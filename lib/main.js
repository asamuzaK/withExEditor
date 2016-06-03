/**
 * main.js
 */
(() => {
  "use strict";
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
  const PREF_ID = `${ (() => {
    const id = /^.+\.([^\.]+)$/.exec(files.basename(system.pathFor("PrefD")));
    return id ? id[1] : LABEL;
  })() }`;

  /* variables */
  let prefsFile, prefsArgs, prefsKey, prefsPb, prefsRemove,
      storeId, tmpDir, isPb, isEnabled, hotKey, menuItem,
      editorName = "", editorPath = "", buttonIcon = ICON;

  /* error handling */
  /**
   * log error, notify error
   * @param {Object} e - error object
   * @return {boolean} - false
   */
  const logError = e => {
    e && console.error(e);
    return false;
  };
  const notifyError = e => {
    e && notify({
      title: `${ LABEL }: ${ _("Error") }`,
      text: e.toString()
    });
    return false;
  };

  /**
   * log warning, notify warning
   * @param {string} m - error message
   * @return {boolean} - false
   */
  const logWarn = m => {
    m && console.warn(m);
    return false;
  };
  const notifyWarn = m => {
    m && notify({
      title: `${ LABEL }: ${ _("Warn") }`,
      text: m
    });
    return false;
  };

  /* file utilities */
  /**
   * get file name from native file path
   * @param {string} path - file path
   * @return {string} - file name
   */
  const getFileNameFromFilePath = path =>
    path && (path = /^([^\.]+)(?:\..+)?$/.exec(files.basename(path))) ?
      path[1] : LABEL;

  /**
   * get file name from URI path
   * @param {string} path - URI path
   * @param {string} value - fallback value
   * @return {string} - file name
   */
  const getFileNameFromURI = (path, value = LABEL) =>
    path && (
      path = /^.*\/((?:[\w\-~!\$&'\(\)\*\+,;=:@]|%[0-9A-F]{2})+)(?:(?:\.(?:[\w\-~!\$&'\(\)\*\+,;=:@]|%[0-9A-F]{2})+)*(?:\?(?:[\w\-\.~!\$&'\(\)\*\+,;=:@\/\?]|%[0-9A-F]{2})*)?(?:#(?:[\w\-\.~!\$&'\(\)\*\+,;=:@\/\?]|%[0-9A-F]{2})*)?)?$/.exec(path)
    ) ? path[1] : value;

  /**
   * get file extension from content type
   * @param {string} type - content type
   * @param {string} fallback - fallback extension type
   * @return {string} - file extension
   */
  const getFileExtension = (type = "text/plain", fallback = "txt") => {
    type = /^(application|image|text)\/([\w\-\.]+)(?:\+(json|xml))?$/.exec(type);
    if(type) {
      const mime = {
        type : type[1],
        subtype: type[2],
        suffix: type[3] ||
                type[1] === "application" && /^(?:json|xml)$/.test(type[2]) &&
                  type[2]
      };
      type = mime.suffix ? (
               fileExt[mime.type][mime.suffix][mime.subtype] ||
               fileExt[mime.type][mime.suffix][mime.suffix]
             ) : fileExt[mime.type][mime.subtype];
    }
    return `.${ type || fallback }`;
  };

  /**
   * determine the file is a file or not
   * @param {string} path - file path
   * @return {boolean}
   */
  const fileIsFile = path =>
    files.exists(path) && files.isFile(path);

  /**
   * determine the file is executable or not
   * @param {string} path - file path
   * @param {number} mask - mask bit
   * @return {boolean}
   */
  const fileIsExecutable = (path, mask = parseInt("0111", 8)) =>
    fileIsFile(path) && Boolean((new fs.Stats(path)).mode & mask);

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
   * @param {?Function} callback
   */
  const createFile = (path, value = "", callback = null) => {
    files.open(path, "w").writeAsync(value, e => {
      e ? logError(e) : (
        fs.chmodSync(path, 0o666),
        callback && callback(path)
      );
    });
  };

  /**
   * create Request object
   * @param {string} url - URL
   * @param {string} type - content type
   * @param {string} charset - character set
   * @param {?Function} callback - callback on complete
   * @param {?Object} opt - callback option
   * @return {Object} - Request object
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

  /**
   * open file with application
   * @param {string} file - file path
   * @param {string} app - application path
   * @param {string} cmd - command line option
   * @param {Object} opt - option
   * @param {?Function} callback - callback
   */
  const openFileWithApp = (file, app, cmd = "", opt = {}, callback = null) => {
    all([
      fileIsFile(file),
      fileIsExecutable(app)
    ]).then(arr => {
      let bool;
      for(let res of arr) {
        bool = res;
        if(!bool) {
          break;
        }
      }
      bool && execFile(
        app,
        /\S+/.test(cmd) ?
          [file].concat(
            cmd.match(/"[^"]?(?:(?:[^"]|\\"[^"]?(?:[^"]*[^"\s])?\\")*[^"\s])?"|[^"\s]+/g)
          ) : [file],
        opt,
        callback
      );
    }).catch(logError);
  };

  /* simpleStorage */
  /**
   * initialize stored temporary files data on storage over quota
   * @param {Object} evt - event
   */
  const onStorageOverQuota = evt => {
    const type = evt && evt.type;
    let value, msg;
    type === OVER_QUOTA && storeId && (
      storeId[isPb ? TMP_DIR_PB : TMP_DIR] = {},
      value = simpleStorage.quotaUsage,
      value >= 0 && value < 1 ? (
        msg = _(`On${ type }Warn`, value),
        logWarn(msg),
        notifyWarn(msg)
      ) : (
        msg = new Error(_(`On${ type }Error`, LABEL)),
        logError(msg),
        notifyError(msg)
      )
    );
  };

  /**
   * store preference ID temporary files data
   * @param {Object} store - simpleStorage.storage.withExEditorTmpFiles
   * @return {Object} - simpleStorage.storage.withExEditorTmpFiles[PREF_ID]
   */
  const setStoreId = promised(store => {
    !store && (store = simpleStorage.storage.withExEditorTmpFiles = {});
    store[PREF_ID] = {
      tmpFiles: {},
      tmpFilesPb: {}
    };
    return store[PREF_ID];
  });

  /**
   * store settings
   * @param {Object} store - store data
   */
  const storeSettings = promised(store => {
    store && (simpleStorage.storage.withExEditor = store);
  });

  /**
   * store pair of key / value
   * @param {string} key - key string
   * @param {*} value - value to store
   */
  const storeKeyValue = promised((key, value = "") => {
    key && (simpleStorage.storage.withExEditor[key] = value);
  });

  /* get temporary file and sync contents value (or text) with edited text */
  /**
   * sync contents value of the target
   * @param {string} value - value to sync
   * @param {Object} file - temporary file data
   */
  const syncContentsValue = (value = "", file = {}) => {
    tabs.activeTab.attach({
      contentScriptFile: CONTENT_JS,
      contentScriptOptions: {
        "target": file.target,
        "value": value,
        "timestamp": file.timestamp,
        "namespace": file.namespace
      }
    });
  };

  /**
   * handle getTmpFile Response
   * @param {Object} res - Response object
   * @param {string} target - target ID
   */
  const onTmpFileRes = (res, target) => {
    if(res && target) {
      const dirName = isPb ? TMP_DIR_PB : TMP_DIR;
      const file = storeId && storeId[dirName] && storeId[dirName][target];
      file && file.path && (
        file.timestamp = (new fs.Stats(file.path)).mtime,
        syncContentsValue(res.text, file)
      );
    }
  };

  /**
   * get target file from temporary files
   * @param {string} target - target ID
   */
  const getTmpFile = target => {
    if(target) {
      const dirName = isPb ? TMP_DIR_PB : TMP_DIR;
      const file = storeId && storeId[dirName] && storeId[dirName][target];
      file &&
        createRequest(file.uri, file.type, "UTF-8", onTmpFileRes, target).get();
    }
  };

  /* create temporary file from contents and open with the external editor */
  /**
   * set parameters for openFileWithApp()
   * @param {string} path - file path
   */
  const setOpenFileWithAppParams = path => {
    if(path && editorPath) {
      const dirName = isPb ? TMP_DIR_PB : TMP_DIR;
      const target = getFileNameFromFilePath(path);
      const file = storeId && storeId[dirName] && storeId[dirName][target];
      file && (
        file.path = path,
        file.uri = urls.fromFilename(path)
      );
      openFileWithApp(
        path,
        editorPath,
        prefsArgs,
        system.env.DISPLAY ? { env: { DISPLAY: system.env.DISPLAY } } : {},
        (e, ...args) => { e && (logError(e), notifyError(e)); }
      );
    }
  };

  /**
   * set temporary file
   * @param {Object} res - data object
   * @param {string} value - value
   */
  const setTmpFile = (res, value = "") => {
    if(res) {
      const dirName = isPb ? TMP_DIR_PB : TMP_DIR;
      const target = res.target;
      target && storeId && storeId[dirName] && (storeId[dirName][target] = res);
      createFile(
        files.join(tmpDir, dirName, res.fileName),
        value,
        setOpenFileWithAppParams
      );
    }
  };

  /**
   * handle getFileSource() Response
   * @param {Object} res - Response object
   */
  const onSourceRes = (res, ...args) => {
    if(res) {
      const tab = tabs.activeTab;
      const type = tab.contentType;
      const target = getFileNameFromURI((new urls.URL(tab.url)).path, "index");
      target && setTmpFile({
        mode: VIEW_SOURCE,
        fileName: target + getFileExtension(type),
        target: target,
        type: type
      }, res.text);
    }
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
        setOpenFileWithAppParams(urls.toFilename(url)) :
        createRequest(url, type, charset, onSourceRes).get()
    );
  };

  /**
   * get value for non DOM parsable contents
   * @param {string} v - value with HTML tags and HTML escaped characters
   * @return {string} - replaced value
   */
  const getNonDomValue = v => {
    while(/^\n*<(?:[^>]+:)?[^>]+?>|<\/(?:[^>]+:)?[^>]+>\n*$/.test(v)) {
      v = v.replace(/^\n*<(?:[^>]+:)?[^>]+?>/, "").
            replace(/<\/(?:[^>]+:)?[^>]+>\n*$/, "\n");
    }
    return v.replace(/<\/(?:[^>]+:)?[^>]+>\n*<!\-\-[^\-]*\-\->\n*<(?:[^>]+:)?[^>]+>/g, "\n\n").
             replace(/&lt;/g, "<").replace(/&gt;/g, ">").
             replace(/&amp;/g, "&");
  };

  /**
   * get context mode
   * @param {string} res - JSON string
   */
  const getContextMode = (res = `{ "mode": "${ VIEW_SOURCE }" }`) => {
    const tab = tabs.activeTab;
    const type = tab.contentType;
    const url = tab.url;
    let target, value, charset;
    (res = JSON.parse(res)) && (
      value = res.value,
      charset = res.charset
    );
    switch(res.mode) {
      case EDIT_TEXT:
        (target = res.target) ?
          setTmpFile({
            mode: EDIT_TEXT,
            fileName: `${ target }.txt`,
            target: target,
            type: "text/plain",
            namespace: res.namespace || null
          }, value) : getSource(url, type, charset);
        break;
      case VIEW_SELECTION:
        value ? (
          target = getFileNameFromURI(urls.URL(url).path, "index"),
          /^(?:(?:application\/(?:[\w\-\.]+\+)?|image\/[\w\-\.]+\+)x|text\/(?:ht|x))ml$/.test(type) ?
            setTmpFile({
              mode: VIEW_SELECTION,
              fileName: `${ target }.xml`,
              target: target,
              type: "application/xml"
            }, value) :
            setTmpFile({
              mode: VIEW_SELECTION,
              fileName: target + getFileExtension(type),
              target: target,
              type: type
            }, getNonDomValue(value))
        ) : getSource(url, type, charset);
        break;
      case VIEW_MATHML:
        value ? (
          target = getFileNameFromURI(urls.URL(url).path, "index"),
          setTmpFile({
            mode: VIEW_MATHML,
            fileName: `${ target }.mml`,
            target: target,
            type: "application/mathml+xml",
          }, value)
        ) : getSource(url, type, charset);
        break;
      default:
        getSource(url, type, charset);
    }
  };

  /* private browsing */
  /**
   * remove temporary files on last private browsing context exited
   * @param {Object} evt - event
   */
  const onLastPbContextExited = evt => {
    evt && evt.type && evt.type === LAST_PB && tmpDir && storeId && (
      removeDir(files.join(tmpDir, TMP_DIR_PB), prefsRemove).then(path =>
        createDir(path)
      ).then(() => {
        storeId.tmpFilesPb = {};
      }).catch(e => {
        notifyError(e);
        logError(e);
      })
    );
  };

  /* UI components and settings */
  /* create toolbar button */
  const button = new ActionButton({
    id: LABEL,
    label: LABEL,
    icon: `${ ICON }#off`,
    disabled: true,
  });

  /* create panel */
  const panel = new Panel({
    contentURL: PANEL,
    contentScriptFile: PANEL_JS,
    contentScriptWhen: "ready",
    position: button,
  });

  /**
   * set toolbar button icon on active window
   * @param {Object} win - window
   */
  const onActiveWindow = win => {
    isPb = isPrivate(win);
    isEnabled = tmpDir && (!isPb || isPb && prefsPb);
    isEnabled ? (
      button.disabled = false,
      button.icon = buttonIcon
    ) : (
      button.disabled = true,
      button.icon = `${ ICON }#off`
    );
  };

  /**
   * handle message from context menu
   * @param {string} res - message string
   */
  const onContextMenuMessage = res => {
    /^(?:View(?:MathML|S(?:ource|election))|EditText)$/.test(res) ?
      menuItem && (menuItem.label = _(res, editorName)) :
    /^withExEditor[^\.].*/.test(res) ?
      getTmpFile(res) : getContextMode(res);
  };

  /**
   * set context menu item
   */
  const setContextMenuItem = () => {
    editorName && contextMenu && (
      menuItem = new contextMenu.Item({
        label: _(VIEW_SOURCE, editorName),
        image: self.data.url(`${ ICON }#gray`),
        context: contextMenu.PredicateContext(context =>
          isEnabled &&
            /^(?:application\/(?:(?:[\w\-\.]+\+)?(?:json|xml)|(?:(?:x-)?jav|ecm)ascript)|image\/[\w\-\.]+\+xml|text\/[\w\-\.]+)$/.test(context.documentType)
        ),
        contentScriptFile: MENU_JS,
        data: nsURI,
        onMessage: onContextMenuMessage
      }),
      menuItem.accesskey = prefsKey || null
    );
  };

  /**
   * toggle tab and activate (or open)
   * @param {string} href - URL
   */
  const toggleTab = href => {
    if(href) {
      let target;
      for(let tab of tabs) {
        if(tab.url === href) {
          target = tab;
          break;
        }
      }
      target ? target.activate() : tabs.open(href);
      panel.isShowing && panel.hide();
    }
  };

  /**
   * change toolbar button icon
   * @param {Object} res - data object
   */
  const changeIcon = res => {
    res && (
      buttonIcon = res.buttonIcon,
      storeKeyValue("toolbarButtonIcon", buttonIcon).catch(logError),
      button.icon = buttonIcon
    );
  };

  /**
   * set UI
   * @param {Object} res - data object
   */
  const setUI = res => {
    res && (
      res.buttonIcon && changeIcon(res),
      res.editorName && (
        editorName = res.editorName,
        storeKeyValue("editorName", editorName).catch(logError)
      ),
      editorName && editorPath && (
        menuItem ?
          menuItem.label = _(VIEW_SOURCE, editorName) : setContextMenuItem(),
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
      buttonIcon: buttonIcon,
    });
  };

  /**
   * set panel
   */
  const setPanel = () => {
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

  /**
   * show panel
   */
  const showPanel = () => {
    panel.port.emit("editorValue", {
      editorName: editorName,
      currentEditorName: _("CurrentEditor"),
      toolbarButtonIcon: buttonIcon,
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
   * set hot key
   */
  const setHotKey = promised(() => {
    prefsKey ?
      hotKey = new Hotkey({
        combo: `accel-alt-${ prefsKey }`,
        onPress: togglePanel
      }) :
      hotKey && hotKey.destroy();
  });

  /**
   * set toolbar button label
   * @return {string} - label
   */
  const setToolbarButtonLabel = () => {
    const isOSX = /Darwin/i.test(system.platform);
    const accel = isOSX ? "Cmd" : "Ctrl";
    const alt = isOSX ? "Opt" : "Alt";
    return prefsKey ?
      `${ LABEL } (${ accel }+${ alt }+${ prefsKey.toUpperCase() })` : LABEL;
  };

  /**
   * set toolbar button
   */
  const setToolbarButton = () => {
    !editorName ? (
      button.badge = WARN_MARK,
      button.badgeColor = WARN_COLOR
    ) : (
      button.badge = null,
      button.badgeColor = null
    );
    setHotKey().then(() => {
      button.label = setToolbarButtonLabel();
      button.on("click", showPanel);
    }).catch(logError);
  };

  /* on preferences change */
  /**
   * replace editor
   * @param {boolean} ex - file is executable
   */
  const replaceEditor = ex => {
    ex && prefsFile ? (
      editorPath = prefsFile,
      editorName = getFileNameFromFilePath(prefsFile),
      editorName && (
        button.badge = null,
        button.badgeColor = null
      )
    ) : (
      editorPath = "",
      editorName = "",
      menuItem = null,
      button.badge = WARN_MARK,
      button.badgeColor = WARN_COLOR
    );
    all([
      storeKeyValue("prefsFile", prefsFile),
      storeKeyValue("editorPath", editorPath),
      storeKeyValue("editorName", editorName)
    ]).then(showPanel).catch(logError);
  };

  /**
   * check and set access key
   * @param {string} k - key
   * @return {string} - a single character or empty string
   */
  const checkAccessKey = k =>
    k && k.length === 1 ? k : "";

  /**
   * switch on preferences change
   * @param {string} prefName - preference name
   */
  const onPrefsChange = (prefName = "") => {
    const value = simplePrefs.prefs[prefName];
    switch(prefName) {
      case `${ PREFS }File`:
        prefsFile = value;
        replaceEditor(fileIsExecutable(prefsFile));
        break;
      case `${ PREFS }CmdArgs`:
        prefsArgs = value;
        break;
      case `${ PREFS }AccessKey`:
        prefsKey = checkAccessKey(value);
        menuItem && (menuItem.accesskey = prefsKey || null);
        setHotKey().then(() => {
          button.label = setToolbarButtonLabel();
        }).catch(logError);
        break;
      case `${ PREFS }EnablePB`:
        prefsPb = value;
        onActiveWindow(browserWindows.activeWindow);
        break;
      case `${ PREFS }ForceRemove`:
        prefsRemove = value;
        break;
      default:
    }
  };

  exports.main = (option, callback) => {
    const store = simpleStorage.storage.withExEditor;

    /* set preferences variables */
    prefsFile = simplePrefs.prefs[`${ PREFS }File`] || "";
    prefsArgs = simplePrefs.prefs[`${ PREFS }CmdArgs`] || "";
    prefsKey = checkAccessKey(simplePrefs.prefs[`${ PREFS }AccessKey`]);
    prefsPb = simplePrefs.prefs[`${ PREFS }EnablePB`] || false;
    prefsRemove = simplePrefs.prefs[`${ PREFS }ForceRemove`] || false;

    /* set storage variables */
    prefsFile && fileIsExecutable(prefsFile) && (
      store && storeKeyValue("prefsFile", prefsFile).catch(logError),
      editorPath = prefsFile,
      editorName = store && store.editorPath &&
                   store.editorPath === store.prefsFile &&
                   store.editorName ?
                     store.editorName :
                     getFileNameFromFilePath(prefsFile)
    );
    store && store.toolbarButtonIcon && (buttonIcon = store.toolbarButtonIcon);

    /* set event listeners */
    simplePrefs.on(`${ PREFS }File`, onPrefsChange);
    simplePrefs.on(`${ PREFS }CmdArgs`, onPrefsChange);
    simplePrefs.on(`${ PREFS }EnvDisplay`, onPrefsChange);
    simplePrefs.on(`${ PREFS }AccessKey`, onPrefsChange);
    simplePrefs.on(`${ PREFS }EnablePB`, onPrefsChange);
    simplePrefs.on(`${ PREFS }ForceRemove`, onPrefsChange);
    browserWindows.on("activate", onActiveWindow);
    events.on(LAST_PB, onLastPbContextExited);
    simpleStorage.on(OVER_QUOTA, onStorageOverQuota);

    /* set temporary directories and set items */
    setStoreId(simpleStorage.storage.withExEditorTmpFiles).then(data => {
      storeId = data;
    }).then(() =>
      createDir(files.join(system.pathFor("TmpD"), LABEL, PREF_ID))
    ).then(path =>
      (tmpDir = path) && all([
        createDir(files.join(tmpDir, TMP_DIR)),
        createDir(files.join(tmpDir, TMP_DIR_PB)),
        storeSettings({
          prefsFile: prefsFile,
          editorName: editorName,
          editorPath: editorPath,
          toolbarButtonIcon: buttonIcon
        }),
        setToolbarButton(),
        setContextMenuItem(),
        setPanel()
      ])
    ).then(arr => {
      arr && onActiveWindow(browserWindows.activeWindow);
    }).catch(logError);
  };

  exports.onUnload = reason => {
    /* remove temporary data */
    removeDir(tmpDir, prefsRemove).catch(logError);
    delete simpleStorage.storage.withExEditorTmpFiles[PREF_ID];

    /* remove event listeners */
    browserWindows.removeListener("activate", onActiveWindow);
    events.off(LAST_PB, onLastPbContextExited);
    simpleStorage.removeListener(OVER_QUOTA, onStorageOverQuota);
    simplePrefs.removeListener(`${ PREFS }File`, onPrefsChange);
    simplePrefs.removeListener(`${ PREFS }CmdArgs`, onPrefsChange);
    simplePrefs.removeListener(`${ PREFS }AccessKey`, onPrefsChange);
    simplePrefs.removeListener(`${ PREFS }EnablePB`, onPrefsChange);
    simplePrefs.removeListener(`${ PREFS }ForceRemove`, onPrefsChange);

    /* remove stored settings on uninstall */
    reason === "uninstall" && (
      delete simpleStorage.storage.withExEditor,
      delete simpleStorage.storage.withExEditorTmpFiles,
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
})();
