/**
 * background.js
 */
"use strict";
{
  /* api */
  const {
    browserAction, contextMenus, extension, i18n, runtime, storage, tabs,
    windows,
  } = browser;
  const {local: localStorage} = storage;

  /* constants */
  const CONTENT_GET = "getContent";
  const CONTEXT_MENU = "contextMenu";
  const EDITOR_CONFIG_GET = "getEditorConfig";
  const EDITOR_CONFIG_RES = "resEditorConfig";
  const EDITOR_CONFIG_TS = "editorConfigTimestamp";
  const EDITOR_FILE_NAME = "editorFileName";
  const EDITOR_LABEL = "editorLabel";
  const ENABLE_PB = "enablePB";
  const EXT_RELOAD = "reloadExtension";
  const EXT_WEBEXT = "jid1-WiAigu4HIo0Tag@jetpack";
  const FILE_EXT = "fileExt";
  const FILE_EXT_PATH = "data/fileExt.json";
  const HOST = "withexeditorhost";
  const HOST_CONNECTION = "hostConnection";
  const HOST_STATUS = "hostStatus";
  const HOST_STATUS_GET = "getHostStatus";
  const HOST_VERSION = "hostVersion";
  const HOST_VERSION_CHECK = "checkHostVersion";
  const HOST_VERSION_MIN = "v2.2.0";
  const ICON = "img/icon.svg";
  const ICON_AUTO = "buttonIconAuto";
  const ICON_BLACK = "buttonIconBlack";
  const ICON_COLOR = "buttonIconColor";
  const ICON_GRAY = "buttonIconGray";
  const ICON_ID = "iconId";
  const ICON_WHITE = "buttonIconWhite";
  const IS_ENABLED = "isEnabled";
  const IS_EXECUTABLE = "isExecutable";
  const IS_WEBEXT = "isWebExtension";
  const KEY_ACCESS = "accessKey";
  const KEY_EDITOR = "editorShortCut";
  const KEY_OPTIONS = "optionsShortCut";
  const LABEL = "withExEditor";
  const LOCAL_FILE_VIEW = "viewLocalFile";
  const MENU_ENABLED = "menuEnabled";
  const MODE_EDIT = "modeEditText";
  const MODE_MATHML = "modeViewMathML";
  const MODE_SELECTION = "modeViewSelection";
  const MODE_SOURCE = "modeViewSource";
  const MODE_SVG = "modeViewSVG";
  const NS_URI = "nsUri";
  const NS_URI_PATH = "data/nsUri.json";
  const ONLY_EDITABLE = "enableOnlyEditable";
  const OPTIONS_OPEN = "openOptions";
  const PORT_CONTENT = "portContent";
  const PROCESS_CHILD = "childProcess";
  const STORAGE_SET = "setStorage";
  const SYNC_AUTO = "enableSyncAuto";
  const SYNC_AUTO_URL = "syncAutoUrls";
  const TEXT_SYNC = "syncText";
  const TMP_FILES_PB_REMOVE = "removePrivateTmpFiles";
  const TMP_FILE_CREATE = "createTmpFile";
  const TMP_FILE_DATA_PORT = "portTmpFileData";
  const TMP_FILE_GET = "getTmpFile";
  const TMP_FILE_RES = "resTmpFile";
  const WARN_COLOR = "#C13832";
  const WARN_TEXT = "!";
  const VARS_SET = "setVars";

  /* variables */
  const vars = {
    [IS_ENABLED]: false,
    [IS_WEBEXT]: runtime.id === EXT_WEBEXT,
    [KEY_ACCESS]: "u",
    [KEY_EDITOR]: true,
    [KEY_OPTIONS]: true,
    [ONLY_EDITABLE]: false,
    [SYNC_AUTO]: false,
    [SYNC_AUTO_URL]: null,
  };

  const varsLocal = {
    [EDITOR_LABEL]: "",
    [ENABLE_PB]: false,
    [ICON_ID]: "#context",
    [IS_EXECUTABLE]: false,
    [MENU_ENABLED]: false,
    [MODE_MATHML]: "",
    [MODE_SOURCE]: "",
    [MODE_SVG]: "",
  };

  /**
   * log error
   * @param {!Object} e - Error
   * @returns {boolean} - false
   */
  const logError = e => {
    console.error(e);
    return false;
  };

  /**
   * log warn
   * @param {*} msg - message
   * @returns {boolean} - false
   */
  const logWarn = msg => {
    msg && console.warn(msg);
    return false;
  };

  /**
   * log message
   * @param {*} msg - message
   * @returns {Object} - message
   */
  const logMsg = msg => {
    msg && console.log(msg);
    return msg;
  };

  /**
   * is string
   * @param {*} o - object to check
   * @returns {boolean} - result
   */
  const isString = o => typeof o === "string" || o instanceof String;

  /**
   * stringify positive integer
   * @param {number} i - integer
   * @param {boolean} zero - treat 0 as a positive integer
   * @returns {?string} - stringified integer
   */
  const stringifyPositiveInt = (i, zero = false) =>
    Number.isSafeInteger(i) && (zero && i >= 0 || i > 0) && `${i}` || null;

  /**
   * remove query string from URI
   * @param {string} uri - URI
   * @returns {string} - replaced URI
   */
  const removeQueryFromURI = uri => {
    const query = /\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9A-F]{2})*/;
    isString(uri) && (uri = uri.replace(query, ""));
    return uri;
  };

  /* windows */
  /**
   * check if any of windows is incognito
   * @returns {boolean} - result
   */
  const checkWindowIncognito = async () => {
    const windowIds = await windows.getAll({windowTypes: ["normal"]});
    let incog;
    if (windowIds && windowIds.length) {
      for (const windowId of windowIds) {
        incog = windowId.incognito;
        if (incog) {
          break;
        }
      }
    }
    return incog || false;
  };

  /* port */
  /* native application host */
  const host = runtime.connectNative(HOST);

  /* host status */
  const hostStatus = {
    [HOST_CONNECTION]: false,
    [HOST_VERSION]: false,
  };

  /**
   * port message to host
   * @param {*} msg - message
   * @returns {void}
   */
  const portHostMsg = async msg => {
    msg && host && host.postMessage(msg);
  };

  /* local storage */
  /**
   * set local storage
   * @param {Object} obj - object to store
   * @returns {?AsyncFunction} - store object
   */
  const setLocalStorage = async obj => obj && localStorage.set(obj) || null;

  /**
   * fetch shared data and store
   * @param {string} path - data path
   * @param {string} key - local storage key
   * @returns {?AsyncFunction} - set local storage
   */
  const storeFetchedData = async (path, key) => {
    let func;
    path = isString(path) && await extension.getURL(path);
    if (path && isString(key)) {
      const data = await fetch(path).then(res => res && res.json());
      func = setLocalStorage({[key]: data});
    }
    return func || null;
  };

  /* content ports collection */
  const ports = {};

  /**
   * restore ports collection
   * @param {Object} data - disconnected port data
   * @returns {?AsyncFunction} - restore ports (recursive)
   */
  const restorePorts = async (data = {}) => {
    const {tabId, windowId} = data;
    let func;
    if (windowId && tabId && ports[windowId]) {
      delete ports[windowId][tabId];
      Object.keys(ports[windowId]).length === 0 &&
        (func = restorePorts({windowId}));
    } else {
      windowId && delete ports[windowId];
    }
    return func || null;
  };

  /**
   * remove port from ports collection
   * @param {!Object} port - removed port
   * @returns {void}
   */
  const removePort = async (port = {}) => {
    const {sender} = port;
    if (sender) {
      const {tab, url} = sender;
      if (tab) {
        const portUrl = removeQueryFromURI(url);
        let {windowId, id: tabId} = tab;
        tabId = stringifyPositiveInt(tabId, true);
        windowId = stringifyPositiveInt(windowId, true);
        tabId && windowId && portUrl && ports[windowId] &&
        ports[windowId][tabId] &&
          delete ports[windowId][tabId][portUrl];
      }
    }
  };

  /**
   * port message
   * @param {*} msg - message
   * @param {string} windowId - windowId
   * @param {string} tabId - tabId
   * @returns {void}
   */
  const portMsg = async (msg, windowId, tabId) => {
    if (msg) {
      if (windowId && tabId) {
        const portUrls = ports[windowId] && ports[windowId][tabId] &&
                           Object.keys(ports[windowId][tabId]);
        if (portUrls && portUrls.length) {
          for (const portUrl of portUrls) {
            const port = ports[windowId][tabId][portUrl];
            try {
              port && port.postMessage(msg);
            } catch (e) {
              delete ports[windowId][tabId][portUrl];
            }
          }
        }
      } else if (windowId) {
        const tabIds = ports[windowId] && Object.keys(ports[windowId]);
        if (tabIds && tabIds.length) {
          for (tabId of tabIds) {
            portMsg(msg, windowId, tabId);
          }
        }
      } else {
        const windowIds = Object.keys(ports);
        if (windowIds.length) {
          for (windowId of windowIds) {
            portMsg(msg, windowId);
          }
        }
      }
    }
  };

  /**
   * port context menu data
   * @param {!Object} info - contextMenus.OnClickData
   * @param {!Object} tab - tabs.Tab
   * @returns {void}
   */
  const portContextMenuData = async (info, tab) => {
    const {frameUrl, pageUrl} = info;
    let {windowId, id: tabId} = tab;
    windowId = stringifyPositiveInt(windowId, true);
    tabId = stringifyPositiveInt(tabId, true);
    if (windowId && tabId) {
      const portUrl = removeQueryFromURI(frameUrl || pageUrl);
      const port = ports[windowId] && ports[windowId][tabId] &&
                   ports[windowId][tabId][portUrl];
      port && port.postMessage({
        [CONTENT_GET]: {info, tab},
      });
    }
  };

  /**
   * port sync text
   * @param {*} msg - message
   * @returns {AsyncFunction} - port message
   */
  const portSyncText = async msg => {
    let func;
    if (msg) {
      const {data} = msg;
      if (data) {
        const {tabId, windowId} = data;
        if (isString(tabId) && /^\d+$/.test(tabId) &&
            isString(windowId) && /^\d+$/.test(windowId)) {
          const tabList = await tabs.query({
            active: true,
            windowId: windowId * 1,
          });
          if (tabList) {
            const [tab] = tabList;
            if (tab.id === tabId * 1) {
              func = portMsg({[TEXT_SYNC]: msg}, windowId, tabId);
            }
          }
        }
      }
    }
    return func || null;
  };

  /* icon */
  /**
   * set icon
   * @param {string} id - icon fragment id
   * @returns {AsyncFunction} - set icon
   */
  const setIcon = async (id = varsLocal[ICON_ID]) => {
    const icon = await extension.getURL(ICON);
    const path = vars[IS_ENABLED] && `${icon}${id}` || `${icon}#off`;
    return browserAction.setIcon({path});
  };

  /**
   * toggle badge
   * @returns {Promise.<Array>} - results of each handler
   */
  const toggleBadge = async () => {
    let color, text;
    if (hostStatus[HOST_CONNECTION] && hostStatus[HOST_VERSION] &&
        varsLocal[IS_EXECUTABLE]) {
      color = [0, 0, 0, 0];
      text = "";
    } else {
      color = WARN_COLOR;
      text = WARN_TEXT;
    }
    return Promise.all([
      browserAction.setBadgeBackgroundColor({color}),
      browserAction.setBadgeText({text}),
    ]);
  };

  /* context menu */
  /* context menu items collection */
  const menus = {
    [MODE_SOURCE]: null,
    [MODE_SELECTION]: null,
    [MODE_EDIT]: null,
  };

  // TODO: implement accesskey, Issue #18
  /**
   * create context menu item
   * @param {string} id - menu item ID
   * @param {Array} contexts - contexts
   * @returns {void}
   */
  const createMenuItem = async (id, contexts) => {
    const label = varsLocal[EDITOR_LABEL] || LABEL;
    const accKey = !vars[IS_WEBEXT] && vars[KEY_ACCESS] &&
                   `(&${vars[KEY_ACCESS].toUpperCase()})` || "";
    const enabled = !!varsLocal[MENU_ENABLED] && !!varsLocal[IS_EXECUTABLE];
    isString(id) && menus.hasOwnProperty(id) && Array.isArray(contexts) && (
      menus[id] = contextMenus.create({
        id, contexts, enabled,
        title: i18n.getMessage(id, [label, accKey]),
      })
    );
  };

  /**
   * create context menu items
   * @returns {Promise.<Array>} - results of each handler
   */
  const createMenuItems = async () => {
    const win = await windows.getCurrent({windowTypes: ["normal"]});
    const enabled = win && (!win.incognito || varsLocal[ENABLE_PB]) || false;
    const bool = enabled && !vars[ONLY_EDITABLE];
    const items = Object.keys(menus);
    const func = [];
    for (const item of items) {
      menus[item] = null;
      switch (item) {
        case MODE_EDIT:
          enabled && func.push(createMenuItem(item, ["editable"]));
          break;
        case MODE_SELECTION:
          bool && func.push(createMenuItem(item, ["selection"]));
          break;
        case MODE_SOURCE:
          bool && func.push(createMenuItem(item, ["frame", "page"]));
          break;
        default:
      }
    }
    return Promise.all(func);
  };

  /**
   * restore context menu
   * @returns {AsyncFunction} - create menu items
   */
  const restoreContextMenu = async () =>
    contextMenus.removeAll().then(createMenuItems);

  /**
   * update context menu
   * @param {Object} type - context type data
   * @returns {void}
   */
  const updateContextMenu = async type => {
    if (type) {
      const items = Object.keys(type);
      if (items.length) {
        for (const item of items) {
          const obj = type[item];
          const {menuItemId} = obj;
          if (menus[menuItemId]) {
            if (item === MODE_SOURCE) {
              const title = varsLocal[obj.mode] || varsLocal[menuItemId];
              title && contextMenus.update(menuItemId, {title});
            } else if (item === MODE_EDIT) {
              const enabled = !!obj.enabled;
              contextMenus.update(menuItemId, {enabled});
            }
          }
        }
      }
    } else {
      const items = Object.keys(menus);
      const label = varsLocal[EDITOR_LABEL] || LABEL;
      const accKey = !vars[IS_WEBEXT] && vars[KEY_ACCESS] &&
                     `(&${vars[KEY_ACCESS].toUpperCase()})` || "";
      if (items.length) {
        for (const item of items) {
          menus[item] && contextMenus.update(item, {
            title: i18n.getMessage(item, [label, accKey]),
          });
        }
      }
    }
  };

  /**
   * cache localized context menu item title
   * @returns {void}
   */
  const cacheMenuItemTitle = async () => {
    const items = [MODE_SOURCE, MODE_MATHML, MODE_SVG];
    const label = varsLocal[EDITOR_LABEL] || LABEL;
    const accKey = !vars[IS_WEBEXT] && vars[KEY_ACCESS] &&
                   `(&${vars[KEY_ACCESS].toUpperCase()})` || "";
    for (const item of items) {
      varsLocal[item] = i18n.getMessage(item, [label, accKey]);
    }
  };

  /* UI */
  /**
   * synchronize UI components
   * @returns {Promise.<Array>} - results of each handler
   */
  const syncUI = async () => {
    const win = await windows.getCurrent({windowTypes: ["normal"]});
    const enabled = win && (!win.incognito || varsLocal[ENABLE_PB]) || false;
    vars[IS_ENABLED] = !!enabled;
    return Promise.all([
      portMsg({[IS_ENABLED]: !!enabled}),
      setIcon(!enabled && "#off" || varsLocal[ICON_ID]),
      toggleBadge(),
    ]);
  };

  /* editor config */
  /**
   * extract editor config data
   * @param {Object} data - editor config data
   * @returns {Promise.<Array>} - results of each handler
   */
  const extractEditorConfig = async (data = {}) => {
    const {editorConfigTimestamp, editorName, executable} = data;
    const store = await localStorage.get([
      EDITOR_FILE_NAME,
      EDITOR_LABEL,
    ]);
    const editorFileName = store[EDITOR_FILE_NAME] &&
                             store[EDITOR_FILE_NAME].value;
    const editorLabel = store[EDITOR_LABEL] && store[EDITOR_LABEL].value;
    const editorNewLabel = editorFileName === editorName && editorLabel ||
                           executable && editorName || "";
    const msg = {
      [EDITOR_CONFIG_TS]: {
        id: EDITOR_CONFIG_TS,
        app: {
          executable: !!executable,
        },
        checked: false,
        value: editorConfigTimestamp || 0,
      },
      [EDITOR_FILE_NAME]: {
        id: EDITOR_FILE_NAME,
        app: {
          executable: !!executable,
        },
        checked: false,
        value: executable && editorName || "",
      },
      [EDITOR_LABEL]: {
        id: EDITOR_LABEL,
        app: {
          executable: false,
        },
        checked: false,
        value: editorNewLabel,
      },
    };
    const func = [
      setLocalStorage(msg),
      portMsg({
        [EDITOR_CONFIG_RES]: {
          editorConfigTimestamp, editorName, executable,
          editorLabel: editorNewLabel,
        },
      }),
    ];
    return Promise.all(func);
  };

  /* extension */
  /**
   * reload extension
   * @param {boolean} reload - reload
   * @returns {void}
   */
  const reloadExt = async (reload = false) => {
    if (reload) {
      host && host.disconnect();
      runtime.reload();
    }
  };

  /* handlers */
  /**
   * open options page
   * @returns {?AsyncFunction} - open options page
   */
  const openOptionsPage = async () =>
    vars[IS_ENABLED] && runtime.openOptionsPage() || null;

  /**
   * handle host message
   * @param {Object} msg - message
   * @returns {Promise.<Array>} - result of each handler
   */
  const handleHostMsg = async msg => {
    const {message, status} = msg;
    const log = message && `${HOST}: ${message}`;
    const func = [];
    switch (status) {
      case `${PROCESS_CHILD}_stderr`:
      case "error":
        log && func.push(logError(log));
        break;
      case "ready":
        hostStatus[HOST_CONNECTION] = true;
        func.push(
          portHostMsg({
            [EDITOR_CONFIG_GET]: true,
            [HOST_VERSION_CHECK]: HOST_VERSION_MIN,
          })
        );
        break;
      case "warn":
        log && func.push(logWarn(log));
        break;
      default:
        log && func.push(logMsg(log));
    }
    return Promise.all(func);
  };

  /**
   * handle message
   * @param {*} msg - message
   * @returns {Promise.<Array>} - results of each handler
   */
  const handleMsg = async msg => {
    const func = [];
    const items = msg && Object.keys(msg);
    if (items && items.length) {
      for (const item of items) {
        const obj = msg[item];
        if (obj) {
          switch (item) {
            case CONTEXT_MENU:
              func.push(updateContextMenu(obj));
              break;
            case EDITOR_CONFIG_GET:
            case LOCAL_FILE_VIEW:
            case TMP_FILE_CREATE:
            case TMP_FILE_GET:
              func.push(portHostMsg({[item]: obj}));
              break;
            case EDITOR_CONFIG_RES:
              func.push(extractEditorConfig(obj));
              break;
            case EXT_RELOAD:
              func.push(reloadExt(!!obj));
              break;
            case HOST:
              func.push(handleHostMsg(obj));
              break;
            case HOST_STATUS_GET:
              func.push(portMsg({[HOST_STATUS]: hostStatus}));
              break;
            case HOST_VERSION: {
              const {result} = obj;
              if (Number.isInteger(result)) {
                hostStatus[HOST_VERSION] = result >= 0 && true || false;
                func.push(toggleBadge());
              }
              break;
            }
            case OPTIONS_OPEN:
              func.push(openOptionsPage());
              break;
            case STORAGE_SET:
              func.push(setLocalStorage(obj));
              break;
            case TMP_FILE_DATA_PORT:
              func.push(portMsg({[item]: obj}));
              break;
            case TMP_FILE_RES:
              func.push(portSyncText(obj));
              break;
            default:
          }
        }
      }
    }
    return Promise.all(func);
  };

  /**
   * handle connected port
   * @param {Object} port - runtime.Port
   * @returns {void}
   */
  const handlePort = async (port = {}) => {
    const {tab, url} = port.sender;
    if (tab) {
      const {incognito} = tab;
      let {windowId, id: tabId} = tab;
      windowId = stringifyPositiveInt(windowId, true);
      tabId = stringifyPositiveInt(tabId, true);
      if (windowId && tabId && url) {
        const portUrl = removeQueryFromURI(url);
        ports[windowId] = ports[windowId] || {};
        ports[windowId][tabId] = ports[windowId][tabId] || {};
        ports[windowId][tabId][portUrl] = port;
        port.onDisconnect.addListener(p => removePort(p).catch(logError));
        port.onMessage.addListener(msg => handleMsg(msg).catch(logError));
        port.postMessage({
          incognito, tabId, windowId,
          [VARS_SET]: vars,
        });
      }
    }
  };

  /**
   * handle disconnected host
   * @returns {AsyncFunction} - toggle badge
   */
  const handleDisconnectedHost = async () => {
    hostStatus[HOST_CONNECTION] = false;
    return toggleBadge();
  };

  /**
   * handle tab activated
   * @param {!Object} info - activated tab info
   * @returns {Promise.<Array>} - results of each handler
   */
  const onTabActivated = async info => {
    let {tabId, windowId} = info, bool;
    windowId = stringifyPositiveInt(windowId, true);
    tabId = stringifyPositiveInt(tabId, true);
    if (windowId && tabId) {
      const items = ports[windowId] && ports[windowId][tabId] &&
                      Object.keys(ports[windowId][tabId]);
      if (items && items.length) {
        for (const item of items) {
          const obj = ports[windowId][tabId][item];
          if (obj && obj.name) {
            bool = obj.name === PORT_CONTENT;
            break;
          }
        }
      }
    }
    varsLocal[MENU_ENABLED] = bool || false;
    return Promise.all([
      restoreContextMenu(),
      syncUI(),
    ]);
  };

  /**
   * handle tab updated
   * @param {!number} id - tabId
   * @param {!Object} info - changed tab info
   * @param {!Object} tab - tabs.Tab
   * @returns {Promise.<Array>} - results of each handler
   */
  const onTabUpdated = async (id, info, tab) => {
    const {active, url, windowId} = tab;
    const func = [];
    if (active) {
      const {status} = info;
      const pUrl = removeQueryFromURI(url);
      const tId = stringifyPositiveInt(id, true);
      const wId = stringifyPositiveInt(windowId, true);
      varsLocal[MENU_ENABLED] = wId && tId && pUrl &&
                                ports[wId] && ports[wId][tId] &&
                                ports[wId][tId][pUrl] &&
                                ports[wId][tId][pUrl].name === PORT_CONTENT ||
                                false;
      status === "complete" && func.push(restoreContextMenu(), syncUI());
    }
    return Promise.all(func);
  };

  /**
   * handle tab removed
   * @param {!number} id - tabId
   * @param {!Object} info - removed tab info
   * @returns {?AsyncFunction} - restore ports
   */
  const onTabRemoved = async (id, info) => {
    const tabId = stringifyPositiveInt(id, true);
    let {windowId} = info;
    windowId = stringifyPositiveInt(windowId, true);
    return windowId && tabId && ports[windowId] && ports[windowId][tabId] &&
           restorePorts({windowId, tabId}) || null;
  };

  /**
   * handle window focus changed
   * @returns {?AsyncFunction} - sync UI
   */
  const onWindowFocusChanged = async () => {
    const win = await windows.getAll({windowTypes: ["normal"]});
    return win.length && syncUI() || null;
  };

  /**
   * handle window removed
   * @param {!number} windowId - windowId
   * @returns {Promise.<Array>} - results of each handler
   */
  const onWindowRemoved = async windowId => {
    const func = [];
    const win = await windows.getAll({windowTypes: ["normal"]});
    if (win.length) {
      const bool = await checkWindowIncognito();
      !bool && func.push(portHostMsg({[TMP_FILES_PB_REMOVE]: !bool}));
      windowId = stringifyPositiveInt(windowId, true);
      windowId && func.push(restorePorts({windowId}));
    }
    return Promise.all(func);
  };

  /* handle variables */
  /**
   * port variable
   * @param {Object} v - variable
   * @returns {?AsyncFunction} - port message
   */
  const portVar = async v => v && portMsg({[VARS_SET]: v}) || null;

  /**
   * set variable
   * @param {string} item - item
   * @param {Object} obj - value object
   * @param {boolean} changed - changed
   * @returns {Promise.<Array>} - results of each handler
   */
  const setVar = async (item, obj, changed = false) => {
    const func = [];
    if (item && obj) {
      const {app, checked, value} = obj;
      const hasPorts = Object.keys(ports).length;
      switch (item) {
        case EDITOR_FILE_NAME:
          varsLocal[item] = value;
          varsLocal[IS_EXECUTABLE] = app && !!app.executable;
          changed && func.push(toggleBadge());
          break;
        case EDITOR_LABEL:
          varsLocal[item] = value;
          func.push(cacheMenuItemTitle());
          changed && func.push(updateContextMenu());
          break;
        case ONLY_EDITABLE:
          vars[item] = !!checked;
          hasPorts && func.push(portVar({[item]: !!checked}));
          changed && func.push(restoreContextMenu());
          break;
        case ENABLE_PB:
          varsLocal[item] = !!checked;
          changed && func.push(syncUI());
          break;
        case ICON_AUTO:
        case ICON_BLACK:
        case ICON_COLOR:
        case ICON_GRAY:
        case ICON_WHITE:
          if (obj.checked) {
            varsLocal[ICON_ID] = value;
            changed && func.push(setIcon(value));
          }
          break;
        case KEY_ACCESS:
        case SYNC_AUTO_URL:
          vars[item] = value;
          hasPorts && func.push(portVar({[item]: value}));
          break;
        case KEY_EDITOR:
        case KEY_OPTIONS:
        case SYNC_AUTO:
          vars[item] = !!checked;
          hasPorts && func.push(portVar({[item]: !!checked}));
          break;
        default:
      }
    }
    return Promise.all(func);
  };

  /**
   * set variables
   * @param {Object} data - data
   * @returns {Promise.<Array>} - results of each handler
   */
  const setVars = async (data = {}) => {
    const func = [];
    const items = Object.keys(data);
    if (items.length) {
      for (const item of items) {
        const obj = data[item];
        const {newValue} = obj;
        func.push(setVar(item, newValue || obj, !!newValue));
      }
    }
    return Promise.all(func);
  };

  /* listeners */
  browserAction.onClicked.addListener(() => openOptionsPage().catch(logError));
  storage.onChanged.addListener(data =>
    setVars(data).then(syncUI).catch(logError)
  );
  contextMenus.onClicked.addListener((info, tab) =>
    portContextMenuData(info, tab).catch(logError)
  );
  host.onDisconnect.addListener(port =>
    handleDisconnectedHost(port).then(toggleBadge).catch(logError)
  );
  host.onMessage.addListener(msg => handleMsg(msg).catch(logError));
  runtime.onConnect.addListener(port => handlePort(port).catch(logError));
  runtime.onMessage.addListener(msg => handleMsg(msg).catch(logError));
  tabs.onActivated.addListener(info => onTabActivated(info).catch(logError));
  tabs.onUpdated.addListener((id, info, tab) =>
    onTabUpdated(id, info, tab).catch(logError)
  );
  tabs.onRemoved.addListener((id, info) =>
    onTabRemoved(id, info).catch(logError)
  );
  windows.onFocusChanged.addListener(() =>
    onWindowFocusChanged().catch(logError)
  );
  windows.onRemoved.addListener(windowId =>
    onWindowRemoved(windowId).catch(logError)
  );

  /* startup */
  Promise.all([
    localStorage.get().then(setVars).then(syncUI),
    storeFetchedData(NS_URI_PATH, NS_URI),
    storeFetchedData(FILE_EXT_PATH, FILE_EXT),
  ]).catch(logError);
}
