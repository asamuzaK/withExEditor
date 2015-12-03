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
  const PREF_ID = (() => {
    const id = /^.+\.([^\.]+)$/.exec(paths.basename(system.pathFor("PrefD")));
    return id ? id[1] : LABEL;
  })();

  /* variables */
  let prefsFile, prefsArgs, prefsDisp, prefsKey, prefsPb, prefsRemove,
      storageId, tmpDir, isPb, isEnabled, editorName = "", editorPath = "",
      button, buttonIcon = ICON, hotKey, panel, menuItem;

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
  const getFileExtension = (type = "text/plain") => {
    switch(true) {
      case /^(?:application\/(?:(?:x-)?jav|ecm)|text\/(?:(?:x-)?jav|ecm))ascript$/.test(type):
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
    const type = evt && evt.type;
    let value, msg;
    type === OVER_QUOTA && storageId && (
      storageId[isPb ? TMP_DIR_PB : TMP_DIR] = {},
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
   * store preference ID temporary files
   * @param {Object} store - simpleStorage.storage.withExEditorTmpFiles
   * @return {Object} - simpleStorage.storage.withExEditorTmpFiles[PREF_ID]
   */
  const storePrefIdTmpFiles = store => {
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
    target && dirName && storageId && storageId[dirName] &&
      (storageId[dirName][target] = store);
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
      contentScriptFile: CONTENT_JS,
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
      dirName = isPb ? TMP_DIR_PB : TMP_DIR,
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
   * @param {string} path - file path
   * @param {string} uri - file URI
   * @return {Object} - child process object
   */
  const openFileWithApp = (path, uri) => {
    let dirName, target;
    isEnabled && path && uri && (
      dirName = isPb ? TMP_DIR_PB : TMP_DIR,
      target = getFileNameFromUriPath(urls.URL(uri).path),
      storageId && storageId[dirName] && storageId[dirName][target] && (
        storageId[dirName][target].filePath = path,
        storageId[dirName][target].fileURI = uri
      ),
      editorPath !== "" && all([
        comUtils.fileIsFile(path),
        comUtils.fileIsExecutable(editorPath)
      ]).then(
        arr => {
          let run;
          for(let bool of arr) {
            run = bool;
            if(!run) {
              break;
            }
          }
          run && execFile(
            editorPath,
            /\S+/.test(prefsArgs) ?
              [path].concat(prefsArgs.match(/"[^"]?(?:(?:[^"]|\\"[^"]?(?:[^"]*[^"\s])?\\")*[^"\s])?"|[^"\s]+/g)) :
              [path],
            prefsDisp !== "" ?
              { env: { DISPLAY: prefsDisp } } : {},
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
      dirName = isPb ? TMP_DIR_PB : TMP_DIR,
      storeTmpFile(res, dirName),
      comUtils.createFile(
        paths.join(tmpDir, dirName, res.fileName),
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
      const uri = urls.URL(url);
      if(uri.protocol === "file:") {
        try {
          const path = urls.toFilename(url);
          path && (
            storeTmpFile(
              {
                mode: VIEW_SOURCE,
                target: getFileNameFromUriPath(uri.path, "index")
              },
              isPb ? TMP_DIR_PB : TMP_DIR
            ),
            openFileWithApp(path, uri.toString())
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
    res = JSON.parse(res);
    res && (
      value = res.value,
      charset = res.charset
    );
    switch(res.mode) {
      case EDIT_TEXT:
        target = res.target;
        target ? (
          setTmpFile({
            mode: EDIT_TEXT,
            fileName: `${ target }.txt`,
            target: target,
            type: "text/plain",
            value: value || "",
            namespace: res.namespace || null
          })
        ) : getSource(url, type, charset);
        break;
      case VIEW_SELECTION:
        value ? (
          target = getFileNameFromUriPath(urls.URL(url).path, "index"),
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
          target = getFileNameFromUriPath(urls.URL(url).path, "index"),
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

  /* temporary files settings */
  /**
   * set preference ID sub directory for usual and private browsing
   * @param {string} path - directory path
   * @return {void}
   */
  const setPrefIdSubDir = path => {
    path && (
      tmpDir = path,
      comUtils.createDir(paths.join(tmpDir, TMP_DIR)),
      comUtils.createDir(paths.join(tmpDir, TMP_DIR_PB)),
      storageId = storePrefIdTmpFiles(simpleStorage.storage.withExEditorTmpFiles)
    );
    return;
  };

  /**
   * set process ID named directory in temporary directory
   * @param {string} path - directory path
   * @return {void}
   */
  const setProcessIdTmpDir = path => {
    path &&
      comUtils.createDir(paths.join(path, PREF_ID), setPrefIdSubDir);
    return;
  };

  /* private browsing */
  /**
   * remove temporary files on last private browsing context existed
   * @param {Object} evt - event
   * @return {void}
   */
  const onLastPbContextExisted = evt => {
    evt && evt.type && evt.type === LAST_PB && tmpDir &&
      storageId && (
        comUtils.initDirPath(
          paths.join(tmpDir, TMP_DIR_PB),
          prefsRemove ? { ignorePermissions: true } : null,
          notifyError
        ),
        storageId.tmpFilesPb = {}
      );
    return;
  };

  /**
   * set toolbar button icon on active window
   * @param {Object} win - window
   */
  const onActiveWindow = win => {
    isPb = isPrivate(win);
    isEnabled = !isPb || isPb && prefsPb;
    button && (
      isEnabled ? (
        button.disabled = false,
        button.icon = buttonIcon
      ) : (
        button.disabled = true,
        button.icon = `${ ICON }#off`
      )
    );
  };

  /* UI components and settings */
  /**
   * set context menu item
   */
  const setContextMenuItem = () => {
    menuItem = new contextMenu.Item({
      label: _(VIEW_SOURCE, editorName),
      image: self.data.url(`${ ICON }#gray`),
      context: contextMenu.PredicateContext(
        context =>
          isEnabled &&
            /^(?:application\/(?:(?:[\w\.\-]+\+)?(?:json|xml)|(?:(?:x-)?jav|ecm)ascript)|image\/[\w\.\-]+\+xml|text\/[\w\.\-]+)$/.test(context.documentType)
      ),
      contentScriptFile: MENU_JS,
      onMessage: res => {
        switch(true) {
          case /^(?:View(?:MathML|S(?:ource|election))|EditText)$/.test(res):
            menuItem.label = _(res, editorName);
            break;
          case /^withExEditor[^\.].*/.test(res):
            getTmpFile(res);
            break;
          default:
            getContextMode(res);
        }
      }
    });
    prefsKey !== "" && (menuItem.accesskey = prefsKey);
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
      panel && panel.isShowing && panel.hide();
    }
  };

  /**
   * change toolbar button icon
   * @param {Object} res - data object
   * @return {void}
   */
  const changeIcon = res => {
    res && (
      buttonIcon = res.toolbarButtonIcon,
      storeKeyValue("toolbarButtonIcon", buttonIcon),
      button.icon = buttonIcon
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
        menuItem ?
          menuItem.label = _(VIEW_SOURCE, editorName) :
          setContextMenuItem(),
        button.badge && (
          button.badge = null,
          button.badgeColor = null
        )
      ),
      panel && panel.isShowing && panel.hide()
    );
    return;
  };

  /**
   * set panel
   */
  const setPanel = () => {
    panel = new Panel({
      contentURL: PANEL,
      contentScriptFile: PANEL_JS,
      contentScriptWhen: "ready",
      position: button,
      onHide: () => {
        setUI({
          editorName: editorName,
          toolbarButtonIcon: buttonIcon,
        });
      }
    });
    panel.port.on("load", () => {
      panel.port.emit("htmlValue", {
        currentEditorName: _("CurrentEditor"),
        editorLabel: _("EditorLabel"),
        lang: _("Lang"),
        submit: _("Submit"),
        /* back compatible localize attributes prior to Firefox 39 */
        compat: comUtils.compareVersion("39.*"),
        iconColorLabel: _("IconColorLable.ariaLabel"),
        iconColorAlt: _("IconColor.alt"),
        iconGrayLabel: _("IconGrayLable.ariaLabel"),
        iconGrayAlt: _("IconGray.alt"),
        iconWhiteLabel: _("IconWhiteLable.ariaLabel"),
        iconWhiteAlt: _("IconWhite.alt"),
        currentEditorNameLabel: _("CurrentEditorName.ariaLabel")
      });
    });
    panel.port.on("click", toggleTab);
    panel.port.on("change", changeIcon);
    panel.port.on("submit", setUI);
  };

  /**
   * show panel
   * @return {void}
   */
  const showPanel = () => {
    panel && (
      panel.port.emit("editorValue", {
        editorName: editorName,
        currentEditorName: _("CurrentEditor"),
        toolbarButtonIcon: buttonIcon,
      }),
      !panel.isShowing && panel.show()
    );
    return;
  };

  /**
   * set hot key
   * @return {void}
   */
  const setHotKey = () => {
    prefsKey && (
      hotKey = new Hotkey({
        combo: `accel-alt-${ prefsKey }`,
        onPress: () => {
          panel && panel.isShowing ?
            panel.hide() : showPanel();
          return;
        }
      })
    );
    return;
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
      `${ LABEL } (${ accel }+${ alt }+${ prefsKey.toUpperCase() })` :
      LABEL;
  };

  /**
   * set toolbar button
   * @param {boolean} stored - settings are stored
   */
  const setToolbarButton = stored => {
    button = new ActionButton({
      id: LABEL,
      label: setToolbarButtonLabel(),
      icon: buttonIcon,
      onClick: showPanel
    });
    switch(true) {
      case editorName === "":
        button.badge = WARN_MARK;
        button.badgeColor = WARN_COLOR;
        break;
      case !stored && editorName !== "":
        button.badge = INFO_MARK;
        button.badgeColor = INFO_COLOR;
        break;
      default:
        button.badge = null;
        button.badgeColor = null;
    }
    setHotKey();
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
      menuItem = null,
      button && (
        button.badge = WARN_MARK,
        button.badgeColor = WARN_COLOR
      )
    );
    storeKeyValue("prefsFile", prefsFile);
    storeKeyValue("editorPath", editorPath);
    storeKeyValue("editorName", editorName);
    editorName !== "" && button && (
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
      case `${ PREFS }EnvDisplay`:
        prefsDisp = value;
        break;
      case `${ PREFS }AccessKey`:
        prefsKey = checkAccessKey(value);
        prefsKey !== "" && (
          menuItem && (menuItem.accesskey = prefsKey),
          button && (
            setHotKey(),
            button.label = setToolbarButtonLabel()
          )
        );
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
     * @param {boolean} bool - is all prepared
     */
    const setItems = (bool = false) => {
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
      events.on(LAST_PB, onLastPbContextExisted);
      simpleStorage.storage.withExEditorTmpFiles = {};
      simpleStorage.on(OVER_QUOTA, onStorageOverQuota);
      comUtils.createDir(paths.join(system.pathFor("TmpD"), LABEL), setProcessIdTmpDir);
      editorName !== "" && setContextMenuItem();
      setToolbarButton(stored ? true : false);
      setPanel();
    };

    /* load preferences settings */
    prefsFile = simplePrefs.prefs[`${ PREFS }File`] || "";
    prefsArgs = simplePrefs.prefs[`${ PREFS }CmdArgs`] || "";
    prefsDisp = simplePrefs.prefs[`${ PREFS }EnvDisplay`] || "";
    prefsKey = checkAccessKey(simplePrefs.prefs[`${ PREFS }AccessKey`]);
    prefsPb = simplePrefs.prefs[`${ PREFS }EnablePB`] || false;
    prefsRemove = simplePrefs.prefs[`${ PREFS }ForceRemove`] || false;
    prefsFile ?
      comUtils.fileIsExecutable(prefsFile).then(setItems, logError) :
      setItems(false);
  };

  exports.onUnload = reason => {
    /* remove temporary data */
    storageId && storageId.tmpDir && (
      comUtils.attemptRemoveDir(
        storageId.tmpDir,
        simplePrefs.prefs[`${ PREFS }ForceRemove`] ?
          { ignorePermissions: true } : null
      ),
      simpleStorage.storage.withExEditorTmpFiles[PREF_ID] = null
    );
    /* initialize all settings when add-on is disabled */
    reason === "disable" && simplePrefs.prefs[`${ PREFS }OnDisable`] === true && (
      simpleStorage.storage.withExEditor && (
        simpleStorage.storage.withExEditor = null
      ),
      simpleStorage.storage.withExEditorTmpFiles && (
        simpleStorage.storage.withExEditorTmpFiles = null
      ),
      simplePrefs.prefs[`${ PREFS }File`] && (
        simplePrefs.removeListener(`${ PREFS }File`, onPrefsChange),
        simplePrefs.prefs[`${ PREFS }File`] = ""
      ),
      simplePrefs.prefs[`${ PREFS }CmdArgs`] && (
        simplePrefs.removeListener(`${ PREFS }CmdArgs`, onPrefsChange),
        simplePrefs.prefs[`${ PREFS }CmdArgs`] = ""
      ),
      simplePrefs.prefs[`${ PREFS }EnvDisplay`] && (
        simplePrefs.removeListener(`${ PREFS }EnvDisplay`, onPrefsChange),
        simplePrefs.prefs[`${ PREFS }EnvDisplay`] = ""
      ),
      simplePrefs.prefs[`${ PREFS }AccessKey`] && (
        simplePrefs.removeListener(`${ PREFS }AccessKey`, onPrefsChange),
        simplePrefs.prefs[`${ PREFS }AccessKey`] = "e"
      ),
      simplePrefs.prefs[`${ PREFS }EnablePB`] && (
        simplePrefs.removeListener(`${ PREFS }EnablePB`, onPrefsChange),
        simplePrefs.prefs[`${ PREFS }EnablePB`] = false
      ),
      simplePrefs.prefs[`${ PREFS }ForceRemove`] && (
        simplePrefs.removeListener(`${ PREFS }ForceRemove`, onPrefsChange),
        simplePrefs.prefs[`${ PREFS }ForceRemove`] = false
      ),
      simplePrefs.prefs[`${ PREFS }OnDisable`] = false,
      browserWindows.removeListener("activate", onActiveWindow),
      events.off(LAST_PB, onLastPbContextExisted),
      simpleStorage.removeListener(OVER_QUOTA, onStorageOverQuota)
    );
  };
})();
