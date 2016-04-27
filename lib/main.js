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
  const { all } = require("sdk/core/promise");
  const { browserWindows } = require("sdk/windows");
  const { execFile } = require("sdk/system/child_process");
  const { isPrivate } = require("sdk/private-browsing");
  const { notify } = require("sdk/notifications");
  const contextMenu = require("sdk/context-menu");
  const events = require("sdk/system/events");
  const paths = require("sdk/fs/path");
  const self = require("sdk/self");
  const simplePrefs = require("sdk/simple-prefs");
  const simpleStorage = require("sdk/simple-storage");
  const system = require("sdk/system");
  const tabs = require("sdk/tabs");
  const urls = require("sdk/url");

  /* component utilities */
  const comUtils = require("./componentUtils");

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
  const WARN_COLOR = "#c13832";
  const INFO_MARK = "i";
  const INFO_COLOR = "#00539f";
  const PREF_ID = `${ (() => {
    const id = /^.+\.([^\.]+)$/.exec(paths.basename(system.pathFor("PrefD")));
    return id ? id[1] : LABEL;
  })() }`;

  /* variables */
  let prefsFile, prefsArgs, prefsKey, prefsPb, prefsRemove,
      storeId, tmpDir, isPb, isEnabled,
      editorName = "", editorPath = "",
      buttonIcon = ICON, hotKey, menuItem;

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
    path && (path = /^([^\.]+)(?:\..+)?$/.exec(paths.basename(path))) ?
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
   * @return {string} - file extension
   */
  const getFileExtension = (type = "text/plain") => {
    switch(true) {
      case /^(?:application|text)\/(?:(?:x-)?jav|ecm)ascript$/.test(type):
        type = "js";
        break;
      case /^application\/ld\+json$/.test(type):
        type = "jsonld";
        break;
      case /^application\/(?!ld\+)(?:[\w\.\-]+\+)?json$/.test(type):
        type = "json";
        break;
      case /^application\/mathml\+xml$/.test(type):
        type = "mml";
        break;
      case /^application\/xhtml\+xml$/.test(type):
        type = "xhtml";
        break;
      case /^(?:application\/(?!(?:math|xht)ml\+)(?:[\w\.\-]+\+)?|text\/)xml$/.test(type):
        type = "xml";
        break;
      case /^image\/svg\+xml$/.test(type):
        type = "svg";
        break;
      case /^text\/cache-manifest$/.test(type):
        type = "appcache";
        break;
      case /^text\/css$/.test(type):
        type = "css";
        break;
      case /^text\/csv$/.test(type):
        type = "csv";
        break;
      case /^text\/html$/.test(type):
        type = "html";
        break;
      case /^text\/markdown$/.test(type):
        type = "md";
        break;
      case /^text\/n3$/.test(type):
        type = "n3";
        break;
      case /^text\/turtle$/.test(type):
        type = "ttl";
        break;
      case /^text\/vcard$/.test(type):
        type = "vcf";
        break;
      default:
        type = "txt";
    }
    return `.${ type }`;
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
   * handle openFileWithApp() error
   * @param {Object} error - Error
   */
  const onOpenFileWithAppError = (error, ...args) => {
    error && (logError(error), notifyError(error));
  };

  /**
   * open file with application
   * @param {string} file - file path
   * @param {string} app - application path
   * @param {string} cmd - command line option
   * @param {Object} opt - option
   * @param {?Function} callback - callback
   * @return {Object} - Promise object, returns child process object on fulfill
   */
  const openFileWithApp = (file, app, cmd = "", opt = {}, callback = null) =>
    all([
      comUtils.fileIsFile(file),
      comUtils.fileIsExecutable(app)
    ]).then(arr => {
      let bool;
      for(let res of arr) {
        bool = res;
        if(!bool) {
          break;
        }
      }
      return bool && execFile(
        app,
        /\S+/.test(cmd) ?
          [file].concat(
            cmd.match(/"[^"]?(?:(?:[^"]|\\"[^"]?(?:[^"]*[^"\s])?\\")*[^"\s])?"|[^"\s]+/g)
          ) : [file],
        opt,
        callback
      );
    }).catch(logError);

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
  const setStoreId = store => {
    !store && (
      simpleStorage.storage.withExEditorTmpFiles = {},
      store = simpleStorage.storage.withExEditorTmpFiles
    );
    store[PREF_ID] = {
      tmpDir: tmpDir,
      tmpFiles: {},
      tmpFilesPb: {}
    };
    return store[PREF_ID];
  };

  /**
   * store data of the temporary file
   * @param {Object} store - store data
   * @param {string} dirName - directory name
   */
  const storeTmpFile = (store, dirName) => {
    const target = store && store.target;
    target && dirName && storeId && storeId[dirName] &&
      (storeId[dirName][target] = store);
  };

  /**
   * store editor settings
   * @param {Object} store - store data
   */
  const storeSettings = store => {
    store && (simpleStorage.storage.withExEditor = store);
  };

  /**
   * store pair of key / value
   * @param {string} key - key string
   * @param {string} value - value string
   */
  const storeKeyValue = (key, value = "") => {
    key && (simpleStorage.storage.withExEditor[key] = value);
  };

  /* get temporary file and sync contents value (or text) with edited text */
  /**
   * sync contents value of the target
   * @param {string} target - target ID
   * @param {string} value - value to sync
   * @param {?string} namespace - namespaceURI
   */
  const syncContentsValue = (target = "", value = "", namespace = null) => {
    tabs.activeTab.attach({
      contentScriptFile: CONTENT_JS,
      contentScriptOptions: {
        "target": target,
        "value": value,
        "namespace": namespace
      }
    });
  };

  /**
   * handle getTmpFile Response
   * @param {Object} res - Response object
   * @param {Object} file - temporary file data
   */
  const onTmpFileRes = (res, file) => {
    if(res && file) {
      const value = res.text || "";
      file.value = value;
      storeTmpFile(file, isPb ? TMP_DIR_PB : TMP_DIR);
      syncContentsValue(file.target, value, file.namespace || null);
    }
  };

  /**
   * get target file from temporary files
   * @param {string} target - target ID
   */
  const getTmpFile = target => {
    if(isEnabled && target) {
      const dirName = isPb ? TMP_DIR_PB : TMP_DIR;
      const file = storeId && storeId[dirName] && storeId[dirName][target];
      file &&
        createRequest(file.uri, file.type, "UTF-8", onTmpFileRes, file).get();
    }
  };

  /* create temporary file from contents and open with the external editor */
  /**
   * set parameters for openFileWithApp()
   * @param {string} path - file path
   */
  const setOpenFileWithAppParams = path => {
    if(isEnabled && path && editorPath) {
      const dirName = isPb ? TMP_DIR_PB : TMP_DIR;
      const target = getFileNameFromFilePath(path);
      storeId && storeId[dirName] && storeId[dirName][target] &&
        (storeId[dirName][target].uri = urls.fromFilename(path));
      openFileWithApp(
        path,
        editorPath,
        prefsArgs || "",
        system.env.DISPLAY ? { env: { DISPLAY: system.env.DISPLAY } } : {},
        onOpenFileWithAppError
      );
    }
  };

  /**
   * set temporary file
   * @param { object } res - data object
   */
  const setTmpFile = res => {
    if(isEnabled && res) {
      const dirName = isPb ? TMP_DIR_PB : TMP_DIR;
      storeTmpFile(res, dirName);
      comUtils.createFile(
        paths.join(tmpDir, dirName, res.fileName),
        res.value,
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
        type: type,
        value: res.text || ""
      });
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
    const uri = isEnabled && urls.isValidURI(url) && new urls.URL(url);
    uri && (
      uri.protocol === "file:" ?
        setOpenFileWithAppParams(urls.toFilename(url)) :
        createRequest(url, type, charset, onSourceRes).get()
    );
  };

  /**
   * get context mode
   * @param {string} res - JSON string
   */
  const getContextMode = (res = `{ "mode": "${ VIEW_SOURCE }" }`) => {
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
            value: value || "",
            namespace: res.namespace || null
          }) : getSource(url, type, charset);
        break;
      case VIEW_SELECTION:
        value ? (
          target = getFileNameFromURI(urls.URL(url).path, "index"),
          /^(?:(?:application\/(?:[\w\.\-]+\+)?|image\/[\w\.\-]+\+)x|text\/(?:ht|x))ml$/.test(type) ?
            setTmpFile({
              mode: VIEW_SELECTION,
              fileName: `${ target }.xml`,
              target: target,
              type: "application/xml",
              value: value
            }) :
            setTmpFile({
              mode: VIEW_SELECTION,
              fileName: target + getFileExtension(type),
              target: target,
              type: type,
              value: getNonDomValue(value)
            })
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
            value: value
          })
        ) : getSource(url, type, charset);
        break;
      default:
        getSource(url, type, charset);
    }
  };

  /* temporary directory settings */
  /**
   * create temporary directory
   * @return {Object} - Promise object, returns boolean on fulfill
   */
  const setTmpDir = () =>
    comUtils.createDir(paths.join(system.pathFor("TmpD"), LABEL)).then(path =>
      comUtils.createDir(paths.join(path, PREF_ID))
    ).then(path =>
      (tmpDir = path) && all([
        comUtils.createDir(paths.join(tmpDir, TMP_DIR)),
        comUtils.createDir(paths.join(tmpDir, TMP_DIR_PB))
      ])
    ).then(arr => {
      let bool = false;
      if(arr) {
        for(let res of arr) {
          bool = typeof res === "string" || res instanceof String;
          if(!bool) {
            tmpDir = null;
            break;
          }
        }
      }
      return bool;
    }).catch(logError);

  /* private browsing */
  /**
   * remove temporary files on last private browsing context exited
   * @param {Object} evt - event
   */
  const onLastPbContextExited = evt => {
    evt && evt.type && evt.type === LAST_PB && tmpDir && storeId && (
      comUtils.initDirPath(
        paths.join(tmpDir, TMP_DIR_PB),
        prefsRemove ? { ignorePermissions: true } : null,
        notifyError
      ),
      storeId.tmpFilesPb = {}
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
    switch(true) {
      case /^(?:View(?:MathML|S(?:ource|election))|EditText)$/.test(res):
        menuItem && (menuItem.label = _(res, editorName));
        break;
      case /^withExEditor[^\.].*/.test(res):
        getTmpFile(res);
        break;
      default:
        getContextMode(res);
    }
  };

  /**
   * set context menu item
   */
  const setContextMenuItem = () => {
    editorName && (
      menuItem = new contextMenu.Item({
        label: _(VIEW_SOURCE, editorName),
        image: self.data.url(`${ ICON }#gray`),
        context: contextMenu.PredicateContext(context =>
          isEnabled &&
            /^(?:application\/(?:(?:[\w\.\-]+\+)?(?:json|xml)|(?:(?:x-)?jav|ecm)ascript)|image\/[\w\.\-]+\+xml|text\/[\w\.\-]+)$/.test(context.documentType)
        ),
        contentScriptFile: MENU_JS,
        onMessage: onContextMenuMessage
      }),
      menuItem.accesskey = prefsKey ? prefsKey : null
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
      buttonIcon = res.toolbarButtonIcon,
      storeKeyValue("toolbarButtonIcon", buttonIcon),
      button.icon = buttonIcon
    );
  };

  /**
   * set UI
   * @param {Object} res - data object
   */
  const setUI = res => {
    res && (
      res.toolbarButtonIcon && changeIcon(res),
      res.editorName && (
        editorName = res.editorName,
        storeKeyValue("editorName", editorName)
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
      toolbarButtonIcon: buttonIcon,
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
  const setHotKey = () => {
    prefsKey ? hotKey = new Hotkey({
      combo: `accel-alt-${ prefsKey }`,
      onPress: togglePanel
    }) : hotKey && hotKey.destroy();
  };

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
   * @param {boolean} stored - settings are stored
   */
  const setToolbarButton = stored => {
    switch(true) {
      case !editorName:
        button.badge = WARN_MARK;
        button.badgeColor = WARN_COLOR;
        break;
      case !stored && editorName:
        button.badge = INFO_MARK;
        button.badgeColor = INFO_COLOR;
        break;
      default:
        button.badge = null;
        button.badgeColor = null;
    }
    setHotKey();
    button.label = setToolbarButtonLabel();
    button.on("click", showPanel);
  };

  /* on preferences change */
  /**
   * replace editor
   * @param {boolean} bool - file is executable
   */
  const replaceEditor = bool => {
    bool && prefsFile ? (
      editorPath = prefsFile,
      editorName = getFileNameFromFilePath(prefsFile)
    ) : (
      editorPath = "",
      editorName = "",
      menuItem = null,
      button.badge = WARN_MARK,
      button.badgeColor = WARN_COLOR
    );
    storeKeyValue("prefsFile", prefsFile);
    storeKeyValue("editorPath", editorPath);
    storeKeyValue("editorName", editorName);
    editorName && (
      button.badge = INFO_MARK,
      button.badgeColor = INFO_COLOR
    );
    showPanel();
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
        comUtils.fileIsExecutable(prefsFile).then(replaceEditor, logError);
        break;
      case `${ PREFS }CmdArgs`:
        prefsArgs = value;
        break;
      case `${ PREFS }AccessKey`:
        prefsKey = checkAccessKey(value);
        menuItem && (menuItem.accesskey = prefsKey ? prefsKey : null);
        setHotKey();
        button.label = setToolbarButtonLabel();
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
    /**
     * prepare to set items, add listeners
     * @param {boolean} ex - external editor is selected
     */
    const setItems = (ex = false) => {
      const stored = simpleStorage.storage.withExEditor || false;
      ex && prefsFile && (
        stored && storeKeyValue("prefsFile", prefsFile),
        editorPath = prefsFile,
        editorName = stored && stored.editorPath &&
                     stored.editorPath === stored.prefsFile &&
                     stored.editorName ?
                       stored.editorName :
                       getFileNameFromFilePath(prefsFile)
      );
      stored && stored.toolbarButtonIcon && (
        buttonIcon = stored.toolbarButtonIcon
      );
      storeSettings({
        prefsFile: prefsFile,
        editorName: editorName,
        editorPath: editorPath,
        toolbarButtonIcon: buttonIcon
      });
      simplePrefs.on(`${ PREFS }File`, onPrefsChange);
      simplePrefs.on(`${ PREFS }CmdArgs`, onPrefsChange);
      simplePrefs.on(`${ PREFS }EnvDisplay`, onPrefsChange);
      simplePrefs.on(`${ PREFS }AccessKey`, onPrefsChange);
      simplePrefs.on(`${ PREFS }EnablePB`, onPrefsChange);
      simplePrefs.on(`${ PREFS }ForceRemove`, onPrefsChange);
      browserWindows.on("activate", onActiveWindow);
      events.on(LAST_PB, onLastPbContextExited);
      simpleStorage.storage.withExEditorTmpFiles = {};
      simpleStorage.on(OVER_QUOTA, onStorageOverQuota);
      setTmpDir().then(bool => {
        bool ? (
          storeId = setStoreId(simpleStorage.storage.withExEditorTmpFiles),
          setToolbarButton(stored ? true : false),
          setContextMenuItem(),
          setPanel(),
          onActiveWindow(browserWindows.activeWindow)
        ) : logWarn(_("TmpDirError"));
      }).catch(logError);
    };

    /* load preferences settings */
    prefsFile = simplePrefs.prefs[`${ PREFS }File`] || "";
    prefsArgs = simplePrefs.prefs[`${ PREFS }CmdArgs`] || "";
    prefsKey = checkAccessKey(simplePrefs.prefs[`${ PREFS }AccessKey`]);
    prefsPb = simplePrefs.prefs[`${ PREFS }EnablePB`] || false;
    prefsRemove = simplePrefs.prefs[`${ PREFS }ForceRemove`] || false;
    prefsFile ?
      comUtils.fileIsExecutable(prefsFile).then(setItems, logError) :
      setItems(false);
  };

  exports.onUnload = reason => {
    /* remove temporary data */
    storeId && storeId.tmpDir && (
      comUtils.attemptRemoveDir(
        storeId.tmpDir,
        simplePrefs.prefs[`${ PREFS }ForceRemove`] ?
          { ignorePermissions: true } : null
      ),
      simpleStorage.storage.withExEditorTmpFiles[PREF_ID] = null
    );

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
    reason === "uninstall" && !simplePrefs.prefs[`${ PREFS }OnUninstall`] && (
      delete simpleStorage.storage.withExEditor,
      delete simpleStorage.storage.withExEditorTmpFiles,
      delete simplePrefs.prefs[`${ PREFS }File`],
      delete simplePrefs.prefs[`${ PREFS }CmdArgs`],
      delete simplePrefs.prefs[`${ PREFS }AccessKey`],
      delete simplePrefs.prefs[`${ PREFS }EnablePB`],
      delete simplePrefs.prefs[`${ PREFS }ForceRemove`],
      delete simplePrefs.prefs[`${ PREFS }OnUninstall`],
      comUtils.attemptRemoveDir(
        paths.join(system.pathFor("PrefD"), "jetpack", self.id)
      )
    );
  };
})();
