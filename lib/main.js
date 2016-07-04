/**
 * main.js
 */
"use strict";
{
  /* sdk */
  const _ = require("sdk/l10n").get;
  const {ActionButton} = require("sdk/ui/button/action");
  const {Hotkey} = require("sdk/hotkeys");
  const {Panel} = require("sdk/panel");
  const {Request} = require("sdk/request");
  const {all, promised} = require("sdk/core/promise");
  const {browserWindows} = require("sdk/windows");
  const {execFile} = require("sdk/system/child_process");
  const {isPrivate} = require("sdk/private-browsing");
  const {notify} = require("sdk/notifications");
  const contextMenu = require("sdk/context-menu");
  const events = require("sdk/system/events");
  const files = require("sdk/io/file");
  const fs = require("sdk/io/fs");
  const self = require("sdk/self");
  const simplePrefs = require("sdk/simple-prefs");
  const simpleStorage = require("sdk/simple-storage");
  const system = require("sdk/system");
  const tabs = require("sdk/tabs");
  const urls = require("sdk/url");

  /* data */
  const fileExt = JSON.parse(self.data.load("json/fileExt.json"));
  const nsURI = self.data.load("json/nsUri.json");

  /* constants */
  const LABEL = "withExEditor";
  const PREFS = "WithExEditorPrefs";
  const VIEW_SOURCE = "ViewSource";
  const VIEW_MATHML = "ViewMathML";
  const VIEW_SELECTION = "ViewSelection";
  const EDIT_TEXT = "EditText";
  const ICON = "./img/icon.svg";
  const JS_CONTENT = "./js/contentScript.js";
  const JS_MENU = "./js/contextMenu.js";
  const JS_PANEL = "./js/controlPanel.js";
  const PANEL = "./html/controlPanel.html";
  const WARN_MARK = "!";
  const WARN_COLOR = "#C13832";
  const LAST_PB = "last-pb-context-exited";
  const CHAR = "UTF-8";
  const MASK_BIT = parseInt("0111", 8);
  const PERM_DIR = 0o777;
  const PERM_FILE = 0o666;
  const EXP_CMD = /"[^"]?(?:(?:[^"]|\\"[^"]?(?:[^"]*[^"\s])?\\")*[^"\s])?"|[^"\s]+/g;
  const EXP_CONTEXT = /^(?:application\/(?:(?:[\w\-\.]+\+)?(?:json|xml)|(?:(?:x-)?jav|ecm)ascript)|image\/[\w\-\.]+\+xml|text\/[\w\-\.]+)$/;
  const EXP_EXT = /^(application|image|text)\/([\w\-\.]+)(?:\+(json|xml))?$/;
  const EXP_PATH = /^.*\/((?:[\w\-~!\$&'\(\)\*\+,;=:@]|%[0-9A-F]{2})+)(?:(?:\.(?:[\w\-~!\$&'\(\)\*\+,;=:@]|%[0-9A-F]{2})+)*(?:\?(?:[\w\-\.~!\$&'\(\)\*\+,;=:@\/\?]|%[0-9A-F]{2})*)?(?:#(?:[\w\-\.~!\$&'\(\)\*\+,;=:@\/\?]|%[0-9A-F]{2})*)?)?$/;
  const EXP_XML = /^(?:(?:application\/(?:[\w\-\.]+\+)?|image\/[\w\-\.]+\+)x|text\/(?:ht|x))ml$/;
  const PREF_D = system.pathFor("PrefD");
  const TMP_DIR = files.join(
    system.pathFor("TmpD"),
    LABEL,
    /^.+\.([^\.]+)$/.test(files.basename(PREF_D)) &&
      /^.+\.([^\.]+)$/.exec(files.basename(PREF_D))[1] || LABEL
  );
  const TMP_FILES = "tmpFiles";
  const TMP_FILES_PB = "tmpFilesPb";

  /* preference */
  const prefs = simplePrefs.prefs;

  /* variables */
  let buttonIcon = ICON, editorName = "", editorPath = "", hotKey;

  /* error handling */
  /**
   * log error
   * @param {Object} e - Error
   * @return {boolean} - false
   */
  const logError = e => {
    e && console.error(e);
    return false;
  };

  /**
   * notify error
   * @param {Object} e - Error
   * @return {boolean} - false
   */
  const notifyError = e => {
    e && (
      console.error(e),
      notify({title: `${LABEL}: ${_("Error")}`, text: e.toString()})
    );
    return false;
  };

  /**
   * log warning
   * @param {string} m - message
   * @return {boolean} - false
   */
  const logWarn = m => {
    m && console.warn(m);
    return false;
  };

  /**
   * notify warning
   * @param {string} m - message
   * @return {boolean} - false
   */
  const notifyWarn = m => {
    m && (
      console.warn(m),
      notify({title: `${LABEL}: ${_("Warn")}`, text: m})
    );
    return false;
  };

  /* utilities */
  /**
   * is private window
   * @return {boolean}
   */
  const isPb = () => isPrivate(browserWindows.activeWindow);

  /**
   * is enabled
   * @return {boolean}
   */
  const isEnabled = () => {
    const bool = isPb();
    return !bool || bool && prefs[`${PREFS}EnablePB`];
  };

  /**
   * is string
   * @param {*} o - object to check
   * @return {boolean}
   */
  const isString = o => typeof o === "string" || o instanceof String;

  /**
   * store all settings
   * @param {Object} store - store data
   * @return {void}
   */
  const storeAll = promised((store = {}) => {
    simpleStorage.storage.withExEditor = store;
  });

  /**
   * store pair of key / value
   * @param {Object} store - store data
   * @return {void}
   */
  const storeKey = promised((store = {}) => {
    for (let key in store) {
      if (simpleStorage.storage.withExEditor.hasOwnProperty(key)) {
        simpleStorage.storage.withExEditor[key] = store[key] || "";
      }
    }
  });

  /* file utilities */
  /**
   * get file name from native file path
   * @param {string} path - file path
   * @return {string} - file name
   */
  const getFileNameFromFilePath = path => {
    const file = /^([^\.]+)(?:\..+)?$/.exec(files.basename(path));
    return file && file[1] || LABEL;
  };

  /**
   * get file name from URI path
   * @param {string} path - URI path
   * @param {string} value - fallback value
   * @return {string} - file name
   */
  const getFileNameFromURI = (path, value = LABEL) => {
    const file = (new urls.URL(tabs.activeTab.url)).scheme !== "data" &&
                   EXP_PATH.exec(path);
    return file && file[1] || value;
  };

  /**
   * get file extension from content type
   * @param {string} mime - content type
   * @param {string} fallback - fallback extension type
   * @return {string} - file extension
   */
  const getFileExtension = (mime = "text/plain", fallback = "txt") => {
    let ext = EXP_EXT.exec(mime);
    if (ext) {
      const type = ext[1];
      const subtype = ext[2];
      const suffix = ext[3] || type === "application" &&
                     /^(?:json|xml)$/.test(subtype) && subtype;
      ext = suffix ?
              fileExt[type][suffix][subtype] || fileExt[type][suffix][suffix] :
              fileExt[type][subtype];
    }
    return `.${ext || fallback}`;
  };

  /**
   * the file is a file
   * @param {string} path - file path
   * @return {boolean}
   */
  const fileIsFile = path =>
    isString(path) && files.exists(path) && files.isFile(path);

  /**
   * the file is executable
   * @param {string} path - file path
   * @param {number} mask - mask bit
   * @return {boolean}
   */
  const fileIsExecutable = (path, mask = MASK_BIT) =>
    fileIsFile(path) && !!((new fs.Stats(path)).mode & mask);

  /**
   * remove the directory
   * @param {string} path - directory path
   * @param {boolean} rec - recursive
   * @return {string} - path
   */
  const removeDir = promised((path, rec = false) => {
    files.exists(path) && fs.rmdirSync(path, rec);
    return path;
  });

  /**
   * create a directory
   * @param {string} path - directory path
   * @param {string|number} mode - permission
   * @return {string} - path
   */
  const createDir = promised((path, mode = PERM_DIR) => {
    !files.exists(path) && fs.mkdirSync(path, mode);
    return path;
  });

  /**
   * create a file
   * @param {string} path - file path
   * @param {string} value - values to write in the file
   * @param {Function} callback - callback when the write completes
   * @param {string|number} mode - permission
   * @return {Object} - TextWriter
   */
  const createFile = (path, value = "", callback = null, mode = PERM_FILE) =>
    files.open(path, "w").writeAsync(value, e => {
      e ? logError(e) : (
        fs.chmodSync(path, mode),
        callback && callback(path)
      );
    });

  /**
   * create Request
   * @param {string} url - URL
   * @param {string} type - content type
   * @param {string} charset - character set
   * @param {Function} callback - callback on complete
   * @param {Object|string} opt - callback option
   * @return {Object} - Request
   */
  const createRequest = (url = tabs.activeTab.url,
                         type = tabs.activeTab.contentType,
                         charset = CHAR,
                         callback = null,
                         opt = null) =>
    new Request({
      url,
      overrideMimeType: `${type}; charset=${charset}`,
      onComplete: res => callback && callback(res, opt)
    });

  /* handle temporary files */
  /* temporary files storage constructor */
  class StorageTmp {
    constructor() {
      this.storage = {
        tmpFiles: {},
        tmpFilesPb: {}
      };
    }

    /**
     * get property value
     * @param {Object} obj - descendant's property
     * @return {*}
     */
    get(obj = {}) {
      const dir = isString(obj.dir) && obj.dir;
      const id = isString(obj.id) && obj.id;
      const host = isString(obj.host) && obj.host;
      const target = isString(obj.target) && obj.target;
      return obj && !dir ?
               this.storage :
             dir && !id ?
               this.storage[dir] :
             this.storage[dir] && id && !host ?
               this.storage[dir][id] :
             this.storage[dir] && this.storage[dir][id] && host && !target ?
               this.storage[dir][id][host] :
             this.storage[dir] && this.storage[dir][id] &&
             this.storage[dir][id][host] &&
               this.storage[dir][id][host][target];
    }

    /**
     * set property and value
     * @param {Object} obj - descendant's property
     * @param {*} val - value
     * @return {void}
     */
    set(obj = {}, val = null) {
      const dir = isString(obj.dir) && obj.dir;
      const id = isString(obj.id) && obj.id;
      const host = isString(obj.host) && obj.host;
      const target = isString(obj.target) && obj.target;
      dir && (this.storage[dir] = this.storage[dir] || id && {} || val) &&
      id && (this.storage[dir][id] = this.storage[dir][id] ||
                                     host && {} || val) &&
      host && (this.storage[dir][id][host] = this.storage[dir][id][host] ||
                                             target && {} || val) &&
      target && (this.storage[dir][id][host][target] = val);
    }

    /**
     * remove property
     * @param {Object} obj - descendant's property
     * @return {boolean|undefined}
     */
    remove(obj = {}) {
      const dir = isString(obj.dir) && obj.dir;
      const id = isString(obj.id) && obj.id;
      const host = isString(obj.host) && obj.host;
      const target = isString(obj.target) && obj.target;
      return dir && !id && this.storage[dir] ?
               delete this.storage[dir] :
             dir && id && !host && this.storage[dir] && this.storage[dir][id] ?
               delete this.storage[dir][id] :
             dir && id && host && !target && this.storage[dir] &&
             this.storage[dir][id] && this.storage[dir][id][host] ?
               delete this.storage[dir][id][host] :
             dir && id && host && target && this.storage[dir] &&
             this.storage[dir][id] && this.storage[dir][id][host] &&
             this.storage[dir][id][host][target] &&
               delete this.storage[dir][id][host][target];
    }
  }

  /* temporary files storage */
  const storageTmp = new StorageTmp();

  /**
   * remove storageTmp data on tab close
   * @param {Object} tab - closed tab
   * @return {void}
   */
  const removeStorageTmp = tab => {
    const dir = isPb() && TMP_FILES_PB || TMP_FILES;
    const id = tab.id;
    tab.removeListener("close", removeStorageTmp);
    storageTmp.remove({dir, id});
  };

  /**
   * remove private temporary files on last private browsing context exited
   * @param {Object} evt - Event
   * @return {Object|boolean} - Promise or false
   */
  const removePrivateTmpFiles = evt =>
    evt && evt.type && evt.type === LAST_PB && TMP_DIR && removeDir(
      files.join(TMP_DIR, TMP_FILES_PB),
      prefs[`${PREFS}ForceRemove`]
    ).then(createDir).then(() => {
      storageTmp.remove({dir: TMP_FILES_PB});
      storageTmp.set({dir: TMP_FILES_PB}, {});
    }).catch(notifyError);

  /**
   * attach temporary file data to the tab
   * @param {Object} res - Response
   * @param {string} target - target ID
   * @return {Object} - EventTarget
   */
  const attachTab = (res, target) => {
    const tab = tabs.activeTab;
    const dir = isPb() && TMP_FILES_PB || TMP_FILES;
    const id = tab.id;
    const host = (new urls.URL(tab.url)).host || LABEL;
    const file = target && storageTmp.get({dir, id, host, target});
    const path = file && file.path;
    file && path && (
      file.timestamp = (new fs.Stats(path)).mtime,
      storageTmp.set({dir, id, host, target}, file)
    );
    return res && file && tabs.activeTab.attach({
      contentScriptFile: JS_CONTENT,
      contentScriptOptions: {
        target: file.target,
        value: res.text,
        timestamp: file.timestamp,
        namespace: file.namespace
      }
    });
  };

  /**
   * get target file from temporary files
   * @param {string} target - target ID
   * @return {Object|undefined}
   */
  const getTmpFile = target => {
    const tab = tabs.activeTab;
    const file = target && storageTmp.get({
      dir: isPb() && TMP_FILES_PB || TMP_FILES,
      id: tab.id,
      host: (new urls.URL(tab.url)).host || LABEL,
      target
    });
    return file &&
             createRequest(file.uri, file.type, CHAR, attachTab, target).get();
  };

  /* create a temporary file */
  /* child process constructor */
  class ChildProcess {
    /**
     * @param {{app:string, cmd:string, opt:Object, onTerminate:Function}} arg
     *        - arguments
     */
    constructor(arg) {
      this.app = arg && fileIsExecutable(arg.app) && arg.app || "";
      this.cmd = arg && isString(arg.cmd) && arg.cmd || "";
      this.opt = arg && arg.opt && (
                   arg.opt.cwd || arg.opt.stdio || arg.opt.env ||
                   arg.opt.encoding || arg.opt.timeout ||
                   arg.opt.maxBuffer || arg.opt.killSignal
                 ) && arg.opt;
      this.callback = arg && typeof arg.onTerminate === "function" &&
                        arg.onTerminate;
    }

    /**
     * spawn process
     * @param {string} file - file path
     * @return {Object|boolean} - ChildProcess or false
     */
    spawn(file) {
      return fileIsFile(file) && fileIsExecutable(this.app) && execFile(
        this.app,
        /\S+/.test(this.cmd) &&
          [file].concat(this.cmd.match(EXP_CMD)) || [file],
        this.opt,
        this.callback
      );
    }
  }

  /**
   * spawn child process
   * @param {string} path - file path
   * @return {Object} - ChildProcess or notification
   */
  const spawnProcess = path => {
    const tab = tabs.activeTab;
    const dir = isPb() && TMP_FILES_PB || TMP_FILES;
    const id = tab.id;
    const host = (new urls.URL(tab.url)).host || LABEL;
    const target = path && getFileNameFromFilePath(path);
    const file = target && storageTmp.get({dir, id, host, target});
    path && file && (
      file.path = path,
      file.uri = urls.fromFilename(path),
      storageTmp.set({dir, id, host, target}, file)
    );
    return path && editorPath && tab.once("close", removeStorageTmp) &&
           (new ChildProcess({
             app: editorPath,
             cmd: prefs[`${PREFS}CmdArgs`],
             opt: system.env.DISPLAY &&
                    {env: {DISPLAY: system.env.DISPLAY}},
             onTerminate: notifyError
           })).spawn(path) ||
           notifyWarn(_("FailSpawn"));
  };

  /**
   * create temporary file
   * @param {Object} res - data
   * @param {string} value - value
   * @return {Object|undefined} - Promise
   */
  const createTmpFile = (res = {}, value = "") => {
    const dir = isPb() && TMP_FILES_PB || TMP_FILES;
    const id = res.id;
    const host = res.host;
    const target = res.target;
    const file = res.file;
    return id && host && target && file &&
             createDir(files.join(TMP_DIR, dir, id, host)).then(path => {
               storageTmp.set({dir, id, host, target}, res);
               createFile(files.join(path, file), value, spawnProcess);
             }).catch(logError);
  };

  /**
   * create temporary file params from Response
   * @param {Object} res - Response
   * @return {Object|string|undefined}
   */
  const createTmpFileFromRes = res => {
    const tab = tabs.activeTab;
    const type = tab.contentType;
    const url = new urls.URL(tab.url);
    const target = getFileNameFromURI(url.path, "index");
    return res && target && createTmpFile({
      mode: VIEW_SOURCE,
      id: tab.id,
      host: url.host || LABEL,
      file: target + getFileExtension(type),
      target,
      type
    }, res.text);
  };

  /**
   * get file source
   * @param {string} url - file URL
   * @param {string} type - content type
   * @param {string} charset - character set
   * @return {Object}
   */
  const getSource = (url = tabs.activeTab.url,
                     type = tabs.activeTab.contentType,
                     charset = CHAR) => {
    const uri = urls.isValidURI(url) && new urls.URL(url);
    return uri && (
             uri.scheme === "file" && spawnProcess(urls.toFilename(uri)) ||
             createRequest(uri, type, charset, createTmpFileFromRes).get()
           );
  };

  /**
   * strip HTML tags and decode HTML escaped characters
   * @param {string} v - value
   * @return {string} - converted value
   */
  const convertValue = v => {
    while (/^\n*<(?:[^>]+:)?[^>]+?>|<\/(?:[^>]+:)?[^>]+>\n*$/.test(v)) {
      v = v.replace(/^\n*<(?:[^>]+:)?[^>]+?>/, "").
            replace(/<\/(?:[^>]+:)?[^>]+>\n*$/, "\n");
    }
    return v.replace(/<\/(?:[^>]+:)?[^>]+>\n*<!\-\-[^\-]*\-\->\n*<(?:[^>]+:)?[^>]+>/g, "\n\n").
             replace(/&lt;/g, "<").replace(/&gt;/g, ">").
             replace(/&amp;/g, "&");
  };

  /**
   * create temporary file params by mode value
   * @param {string} res - JSON string
   * @return {Object|undefined}
   */
  const createTmpFileByMode = (res = `{"mode": "${VIEW_SOURCE}"}`) => {
    const tab = tabs.activeTab;
    const type = tab.contentType;
    const id = tab.id;
    const url = new urls.URL(tab.url);
    const host = url.host || LABEL;
    const obj = res && JSON.parse(res) || {};
    const charset = obj.charset;
    const value = obj.value;
    let target;
    switch (obj.mode) {
      case EDIT_TEXT:
        return (target = obj.target) &&
                 createTmpFile({
                   mode: EDIT_TEXT,
                   id,
                   host,
                   file: `${target}.txt`,
                   target,
                   type: "text/plain",
                   namespace: obj.namespace || ""
                 }, value) ||
                 getSource(url, type, charset);
      case VIEW_SELECTION:
        return value && (target = getFileNameFromURI(url.path, "index")) ?
                 EXP_XML.test(type) ?
                   createTmpFile({
                     mode: VIEW_SELECTION,
                     id,
                     host,
                     file: `${target}.xml`,
                     target,
                     type: "application/xml"
                   }, value) :
                   createTmpFile({
                     mode: VIEW_SELECTION,
                     id,
                     host,
                     file: target + getFileExtension(type),
                     target,
                     type
                   }, convertValue(value)) :
                 getSource(url, type, charset);
      case VIEW_MATHML:
        return value && (target = getFileNameFromURI(url.path, "index")) &&
                 createTmpFile({
                   mode: VIEW_MATHML,
                   id,
                   host,
                   file: `${target}.mml`,
                   target,
                   type: "application/mathml+xml"
                 }, value) ||
                 getSource(url, type, charset);
      default:
        return getSource(url, type, charset);
    }
  };

  /* components */
  /* access key constructor */
  class AccessKey {
    /**
     * @param {string} key - key string
     */
    constructor(key) {
      this._key = isString(key) && key.length === 1 && key || "";
    }
    get key() {
      return this._key;
    }
    set key(key) {
      isString(key) && key.length === 1 && (this._key = key);
    }
  }

  /* access key */
  const accKey = new AccessKey(prefs[`${PREFS}AccessKey`]);

  /* toolbar button */
  const button = new ActionButton({
    id: LABEL,
    label: LABEL,
    icon: `${ICON}#off`,
    disabled: true
  });

  /* control panel */
  const panel = new Panel({
    contentURL: PANEL,
    contentScriptFile: JS_PANEL,
    contentScriptWhen: "ready",
    position: button
  });

  /* context menu item */
  const menu = new contextMenu.Item({
    label: _(VIEW_SOURCE, editorName),
    image: self.data.url(`${ICON}#gray`),
    contentScriptFile: JS_MENU,
    context: new contextMenu.PredicateContext(context =>
      isEnabled() && editorPath && EXP_CONTEXT.test(context.documentType)
    ),
    accesskey: accKey.key || null,
    data: nsURI,
    onMessage: res => {
      /^(?:View(?:MathML|S(?:ource|election))|EditText)$/.test(res) ?
        menu.label = _(res, editorName) :
      /^withExEditor[^\.].*/.test(res) ?
        getTmpFile(res) : createTmpFileByMode(res);
    }
  });

  /**
   * toggle tab and activate (or open)
   * @param {string} url - URL
   * @return {void}
   */
  const toggleTab = url => {
    if (urls.isValidURI(url)) {
      let target;
      for (let tab of tabs) {
        if (tab.url === url) {
          target = tab;
          break;
        }
      }
      panel.isShowing && panel.hide();
      target && target.activate() || tabs.open(url);
    }
  };

  /**
   * show panel
   * @return {void}
   */
  const showPanel = () => {
    panel.port.emit("editorValue", {
      editorName,
      currentEditorName: _("CurrentEditor"),
      buttonIcon
    });
    !panel.isShowing && panel.show();
  };

  /**
   * toggle panel
   * @return {void}
   */
  const togglePanel = () => {
    panel.isShowing && panel.hide() || showPanel();
  };

  /**
   * toggle toolbar button icon on active window
   * @return {void}
   */
  const toggleButtonIcon = () => {
    isEnabled() ? (
      button.disabled = false,
      button.icon = buttonIcon
    ) : (
      button.disabled = true,
      button.icon = `${ICON}#off`
    );
  };

  /**
   * change toolbar button icon
   * @param {Object} res - data
   * @return {void}
   */
  const changeIcon = res => {
    res && (
      buttonIcon = res.buttonIcon,
      button.icon = buttonIcon,
      storeKey({buttonIcon}).catch(logError)
    );
  };

  /**
   * set hot key
   * @param {string} key - key string
   * @return {void}
   */
  const setHotKey = (key = accKey.key) => {
    key && (hotKey = new Hotkey({
      combo: `accel-alt-${key}`,
      onPress: togglePanel
    })) || hotKey && hotKey.destroy();
  };

  /**
   * set toolbar button label
   * @param {string} key - key string
   * @return {string} - label
   */
  const setToolbarButtonLabel = (key = accKey.key) => {
    const isOSX = /Darwin/i.test(system.platform);
    const accel = isOSX && "Cmd" || "Ctrl";
    const alt = isOSX && "Opt" || "Alt";
    return key && `${LABEL} (${accel}+${alt}+${key.toUpperCase()})` || LABEL;
  };

  /**
   * set toolbar button
   * @return {void}
   */
  const setToolbarButton = () => {
    editorName ? (
      button.badge = null,
      button.badgeColor = null
    ) : (
      button.badge = WARN_MARK,
      button.badgeColor = WARN_COLOR,
      logWarn(_("CurrentEditor"))
    );
    button.label = setToolbarButtonLabel(accKey.key);
    button.on("click", togglePanel);
  };

  /**
   * set UI
   * @param {Object} res - data
   * @return {void}
   */
  const setUI = res => {
    res && (
      res.buttonIcon && changeIcon(res),
      res.editorName && (
        editorName = res.editorName,
        storeKey({editorName}).catch(logError)
      ),
      editorName && editorPath && (
        menu.label = _(VIEW_SOURCE, editorName),
        button.badge && (
          button.badge = null,
          button.badgeColor = null
        )
      )
    );
    panel.isShowing && panel.hide();
  };

  /**
   * update UI on panel hide
   * @return {void}
   */
  const updateUI = () =>
    setUI({editorName, buttonIcon});

  /**
   * panel port emit
   * @return {void}
   */
  const panelPortEmit = () => {
    panel.port.removeListener("load", panelPortEmit);
    panel.port.emit("htmlValue", {
      currentEditorName: _("CurrentEditor"),
      editorLabel: _("EditorLabel"),
      lang: _("Lang"),
      submit: _("Submit")
    });
  };

  /**
   * set panel event
   * @return {void}
   */
  const setPanelEvent = () => {
    panel.port.once("load", panelPortEmit);
    panel.port.on("click", toggleTab);
    panel.port.on("change", changeIcon);
    panel.port.on("submit", setUI);
    panel.port.on("hide", updateUI);
  };

  /* simplePrefs utilities */
  /**
   * replace editor
   * @param {string} path - editor path
   * @return {void}
   */
  const replaceEditor = path => {
    path && fileIsExecutable(path) ? (
      editorPath = path,
      editorName = getFileNameFromFilePath(path),
      editorName && (
        button.badge = null,
        button.badgeColor = null
      )
    ) : (
      editorPath = "",
      editorName = "",
      button.badge = WARN_MARK,
      button.badgeColor = WARN_COLOR,
      logWarn(_("CurrentEditor"))
    );
    storeKey({editorPath, editorName}).then(showPanel).catch(logError);
  };

  /**
   * replace access key
   * @param {string} key - key string
   * @return {void}
   */
  const replaceAccessKey = key => {
    accKey.key = key;
    setHotKey(accKey.key);
    menu.accesskey = accKey.key || null;
    button.label = setToolbarButtonLabel(accKey.key);
  };

  /**
   * replace value on preferences change
   * @param {string} prefName - preference name
   * @return {void}
   */
  const replacePrefValue = (prefName = "") => {
    const value = prefName && prefs[prefName];
    switch (prefName) {
      case `${PREFS}File`:
        return replaceEditor(value);
      case `${PREFS}AccessKey`:
        return replaceAccessKey(value);
      case `${PREFS}EnablePB`:
        return toggleButtonIcon();
      default:
        return undefined;
    }
  };

  exports.main = () => {
    const storage = simpleStorage.storage.withExEditor =
                      simpleStorage.storage.withExEditor || {};
    let str = prefs[`${PREFS}File`];

    /* set storage variables */
    fileIsExecutable(str) && (
      editorPath = str,
      editorName = editorPath === storage.editorPath && storage.editorName &&
                     storage.editorName || getFileNameFromFilePath(editorPath)
    );
    // TODO: remove storage.toolbarButtonIcon at future release
    (storage.buttonIcon || storage.toolbarButtonIcon) && (
      buttonIcon = storage.buttonIcon || storage.toolbarButtonIcon
    );

    /* set event listeners */
    simplePrefs.on(`${PREFS}File`, replacePrefValue);
    simplePrefs.on(`${PREFS}AccessKey`, replacePrefValue);
    simplePrefs.on(`${PREFS}EnablePB`, replacePrefValue);
    browserWindows.on("activate", toggleButtonIcon);
    events.on(LAST_PB, removePrivateTmpFiles);

    /* set temporary directories and components */
    all([
      createDir(files.join(TMP_DIR, TMP_FILES)),
      createDir(files.join(TMP_DIR, TMP_FILES_PB)),
      setHotKey(accKey.key),
      setToolbarButton(),
      setPanelEvent(),
      storeAll({editorName, editorPath, buttonIcon})
    ]).then(toggleButtonIcon).catch(logError);
  };

  exports.onUnload = reason => {
    /* remove temporary files */
    removeDir(TMP_DIR, prefs[`${PREFS}ForceRemove`]).catch(logError);

    /* remove stored settings on uninstall */
    reason === "uninstall" && (
      delete simpleStorage.storage.withExEditor,
      delete simplePrefs.prefs[`${PREFS}File`],
      delete simplePrefs.prefs[`${PREFS}CmdArgs`],
      delete simplePrefs.prefs[`${PREFS}AccessKey`],
      delete simplePrefs.prefs[`${PREFS}EnablePB`],
      delete simplePrefs.prefs[`${PREFS}ForceRemove`],
      removeDir(files.join(PREF_D, "jetpack", self.id), true).catch(logError)
    );
  };
}
