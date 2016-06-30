/**
 * main.js
 */
"use strict";
{
  /* sdk */
  const _ = require("sdk/l10n").get;
  const { ActionButton } = require("sdk/ui/button/action");
  const { Hotkey } = require("sdk/hotkeys");
  const { Panel } = require("sdk/panel");
  const { Request } = require("sdk/request");
  const { all, promised } = require("sdk/core/promise");
  const { browserWindows } = require("sdk/windows");
  const { execFile } = require("sdk/system/child_process");
  const { isPrivate } = require("sdk/private-browsing");
  const { notify } = require("sdk/notifications");
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
  const CONTENT_JS = "./js/contentScript.js";
  const MENU_JS = "./js/contextMenu.js";
  const PANEL_JS = "./js/controlPanel.js";
  const PANEL = "./html/controlPanel.html";
  const ICON = "./img/icon.svg";
  const LAST_PB = "last-pb-context-exited";
  const TMP_DIR = "tmpFiles";
  const TMP_DIR_PB = "tmpFilesPb";
  const WARN_MARK = "!";
  const WARN_COLOR = "#C13832";
  const KEY_LEN = 1;
  const DIR_PERM = 0o777;
  const FILE_PERM = 0o666;

  /* preference */
  const prefs = simplePrefs.prefs;

  /* temporary files storage */
  const storageTmp = { tmpFiles: {}, tmpFilesPb: {} };

  /* variables */
  let buttonIcon = ICON, editorName = "", editorPath = "", hotKey, tmpDir;

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
      notify({
        title: `${ LABEL }: ${ _("Error") }`,
        text: e.toString()
      })
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
      notify({
        title: `${ LABEL }: ${ _("Warn") }`,
        text: m
      })
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
    return !bool || bool && prefs[`${ PREFS }EnablePB`];
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
   * @return {Object} - simpleStorage.storage.withExEditor
   */
  const storeAll = promised((store = {}) => {
    simpleStorage.storage.withExEditor = store;
    return simpleStorage.storage.withExEditor;
  });

  /**
   * store pair of key / value
   * @param {string} key - key string
   * @param {*} value - value to store
   * @return {Object} - simpleStorage.storage.withExEditor
   */
  const storeKey = promised((key, value = "") => {
    key && (simpleStorage.storage.withExEditor[key] = value);
    return simpleStorage.storage.withExEditor;
  });

  /* file utilities */
  /**
   * get file name from native file path
   * @param {string} path - file path
   * @return {string} - file name
   */
  const getFileNameFromFilePath = path => {
    const file = /^([^\.]+)(?:\..+)?$/.exec(files.basename(path));
    return file ? file[1] : LABEL;
  };

  /**
   * get file name from URI path
   * @param {string} path - URI path
   * @param {string} value - fallback value
   * @return {string} - file name
   */
  const getFileNameFromURI = (path, value = LABEL) => {
    const file = (new urls.URL(tabs.activeTab.url)).scheme !== "data" &&
                   /^.*\/((?:[\w\-~!\$&'\(\)\*\+,;=:@]|%[0-9A-F]{2})+)(?:(?:\.(?:[\w\-~!\$&'\(\)\*\+,;=:@]|%[0-9A-F]{2})+)*(?:\?(?:[\w\-\.~!\$&'\(\)\*\+,;=:@\/\?]|%[0-9A-F]{2})*)?(?:#(?:[\w\-\.~!\$&'\(\)\*\+,;=:@\/\?]|%[0-9A-F]{2})*)?)?$/.exec(path);
    return file ? file[1] : value;
  };

  /**
   * get file extension from content type
   * @param {string} mime - content type
   * @param {string} fallback - fallback extension type
   * @return {string} - file extension
   */
  const getFileExtension = (mime = "text/plain", fallback = "txt") => {
    let ext = /^(application|image|text)\/([\w\-\.]+)(?:\+(json|xml))?$/.exec(mime);
    if (ext) {
      const type = ext[1];
      const subtype = ext[2];
      const suffix = ext[3] || type === "application" &&
                     /^(?:json|xml)$/.test(subtype) && subtype;
      ext = suffix ?
              fileExt[type][suffix][subtype] || fileExt[type][suffix][suffix] :
              fileExt[type][subtype];
    }
    return `.${ ext || fallback }`;
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
  const fileIsExecutable = (path, mask = parseInt("0111", 8)) =>
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
   * @param {(string|number)} mode - permission
   * @return {string} - path
   */
  const createDir = promised((path, mode = DIR_PERM) => {
    !files.exists(path) && fs.mkdirSync(path, mode);
    return path;
  });

  /**
   * create a file
   * @param {string} path - file path
   * @param {string} value - values to write in the file
   * @param {?Function} callback - callback when the write completes
   * @param {(string|number)} mode - permission
   * @return {Function} - TextWriter.writeAsync
   */
  const createFile = (path, value = "", callback = null, mode = FILE_PERM) =>
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
   * @param {?Function} callback - callback on complete
   * @param {?(Object|string)} opt - callback option
   * @return {Object} - Request
   */
  const createRequest = (url = tabs.activeTab.url,
                         type = tabs.activeTab.contentType,
                         charset = "UTF-8",
                         callback = null,
                         opt = null) =>
    new Request({
      url,
      overrideMimeType: `${ type }; charset=${ charset }`,
      onComplete: res => callback && callback(res, opt)
    });

  /* constructors */
  /* access key constructor */
  class AccessKey {
    /**
     * @param {string} key - key string
     */
    constructor(key) {
      this._key = isString(key) && key.length === KEY_LEN ? key : "";
    }
    get key() {
      return this._key;
    }
    set key(key) {
      isString(key) && key.length === KEY_LEN && (this._key = key);
    }
  }

  /* child process constructor */
  class ChildProcess {
    /**
     * @param {{app:string, cmd:string, opt:Object, onTerminate:Function}} arg
     *        - arguments
     */
    constructor(arg) {
      this.app = arg && fileIsExecutable(arg.app) ? arg.app : "";
      this.cmd = arg && isString(arg.cmd) ? arg.cmd : "";
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
     * @return {Object|boolean} - process or false
     */
    spawn(file) {
      return fileIsFile(file) && fileIsExecutable(this.app) && execFile(
               this.app,
               /\S+/.test(this.cmd) ?
                 [file].concat(
                   this.cmd.match(/"[^"]?(?:(?:[^"]|\\"[^"]?(?:[^"]*[^"\s])?\\")*[^"\s])?"|[^"\s]+/g)
                 ) : [file],
               this.opt,
               this.callback
             );
    }
  }

  /* event handling */
  /**
   * remove storageTmp data on tab close
   * @param {Object} tab - closed tab
   * @return {void}
   */
  const onTabClose = tab => {
    const dir = isPb() ? TMP_DIR_PB : TMP_DIR;
    const id = tab.id;
    storageTmp[dir] && storageTmp[dir][id] &&
      delete storageTmp[dir][id];
    tab.removeListener("close", onTabClose);
  };

  /**
   * remove temporary files on last private browsing context exited
   * @param {Object} evt - Event
   * @return {Object|boolean|undefined} - Promise or falsy
   */
  const onLastPbContextExited = evt =>
    evt && evt.type && evt.type === LAST_PB && tmpDir && removeDir(
      files.join(tmpDir, TMP_DIR_PB),
      prefs[`${ PREFS }ForceRemove`]
    ).then(createDir).then(() => {
      storageTmp.tmpFilesPb = {};
    }).catch(notifyError);

  /**
   * notify when process terminates with error
   * @param {Object} e - Error
   * @return {Function|boolean}
   */
  const onProcessTerminate = (e, ...args) =>
    e && notifyError(e);

  /* temporary file utilities */
  /**
   * handle temporary file Response
   * @param {Object} res - Response
   * @param {string} target - target ID
   * @return {Object|undefined} - Worker
   */
  const onTmpFileRes = (res, target) => {
    const tab = tabs.activeTab;
    const dir = isPb() ? TMP_DIR_PB : TMP_DIR;
    const id = tab.id;
    const host = (new urls.URL(tab.url)).host || LABEL;
    const file = target && storageTmp[dir] && storageTmp[dir][id] &&
                 storageTmp[dir][id][host] &&
                   storageTmp[dir][id][host][target];
    const path = file && file.path;
    return res && file && path && (
             file.timestamp = (new fs.Stats(path)).mtime
           ) &&
             tabs.activeTab.attach({
               contentScriptFile: CONTENT_JS,
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
   * @return {Function|boolean}
   */
  const getTmpFile = target => {
    const tab = tabs.activeTab;
    const dir = isPb() ? TMP_DIR_PB : TMP_DIR;
    const id = tab.id;
    const host = (new urls.URL(tab.url)).host || LABEL;
    const file = target && storageTmp[dir] && storageTmp[dir][id] &&
                 storageTmp[dir][id][host] &&
                   storageTmp[dir][id][host][target];
    const uri = file && file.uri;
    const type = file && file.type;
    return file &&
             createRequest(uri, type, "UTF-8", onTmpFileRes, target).get();
  };

  /**
   * spawn child process
   * @param {string} path - file path
   * @return {Function} - ChildProcess.spawn or warning on fail
   */
  const spawnProcess = path => {
    const tab = tabs.activeTab;
    const dir = isPb() ? TMP_DIR_PB : TMP_DIR;
    const id = tab.id;
    const host = (new urls.URL(tab.url)).host || LABEL;
    const target = path && getFileNameFromFilePath(path);
    const file = target && storageTmp[dir] && storageTmp[dir][id] &&
                 storageTmp[dir][id][host] &&
                   storageTmp[dir][id][host][target];
    path && file && (
        file.path = path,
        file.uri = urls.fromFilename(path)
    );
    return path && editorPath && tab.once("close", onTabClose) &&
             (new ChildProcess({
               app: editorPath,
               cmd: prefs[`${ PREFS }CmdArgs`],
               opt: system.env.DISPLAY &&
                      { env: { DISPLAY: system.env.DISPLAY } },
               onTerminate: onProcessTerminate
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
    const dir = isPb() ? TMP_DIR_PB : TMP_DIR;
    const id = res.id;
    const host = res.host;
    const target = res.target;
    const file = res.file;
    return id && host && target && file && storageTmp[dir] && (
             storageTmp[dir][id] = storageTmp[dir][id] || {}
           ) && (
             storageTmp[dir][id][host] = storageTmp[dir][id][host] || {}
           ) && (
             storageTmp[dir][id][host][target] = res
           ) &&
             createDir(files.join(tmpDir, dir, id, host)).then(path => {
               createFile(files.join(path, file), value, spawnProcess);
             }).catch(logError);
  };

  /**
   * handle getFileSource() Response
   * @param {Object} res - Response
   * @return {Function|undefined}
   */
  const onSourceRes = (res, ...args) => {
    const tab = tabs.activeTab;
    const type = tab.contentType;
    const id = tab.id;
    const url = new urls.URL(tab.url);
    const host = url.host || LABEL;
    const target = getFileNameFromURI(url.path, "index");
    return res && target &&
             createTmpFile({
               mode: VIEW_SOURCE,
               id,
               host,
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
   * @return {Function|undefined}
   */
  const getSource = (url = tabs.activeTab.url,
                     type = tabs.activeTab.contentType,
                     charset = "UTF-8") => {
    const uri = urls.isValidURI(url) && new urls.URL(url);
    return uri && (
             uri.scheme === "file" ?
               spawnProcess(urls.toFilename(url)) :
               createRequest(url, type, charset, onSourceRes).get()
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
   * parse stringified JSON and switch by mode
   * @param {string} res - JSON string
   * @return {Function}
   */
  const switchByMode = (res = `{ "mode": "${ VIEW_SOURCE }" }`) => {
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
        return (target = obj.target) ?
                 createTmpFile({
                   mode: EDIT_TEXT,
                   id,
                   host,
                   file: `${ target }.txt`,
                   target,
                   type: "text/plain",
                   namespace: obj.namespace || ""
                 }, value) :
                 getSource(url, type, charset);
      case VIEW_SELECTION:
        return value && (target = getFileNameFromURI(url.path, "index")) ?
                 /^(?:(?:application\/(?:[\w\-\.]+\+)?|image\/[\w\-\.]+\+)x|text\/(?:ht|x))ml$/.test(type) ?
                   createTmpFile({
                     mode: VIEW_SELECTION,
                     id,
                     host,
                     file: `${ target }.xml`,
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
        return value && (target = getFileNameFromURI(url.path, "index")) ?
                 createTmpFile({
                   mode: VIEW_MATHML,
                   id,
                   host,
                   file: `${ target }.mml`,
                   target,
                   type: "application/mathml+xml"
                 }, value) :
                 getSource(url, type, charset);
      default:
        return getSource(url, type, charset);
    }
  };

  /* components */
  /* access key */
  const accesskey = new AccessKey(prefs[`${ PREFS }AccessKey`]);

  /* toolbar button */
  const button = new ActionButton({
    id: LABEL,
    label: LABEL,
    icon: `${ ICON }#off`,
    disabled: true
  });

  /* control panel */
  const panel = new Panel({
    contentURL: PANEL,
    contentScriptFile: PANEL_JS,
    contentScriptWhen: "ready",
    position: button
  });

  /* context menu item */
  const menu = new contextMenu.Item({
    label: _(VIEW_SOURCE, editorName),
    image: self.data.url(`${ ICON }#gray`),
    contentScriptFile: MENU_JS,
    context: new contextMenu.PredicateContext(context =>
      isEnabled() && editorPath &&
        /^(?:application\/(?:(?:[\w\-\.]+\+)?(?:json|xml)|(?:(?:x-)?jav|ecm)ascript)|image\/[\w\-\.]+\+xml|text\/[\w\-\.]+)$/.test(context.documentType)
    ),
    accesskey: accesskey.key || null,
    data: nsURI,
    onMessage: res => {
      /^(?:View(?:MathML|S(?:ource|election))|EditText)$/.test(res) ?
        menu.label = _(res, editorName) :
      /^withExEditor[^\.].*/.test(res) ?
        getTmpFile(res) : switchByMode(res);
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
      for (const tab of tabs) {
        if (tab.url === url) {
          target = tab;
          break;
        }
      }
      target ? target.activate() : tabs.open(url);
      panel.isShowing && panel.hide();
    }
  };

  /**
   * show panel
   * @return {Function|boolean}
   */
  const showPanel = () => {
    panel.port.emit("editorValue", {
      editorName,
      currentEditorName: _("CurrentEditor"),
      buttonIcon
    });
    return !panel.isShowing && panel.show();
  };

  /**
   * toggle panel
   * @return {Function}
   */
  const togglePanel = () => (panel.isShowing ? panel.hide() : showPanel());

  /**
   * toggle toolbar button icon on active window
   * @return {boolean}
   */
  const onActiveWindow = () => {
    const bool = isEnabled();
    bool ? (
      button.disabled = false,
      button.icon = buttonIcon
    ) : (
      button.disabled = true,
      button.icon = `${ ICON }#off`
    );
    return bool;
  };

  /**
   * change toolbar button icon
   * @param {Object} res - data
   * @return {Object} - button
   */
  const changeIcon = res => {
    res && (
      buttonIcon = res.buttonIcon,
      storeKey("buttonIcon", buttonIcon).catch(logError),
      button.icon = buttonIcon
    );
    return button;
  };

  /**
   * set hotKey
   * @param {string} key - key string
   * @return {Object} - hotKey
   */
  const setHotKey = (key = accesskey.key) => {
    key ?
      hotKey = new Hotkey({
        combo: `accel-alt-${ key }`,
        onPress: togglePanel
      }) :
      hotKey && hotKey.destroy();
    return hotKey;
  };

  /**
   * set toolbar button label
   * @param {string} key - key string
   * @return {string} - label
   */
  const setToolbarButtonLabel = (key = accesskey.key) => {
    const isOSX = /Darwin/i.test(system.platform);
    const accel = isOSX ? "Cmd" : "Ctrl";
    const alt = isOSX ? "Opt" : "Alt";
    return key ?
             `${ LABEL } (${ accel }+${ alt }+${ key.toUpperCase() })` :
             LABEL;
  };

  /**
   * set toolbar button
   * @return {Object} - button
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
    button.label = setToolbarButtonLabel(accesskey.key);
    button.on("click", togglePanel);
    return button;
  };

  /**
   * set UI
   * @param {Object} res - data
   * @return {Function|boolean}
   */
  const setUI = res => {
    res && (
      res.buttonIcon && changeIcon(res),
      res.editorName && (
        editorName = res.editorName,
        storeKey("editorName", editorName).catch(logError)
      ),
      editorName && editorPath && (
        menu.label = _(VIEW_SOURCE, editorName),
        button.badge && (
          button.badge = null,
          button.badgeColor = null
        )
      )
    );
    return panel.isShowing && panel.hide();
  };

  /**
   * update UI on panel hide
   * @return {Function}
   */
  const onPanelHide = () => setUI({ editorName, buttonIcon });

  /**
   * panel port emit
   * @return {void}
   */
  const panelPortEmit = () => {
    panel.port.emit("htmlValue", {
      currentEditorName: _("CurrentEditor"),
      editorLabel: _("EditorLabel"),
      lang: _("Lang"),
      submit: _("Submit")
    });
    panel.port.removeListener("load", panelPortEmit);
  };

  /**
   * set panel event
   * @return {Object} - panel
   */
  const setPanelEvent = () => {
    panel.port.once("load", panelPortEmit);
    panel.port.on("click", toggleTab);
    panel.port.on("change", changeIcon);
    panel.port.on("submit", setUI);
    panel.port.on("hide",onPanelHide);
    return panel;
  };

  /* simplePrefs utilities */
  /**
   * replace editor
   * @param {string} path - editor path
   * @return {Object} - Promise
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
    return all([
      storeKey("editorPath", editorPath),
      storeKey("editorName", editorName)
    ]).then(showPanel).catch(logError);
  };

  /**
   * replace access key
   * @param {string} key - key string
   * @return {Object} - accesskey
   */
  const replaceAccessKey = key => {
    accesskey.key = key;
    setHotKey(accesskey.key);
    menu.accesskey = accesskey.key || null;
    button.label = setToolbarButtonLabel(accesskey.key);
    return accesskey;
  };

  /**
   * switch on preferences change
   * @param {string} prefName - preference name
   * @return {?Function}
   */
  const onPrefsChange = (prefName = "") => {
    const value = prefName && prefs[prefName];
    switch (prefName) {
      case `${ PREFS }File`:
        return replaceEditor(value);
      case `${ PREFS }AccessKey`:
        return replaceAccessKey(value);
      case `${ PREFS }EnablePB`:
        return onActiveWindow();
      default:
        return null;
    }
  };

  exports.main = (option, callback) => {
    const storage = simpleStorage.storage.withExEditor =
                      simpleStorage.storage.withExEditor || {};
    let str = prefs[`${ PREFS }File`];

    /* set storage variables */
    fileIsExecutable(str) && (
      editorPath = str,
      editorName = storage.editorPath && editorPath === storage.editorPath &&
                   storage.editorName ?
                     storage.editorName :
                     getFileNameFromFilePath(editorPath)
    );
    // TODO: remove storage.toolbarButtonIcon at future release
    (storage.buttonIcon || storage.toolbarButtonIcon) && (
      buttonIcon = storage.buttonIcon || storage.toolbarButtonIcon
    );

    /* set event listeners */
    simplePrefs.on(`${ PREFS }File`, onPrefsChange);
    simplePrefs.on(`${ PREFS }AccessKey`, onPrefsChange);
    simplePrefs.on(`${ PREFS }EnablePB`, onPrefsChange);
    browserWindows.on("activate", onActiveWindow);
    events.on(LAST_PB, onLastPbContextExited);

    /* set temporary directories and set items */
    createDir(
      files.join(
        system.pathFor("TmpD"),
        LABEL,
        (str = /^.+\.([^\.]+)$/.exec(files.basename(system.pathFor("PrefD")))) ?
          str[1] : LABEL
      )
    ).then(path =>
      (tmpDir = path) && all([
        createDir(files.join(tmpDir, TMP_DIR)),
        createDir(files.join(tmpDir, TMP_DIR_PB)),
        storeAll({ editorName, editorPath, buttonIcon }),
        setHotKey(accesskey.key),
        setToolbarButton(),
        setPanelEvent()
      ])
    ).then(arr => {
      let bool;
      for (const i of arr) {
        bool = i;
        if (!bool) {
          break;
        }
      }
      return !!bool && onActiveWindow();
    }).catch(logError);
  };

  exports.onUnload = reason => {
    /* remove temporary files */
    removeDir(tmpDir, prefs[`${ PREFS }ForceRemove`]).catch(logError);

    /* remove event listeners */
    panel.port.removeListener("click", toggleTab);
    panel.port.removeListener("change", changeIcon);
    panel.port.removeListener("submit", setUI);
    panel.port.removeListener("hide",onPanelHide);
    button.removeListener("click", togglePanel);
    browserWindows.removeListener("activate", onActiveWindow);
    events.off(LAST_PB, onLastPbContextExited);
    simplePrefs.removeListener(`${ PREFS }File`, onPrefsChange);
    simplePrefs.removeListener(`${ PREFS }AccessKey`, onPrefsChange);
    simplePrefs.removeListener(`${ PREFS }EnablePB`, onPrefsChange);

    /* remove stored settings on uninstall */
    reason === "uninstall" && (
      delete simpleStorage.storage.withExEditor,
      delete simplePrefs.prefs[`${ PREFS }File`],
      delete simplePrefs.prefs[`${ PREFS }CmdArgs`],
      delete simplePrefs.prefs[`${ PREFS }AccessKey`],
      delete simplePrefs.prefs[`${ PREFS }EnablePB`],
      delete simplePrefs.prefs[`${ PREFS }ForceRemove`],
      removeDir(
        files.join(system.pathFor("PrefD"), "jetpack", self.id),
        true
      ).catch(logError)
    );
  };
}
