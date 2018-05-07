/**
 * background.js
 */
"use strict";
{
  /* api */
  const {
    browserAction, commands, contextMenus, i18n, notifications, runtime,
    storage, tabs, windows,
  } = browser;
  const {local: localStorage} = storage;

  /* constants */
  const {WINDOW_ID_CURRENT} = windows;
  const CONTENT_GET = "getContent";
  const CONTENT_SCRIPT_PATH = "js/content.js";
  const CONTEXT_MENU = "contextMenu";
  const EDITOR_CONFIG_GET = "getEditorConfig";
  const EDITOR_CONFIG_RES = "resEditorConfig";
  const EDITOR_CONFIG_TS = "editorConfigTimestamp";
  const EDITOR_EXEC = "execEditor";
  const EDITOR_FILE_NAME = "editorFileName";
  const EDITOR_LABEL = "editorLabel";
  const ENABLE_PB = "enablePB";
  const EXT_RELOAD = "reloadExtension";
  const EXT_WEBEXT = "jid1-WiAigu4HIo0Tag@jetpack";
  const FILE_EXT = "fileExt";
  const FILE_EXT_PATH = "data/fileExt.json";
  const HOST = "withexeditorhost";
  const HOST_CONNECTION = "hostConnection";
  const HOST_ERR_NOTIFY = "notifyHostError";
  const HOST_STATUS = "hostStatus";
  const HOST_STATUS_GET = "getHostStatus";
  const HOST_VERSION = "hostVersion";
  const HOST_VERSION_CHECK = "checkHostVersion";
  const HOST_VERSION_MIN = "v3.1.3";
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
  const LABEL = "withExEditor";
  const LIVE_EDIT = "liveEdit";
  const LIVE_EDIT_PATH = "data/liveEdit.json";
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
  const OPTIONS_OPEN = "openOptionsPage";
  const PORT_CONTENT = "portContent";
  const PROCESS_CHILD = "childProcess";
  const STORAGE_SET = "setStorage";
  const SYNC_AUTO = "enableSyncAuto";
  const SYNC_AUTO_URL = "syncAutoUrls";
  const TEXT_SYNC = "syncText";
  const TMP_FILES = "tmpFiles";
  const TMP_FILES_PB = "tmpFilesPb";
  const TMP_FILES_PB_REMOVE = "removePrivateTmpFiles";
  const TMP_FILE_CREATE = "createTmpFile";
  const TMP_FILE_DATA_PORT = "portTmpFileData";
  const TMP_FILE_DATA_REMOVE = "removeTmpFileData";
  const TMP_FILE_GET = "getTmpFile";
  const TMP_FILE_REQ = "requestTmpFile";
  const TMP_FILE_RES = "resTmpFile";
  const WARN_COLOR = "#C13832";
  const WARN_TEXT = "!";
  const VARS_SET = "setVars";

  /* variables */
  const vars = {
    [IS_ENABLED]: false,
    [IS_WEBEXT]: runtime.id === EXT_WEBEXT,
    [ONLY_EDITABLE]: false,
    [SYNC_AUTO]: false,
    [SYNC_AUTO_URL]: null,
  };

  const varsLocal = {
    [EDITOR_LABEL]: "",
    [ENABLE_PB]: false,
    [ICON_ID]: "#context",
    [IS_EXECUTABLE]: false,
    [KEY_ACCESS]: "U",
    [MENU_ENABLED]: false,
    [MODE_MATHML]: "",
    [MODE_SOURCE]: "",
    [MODE_SVG]: "",
  };

  /**
   * throw error
   * @param {!Object} e - Error
   * @throws
   */
  const throwErr = e => {
    throw e;
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
    if (isString(uri)) {
      uri = uri.replace(query, "");
    }
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

  /* tabs */
  /**
   * execute content script to existing tabs
   * NOTE: Exclude Blink due to the error "No source code or file specified.".
   * @returns {Promise.<Arrya>} - results of each handler
   */
  const execScriptToTabs = async () => {
    const func = [];
    if (vars[IS_WEBEXT]) {
      const contentScript = runtime.getURL(CONTENT_SCRIPT_PATH);
      const tabList = await tabs.query({
        windowType: "normal",
      });
      for (const tab of tabList) {
        const {id: tabId} = tab;
        func.push(tabs.executeScript(tabId, {
          allFrames: true,
          file: contentScript,
        }));
      }
    }
    return Promise.all(func);
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
    path = isString(path) && await runtime.getURL(path);
    if (path && isString(key)) {
      const data = await fetch(path).then(res => res && res.json());
      func = setLocalStorage({[key]: data});
    }
    return func || null;
  };

  /* content ports collection */
  const ports = new Map();

  /**
   * create ports map
   * @param {string} windowId - window ID
   * @param {string} tabId - tabId
   * @returns {Object} - Map
   */
  const createPortsMap = (windowId, tabId) => {
    if (!ports.has(windowId)) {
      ports.set(windowId, new Map());
    }
    const portsWin = ports.get(windowId);
    if (!portsWin.has(tabId)) {
      portsWin.set(tabId, new Map());
    }
    return portsWin.get(tabId);
  };

  /**
   * restore ports collection
   * @param {Object} data - disconnected port data
   * @returns {?AsyncFunction} - restore ports (recursive)
   */
  const restorePorts = async (data = {}) => {
    const {tabId, windowId} = data;
    let func;
    if (windowId && tabId && ports.has(windowId)) {
      const portsWin = ports.get(windowId);
      portsWin.delete(tabId);
      if (portsWin.size === 0) {
        func = restorePorts({windowId});
      }
    } else {
      windowId && ports.delete(windowId);
    }
    return func || null;
  };

  /**
   * remove port from ports collection
   * @param {!Object} port - removed port
   * @returns {?AsyncFunction} - portHostMsg
   */
  const removePort = async (port = {}) => {
    const {sender} = port;
    let func;
    if (sender) {
      const {tab, url} = sender;
      if (tab) {
        const portUrl = removeQueryFromURI(url);
        const {hostname} = new URL(portUrl);
        const {incognito} = tab;
        const {windowId: wId, id: tId} = tab;
        const windowId = stringifyPositiveInt(wId, true);
        const tabId = stringifyPositiveInt(tId, true);
        if (tabId && windowId && portUrl && ports.has(windowId)) {
          const portsWin = ports.get(windowId);
          if (portsWin.has(tabId)) {
            const portsTab = portsWin.get(tabId);
            portsTab.delete(portUrl);
            func = portHostMsg({
              [TMP_FILE_DATA_REMOVE]: {
                tabId, windowId,
                dir: incognito && TMP_FILES_PB || TMP_FILES,
                host: hostname,
              },
            });
          }
        }
      }
    }
    return func || null;
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
      const portsWin = ports.get(windowId);
      const portsTab = portsWin && portsWin.get(tabId);
      if (portsTab) {
        const portUrls = portsTab && portsTab.entries();
        for (const portUrl of portUrls) {
          const [key, port] = portUrl;
          try {
            port && port.postMessage(msg);
          } catch (e) {
            portsTab.delete(key);
          }
        }
      } else if (portsWin) {
        const tabIds = portsWin.keys();
        for (tabId of tabIds) {
          if (tabId) {
            portMsg(msg, windowId, tabId);
          }
        }
      } else {
        const windowIds = ports.keys();
        for (windowId of windowIds) {
          if (windowIds) {
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
    const {windowId: wId, id: tId} = tab;
    const windowId = stringifyPositiveInt(wId, true);
    const tabId = stringifyPositiveInt(tId, true);
    if (windowId && tabId) {
      const portUrl = removeQueryFromURI(frameUrl || pageUrl);
      const portsWin = ports.get(windowId);
      const portsTab = portsWin && portsWin.get(tabId);
      const port = portsTab && portsTab.get(portUrl);
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

  /**
   * port get content message to active tab
   * @returns {?AsyncFunction} - port msg
   */
  const portGetContentMsg = async () => {
    const [tab] = await tabs.query({
      active: true,
      windowId: WINDOW_ID_CURRENT,
      windowType: "normal",
    });
    let func;
    if (tab) {
      const {id: tId, windowId: wId} = tab;
      const windowId = stringifyPositiveInt(wId, true);
      const tabId = stringifyPositiveInt(tId, true);
      const msg = {
        [CONTENT_GET]: {tab},
      };
      func = portMsg(msg, windowId, tabId);
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
    const icon = await runtime.getURL(ICON);
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
    const accKey = !vars[IS_WEBEXT] && varsLocal[KEY_ACCESS] &&
                   `(&${varsLocal[KEY_ACCESS].toUpperCase()})` || "";
    const enabled = !!varsLocal[MENU_ENABLED] && !!varsLocal[IS_EXECUTABLE];
    if (isString(id) && menus.hasOwnProperty(id) && Array.isArray(contexts)) {
      menus[id] = await contextMenus.create({
        id, contexts, enabled,
        title: i18n.getMessage(id, [label, accKey]),
      });
    }
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
   * @returns {Promise.<Array>} - results of each handler
   */
  const updateContextMenu = async type => {
    const func = [];
    if (type) {
      const items = Object.entries(type);
      if (items.length) {
        for (const item of items) {
          const [key, value] = item;
          const {enabled, menuItemId, mode} = value;
          if (menus[menuItemId]) {
            if (key === MODE_SOURCE) {
              const title = varsLocal[mode] || varsLocal[menuItemId];
              title && func.push(contextMenus.update(menuItemId, {title}));
            } else if (key === MODE_EDIT) {
              func.push(contextMenus.update(menuItemId, {enabled}));
            }
          }
        }
      }
    } else {
      const items = Object.keys(menus);
      const label = varsLocal[EDITOR_LABEL] || LABEL;
      const accKey = !vars[IS_WEBEXT] && varsLocal[KEY_ACCESS] &&
                     `(&${varsLocal[KEY_ACCESS].toUpperCase()})` || "";
      const enabled = !!varsLocal[MENU_ENABLED] && !!varsLocal[IS_EXECUTABLE];
      if (items.length) {
        for (const item of items) {
          if (menus[item]) {
            func.push(contextMenus.update(item, {
              enabled,
              title: i18n.getMessage(item, [label, accKey]),
            }));
          } else {
            switch (item) {
              case MODE_EDIT:
                func.push(createMenuItem(item, ["editable"]));
                break;
              case MODE_SELECTION:
                func.push(createMenuItem(item, ["selection"]));
                break;
              case MODE_SOURCE:
                func.push(createMenuItem(item, ["frame", "page"]));
                break;
              default:
            }
          }
        }
      }
    }
    return Promise.all(func);
  };

  /**
   * cache localized context menu item title
   * @returns {void}
   */
  const cacheMenuItemTitle = async () => {
    const items = [MODE_SOURCE, MODE_MATHML, MODE_SVG];
    const label = varsLocal[EDITOR_LABEL] || LABEL;
    const accKey = !vars[IS_WEBEXT] && varsLocal[KEY_ACCESS] &&
                   `(&${varsLocal[KEY_ACCESS].toUpperCase()})` || "";
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
      restoreContextMenu(),
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
   * handle notifications onclosed
   * @param {string} id - notification ID
   * @returns {?AsyncFunction} - notifications.clear()
   */
  const handleNotifyOnClosed = id => {
    let func;
    if (isString(id)) {
      func = notifications.clear(id).catch(throwErr);
    }
    return func || null;
  };

  /**
   * create notification
   * @param {string} id - notification ID
   * @param {Object} opt - options
   * @returns {void}
   */
  const createNotification = async (id, opt) => {
    let func;
    if (isString(id) && notifications) {
      if (notifications.onClosed &&
          !notifications.onClosed.hasListener(handleNotifyOnClosed)) {
        notifications.onClosed.addListener(handleNotifyOnClosed);
      }
      func = notifications.create(id, opt);
    }
    return func || null;
  };

  /**
   * handle host message
   * @param {Object} msg - message
   * @returns {Promise.<Array>} - result of each handler
   */
  const handleHostMsg = async msg => {
    const {message, status} = msg;
    const log = message && `${HOST}: ${message}`;
    const iconUrl = await runtime.getURL(ICON);
    const notifyMsg = {
      iconUrl, message,
      title: `${HOST}: ${status}`,
      type: "basic",
    };
    const func = [];
    switch (status) {
      case `${PROCESS_CHILD}_stderr`:
      case "error":
        log && func.push(logError(log));
        notifications && func.push(createNotification(status, notifyMsg));
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
        notifications && func.push(createNotification(status, notifyMsg));
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
    const items = msg && Object.entries(msg);
    if (items && items.length) {
      for (const item of items) {
        const [key, value] = item;
        if (value) {
          switch (key) {
            case CONTEXT_MENU:
              func.push(updateContextMenu(value));
              break;
            case EDITOR_CONFIG_GET:
            case LOCAL_FILE_VIEW:
            case TMP_FILE_CREATE:
            case TMP_FILE_GET:
              func.push(portHostMsg({[key]: value}));
              break;
            case EDITOR_CONFIG_RES:
              func.push(extractEditorConfig(value));
              break;
            case EXT_RELOAD:
              func.push(reloadExt(!!value));
              break;
            case HOST:
              func.push(handleHostMsg(value));
              break;
            case HOST_STATUS_GET:
              func.push(portMsg({[HOST_STATUS]: hostStatus}));
              break;
            case HOST_VERSION: {
              const {result} = value;
              if (Number.isInteger(result)) {
                hostStatus[HOST_VERSION] = result >= 0;
                func.push(toggleBadge());
              }
              break;
            }
            case OPTIONS_OPEN:
              func.push(openOptionsPage());
              break;
            case STORAGE_SET:
              func.push(setLocalStorage(value));
              break;
            case TMP_FILE_DATA_PORT:
              func.push(portMsg({[key]: value}));
              break;
            case TMP_FILE_RES:
              func.push(portSyncText(value));
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
    const {name: portName, sender} = port;
    const {frameId, tab, url} = sender;
    let func;
    if (tab) {
      const {active, incognito, status} = tab;
      const {windowId: wId, id: tId} = tab;
      const windowId = stringifyPositiveInt(wId, true);
      const tabId = stringifyPositiveInt(tId, true);
      if (windowId && tabId && url) {
        const portsTab = createPortsMap(windowId, tabId);
        const portUrl = removeQueryFromURI(url);
        port.onDisconnect.addListener(p => removePort(p).catch(throwErr));
        port.onMessage.addListener(msg => handleMsg(msg).catch(throwErr));
        portsTab.set(portUrl, port);
        port.postMessage({
          incognito, tabId, windowId,
          [VARS_SET]: vars,
        });
      }
      if (portName === PORT_CONTENT && frameId === 0 && active &&
          status === "complete") {
        varsLocal[MENU_ENABLED] = true;
        func = updateContextMenu();
      }
    }
    return func || null;
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
    const func = [];
    const {tabId: tId, windowId: wId} = info;
    const windowId = stringifyPositiveInt(wId, true);
    const tabId = stringifyPositiveInt(tId, true);
    let bool;
    if (windowId && tabId) {
      const portsWin = ports.get(windowId);
      const portsTab = portsWin && portsWin.get(tabId);
      const items = portsTab && portsTab.values();
      if (items) {
        for (const item of items) {
          if (item) {
            const {name} = item;
            if (name) {
              bool = name === PORT_CONTENT;
              break;
            }
          }
        }
        if (bool) {
          func.push(portMsg({
            [TMP_FILE_REQ]: bool,
          }, windowId, tabId));
        }
      }
    }
    varsLocal[MENU_ENABLED] = bool || false;
    func.push(
      updateContextMenu(),
      syncUI(),
    );
    return Promise.all(func);
  };

  /**
   * handle tab updated
   * @param {!number} id - tabId
   * @param {!Object} info - changed tab info
   * @param {!Object} tab - tabs.Tab
   * @returns {Promise.<Array>} - results of each handler
   */
  const onTabUpdated = async (id, info, tab) => {
    const {active, url, windowId: wId} = tab;
    const {status} = info;
    const windowId = stringifyPositiveInt(wId, true);
    const tabId = stringifyPositiveInt(id, true);
    const func = [];
    if (active) {
      const portUrl = removeQueryFromURI(url);
      const portsWin = ports.get(windowId);
      const portsTab = portsWin && portsWin.get(tabId);
      const port = portsTab && portsTab.get(portUrl);
      if (port) {
        const {name} = port;
        varsLocal[MENU_ENABLED] = name === PORT_CONTENT;
      } else {
        varsLocal[MENU_ENABLED] = false;
      }
      status === "complete" && func.push(updateContextMenu(), syncUI());
    }
    return Promise.all(func);
  };

  /**
   * handle tab removed
   * @param {!number} id - tabId
   * @param {!Object} info - removed tab info
   * @returns {Promise.<Array>} - results of each handler
   */
  const onTabRemoved = async (id, info) => {
    const func = [];
    const {windowId: wId} = info;
    const {incognito} = await windows.get(wId);
    const windowId = stringifyPositiveInt(wId, true);
    const tabId = stringifyPositiveInt(id, true);
    const portsWin = ports.get(windowId);
    const portsTab = portsWin && portsWin.get(tabId);
    if (portsTab) {
      func.push(
        restorePorts({windowId, tabId}),
        portHostMsg({
          [TMP_FILE_DATA_REMOVE]: {
            tabId, windowId,
            dir: incognito && TMP_FILES_PB || TMP_FILES,
          },
        }),
      );
    }
    return Promise.all(func);
  };

  /**
   * handle window focus changed
   * @param {number} id - window ID
   * @returns {Promise.<Array>} - results of each handler
   */
  const onWindowFocusChanged = async id => {
    const func = [];
    const win = await windows.getAll({windowTypes: ["normal"]});
    const tabList = await tabs.query({
      windowId: id,
      windowType: "normal",
    });
    for (const tab of tabList) {
      const {active, id: tId} = tab;
      const windowId = stringifyPositiveInt(id, true);
      const tabId = stringifyPositiveInt(tId, true);
      if (windowId && tabId) {
        if (active) {
          func.push(portMsg({
            [TMP_FILE_REQ]: true,
          }, windowId, tabId));
        }
      }
    }
    win.length && func.push(
      updateContextMenu(),
      syncUI(),
    );
    return Promise.all(func);
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

  /**
   * handle command
   * @param {string} cmd - command
   * @returns {?AsyncFunction} - command handler function
   */
  const handleCmd = async cmd => {
    let func;
    if (isString(cmd)) {
      switch (cmd) {
        case EDITOR_EXEC:
          func = portGetContentMsg();
          break;
        case OPTIONS_OPEN:
          func = openOptionsPage();
          break;
        default:
      }
    }
    return func || null;
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
      const hasPorts = ports.size > 0;
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
        case ENABLE_PB:
          varsLocal[item] = !!checked;
          changed && func.push(syncUI());
          break;
        case HOST_ERR_NOTIFY:
          if (checked && notifications && notifications.onClosed &&
              !notifications.onClosed.hasListener(handleNotifyOnClosed)) {
            notifications.onClosed.addListener(handleNotifyOnClosed);
          }
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
          varsLocal[item] = value;
          changed && func.push(
            updateContextMenu(),
            cacheMenuItemTitle(),
          );
          break;
        case ONLY_EDITABLE:
          vars[item] = !!checked;
          hasPorts && func.push(portVar({[item]: !!checked}));
          changed && func.push(updateContextMenu());
          break;
        case SYNC_AUTO:
          vars[item] = !!checked;
          hasPorts && func.push(portVar({[item]: !!checked}));
          break;
        case SYNC_AUTO_URL:
          vars[item] = value;
          hasPorts && func.push(portVar({[item]: value}));
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
    const items = Object.entries(data);
    if (items.length) {
      for (const item of items) {
        const [key, value] = item;
        const {newValue} = value;
        func.push(setVar(key, newValue || value, !!newValue));
      }
    }
    return Promise.all(func);
  };

  /* listeners */
  browserAction.onClicked.addListener(() => openOptionsPage().catch(throwErr));
  commands.onCommand.addListener(cmd => handleCmd(cmd).catch(throwErr));
  contextMenus.onClicked.addListener((info, tab) =>
    portContextMenuData(info, tab).catch(throwErr)
  );
  host.onDisconnect.addListener(port =>
    handleDisconnectedHost(port).then(toggleBadge).catch(throwErr)
  );
  host.onMessage.addListener(msg => handleMsg(msg).catch(throwErr));
  runtime.onConnect.addListener(port => handlePort(port).catch(throwErr));
  runtime.onMessage.addListener(msg => handleMsg(msg).catch(throwErr));
  storage.onChanged.addListener(data =>
    setVars(data).then(syncUI).catch(throwErr)
  );
  tabs.onActivated.addListener(info => onTabActivated(info).catch(throwErr));
  tabs.onUpdated.addListener((id, info, tab) =>
    onTabUpdated(id, info, tab).catch(throwErr)
  );
  tabs.onRemoved.addListener((id, info) =>
    onTabRemoved(id, info).catch(throwErr)
  );
  windows.onFocusChanged.addListener(windowId =>
    onWindowFocusChanged(windowId).catch(throwErr)
  );
  windows.onRemoved.addListener(windowId =>
    onWindowRemoved(windowId).catch(throwErr)
  );

  /* startup */
  Promise.all([
    localStorage.get().then(setVars).then(execScriptToTabs).then(syncUI),
    storeFetchedData(NS_URI_PATH, NS_URI),
    storeFetchedData(FILE_EXT_PATH, FILE_EXT),
    storeFetchedData(LIVE_EDIT_PATH, LIVE_EDIT),
  ]).catch(throwErr);
}
