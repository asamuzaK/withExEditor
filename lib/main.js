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
  const {ns} = require("sdk/core/namespace");
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

  /* namespace */
  const internal = ns();

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
  const isEnabled = () => !isPb() || prefs[`${PREFS}EnablePB`];

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
      simpleStorage.storage.withExEditor.hasOwnProperty(key) &&
        (simpleStorage.storage.withExEditor[key] = store[key] || "");
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
      const suffix = ext[3] ||
                     type === "application" && /^(?:json|xml)$/.test(subtype) &&
                       subtype;
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
  /**
   * temporary files storage class
   */
  class StorageTmp {
    /**
     * @private
     */
    constructor() {
      internal(this).storage = {tmpFiles: {}, tmpFilesPb: {}};
    }

    /**
     * get target property value
     * @param {{dir:string, tId:string, host:string, target:string}} des
     *        - descendant property keys
     * @return {*}
     */
    get(des) {
      const store = internal(this).storage;
      const dir = des && isString(des.dir) && des.dir;
      const tId = des && isString(des.tId) && des.tId;
      const host = des && isString(des.host) && des.host;
      const target = des && isString(des.target) && des.target;
      return dir && tId && host && target &&
             store[dir] && store[dir][tId] && store[dir][tId][host] &&
               store[dir][tId][host][target];
    }

    /**
     * set property / value
     * @param {Object} des - descendant property keys
     * @param {*} val - value
     * @return {void}
     */
    set(des = {}, val = null) {
      const store = internal(this).storage;
      const dir = isString(des.dir) && des.dir;
      const tId = isString(des.tId) && des.tId;
      const host = isString(des.host) && des.host;
      const target = isString(des.target) && des.target;
      dir && (store[dir] = store[dir] || tId && {} || val) &&
      tId && (store[dir][tId] = store[dir][tId] || host && {} || val) &&
      host && (store[dir][tId][host] = store[dir][tId][host] ||
                                       target && {} || val) &&
      target && (store[dir][tId][host][target] = val);
    }

    /**
     * remove property
     * @param {Object} des - descendant property keys
     * @return {boolean|undefined}
     */
    remove(des = {}) {
      const store = internal(this).storage;
      const dir = isString(des.dir) && des.dir;
      const tId = isString(des.tId) && des.tId;
      const host = isString(des.host) && des.host;
      const target = isString(des.target) && des.target;
      return dir && !tId && store[dir] ?
               delete store[dir] :
             dir && tId && !host && store[dir] && store[dir][tId] ?
               delete store[dir][tId] :
             dir && tId && host && !target &&
             store[dir] && store[dir][tId] && store[dir][tId][host] ?
               delete store[dir][tId][host] :
             dir && tId && host && target && store[dir] && store[dir][tId] &&
             store[dir][tId][host] && store[dir][tId][host][target] &&
               delete store[dir][tId][host][target];
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
    tab.removeListener("close", removeStorageTmp);
    storageTmp.remove({dir: isPb() && TMP_FILES_PB || TMP_FILES, tId: tab.id});
  };

  /**
   * remove private temporary files on last private browsing context exited
   * @param {Object} evt - Event
   * @return {Object|boolean|undefined} - Promise or false
   */
  const removePrivateTmpFiles = evt =>
    evt && evt.type && evt.type === LAST_PB && TMP_DIR &&
      removeDir(
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
   * @return {Object|undefined} - EventTarget
   */
  const attachTab = (res, target) => {
    const tab = tabs.activeTab;
    const dir = isPb() && TMP_FILES_PB || TMP_FILES;
    const tId = tab.id;
    const host = (new urls.URL(tab.url)).host || LABEL;
    const file = storageTmp.get({dir, tId, host, target});
    file && file.path && (
      file.timestamp = (new fs.Stats(file.path)).mtime,
      storageTmp.set({dir, tId, host, target}, file)
    );
    return res && file &&
             tabs.activeTab.attach({
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
    const file = storageTmp.get({
      dir: isPb() && TMP_FILES_PB || TMP_FILES,
      tId: tab.id,
      host: (new urls.URL(tab.url)).host || LABEL,
      target
    });
    return file &&
             createRequest(file.uri, file.type, CHAR, attachTab, target).get();
  };

  /* create a temporary file */
  /**
   * child process class
   */
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
      return fileIsFile(file) && fileIsExecutable(this.app) &&
               execFile(
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
    const tId = tab.id;
    const host = (new urls.URL(tab.url)).host || LABEL;
    const target = path && getFileNameFromFilePath(path);
    const file = storageTmp.get({dir, tId, host, target});
    path && file && (
      file.path = path,
      file.uri = urls.fromFilename(path),
      storageTmp.set({dir, tId, host, target}, file)
    );
    return path && editorPath && tab.once("close", removeStorageTmp) &&
             (new ChildProcess({
               app: editorPath,
               cmd: prefs[`${PREFS}CmdArgs`],
               opt: system.env.DISPLAY && {env: {DISPLAY: system.env.DISPLAY}},
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
    const tId = res.tId;
    const host = res.host;
    const target = res.target;
    const file = res.file;
    return tId && host && target && file &&
             createDir(files.join(TMP_DIR, dir, tId, host)).then(path => {
               storageTmp.set({dir, tId, host, target}, res);
               createFile(files.join(path, file), value, spawnProcess);
             }).catch(logError);
  };

  /**
   * create temporary file params from Response
   * @param {Object} res - Response
   * @return {Object|undefined}
   */
  const createTmpFileFromRes = res => {
    const tab = tabs.activeTab;
    const url = new urls.URL(tab.url);
    const target = getFileNameFromURI(url.path, "index");
    const type = tab.contentType;
    return res &&
             createTmpFile({
               mode: VIEW_SOURCE,
               tId: tab.id,
               host: url.host || LABEL,
               target, type,
               file: target + getFileExtension(type)
             }, res.text);
  };

  /**
   * get file source
   * @param {string} url - file URL
   * @param {string} type - content type
   * @param {string} charset - character set
   * @return {Object|undefined}
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
    const obj = JSON.parse(res) || {};
    const mode = obj.mode;
    const charset = obj.charset;
    const value = obj.value;
    const tab = tabs.activeTab;
    const tId = tab.id;
    const type = tab.contentType;
    const url = new urls.URL(tab.url);
    const host = url.host || LABEL;
    let target;
    switch (mode) {
      case EDIT_TEXT:
        return (target = obj.target) &&
                 createTmpFile({
                   mode, tId, host, target,
                   type: "text/plain",
                   file: `${target}.txt`,
                   namespace: obj.namespace || ""
                 }, value) ||
                 getSource(url, type, charset);
      case VIEW_SELECTION:
        return value && (target = getFileNameFromURI(url.path, "index")) ?
               EXP_XML.test(type) ?
                 createTmpFile({
                   mode, tId, host, target,
                   type: "application/xml",
                   file: `${target}.xml`
                 }, value) :
                 createTmpFile({
                   mode, tId, host, target, type,
                   file: target + getFileExtension(type)
                 }, convertValue(value)) :
                 getSource(url, type, charset);
      case VIEW_MATHML:
        return value && (target = getFileNameFromURI(url.path, "index")) &&
                 createTmpFile({
                   mode, tId, host, target,
                   type: "application/mathml+xml",
                   file: `${target}.mml`
                 }, value) ||
                 getSource(url, type, charset);
      default:
        return getSource(url, type, charset);
    }
  };

  /* components */
  /**
   * access key class
   */
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

  /* selector context */
  const selectorContext = new contextMenu.SelectorContext([
    "input[type=email]", "input[type=tel]", "input[type=url]",
    "input[type=search]", "input[type=text]", "textarea",
    "[contenteditable=true] svg text", "[contenteditable=true]"
  ].join(","));

  /* predicate context */
  const predicateContext = new contextMenu.PredicateContext(context =>
    isEnabled() && editorPath && EXP_CONTEXT.test(context.documentType)
  );

  /* context menu item */
  const menu = new contextMenu.Item({
    label: _(VIEW_SOURCE, editorName),
    image: self.data.url(`${ICON}#gray`),
    contentScriptFile: JS_MENU,
    context: prefs[`${PREFS}Context`] && selectorContext || predicateContext,
    accesskey: accKey.key || null,
    data: nsURI,
    onMessage: res => {
      /^(?:View(?:MathML|S(?:ource|election))|EditText)$/.test(res) ?
        menu.label = _(res, editorName) :
      /^withExEditor[^\.].*/.test(res) ?
        getTmpFile(res) :
        createTmpFileByMode(res);
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
      target ? target.activate() : tabs.open(url);
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
    key ?
      hotKey = new Hotkey({combo: `accel-alt-${key}`, onPress: togglePanel}) :
      hotKey && hotKey.destroy();
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
        button.badge = null,
        button.badgeColor = null
      )
    );
    panel.isShowing && panel.hide();
  };

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
  };

  /* simplePrefs utilities */
  /**
   * replace editor
   * @param {string} pref - preference
   * @return {void}
   */
  const replaceEditor = pref => {
    const path = prefs[pref];
    fileIsExecutable(path) ? (
      editorPath = path,
      (editorName = getFileNameFromFilePath(path)) && (
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
   * @param {string} pref - preference
   * @return {void}
   */
  const replaceAccessKey = pref => {
    const key = prefs[pref];
    accKey.key = key;
    setHotKey(accKey.key);
    menu.accesskey = accKey.key || null;
    button.label = setToolbarButtonLabel(accKey.key);
  };

  /**
   * replace context mode
   * @param {string} pref - preference
   * @return {void}
   */
  const replaceContext = pref => {
    const bool = prefs[pref];
    bool ? (
      menu.context.remove(predicateContext),
      menu.context.add(selectorContext)
    ) : (
      menu.context.remove(selectorContext),
      menu.context.add(predicateContext)
    );
  };

  exports.main = () => {
    const storage = simpleStorage.storage.withExEditor =
                      simpleStorage.storage.withExEditor || {};
    const path = prefs[`${PREFS}File`];

    /* set storage variables */
    fileIsExecutable(path) && (
      editorPath = path,
      editorName = editorPath === storage.editorPath &&
                     storage.editorName || getFileNameFromFilePath(editorPath)
    );
    // TODO: remove storage.toolbarButtonIcon at future release
    (storage.buttonIcon || storage.toolbarButtonIcon) &&
      (buttonIcon = storage.buttonIcon || storage.toolbarButtonIcon);

    /* set event listeners */
    simplePrefs.on(`${PREFS}File`, replaceEditor);
    simplePrefs.on(`${PREFS}AccessKey`, replaceAccessKey);
    simplePrefs.on(`${PREFS}EnablePB`, toggleButtonIcon);
    simplePrefs.on(`${PREFS}Context`, replaceContext);
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
      delete prefs[`${PREFS}File`],
      delete prefs[`${PREFS}CmdArgs`],
      delete prefs[`${PREFS}AccessKey`],
      delete prefs[`${PREFS}EnablePB`],
      delete prefs[`${PREFS}Context`],
      delete prefs[`${PREFS}ForceRemove`],
      removeDir(files.join(PREF_D, "jetpack", self.id), true).catch(logError)
    );
  };
}
