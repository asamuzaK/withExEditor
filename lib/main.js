/**
* main.js
*/
(() => {
  "use strict";
  /* sdk */
  const _ = require("sdk/l10n").get;
  const ActionButton = require("sdk/ui/button/action").ActionButton;
  const Panel = require("sdk/panel").Panel;
  const Request = require("sdk/request").Request;
  const all = require("sdk/core/promise").all;
  const browserWindows = require("sdk/windows").browserWindows;
  const contextMenu = require("sdk/context-menu");
  const events = require("sdk/system/events");
  const execFile = require("sdk/system/child_process").execFile;
  const isPrivate = require("sdk/private-browsing").isPrivate;
  const notify = require("sdk/notifications").notify;
  const self = require("sdk/self");
  const simplePrefs = require("sdk/simple-prefs");
  const simpleStorage = require("sdk/simple-storage");
  const tabs = require("sdk/tabs");
  const tmpDPath = require("sdk/system").pathFor("TmpD");
  const urls = require("sdk/url");

  /* component utilities */
  const componentUtils = require("./componentUtils");

  /* constants */
  const LABEL = "withExEditor";
  const VIEW_SOURCE = "ViewSource";
  const VIEW_MATHML = "ViewMathML";
  const VIEW_SELECTION = "ViewSelection";
  const EDIT_TEXT = "EditText";
  const CONTENT_SCRIPT_JS = "./js/contentScript.js";
  const CONTEXT_MENU_JS = "./js/contextMenu.js";
  const CONTROL_PANEL = "./html/controlPanel.html";
  const CONTROL_PANEL_JS = "./js/controlPanel.js";
  const ICON = "./img/icon.svg";
  const ICON_DISABLED = "./img/icon.svg#off";
  const ICON_GRAY = "./img/icon.svg#gray";
  const PREFS_APP_FILE = "WithExEditorPrefsFile";
  const PREFS_CMD_ARGS = "WithExEditorPrefsCmdArgs";
  const PREFS_ENV_DISPLAY = "WithExEditorPrefsEnvDisplay";
  const PREFS_ACCESS_KEY = "WithExEditorPrefsAccessKey";
  const PREFS_ENABLE_PB = "WithExEditorPrefsEnablePB";
  const PREFS_FORCE_REMOVE = "WithExEditorPrefsForceRemove";
  const PREFS_ON_DISABLE = "WithExEditorPrefsOnDisable";
  const TMP_FILES_DIR_NAME = "tmpFiles";
  const PB_TMP_FILES_DIR_NAME = "pbTmpFiles";
  const RECOMMEND_MIN_VERSION = "39.*";
  const PROCESS_ID = componentUtils.getProfName() || LABEL;

  /* variables */
  let prefsFile, prefsCmdArgs, prefsEnvDisplay,
      prefsAccessKey, prefsEnablePb, prefsForceRemove,
      storageId, tmpDir, isPb, isEnabled,
      editorName = "", editorPath = "",
      toolbarButton, toolbarButtonIcon = ICON,
      controlPanel, contextMenuItem;

  /* error handling */
  /**
  * log error, notify error
  * @param {Object} e - error object
  * @return {void}
  */
  const logError = e => {
    e && console.error(e);
    return;
  };
  const notifyError = e => {
    e && notify({
      title: `${ LABEL }: ${ _("Error") }`,
      text: e.toString()
    });
    return;
  };

  /**
  * log warning, notify warning
  * @param {string} m - error message
  * @return {void}
  */
  const logWarn = m => {
    m && console.warn(m);
    return;
  };
  const notifyWarn = m => {
    m && notify({
      title: `${ LABEL }: ${ _("Warn") }`,
      text: m
    });
    return;
  };

  /* file utilities */
  /**
  * get file name from URI path
  * @param {string} path - URI path
  * @param {string} value - fallback value
  * @return {string} - file name
  */
  const getFileNameFromUriPath = (path, value = LABEL) =>
    path && (
      path = /^.*\/((?:[\w\-~!\$&'\(\)\*\+,;=:@]|%[0-9A-F]{2})+)(?:(?:\.(?:[\w\-~!\$&'\(\)\*\+,;=:@]|%[0-9A-F]{2})+)*(?:\?(?:[\w\-\.~!\$&'\(\)\*\+,;=:@\/\?]|%[0-9A-F]{2})*)?(?:#(?:[\w\-\.~!\$&'\(\)\*\+,;=:@\/\?]|%[0-9A-F]{2})*)?)?$/.exec(path)
    ) ? path[1] : value;

  /**
  * get file extension from content type
  * @param {string} type - content type
  * @return {string} - file extension
  */
  const getFileExtension = type => {
    switch(true) {
      case /^(?:application\/(?:ecm|jav)|text\/(?:(?:x-)?jav|ecm))ascript$/.test(type):
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

  /* simpleStorage */
  /**
  * initialize stored temporary files data on storage over quota
  * @param {Object} evt - event
  */
  const onStorageOverQuota = evt => {
    let msg;
    evt && evt.type === "OverQuota" && storageId && (
      storageId[isPb ? PB_TMP_FILES_DIR_NAME : TMP_FILES_DIR_NAME] = {},
      simpleStorage.quotaUsage >= 0 && simpleStorage.quotaUsage < 1 ? (
        msg = _(`On${ evt.type }Warn`, simpleStorage.quotaUsage),
        logWarn(msg),
        notifyWarn(msg)
      ) : (
        msg = new Error(_(`On${ evt.type }Error`, LABEL)),
        logError(msg),
        notifyError(msg)
      )
    );
  };

  /**
  * store process ID temporary files
  * @param {Object} store - simpleStorage.storage.withExEditorTmpFiles
  * @return {Object} - simpleStorage.storage.withExEditorTmpFiles[PROCESS_ID]
  */
  const storeProcessIdTmpFiles = store => {
    !store && (
      simpleStorage.storage.withExEditorTmpFiles = {},
      store = simpleStorage.storage.withExEditorTmpFiles
    );
    store[PROCESS_ID] = {
      tmpDir: tmpDir,
      tmpFiles: {},
      pbTmpFiles: {}
    };
    return store[PROCESS_ID];
  };

  /**
  * store data of the temporary file
  * @param {Object} store - store data
  * @param {string} dirName - directory name
  * @return {void}
  */
  const storeTmpFile = (store, dirName) => {
    store && store.target && dirName && storageId && storageId[dirName] &&
      (storageId[dirName][store.target] = store);
    return;
  };

  /**
  * store editor settings
  * @param {Object} store - store data
  * @return {void}
  */
  const storeSettings = store => {
    store && (simpleStorage.storage.withExEditor = store);
    return;
  };

  /**
  * store pair of key / value
  * @param {string} key - key string
  * @param {string} value - value string
  * @return {void}
  */
  const storeKeyValue = (key, value = "") => {
    key && (simpleStorage.storage.withExEditor[key] = value);
    return;
  };

  /* get temporary file and sync contents value (or text) with edited text */
  /**
  * sync contents value of the target
  * @param {string} target - target ID
  * @param {string} value - value to sync
  * @param {?string} namespace - namespaceURI
  * @return {void}
  */
  const syncContentsValue = (target = "", value = "", namespace = null) => {
    tabs.activeTab.attach({
      contentScriptFile: CONTENT_SCRIPT_JS,
      contentScriptOptions: {
        "target": target,
        "value": value,
        "namespace": namespace
      }
    });
    return;
  };

  /**
  * get target file from temporary files
  * @param {string} target - target ID
  * @return {Object} - Response object
  */
  const getTmpFile = target => {
    let dirName, file;
    isEnabled && target && (
      dirName = isPb ? PB_TMP_FILES_DIR_NAME : TMP_FILES_DIR_NAME,
      storageId && storageId[dirName] && storageId[dirName][target] && (
        file = storageId[dirName][target],
        (new Request({
          url: file.fileURI,
          overrideMimeType: file.type,
          onComplete: res => {
            let value;
            res && (
              value = res.text || "",
              file.value = value,
              storeTmpFile(file, dirName),
              syncContentsValue(target, value, file.namespace || null)
            );
          }
        })).get()
      )
    );
  };

  /* create temporary file from contents and open with the external editor */
  /**
  * open file with application
  * @param {string} filePath - file path
  * @param {string} fileURI - file URI
  * @return {Object} - child process object
  */
  const openFileWithApp = (filePath, fileURI) => {
    let dirName, target;
    isEnabled && filePath && fileURI && (
      dirName = isPb ? PB_TMP_FILES_DIR_NAME : TMP_FILES_DIR_NAME,
      target = getFileNameFromUriPath(urls.URL(fileURI).path),
      storageId && storageId[dirName] && storageId[dirName][target] && (
        storageId[dirName][target].filePath = filePath,
        storageId[dirName][target].fileURI = fileURI
      ),
      editorPath !== "" && all([
        componentUtils.fileIsFile(filePath),
        componentUtils.fileIsExecutable(editorPath)
      ]).then(
        array => {
          let run;
          for(let i of array) {
            run = i;
            if(!run) {
              break;
            }
          }
          run && execFile(
            editorPath,
            /\S+/.test(prefsCmdArgs) ?
              [filePath].concat(prefsCmdArgs.match(/"[^"]?(?:(?:[^"]|\\"[^"]?(?:[^"]*[^"\s])?\\")*[^"\s])?"|[^"\s]+/g)) :
              [filePath],
            prefsEnvDisplay !== "" ?
              { env: { "DISPLAY": prefsEnvDisplay } } : {},
            (error, stdout, stderr) => {
              error && (logError(error), notifyError(error));
              return;
            }
          );
        }
      ).catch(logError)
    );
  };

  /**
  * set temporary file
  * @param { object } res - data object
  */
  const setTmpFile = res => {
    let dirName;
    isEnabled && res && (
      dirName = isPb ? PB_TMP_FILES_DIR_NAME : TMP_FILES_DIR_NAME,
      storeTmpFile(res, dirName),
      componentUtils.createFile(
        [tmpDir, dirName, res.fileName],
        res.value,
        openFileWithApp
      )
    );
  };

  /**
  * request file and get source
  * @param {string} url - file URL
  * @param {string} type - content type
  * @param {string} charset - character set
  * @return {Object|void} - Response object, or nothing if a local file
  */
  const getSource = (url = tabs.activeTab.url,
                     type = tabs.activeTab.contentType,
                     charset = "UTF-8") => {
    const requestFile = () => {
      (new Request({
        url: url,
        overrideMimeType: `${ type }; charset=${ charset }`,
        onComplete: res => {
          const target = getFileNameFromUriPath(urls.URL(url).path, "index");
          res && setTmpFile({
            mode: VIEW_SOURCE,
            fileName: target + getFileExtension(type),
            target: target,
            type: type,
            value: res.text || ""
          });
        }
      })).get();
    };
    if(isEnabled && urls.isValidURI(url)) {
      const fileURI = urls.URL(url);
      if(fileURI.protocol === "file:") {
        try {
          const filePath = urls.toFilename(url);
          filePath && (
            storeTmpFile(
              {
                mode: VIEW_SOURCE,
                target: getFileNameFromUriPath(fileURI.path, "index")
              },
              isPb ? PB_TMP_FILES_DIR_NAME : TMP_FILES_DIR_NAME
            ),
            openFileWithApp(filePath, fileURI.toString())
          );
        }
        catch(e) {
          requestFile();
        }
      }
      else {
        requestFile();
      }
    }
  };

  /**
  * get context mode
  * @param {string} res - JSON string
  */
  const getContextMode = (res = `{ "mode": ${ VIEW_SOURCE }}`) => {
    /**
    * get value for non DOM parsable contents
    * @param {string} val - value with HTML tags and HTML escaped characters
    * @return {string} - replaced value
    */
    const getNonDomValue = val => {
      while(/^\n*<(?:[^>]+:)?[^>]+?>|<\/(?:[^>]+:)?[^>]+>\n*$/.test(val)) {
        val = val.replace(/^\n*<(?:[^>]+:)?[^>]+?>/, "").
                  replace(/<\/(?:[^>]+:)?[^>]+>\n*$/, "\n");
      }
      return val.replace(/<\/(?:[^>]+:)?[^>]+>\n*<!\-\-[^\-]*\-\->\n*<(?:[^>]+:)?[^>]+>/g, "\n\n").
                 replace(/&lt;/g, "<").replace(/&gt;/g, ">").
                 replace(/&amp;/g, "&");
    };
    const tab = tabs.activeTab;
    const type = tab.contentType;
    const url = tab.url;
    let target;
    res = JSON.parse(res);
    switch(res.mode) {
      case EDIT_TEXT:
        target = res.target;
        target ? (
          setTmpFile({
            mode: EDIT_TEXT,
            fileName: `${ target }.txt`,
            target: target,
            type: "text/plain",
            value: res.value || "",
            namespace: res.namespace || null
          })
        ) : getSource(url, type);
        break;
      case VIEW_SELECTION:
        res.value ? (
          target = getFileNameFromUriPath(urls.URL(url).path, "index"),
          /^(?:(?:application\/(?:[\w\.\-]+\+)?|image\/[\w\.\-]+\+)x|text\/(?:ht|x))ml$/.test(type) ?
            setTmpFile({
              mode: VIEW_SELECTION,
              fileName: `${ target }.xml`,
              target: target,
              type: "application/xml",
              value: res.value
            }) :
            setTmpFile({
              mode: VIEW_SELECTION,
              fileName: target + getFileExtension(type),
              target: target,
              type: type,
              value: getNonDomValue(res.value)
            })
        ) : getSource(url, type);
        break;
      case VIEW_MATHML:
        res.value ? (
          target = getFileNameFromUriPath(urls.URL(url).path, "index"),
          setTmpFile({
            mode: VIEW_MATHML,
            fileName: `${ target }.mml`,
            target: target,
            type: "application/mathml+xml",
            value: res.value
          })
        ) : getSource(url, type);
        break;
      default:
        getSource(url, type, res.charset ? res.charset : "UTF-8");
    }
  };

  /* temporary files settings */
  /**
  * set process ID sub directory for usual and private browsing
  * @param {string} path - directory path
  * @return {void}
  */
  const setProcessIdSubDir = path => {
    path && (
      tmpDir = path,
      componentUtils.createDir([tmpDir, TMP_FILES_DIR_NAME]),
      componentUtils.createDir([tmpDir, PB_TMP_FILES_DIR_NAME]),
      storageId = storeProcessIdTmpFiles(simpleStorage.storage.withExEditorTmpFiles)
    );
    return;
  };

  /**
  * set process ID named directory in temporary directory
  * @param {string} path - directory path
  * @return {void}
  */
  const setProcessIdTmpDir = path => {
    path && componentUtils.createDir([path, PROCESS_ID], setProcessIdSubDir);
    return;
  };

  /* private browsing */
  /**
  * remove temporary files on last private browsing context existed
  * @param {Object} evt - event
  * @return {void}
  */
  const onLastPbContextExisted = evt => {
    evt && evt.type === "last-pb-context-exited" && tmpDir && storageId && (
      componentUtils.initDirPath(
        componentUtils.joinPath([tmpDir, PB_TMP_FILES_DIR_NAME]),
        prefsForceRemove ? { ignorePermissions: true } : null,
        notifyError
      ),
      storageId.pbTmpFiles = {}
    );
    return;
  };

  /**
  * set toolbar button icon on active window
  * @param {Object} win - window
  */
  const onActiveWindow = win => {
    isPb = isPrivate(win);
    isEnabled = !isPb || isPb && prefsEnablePb;
    toolbarButton && (
      isEnabled ? (
        toolbarButton.disabled = false,
        toolbarButton.icon = toolbarButtonIcon
      ) : (
        toolbarButton.disabled = true,
        toolbarButton.icon = ICON_DISABLED
      )
    );
  };

  /* UI components and settings */
  /**
  * set context menu item
  */
  const setContextMenuItem = () => {
    const Item = contextMenu.Item;
    contextMenuItem = new Item({
      label: _(VIEW_SOURCE, editorName),
      image: self.data.url(ICON_GRAY),
      context: contextMenu.PredicateContext(
        context =>
          isEnabled &&
            /^(?:application\/(?:(?:[\w\.\-]+\+)?(?:json|xml)|(?:ecm|jav)ascript)|image\/[\w\.\-]+\+xml|text\/[\w\.\-]+)$/.test(context.documentType)
      ),
      contentScriptFile: CONTEXT_MENU_JS,
      onMessage: res => {
        switch(true) {
          case /^(?:View(?:MathML|S(?:ource|election))|EditText)$/.test(res):
            contextMenuItem.label = _(res, editorName);
            break;
          case /^withExEditor[^\.].*/.test(res):
            getTmpFile(res);
            break;
          default:
            getContextMode(res);
        }
      }
    });
    prefsAccessKey !== "" && (contextMenuItem.accesskey = prefsAccessKey);
  };

  /**
  * toggle tab and activate (or open)
  * @param {string} href - URL
  */
  const toggleTab = href => {
    if(href) {
      let tab;
      for(let i of tabs) {
        if(i.url === href) {
          tab = i;
          break;
        }
      }
      tab ? tab.activate() : tabs.open(href);
      controlPanel && controlPanel.isShowing && controlPanel.hide();
    }
  };

  /**
  * change toolbar button icon
  * @param {Object} res - data object
  * @return {void}
  */
  const changeIcon = res => {
    res && (
      toolbarButtonIcon = res.toolbarButtonIcon,
      storeKeyValue("toolbarButtonIcon", toolbarButtonIcon),
      toolbarButton.icon = toolbarButtonIcon
    );
    return;
  };

  /**
  * set UI
  * @param {Object} res - data object
  * @return {void}
  */
  const setUI = res => {
    res && (
      res.toolbarButtonIcon && changeIcon(res),
      res.editorName && (
        editorName = res.editorName,
        storeKeyValue("editorName", editorName)
      ),
      editorName && editorPath && (
        contextMenuItem ?
          contextMenuItem.label = _(VIEW_SOURCE, editorName) :
          setContextMenuItem(),
        toolbarButton.badge && (
          toolbarButton.badge = null,
          toolbarButton.badgeColor = null
        )
      ),
      controlPanel && controlPanel.isShowing && controlPanel.hide()
    );
    return;
  };

  /**
  * set control panel
  */
  const setControlPanel = () => {
    controlPanel = new Panel({
      contentURL: CONTROL_PANEL,
      contentScriptFile: CONTROL_PANEL_JS,
      contentScriptWhen: "ready",
      position: toolbarButton,
      onHide: () => {
        setUI({
          editorName: editorName,
          toolbarButtonIcon: toolbarButtonIcon,
        });
      }
    });
    controlPanel.port.on("load", () => {
      controlPanel.port.emit("htmlValue", {
        currentEditorName: _("CurrentEditor"),
        editorLabel: _("EditorLabel"),
        lang: _("Lang"),
        submit: _("Submit"),
        /* back compatible localize attributes prior to Firefox 39 */
        compat: componentUtils.compareVersion(RECOMMEND_MIN_VERSION),
        iconColorLabel: _("IconColorLable.ariaLabel"),
        iconColorAlt: _("IconColor.alt"),
        iconGrayLabel: _("IconGrayLable.ariaLabel"),
        iconGrayAlt: _("IconGray.alt"),
        iconWhiteLabel: _("IconWhiteLable.ariaLabel"),
        iconWhiteAlt: _("IconWhite.alt"),
        currentEditorNameLabel: _("CurrentEditorName.ariaLabel")
      });
    });
    controlPanel.port.on("click", toggleTab);
    controlPanel.port.on("change", changeIcon);
    controlPanel.port.on("submit", setUI);
  };

  /**
  * show control panel
  * @return {void}
  */
  const showControlPanel = () => {
    controlPanel && (
      controlPanel.port.emit("editorValue", {
        editorName: editorName,
        currentEditorName: _("CurrentEditor"),
        toolbarButtonIcon: toolbarButtonIcon,
      }),
      !controlPanel.isShowing && controlPanel.show()
    );
    return;
  };

  /**
  * set toolbar button
  * @param {boolean} stored - settings are stored
  */
  const setToolbarButton = stored => {
    toolbarButton = new ActionButton({
      id: LABEL,
      label: LABEL,
      icon: toolbarButtonIcon,
      onClick: showControlPanel
    });
    switch(true) {
      case editorName === "":
        toolbarButton.badge = "!";
        toolbarButton.badgeColor = "#c13832";
        break;
      case !stored && editorName !== "":
        toolbarButton.badge = "i";
        toolbarButton.badgeColor = "#00539f";
        break;
      default:
        toolbarButton.badge = null;
        toolbarButton.badgeColor = null;
    }
    onActiveWindow(browserWindows.activeWindow);
  };

  /* on preferences change */
  /**
  * replace editor
  * @param {boolean} bool - file is executable
  */
  const replaceEditor = bool => {
    bool ? (
      editorPath = prefsFile ? prefsFile : "",
      editorName = prefsFile ?
        getFileNameFromUriPath(urls.URL(urls.fromFilename(editorPath)).path) : ""
    ) : (
      editorPath = "",
      editorName = "",
      contextMenuItem = null,
      toolbarButton && (
        toolbarButton.badge = "!",
        toolbarButton.badgeColor = "#c13832"
      )
    );
    storeKeyValue("prefsFile", prefsFile);
    storeKeyValue("editorPath", editorPath);
    storeKeyValue("editorName", editorName);
    editorName !== "" && toolbarButton && (
      toolbarButton.badge = "i",
      toolbarButton.badgeColor = "#00539f"
    );
    showControlPanel();
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
    switch(prefName) {
      case PREFS_APP_FILE:
        prefsFile = simplePrefs.prefs[prefName];
        componentUtils.fileIsExecutable(prefsFile).then(replaceEditor, logError);
        break;
      case PREFS_CMD_ARGS:
        prefsCmdArgs = simplePrefs.prefs[prefName];
        break;
      case PREFS_ENV_DISPLAY:
        prefsEnvDisplay = simplePrefs.prefs[prefName];
        break;
      case PREFS_ACCESS_KEY:
        prefsAccessKey = checkAccessKey(simplePrefs.prefs[prefName]);
        prefsAccessKey !== "" && contextMenuItem && (
          contextMenuItem.accesskey = prefsAccessKey
        );
        break;
      case PREFS_ENABLE_PB:
        prefsEnablePb = simplePrefs.prefs[prefName];
        onActiveWindow(browserWindows.activeWindow);
        break;
      case PREFS_FORCE_REMOVE:
        prefsForceRemove = simplePrefs.prefs[prefName];
        break;
      default:
    }
  };

  exports.main = (option, callback) => {
    /**
    * prepare to set items, add listeners
    * @param {boolean} bool - is all prepared
    */
    const setItems = bool => {
      const stored = simpleStorage.storage.withExEditor || false;
      bool && prefsFile && (
        stored && storeKeyValue("prefsFile", prefsFile),
        editorPath = prefsFile,
        editorName = stored && stored.editorPath &&
                     stored.editorPath === stored.prefsFile &&
                     stored.editorName ?
                       stored.editorName :
                       getFileNameFromUriPath(urls.URL(urls.fromFilename(prefsFile)).path)
      );
      stored && stored.toolbarButtonIcon && (
        toolbarButtonIcon = stored.toolbarButtonIcon
      );
      storeSettings({
        prefsFile: prefsFile,
        editorName: editorName,
        editorPath: editorPath,
        toolbarButtonIcon: toolbarButtonIcon
      });
      simplePrefs.on(PREFS_APP_FILE, onPrefsChange);
      simplePrefs.on(PREFS_CMD_ARGS, onPrefsChange);
      simplePrefs.on(PREFS_ENV_DISPLAY, onPrefsChange);
      simplePrefs.on(PREFS_ACCESS_KEY, onPrefsChange);
      simplePrefs.on(PREFS_ENABLE_PB, onPrefsChange);
      simplePrefs.on(PREFS_FORCE_REMOVE, onPrefsChange);
      browserWindows.on("activate", onActiveWindow);
      events.on("last-pb-context-exited", onLastPbContextExisted);
      simpleStorage.storage.withExEditorTmpFiles = {};
      simpleStorage.on("OverQuota", onStorageOverQuota);
      componentUtils.createDir([tmpDPath, LABEL], setProcessIdTmpDir);
      editorName !== "" && setContextMenuItem();
      setToolbarButton(stored ? true : false);
      setControlPanel();
    };
    /* load preferences settings */
    prefsFile = simplePrefs.prefs[PREFS_APP_FILE] || "";
    prefsCmdArgs = simplePrefs.prefs[PREFS_CMD_ARGS] || "";
    prefsEnvDisplay = simplePrefs.prefs[PREFS_ENV_DISPLAY] || "";
    prefsAccessKey = checkAccessKey(simplePrefs.prefs[PREFS_ACCESS_KEY]);
    prefsEnablePb = simplePrefs.prefs[PREFS_ENABLE_PB] || false;
    prefsForceRemove = simplePrefs.prefs[PREFS_FORCE_REMOVE] || false;
    prefsFile ?
      componentUtils.fileIsExecutable(prefsFile).then(setItems, logError) :
      setItems(false);
  };

  exports.onUnload = reason => {
    /* remove temporary data */
    storageId && storageId.tmpDir && (
      componentUtils.attemptRemoveDir(
        storageId.tmpDir,
        simplePrefs.prefs[PREFS_FORCE_REMOVE] ?
          { ignorePermissions: true } : null
      ),
      simpleStorage.storage.withExEditorTmpFiles[PROCESS_ID] = null
    );
    /* initialize all settings when add-on is disabled */
    reason === "disable" && simplePrefs.prefs[PREFS_ON_DISABLE] === true && (
      simpleStorage.storage.withExEditor && (
        simpleStorage.storage.withExEditor = null
      ),
      simpleStorage.storage.withExEditorTmpFiles && (
        simpleStorage.storage.withExEditorTmpFiles = null
      ),
      simplePrefs.prefs[PREFS_APP_FILE] && (
        simplePrefs.removeListener(PREFS_APP_FILE, onPrefsChange),
        simplePrefs.prefs[PREFS_APP_FILE] = ""
      ),
      simplePrefs.prefs[PREFS_CMD_ARGS] && (
        simplePrefs.removeListener(PREFS_CMD_ARGS, onPrefsChange),
        simplePrefs.prefs[PREFS_CMD_ARGS] = ""
      ),
      simplePrefs.prefs[PREFS_ENV_DISPLAY] && (
        simplePrefs.removeListener(PREFS_ENV_DISPLAY, onPrefsChange),
        simplePrefs.prefs[PREFS_ENV_DISPLAY] = ""
      ),
      simplePrefs.prefs[PREFS_ACCESS_KEY] && (
        simplePrefs.removeListener(PREFS_ACCESS_KEY, onPrefsChange),
        simplePrefs.prefs[PREFS_ACCESS_KEY] = "e"
      ),
      simplePrefs.prefs[PREFS_ENABLE_PB] && (
        simplePrefs.removeListener(PREFS_ENABLE_PB, onPrefsChange),
        simplePrefs.prefs[PREFS_ENABLE_PB] = false
      ),
      simplePrefs.prefs[PREFS_FORCE_REMOVE] && (
        simplePrefs.removeListener(PREFS_FORCE_REMOVE, onPrefsChange),
        simplePrefs.prefs[PREFS_FORCE_REMOVE] = false
      ),
      simplePrefs.prefs[PREFS_ON_DISABLE] = false,
      browserWindows.removeListener("activate", onActiveWindow),
      events.off("last-pb-context-exited", onLastPbContextExisted),
      simpleStorage.removeListener("OverQuota", onStorageOverQuota)
    );
  };
})();
