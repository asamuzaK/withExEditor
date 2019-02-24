/**
 * main.js
 */

import {
  getType, isObjectNotEmpty, isString, logErr, logMsg, logWarn,
  removeQueryFromURI, stringifyPositiveInt, throwErr,
} from "./common.js";
import {
  checkIncognitoWindowExists, clearNotification, createNotification,
  execScriptToTabs, getActiveTab, getActiveTabId, getCurrentWindow,
  getEnabledTheme, getStorage, getWindow, setStorage,
} from "./browser.js";

/* api */
const {
  browserAction, contextMenus, i18n, notifications, runtime, windows,
} = browser;

/* constants */
import {
  CONTENT_GET, CONTEXT_MENU, EDITOR_CONFIG_GET,
  EDITOR_CONFIG_RES, EDITOR_CONFIG_TS, EDITOR_EXEC, EDITOR_FILE_NAME,
  EDITOR_LABEL, EXT_NAME, EXT_RELOAD,
  HOST, HOST_CONNECTION, HOST_ERR_NOTIFY, HOST_STATUS, HOST_STATUS_GET,
  HOST_VERSION, HOST_VERSION_CHECK,
  ICON, ICON_AUTO, ICON_BLACK, ICON_COLOR, ICON_DARK, ICON_DARK_ID, ICON_ID,
  ICON_LIGHT, ICON_LIGHT_ID, ICON_WHITE,
  IS_EXECUTABLE, IS_WEBEXT, LOCAL_FILE_VIEW, MENU_ENABLED,
  MODE_EDIT, MODE_MATHML, MODE_SELECTION, MODE_SOURCE, MODE_SVG,
  ONLY_EDITABLE, OPTIONS_OPEN, PATH_BROWSER_POLYFILL, PATH_CONTENT_SCRIPT,
  PORT_CONTENT, PROCESS_CHILD, STORAGE_SET, SYNC_AUTO, SYNC_AUTO_URL,
  THEME_DARK, THEME_LIGHT, TMP_FILES, TMP_FILES_PB, TMP_FILES_PB_REMOVE,
  TMP_FILE_CREATE, TMP_FILE_DATA_PORT, TMP_FILE_DATA_REMOVE, TMP_FILE_GET,
  TMP_FILE_REQ, TMP_FILE_RES,
  VARS_SET, WARN_COLOR, WARN_TEXT, WEBEXT_ID,
} from "./constant.js";
const HOST_VERSION_MIN = "v3.3.1";

/* variables */
export const vars = {
  [IS_WEBEXT]: runtime.id === WEBEXT_ID,
  [ONLY_EDITABLE]: false,
  [SYNC_AUTO]: false,
  [SYNC_AUTO_URL]: null,
};

export const varsLocal = {
  [EDITOR_LABEL]: "",
  [ICON_ID]: "",
  [IS_EXECUTABLE]: false,
  [MENU_ENABLED]: false,
  [MODE_MATHML]: "",
  [MODE_SOURCE]: "",
  [MODE_SVG]: "",
};

/* native application host */
export const host = runtime.connectNative(HOST);

/* host status */
export const hostStatus = {
  [HOST_CONNECTION]: false,
  [HOST_VERSION]: false,
};

/**
 * post message to host
 * @param {*} msg - message
 * @returns {void}
 */
export const hostPostMsg = async msg => {
  if (msg && host) {
    host.postMessage(msg);
  }
};

/* content ports collection */
export const ports = new Map();

/**
 * create ports map
 * @param {string} windowId - window ID
 * @param {string} tabId - tabId
 * @returns {Object} - Map
 */
export const createPortsMap = async (windowId, tabId) => {
  if (!isString(windowId)) {
    throw new TypeError(`Expected String but got ${getType(windowId)}.`);
  }
  if (!isString(tabId)) {
    throw new TypeError(`Expected String but got ${getType(tabId)}.`);
  }
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
 * @returns {?AsyncFunction} - restorePorts() (recursive)
 */
export const restorePorts = async (data = {}) => {
  const {tabId, windowId} = data;
  let func;
  if (windowId && tabId && ports.has(windowId)) {
    const portsWin = ports.get(windowId);
    portsWin.delete(tabId);
    if (portsWin.size === 0) {
      func = restorePorts({windowId});
    }
  } else if (windowId) {
    ports.delete(windowId);
  }
  return func || null;
};

/**
 * remove port from ports collection
 * @param {Object} port - removed port
 * @returns {?AsyncFunction} - hostPostMsg()
 */
export const removePort = async (port = {}) => {
  const {sender} = port;
  let func;
  if (isObjectNotEmpty(sender)) {
    const {tab, url} = sender;
    const {incognito, windowId: wId, id: tId} = tab;
    const windowId = stringifyPositiveInt(wId, true);
    const portsWin = ports.get(windowId);
    if (portsWin) {
      const tabId = stringifyPositiveInt(tId, true);
      const portsTab = portsWin.get(tabId);
      if (portsTab) {
        const portUrl = removeQueryFromURI(url);
        const {hostname} = new URL(portUrl);
        portsTab.delete(portUrl);
        func = hostPostMsg({
          [TMP_FILE_DATA_REMOVE]: {
            tabId, windowId,
            dir: incognito && TMP_FILES_PB || TMP_FILES,
            host: hostname,
          },
        });
      }
    }
  }
  return func || null;
};

/**
 * post message to port
 * @param {*} msg - message
 * @param {string} windowId - windowId
 * @param {string} tabId - tabId
 * @param {string} portKey - key
 * @returns {Promise.<Array>} - results of each handler
 */
export const portPostMsg = async (msg, windowId, tabId, portKey) => {
  const func = [];
  if (msg) {
    const portsWin = ports.get(windowId);
    const portsTab = portsWin && portsWin.get(tabId);
    const port = portsTab && portsTab.get(portKey);
    if (port) {
      port.postMessage(msg);
    } else if (portsTab) {
      const items = portsTab.entries();
      for (const [itemKey, itemPort] of items) {
        try {
          itemPort.postMessage(msg);
        } catch (e) {
          logErr(e);
          portsTab.delete(itemKey);
        }
      }
    } else if (portsWin) {
      const items = portsWin.keys();
      for (const itemKey of items) {
        func.push(portPostMsg(msg, windowId, itemKey));
      }
    } else {
      const items = ports.keys();
      for (const itemKey of items) {
        func.push(portPostMsg(msg, itemKey));
      }
    }
  }
  return Promise.all(func);
};

/**
 * post context menu data
 * @param {Object} info - contextMenus.OnClickData
 * @param {Object} tab - tabs.Tab
 * @returns {?AsyncFunction} - portPostMsg()
 */
export const postContextMenuData = async (info, tab) => {
  let func;
  if (info && tab) {
    const {frameUrl, pageUrl} = info;
    const {windowId: wId, id: tId} = tab;
    const windowId = stringifyPositiveInt(wId, true);
    const tabId = stringifyPositiveInt(tId, true);
    const portKey = removeQueryFromURI(frameUrl || pageUrl);
    if (windowId && tabId && portKey) {
      func = portPostMsg({
        [CONTENT_GET]: {info, tab},
      }, windowId, tabId, portKey);
    }
  }
  return func || null;
};

/**
 * post tmp file data
 * @param {string} key - message key
 * @param {*} msg - message
 * @returns {?AsyncFunction} - portPostMsg()
 */
export const postTmpFileData = async (key, msg) => {
  if (!isString(key)) {
    throw new TypeError(`Expected String but got ${getType(key)}.`);
  }
  let func;
  if (msg) {
    const {data} = msg;
    if (data) {
      const {tabId, windowId} = data;
      if (isString(tabId) && /^\d+$/.test(tabId) &&
          isString(windowId) && /^\d+$/.test(windowId)) {
        const activeTabId = await getActiveTabId(windowId * 1);
        if (activeTabId === tabId * 1) {
          func = portPostMsg({[key]: msg}, windowId, tabId);
        }
      }
    }
  }
  return func || null;
};

/**
 * post get content message to active tab
 * @returns {?AsyncFunction} - portPostMsg()
 */
export const postGetContent = async () => {
  const tab = await getActiveTab();
  let func;
  if (tab) {
    const {id: tId, windowId: wId} = tab;
    const windowId = stringifyPositiveInt(wId, true);
    const tabId = stringifyPositiveInt(tId, true);
    const msg = {
      [CONTENT_GET]: {tab},
    };
    func = portPostMsg(msg, windowId, tabId);
  }
  return func || null;
};

/**
 * restore content script
 * @returns {?AsyncFunction} - execScriptToTabs()
 */
export const restoreContentScript = async () => {
  let func;
  if (ports.size < 1) {
    if (!vars[IS_WEBEXT]) {
      await execScriptToTabs({
        allFrames: true,
        file: PATH_BROWSER_POLYFILL,
      });
    }
    func = execScriptToTabs({
      allFrames: true,
      file: PATH_CONTENT_SCRIPT,
    });
  }
  return func || null;
};

/* icon */
/**
 * set icon
 * @param {string} id - icon fragment id
 * @returns {AsyncFunction} - set icon
 */
export const setIcon = async (id = varsLocal[ICON_ID]) => {
  const icon = runtime.getURL(ICON);
  const path = `${icon}${id}`;
  return browserAction.setIcon({path});
};

/**
 * toggle badge
 * @returns {Promise.<Array>} - results of each handler
 */
export const toggleBadge = async () => {
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

/**
 * set default icon
 * @returns {void}
 */
export const setDefaultIcon = async () => {
  const items = await getEnabledTheme();
  if (Array.isArray(items) && items.length) {
    for (const item of items) {
      const {id} = item;
      switch (id) {
        case THEME_DARK: {
          varsLocal[ICON_ID] = ICON_LIGHT_ID;
          break;
        }
        case THEME_LIGHT: {
          varsLocal[ICON_ID] = ICON_DARK_ID;
          break;
        }
        default: {
          if (vars[IS_WEBEXT]) {
            varsLocal[ICON_ID] = ICON_DARK_ID;
          } else {
            varsLocal[ICON_ID] = "";
          }
        }
      }
    }
  } else {
    varsLocal[ICON_ID] = "";
  }
};

/* context menu items */
export const menuItems = {
  [MODE_SOURCE]: null,
  [MODE_SELECTION]: null,
  [MODE_EDIT]: null,
};

/**
 * init context menu items
 * @returns {void}
 */
export const initMenuItems = async () => {
  const items = Object.keys(menuItems);
  for (const item of items) {
    menuItems[item] = null;
  }
};

/**
 * get access key
 * NOTE: sync
 * @param {string} id - menu item ID
 * @returns {string} - accesskey
 */
export const getAccesskey = id => {
  if (!isString(id)) {
    throw new TypeError(`Expected String but got ${getType(id)}.`);
  }
  let key;
  switch (id) {
    case MODE_EDIT:
      if (vars[IS_WEBEXT]) {
        key = "(&E)";
      } else {
        key = " (&E)";
      }
      break;
    case MODE_MATHML:
    case MODE_SELECTION:
    case MODE_SOURCE:
    case MODE_SVG:
      if (vars[IS_WEBEXT]) {
        key = "(&V)";
      } else {
        key = " (&V)";
      }
      break;
    default:
  }
  return key || "";
};

/**
 * create context menu item
 * @param {string} id - menu item ID
 * @param {Array} contexts - contexts
 * @returns {void}
 */
export const createMenuItem = async (id, contexts) => {
  if (!isString(id)) {
    throw new TypeError(`Expected String but got ${getType(id)}.`);
  }
  if (!Array.isArray(contexts)) {
    throw new TypeError(`Expected Array but got ${getType(contexts)}.`);
  }
  if (menuItems.hasOwnProperty(id)) {
    const label = varsLocal[EDITOR_LABEL] || i18n.getMessage(EXT_NAME);
    const accKey = getAccesskey(id);
    const title = `${id}_key`;
    const opt = {
      contexts,
      enabled: !!varsLocal[MENU_ENABLED] && !!varsLocal[IS_EXECUTABLE],
      title: i18n.getMessage(title, [label, accKey]),
    };
    if (id === MODE_EDIT) {
      opt.visible = true;
    } else {
      opt.visible = !vars[ONLY_EDITABLE];
    }
    if (menuItems[id]) {
      await contextMenus.update(id, opt);
    } else {
      opt.id = id;
      menuItems[id] = await contextMenus.create(opt);
    }
  }
};

/**
 * create context menu items
 * @returns {Promise.<Array>} - results of each handler
 */
export const createMenuItems = async () => {
  const bool = !vars[ONLY_EDITABLE];
  const items = Object.keys(menuItems);
  const func = [];
  for (const item of items) {
    switch (item) {
      case MODE_EDIT:
        func.push(createMenuItem(item, ["editable"]));
        break;
      case MODE_SELECTION:
        if (bool) {
          func.push(createMenuItem(item, ["selection"]));
        }
        break;
      case MODE_SOURCE:
        if (bool) {
          func.push(createMenuItem(item, ["frame", "page"]));
        }
        break;
      default:
    }
  }
  return Promise.all(func);
};

/**
 * restore context menu
 * NOTE: Remove in future release. Use updateContextMenu instead.
 * @returns {AsyncFunction} - Promise chain
 */
export const restoreContextMenu = async () =>
  contextMenus.removeAll().then(initMenuItems).then(createMenuItems);

/**
 * update context menu
 * @param {Object} type - context type data
 * @returns {Promise.<Array>} - results of each handler
 */
export const updateContextMenu = async type => {
  const func = [];
  if (isObjectNotEmpty(type)) {
    const items = Object.entries(type);
    for (const [key, value] of items) {
      const {enabled, menuItemId, mode} = value;
      if (menuItems[menuItemId]) {
        if (key === MODE_SOURCE) {
          const title = varsLocal[mode] || varsLocal[menuItemId];
          if (title) {
            func.push(contextMenus.update(menuItemId, {title}));
          }
        } else if (key === MODE_EDIT) {
          func.push(contextMenus.update(menuItemId, {enabled}));
        }
      }
    }
  } else {
    const items = Object.keys(menuItems);
    const label = varsLocal[EDITOR_LABEL] || i18n.getMessage(EXT_NAME);
    const enabled = !!varsLocal[MENU_ENABLED] && !!varsLocal[IS_EXECUTABLE];
    for (const item of items) {
      if (menuItems[item]) {
        const title = `${item}_key`;
        const accKey = getAccesskey(item);
        const opt = {
          enabled,
          title: i18n.getMessage(title, [label, accKey]),
        };
        if (item === MODE_EDIT) {
          opt.visible = true;
        } else {
          opt.visible = !vars[ONLY_EDITABLE];
        }
        func.push(contextMenus.update(item, opt));
      } else if (enabled) {
        const bool = !vars[ONLY_EDITABLE];
        switch (item) {
          case MODE_EDIT:
            func.push(createMenuItem(item, ["editable"]));
            break;
          case MODE_SELECTION:
            if (bool) {
              func.push(createMenuItem(item, ["selection"]));
            }
            break;
          case MODE_SOURCE:
            if (bool) {
              func.push(createMenuItem(item, ["frame", "page"]));
            }
            break;
          default:
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
export const cacheMenuItemTitle = async () => {
  const items = [MODE_SOURCE, MODE_MATHML, MODE_SVG];
  const label = varsLocal[EDITOR_LABEL] || i18n.getMessage(EXT_NAME);
  for (const item of items) {
    const title = `${item}_key`;
    const accKey = getAccesskey(item);
    varsLocal[item] = i18n.getMessage(title, [label, accKey]);
  }
};

/* UI */
/**
 * synchronize UI components
 * @returns {Promise.<Array>} - results of each handler
 */
export const syncUI = async () => Promise.all([
  setIcon(varsLocal[ICON_ID]),
  toggleBadge(),
]);

/* editor config */
/**
 * extract editor config data
 * @param {Object} data - editor config data
 * @returns {Promise.<Array>} - results of each handler
 */
export const extractEditorConfig = async (data = {}) => {
  const {editorConfigTimestamp, editorName, executable} = data;
  const store = await getStorage([
    EDITOR_FILE_NAME,
    EDITOR_LABEL,
  ]);
  const editorFileName = store[EDITOR_FILE_NAME] &&
                           store[EDITOR_FILE_NAME].value;
  const editorLabel = store[EDITOR_LABEL] && store[EDITOR_LABEL].value;
  const editorNewLabel = editorFileName === editorName && editorLabel ||
                         executable && editorName || "";
  return Promise.all([
    setStorage({
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
    }),
    portPostMsg({
      [EDITOR_CONFIG_RES]: {
        editorConfigTimestamp, editorName, executable,
        editorLabel: editorNewLabel,
      },
    }),
    restoreContextMenu(),
  ]);
};

/* extension */
/**
 * reload extension
 * @param {boolean} reload - reload
 * @returns {void}
 */
export const reloadExt = async (reload = false) => {
  if (reload) {
    if (host) {
      host.disconnect();
    }
    runtime.reload();
  }
};

/* handlers */
/**
 * open options page
 * @returns {?AsyncFunction} - open options page
 */
export const openOptionsPage = async () => runtime.openOptionsPage();

/**
 * handle host message
 * @param {Object} msg - message
 * @returns {Promise.<Array>} - result of each handler
 */
export const handleHostMsg = async msg => {
  const func = [];
  if (isObjectNotEmpty(msg)) {
    const {message, status} = msg;
    const log = message && `${HOST}: ${message}`;
    const iconUrl = runtime.getURL(ICON);
    const notifyMsg = {
      iconUrl, message,
      title: `${HOST}: ${status}`,
      type: "basic",
    };
    switch (status) {
      case `${PROCESS_CHILD}_stderr`:
      case "error":
        if (log) {
          func.push(logErr(log));
        }
        func.push(createNotification(status, notifyMsg));
        break;
      case "ready":
        hostStatus[HOST_CONNECTION] = true;
        func.push(
          hostPostMsg({
            [EDITOR_CONFIG_GET]: true,
            [HOST_VERSION_CHECK]: HOST_VERSION_MIN,
          })
        );
        break;
      case "warn":
        if (log) {
          func.push(logWarn(log));
        }
        func.push(createNotification(status, notifyMsg));
        break;
      default:
        if (log) {
          func.push(logMsg(log));
        }
    }
  }
  return Promise.all(func);
};

/**
 * handle message
 * @param {*} msg - message
 * @returns {Promise.<Array>} - results of each handler
 */
export const handleMsg = async msg => {
  const func = [];
  if (msg) {
    const items = Object.entries(msg);
    for (const [key, value] of items) {
      switch (key) {
        case CONTEXT_MENU:
          func.push(updateContextMenu(value));
          break;
        case EDITOR_CONFIG_GET:
        case LOCAL_FILE_VIEW:
        case TMP_FILE_CREATE:
        case TMP_FILE_GET:
          func.push(hostPostMsg({[key]: value}));
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
          func.push(portPostMsg({[HOST_STATUS]: hostStatus}));
          break;
        case HOST_VERSION: {
          if (isObjectNotEmpty(value)) {
            const {result} = value;
            if (Number.isInteger(result)) {
              hostStatus[HOST_VERSION] = result >= 0;
              func.push(toggleBadge());
            }
          }
          break;
        }
        case OPTIONS_OPEN:
          func.push(openOptionsPage());
          break;
        case STORAGE_SET:
          func.push(setStorage(value));
          break;
        case TMP_FILE_DATA_PORT:
          func.push(portPostMsg({[key]: value}));
          break;
        case TMP_FILE_DATA_REMOVE:
        case TMP_FILE_RES:
          func.push(postTmpFileData(key, value));
          break;
        default:
      }
    }
  }
  return Promise.all(func);
};

/**
 * handle port on disconnect
 * @param {Object} port - runtime.Port
 * @returns {AsyncFunction} - removePort()
 */
export const handlePortOnDisconnect = port => removePort(port).catch(throwErr);

/**
 * handle port on message
 * @param {*} msg - message
 * @returns {AsyncFunction} - handleMsg()
 */
export const handlePortOnMsg = msg => handleMsg(msg).catch(throwErr);

/**
 * handle connected port
 * @param {Object} port - runtime.Port
 * @returns {?AsyncFunction} - updateContextMenu()
 */
export const handlePort = async (port = {}) => {
  const {name: portName, sender} = port;
  let func;
  if (sender) {
    const {frameId, tab, url} = sender;
    if (tab) {
      const {active, id: tId, incognito, status, windowId: wId} = tab;
      const windowId = stringifyPositiveInt(wId, true);
      const tabId = stringifyPositiveInt(tId, true);
      if (windowId && tabId && url) {
        const portsTab = await createPortsMap(windowId, tabId);
        const portUrl = removeQueryFromURI(url);
        port.onDisconnect.addListener(handlePortOnDisconnect);
        port.onMessage.addListener(handlePortOnMsg);
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
  }
  return func || null;
};

/**
 * handle disconnected host
 * @returns {AsyncFunction} - toggle badge
 */
export const handleDisconnectedHost = async () => {
  hostStatus[HOST_CONNECTION] = false;
  return toggleBadge();
};

/**
 * handle tab activated
 * @param {!Object} info - activated tab info
 * @returns {Promise.<Array>} - results of each handler
 */
export const onTabActivated = async info => {
  const {tabId: tId, windowId: wId} = info;
  const windowId = stringifyPositiveInt(wId, true);
  const tabId = stringifyPositiveInt(tId, true);
  const func = [];
  let bool;
  if (windowId && tabId) {
    const portsWin = ports.get(windowId);
    const portsTab = portsWin && portsWin.get(tabId);
    const items = portsTab && portsTab.values();
    if (items) {
      for (const item of items) {
        const {name} = item;
        bool = name === PORT_CONTENT;
        if (bool) {
          break;
        }
      }
    }
  }
  varsLocal[MENU_ENABLED] = bool || false;
  if (bool) {
    func.push(portPostMsg({
      [TMP_FILE_REQ]: bool,
    }, windowId, tabId));
  }
  func.push(updateContextMenu(), syncUI());
  return Promise.all(func);
};

/**
 * handle tab updated
 * @param {!number} id - tabId
 * @param {!Object} info - changed tab info
 * @param {!Object} tab - tabs.Tab
 * @returns {Promise.<Array>} - results of each handler
 */
export const onTabUpdated = async (id, info, tab) => {
  if (!Number.isInteger(id)) {
    throw new TypeError(`Expected Number but got ${getType(id)}.`);
  }
  const {active, url, windowId: wId} = tab;
  const func = [];
  if (active) {
    const {status} = info;
    const windowId = stringifyPositiveInt(wId, true);
    const tabId = stringifyPositiveInt(id, true);
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
    if (status === "complete") {
      func.push(updateContextMenu(), syncUI());
    }
  }
  return Promise.all(func);
};

/**
 * handle tab removed
 * @param {!number} id - tabId
 * @param {!Object} info - removed tab info
 * @returns {Promise.<Array>} - results of each handler
 */
export const onTabRemoved = async (id, info) => {
  if (!Number.isInteger(id)) {
    throw new TypeError(`Expected Number but got ${getType(id)}.`);
  }
  const {windowId: wId} = info;
  const func = [];
  const win = await getWindow(wId).catch(logErr);
  if (win) {
    const {incognito} = win;
    const windowId = stringifyPositiveInt(wId, true);
    const tabId = stringifyPositiveInt(id, true);
    const portsWin = ports.get(windowId);
    const portsTab = portsWin && portsWin.get(tabId);
    if (portsTab) {
      func.push(
        restorePorts({windowId, tabId}),
        hostPostMsg({
          [TMP_FILE_DATA_REMOVE]: {
            tabId, windowId,
            dir: incognito && TMP_FILES_PB || TMP_FILES,
          },
        }),
      );
    }
  }
  return Promise.all(func);
};

/**
 * handle window focus changed
 * @returns {Promise.<Array>} - results of each handler
 */
export const onWindowFocusChanged = async () => {
  const win = await getCurrentWindow();
  const {focused, id, type} = win;
  const func = [];
  if (focused && id !== windows.WINDOW_ID_NONE && type === "normal") {
    const tId = await getActiveTabId(id);
    const windowId = stringifyPositiveInt(id, true);
    const tabId = stringifyPositiveInt(tId, true);
    if (windowId && tabId) {
      func.push(portPostMsg({
        [TMP_FILE_REQ]: true,
      }, windowId, tabId));
    }
    func.push(updateContextMenu());
  }
  func.push(syncUI());
  return Promise.all(func);
};

/**
 * handle window removed
 * @param {!number} id - windowId
 * @returns {Promise.<Array>} - results of each handler
 */
export const onWindowRemoved = async id => {
  if (!Number.isInteger(id)) {
    throw new TypeError(`Expected Number but got ${getType(id)}.`);
  }
  const windowId = stringifyPositiveInt(id, true);
  const bool = await checkIncognitoWindowExists();
  const func = [];
  if (windowId) {
    func.push(restorePorts({windowId}));
  }
  if (!bool) {
    func.push(hostPostMsg({[TMP_FILES_PB_REMOVE]: !bool}));
  }
  return Promise.all(func);
};

/**
 * handle command
 * @param {!string} cmd - command
 * @returns {?AsyncFunction} - command handler function
 */
export const handleCmd = async cmd => {
  if (!isString(cmd)) {
    throw new TypeError(`Expected String but got ${getType(cmd)}.`);
  }
  let func;
  switch (cmd) {
    case EDITOR_EXEC:
      func = postGetContent();
      break;
    case OPTIONS_OPEN:
      func = openOptionsPage();
      break;
    default:
  }
  return func || null;
};

/* handle variables */
/**
 * post variable
 * @param {Object} obj - variable object
 * @returns {?AsyncFunction} - port message
 */
export const portPostVar = async obj => {
  let func;
  if (obj) {
    func = portPostMsg({[VARS_SET]: obj});
  }
  return func || null;
};

/**
 * set variable
 * @param {string} item - item
 * @param {Object} obj - value object
 * @param {boolean} changed - changed
 * @returns {Promise.<Array>} - results of each handler
 */
export const setVar = async (item, obj, changed = false) => {
  if (!isString(item)) {
    throw new TypeError(`Expected String but got ${getType(item)}.`);
  }
  const func = [];
  if (isObjectNotEmpty(obj)) {
    const {app, checked, value} = obj;
    const hasPorts = ports.size > 0;
    switch (item) {
      case EDITOR_FILE_NAME:
        varsLocal[IS_EXECUTABLE] = app && !!app.executable;
        if (changed) {
          func.push(toggleBadge());
        }
        break;
      case EDITOR_LABEL:
        varsLocal[item] = value;
        func.push(cacheMenuItemTitle());
        if (changed) {
          func.push(updateContextMenu());
        }
        break;
      case HOST_ERR_NOTIFY:
        if (notifications && checked) {
          notifications.onClosed.addListener(clearNotification);
        }
        break;
      case ICON_AUTO:
      case ICON_BLACK:
      case ICON_COLOR:
      case ICON_DARK:
      case ICON_LIGHT:
      case ICON_WHITE:
        if (checked) {
          varsLocal[ICON_ID] = value;
          if (changed) {
            func.push(setIcon(value));
          }
        }
        break;
      case ONLY_EDITABLE:
        vars[item] = !!checked;
        if (hasPorts) {
          func.push(portPostVar({[item]: !!checked}));
        }
        if (changed) {
          func.push(restoreContextMenu());
        }
        break;
      case SYNC_AUTO:
        vars[item] = !!checked;
        if (hasPorts) {
          func.push(portPostVar({[item]: !!checked}));
        }
        break;
      case SYNC_AUTO_URL:
        vars[item] = value;
        if (hasPorts) {
          func.push(portPostVar({[item]: value}));
        }
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
export const setVars = async (data = {}) => {
  const items = Object.entries(data);
  const func = [];
  for (const [key, value] of items) {
    const {newValue} = value;
    func.push(setVar(key, newValue || value, !!newValue));
  }
  return Promise.all(func);
};
