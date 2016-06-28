/**
 * index.js
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
  const OVER_QUOTA = "OverQuota";
  const TMP_DIR = "tmpFiles";
  const TMP_DIR_PB = "tmpFilesPb";
  const WARN_MARK = "!";
  const WARN_COLOR = "#C13832";

  /* preference */
  const prefs = simplePrefs.prefs;

  /* user settings storage */
  let storage = (
    simpleStorage.storage.withExEditor =
      simpleStorage.storage.withExEditor || {}
  );

  /* temporary files storage */
  const storageTmp = (
    simpleStorage.storage.withExEditorTmpFiles =
      simpleStorage.storage.withExEditorTmpFiles ||
      { tmpFiles: {}, tmpFilesPb: {} }
  );

  /* variables */
  let buttonIcon = ICON, editorName = "", editorPath = "", hotKey, tmpDir;

  /* error handling */
  /**
   * log error, notify error
   * @param {Object} e - Error
   * @return {boolean} - false
   */
  const logError = e => {
    e && console.error(e);
    return false;
  };
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
   * log warning, notify warning
   * @param {string} m - message
   * @return {boolean} - false
   */
  const logWarn = m => {
    m && console.warn(m);
    return false;
  };
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
   * store all settings
   * @param {Object} store - store data
   */
  const storeAll = promised(store => {
    store && (storage = store);
  });

  /**
   * store pair of key / value
   * @param {string} key - key string
   * @param {*} value - value to store
   */
  const storeKey = promised((key, value = "") => {
    key && (storage[key] = value);
  });

  /**
   * is private window
   * @return {boolean}
   */
  const isPv = () => isPrivate(browserWindows.activeWindow);

  /**
   * is enabled
   * @return {boolean}
   */
  const isEnabled = () => !isPv() || isPv() && prefs[`${ PREFS }EnablePB`];

  /**
   * is string
   * @return {boolean}
   */
  const isString = str => typeof str === "string" || str instanceof String;

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
    const file = /^.*\/((?:[\w\-~!\$&'\(\)\*\+,;=:@]|%[0-9A-F]{2})+)(?:(?:\.(?:[\w\-~!\$&'\(\)\*\+,;=:@]|%[0-9A-F]{2})+)*(?:\?(?:[\w\-\.~!\$&'\(\)\*\+,;=:@\/\?]|%[0-9A-F]{2})*)?(?:#(?:[\w\-\.~!\$&'\(\)\*\+,;=:@\/\?]|%[0-9A-F]{2})*)?)?$/.exec(path);
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
  const createDir = promised((path, mode = 0o777) => {
    !files.exists(path) && fs.mkdirSync(path, mode);
    return path;
  });

  /**
   * create a file
   * @param {string} path - file path
   * @param {string} value - values to write in the file
   * @param {?Function} callback - callback when the write completes
   * @param {(string|number)} mode - permission
   */
  const createFile = (path, value = "", callback = null, mode = 0o666) => {
    files.open(path, "w").writeAsync(value, e => {
      e ? logError(e) : (
        fs.chmodSync(path, mode),
        callback && callback(path)
      );
    });
  };

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
      url: url,
      overrideMimeType: `${ type }; charset=${ charset }`,
      onComplete: res => callback && callback(res, opt)
    });

  /* constructors */
  /**
   * access key constructor
   * @constructor
   */
  class AccessKey {
    /**
     * @param {string} key
     */
    constructor(key) {
      this._key = isString(key) && key.length === 1 ? key : "";
    }
    get key() {
      return this._key;
    }
    set key(key) {
      isString(key) && key.length === 1 && (this._key = key);
    }
  }

  /**
   * child process constructor
   * @constructor
   */
  class ChildProcess {
    /**
     * @param {Object} arg
     * @param {string} arg.app - application file path
     * @param {string} arg.cmd - command line option
     * @param {Object} arg.opt - environment variable options
     * @param {Function} arg.onTerminate - callback on terminate
     */
    constructor(arg = {}) {
      this.app = fileIsExecutable(arg.app) ? arg.app : "";
      this.cmd = isString(arg.cmd) ? arg.cmd : "";
      this.opt = arg.opt && (
                   arg.opt.cwd || arg.opt.stdio || arg.opt.env ||
                   arg.opt.encoding || arg.opt.timeout ||
                   arg.opt.maxBuffer || arg.opt.killSignal
                 ) && arg.opt;
      this.callback = typeof arg.onTerminate === "function" && arg.onTerminate;
    }
    /**
     * spawn process
     * @param {string} file - file path
     * @return {Object|boolean} - process or false
     */
    spawn(file) {
      return fileIsFile(file) && fileIsExecutable(this.app) &&
               execFile(
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
   * initialize stored temporary files data on storage over quota
   * @param {Object} evt - Event
   */
  const onStorageOverQuota = evt => {
    const type = evt && evt.type;
    let value;
    type === OVER_QUOTA && (
      storageTmp[isPv() ? TMP_DIR_PB : TMP_DIR] = {},
      value = simpleStorage.quotaUsage,
      value >= 0 && value < 1 ?
        notifyWarn(_(`On${ type }Warn`, value)) :
        notifyError(new Error(_(`On${ type }Error`, LABEL)))
    );
  };

  /**
   * remove temporary files on last private browsing context exited
   * @param {Object} evt - Event
   */
  const onLastPbContextExited = evt => {
    evt && evt.type && evt.type === LAST_PB && tmpDir && removeDir(
      files.join(tmpDir, TMP_DIR_PB),
      prefs[`${ PREFS }ForceRemove`]
    ).then(createDir).then(() => {
      storageTmp.tmpFilesPb = {};
    }).catch(notifyError);
  };

  /**
   * notify when process terminates with error
   * @param {Object} e - Error
   */
  const onProcessTerminate = (e, ...args) => {
    e && notifyError(e);
  };

  /* temporary file utilities */
  /**
   * handle temporary file Response
   * @param {Object} res - Response
   * @param {string} target - target ID
   */
  const onTmpFileRes = (res, target) => {
    const dir = isPv() ? TMP_DIR_PB : TMP_DIR;
    const file = target && storageTmp[dir] && storageTmp[dir][target];
    const path = file && file.path;
    res && file && path && (
      file.timestamp = (new fs.Stats(path)).mtime,
      tabs.activeTab.attach({
        contentScriptFile: CONTENT_JS,
        contentScriptOptions: {
          target: file.target,
          value: res.text,
          timestamp: file.timestamp,
          namespace: file.namespace
        }
      })
    );
  };

  /**
   * get target file from temporary files
   * @param {string} target - target ID
   */
  const getTmpFile = target => {
    const dir = isPv() ? TMP_DIR_PB : TMP_DIR;
    const file = target && storageTmp[dir] && storageTmp[dir][target];
    file &&
      createRequest(file.uri, file.type, "UTF-8", onTmpFileRes, target).get();
  };

  /**
   * spawn child process
   * @param {string} path - file path
   */
  const spawnProcess = path => {
    const dir = isPv() ? TMP_DIR_PB : TMP_DIR;
    const target = path && getFileNameFromFilePath(path);
    const file = target && storageTmp[dir] && storageTmp[dir][target];
    path && editorPath && (
      file && (
        file.path = path,
        file.uri = urls.fromFilename(path)
      ),
      !(new ChildProcess({
        app: editorPath,
        cmd: prefs[`${ PREFS }CmdArgs`],
        opt: system.env.DISPLAY && { env: { DISPLAY: system.env.DISPLAY } },
        onTerminate: onProcessTerminate
      })).spawn(path) && notifyWarn(_("FailSpawn"))
    );
  };

  /**
   * create temporary file
   * @param {Object} res - data
   * @param {string} value - value
   */
  const createTmpFile = (res = {}, value = "") => {
    const dir = isPv() ? TMP_DIR_PB : TMP_DIR;
    const target = res.target;
    const file = res.file;
    target && file && (
      storageTmp[dir] && (storageTmp[dir][target] = res),
      createFile(files.join(tmpDir, dir, file), value, spawnProcess)
    );
  };

  /**
   * handle getFileSource() Response
   * @param {Object} res - Response
   */
  const onSourceRes = (res, ...args) => {
    const tab = tabs.activeTab;
    const type = tab.contentType;
    const target = getFileNameFromURI((new urls.URL(tab.url)).path, "index");
    res && target && createTmpFile({
      mode: VIEW_SOURCE,
      file: target + getFileExtension(type),
      target: target,
      type: type
    }, res.text);
  };

  /**
   * get file source
   * @param {string} url - file URL
   * @param {string} type - content type
   * @param {string} charset - character set
   */
  const getSource = (url = tabs.activeTab.url,
                     type = tabs.activeTab.contentType,
                     charset = "UTF-8") => {
    const uri = urls.isValidURI(url) && new urls.URL(url);
    uri && (
      uri.protocol === "file:" ?
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
   */
  const switchByMode = (res = `{ "mode": "${ VIEW_SOURCE }" }`) => {
    const tab = tabs.activeTab;
    const type = tab.contentType;
    const url = tab.url;
    const obj = res && JSON.parse(res) || {};
    const charset = obj.charset;
    const value = obj.value;
    let target;
    switch (obj.mode) {
      case EDIT_TEXT:
        (target = obj.target) ?
          createTmpFile({
            mode: EDIT_TEXT,
            file: `${ target }.txt`,
            target: target,
            type: "text/plain",
            namespace: obj.namespace || ""
          }, value) : getSource(url, type, charset);
        break;
      case VIEW_SELECTION:
        value ? (
          target = getFileNameFromURI(urls.URL(url).path, "index"),
          /^(?:(?:application\/(?:[\w\-\.]+\+)?|image\/[\w\-\.]+\+)x|text\/(?:ht|x))ml$/.test(type) ?
            createTmpFile({
              mode: VIEW_SELECTION,
              file: `${ target }.xml`,
              target: target,
              type: "application/xml"
            }, value) :
            createTmpFile({
              mode: VIEW_SELECTION,
              file: target + getFileExtension(type),
              target: target,
              type: type
            }, convertValue(value))
        ) : getSource(url, type, charset);
        break;
      case VIEW_MATHML:
        value ? (
          target = getFileNameFromURI(urls.URL(url).path, "index"),
          createTmpFile({
            mode: VIEW_MATHML,
            file: `${ target }.mml`,
            target: target,
            type: "application/mathml+xml"
          }, value)
        ) : getSource(url, type, charset);
        break;
      default:
        getSource(url, type, charset);
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
    context: contextMenu.PredicateContext(context =>
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
      target ? target.activate() : tabs.open(url);
      panel.isShowing && panel.hide();
    }
  };

  /**
   * toggle toolbar button icon on active window
   * @param {Object} win - window
   */
  const onActiveWindow = win => {
    isEnabled() ? (
      button.disabled = false,
      button.icon = buttonIcon
    ) : (
      button.disabled = true,
      button.icon = `${ ICON }#off`
    );
  };

  /**
   * change toolbar button icon
   * @param {Object} res - data
   */
  const changeIcon = res => {
    res && (
      buttonIcon = res.buttonIcon,
      storeKey("buttonIcon", buttonIcon).catch(logError),
      button.icon = buttonIcon
    );
  };

  /**
   * set toolbar button label
   * @param {string} key
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
   * show panel
   */
  const showPanel = () => {
    panel.port.emit("editorValue", {
      editorName: editorName,
      currentEditorName: _("CurrentEditor"),
      buttonIcon: buttonIcon
    }),
    !panel.isShowing && panel.show();
  };

  /**
   * toggle panel
   */
  const togglePanel = () => {
    panel.isShowing ? panel.hide() : showPanel();
  };

  /**
   * set toolbar button
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
  };

  /**
   * set UI
   * @param {Object} res - data
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
      ),
      panel.isShowing && panel.hide()
    );
  };

  /**
   * update UI on panel hide
   */
  const onPanelHide = () => {
    setUI({
      editorName: editorName,
      buttonIcon: buttonIcon
    });
  };

  /**
   * set panel event
   */
  const setPanelEvent = () => {
    panel.port.on("load", () => {
      panel.port.emit("htmlValue", {
        currentEditorName: _("CurrentEditor"),
        editorLabel: _("EditorLabel"),
        lang: _("Lang"),
        submit: _("Submit")
      });
    });
    panel.port.on("click", toggleTab);
    panel.port.on("change", changeIcon);
    panel.port.on("submit", setUI);
    panel.port.on("hide",onPanelHide);
  };

  /* simplePrefs utilities */
  /**
   * replace editor
   * @param {string} path - editor path
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
    all([
      storeKey("editorPath", editorPath),
      storeKey("editorName", editorName)
    ]).then(showPanel).catch(logError);
  };

  /**
   * set hotKey
   * @param {string} key
   */
  const setHotKey = (key = accesskey.key) => {
    key ?
      hotKey = new Hotkey({
        combo: `accel-alt-${ key }`,
        onPress: togglePanel
      }) :
      hotKey && hotKey.destroy();
  };

  /**
   * switch on preferences change
   * @param {string} prefName - preference name
   */
  const onPrefsChange = (prefName = "") => {
    const value = prefName && prefs[prefName];
    switch (prefName) {
      case `${ PREFS }File`:
        replaceEditor(value);
        break;
      case `${ PREFS }AccessKey`:
        accesskey.key = value;
        setHotKey(accesskey.key);
        menu.accesskey = accesskey.key || null;
        button.label = setToolbarButtonLabel(accesskey.key);
        break;
      case `${ PREFS }EnablePB`:
        onActiveWindow(browserWindows.activeWindow);
    }
  };

  exports.main = (option, callback) => {
    let str = prefs[`${ PREFS }File`];

    /* set storage variables */
    fileIsExecutable(str) && (
      editorPath = str,
      editorName = storage.editorPath && editorPath === storage.editorPath &&
                   storage.editorName ?
                     storage.editorName :
                     getFileNameFromFilePath(editorPath)
    );
    storage.buttonIcon && (buttonIcon = storage.buttonIcon);

    /* set event listeners */
    simplePrefs.on(`${ PREFS }File`, onPrefsChange);
    simplePrefs.on(`${ PREFS }AccessKey`, onPrefsChange);
    simplePrefs.on(`${ PREFS }EnablePB`, onPrefsChange);
    browserWindows.on("activate", onActiveWindow);
    events.on(LAST_PB, onLastPbContextExited);
    simpleStorage.on(OVER_QUOTA, onStorageOverQuota);

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
        storeAll({
          editorName: editorName,
          editorPath: editorPath,
          buttonIcon: buttonIcon
        }),
        setHotKey(accesskey.key),
        setToolbarButton(),
        setPanelEvent()
      ])
    ).then(arr => {
      arr && onActiveWindow(browserWindows.activeWindow);
    }).catch(logError);
  };

  exports.onUnload = reason => {
    /* remove temporary data */
    removeDir(tmpDir, prefs[`${ PREFS }ForceRemove`]).catch(logError);
    delete simpleStorage.storage.withExEditorTmpFiles;

    /* remove event listeners */
    browserWindows.removeListener("activate", onActiveWindow);
    events.off(LAST_PB, onLastPbContextExited);
    simpleStorage.removeListener(OVER_QUOTA, onStorageOverQuota);
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
