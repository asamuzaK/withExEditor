/**
 * main.js
 */

/* shared */
import {
  getType, isObjectNotEmpty, isString, logErr, logMsg, logWarn,
  removeQueryFromURI, stringifyPositiveInt, throwErr
} from './common.js';
import {
  checkIncognitoWindowExists, clearNotification, createNotification,
  getActiveTab, getActiveTabId, getAllStorage, getCurrentWindow, getOs,
  getStorage, getWindow, sendMessage, setStorage
} from './browser.js';
import {
  CONTENT_GET, CONTEXT_MENU, EDITOR_CONFIG_GET, EDITOR_CONFIG_RES,
  EDITOR_CONFIG_TS, EDITOR_EXEC, EDITOR_FILE_NAME, EDITOR_LABEL, EXT_NAME,
  EXT_RELOAD, FILE_EXT_SELECT, FILE_EXT_SELECT_HTML, FILE_EXT_SELECT_MD,
  FILE_EXT_SELECT_TXT, HOST, HOST_COMPAT, HOST_CONNECTION, HOST_ERR_NOTIFY,
  HOST_STATUS, HOST_STATUS_GET, HOST_VERSION, HOST_VERSION_CHECK,
  HOST_VERSION_LATEST, HOST_VERSION_MIN, ICON, ICON_AUTO, ICON_BLACK,
  ICON_COLOR, ICON_CONTEXT_ID, ICON_DARK, ICON_ID, ICON_LIGHT, ICON_WHITE,
  INFO_COLOR, INFO_TEXT, IS_EXECUTABLE, IS_MAC, IS_WEBEXT, LOCAL_FILE_VIEW,
  MENU_ENABLED, MODE_EDIT, MODE_EDIT_EXT, MODE_EDIT_HTML, MODE_EDIT_MD,
  MODE_EDIT_TXT, MODE_MATHML, MODE_SELECTION, MODE_SOURCE, MODE_SVG,
  ONLY_EDITABLE, OPTIONS_OPEN, PORT_CONNECT, PORT_CONTENT, PROCESS_CHILD,
  STORAGE_SET, SYNC_AUTO, SYNC_AUTO_URL, TMP_FILES, TMP_FILES_PB,
  TMP_FILES_PB_REMOVE, TMP_FILE_CREATE, TMP_FILE_DATA_PORT,
  TMP_FILE_DATA_REMOVE, TMP_FILE_GET, TMP_FILE_REQ, TMP_FILE_RES, VARS_SET,
  WARN_COLOR, WARN_TEXT, WEBEXT_ID
} from './constant.js';

/* api */
const {
  browserAction, i18n, notifications, runtime, tabs, windows
} = browser;
const menus = browser.menus ?? browser.contextMenus;

/* constants */
const { TAB_ID_NONE } = tabs;
const { WINDOW_ID_NONE } = windows;

/* variables */
export const vars = {
  [IS_MAC]: false,
  [IS_WEBEXT]: runtime.id === WEBEXT_ID,
  [ONLY_EDITABLE]: false,
  [SYNC_AUTO]: false,
  [SYNC_AUTO_URL]: null
};

/* local variables */
export const varsLocal = {
  [EDITOR_LABEL]: '',
  [FILE_EXT_SELECT]: false,
  [FILE_EXT_SELECT_HTML]: false,
  [FILE_EXT_SELECT_MD]: false,
  [FILE_EXT_SELECT_TXT]: false,
  [ICON_ID]: '',
  [IS_EXECUTABLE]: false,
  [MENU_ENABLED]: false,
  [MODE_MATHML]: '',
  [MODE_SOURCE]: '',
  [MODE_SVG]: ''
};

/* UI */
/**
 * set icon
 *
 * @param {string} id - icon fragment ID
 * @returns {Function} - browserAction.setIcon()
 */
export const setIcon = async (id = varsLocal[ICON_ID]) => {
  const icon = runtime.getURL(ICON);
  const path = `${icon}${id}`;
  return browserAction.setIcon({ path });
};

/**
 * set default icon
 *
 * @returns {?Function} - setIcon()
 */
export const setDefaultIcon = async () => {
  let func;
  if (vars[IS_WEBEXT] && !varsLocal[ICON_ID]) {
    func = setIcon(ICON_CONTEXT_ID);
  }
  return func || null;
};

/**
 * toggle badge
 *
 * @returns {Promise.<Array>} - results of each handler
 */
export const toggleBadge = async () => {
  const func = [];
  let color, text;
  if (hostStatus[HOST_CONNECTION] && hostStatus[HOST_COMPAT] &&
      varsLocal[IS_EXECUTABLE]) {
    if (hostStatus[HOST_VERSION_LATEST]) {
      color = INFO_COLOR;
      text = INFO_TEXT;
    } else {
      color = [0, 0, 0, 0];
      text = '';
    }
  } else {
    color = WARN_COLOR;
    text = WARN_TEXT;
  }
  func.push(
    browserAction.setBadgeBackgroundColor({ color }),
    browserAction.setBadgeText({ text })
  );
  if (text && typeof browserAction.setBadgeTextColor === 'function') {
    func.push(browserAction.setBadgeTextColor({ color: 'white' }));
  }
  return Promise.all(func);
};

/**
 * open options page
 *
 * @returns {?Function} - runtime.openOptionsPage()
 */
export const openOptionsPage = async () => runtime.openOptionsPage();

/* context menu items */
export const menuItems = {
  [MODE_EDIT]: {
    id: MODE_EDIT,
    contexts: ['editable'],
    placeholder: '(&E)'
  },
  [MODE_EDIT_TXT]: {
    id: MODE_EDIT_TXT,
    contexts: ['editable'],
    parentId: MODE_EDIT,
    placeholder: '.&txt'
  },
  [MODE_EDIT_HTML]: {
    id: MODE_EDIT_HTML,
    contexts: ['editable'],
    parentId: MODE_EDIT,
    placeholder: '.&html'
  },
  [MODE_EDIT_MD]: {
    id: MODE_EDIT_MD,
    contexts: ['editable'],
    parentId: MODE_EDIT,
    placeholder: '.&md'
  },
  [MODE_MATHML]: {
    id: MODE_MATHML,
    contexts: ['frame', 'page'],
    placeholder: '(&V)'
  },
  [MODE_SELECTION]: {
    id: MODE_SELECTION,
    contexts: ['selection'],
    placeholder: '(&V)'
  },
  [MODE_SOURCE]: {
    id: MODE_SOURCE,
    contexts: ['frame', 'page'],
    placeholder: '(&V)'
  },
  [MODE_SVG]: {
    id: MODE_SVG,
    contexts: ['frame', 'page'],
    placeholder: '(&V)'
  }
};

/**
 * create menu item data
 *
 * @param {string} key - item key
 * @returns {object} - item data
 */
export const createMenuItemData = key => {
  const data = {};
  if (isString(key) && menuItems[key]) {
    const { contexts, placeholder, parentId } = menuItems[key];
    const enabled = !!varsLocal[MENU_ENABLED] && !!varsLocal[IS_EXECUTABLE] &&
                    !!hostStatus[HOST_COMPAT];
    if (parentId) {
      const keys = [MODE_EDIT_HTML, MODE_EDIT_MD, MODE_EDIT_TXT];
      if (keys.includes(key) && varsLocal[FILE_EXT_SELECT]) {
        let bool;
        switch (key) {
          case MODE_EDIT_HTML:
            bool = !!varsLocal[FILE_EXT_SELECT_HTML];
            break;
          case MODE_EDIT_MD:
            bool = !!varsLocal[FILE_EXT_SELECT_MD];
            break;
          default:
            bool = !!varsLocal[FILE_EXT_SELECT_TXT];
        }
        if (bool) {
          data.contexts = contexts;
          data.enabled = enabled;
          data.parentId = parentId;
          data.title = i18n.getMessage(`${MODE_EDIT_EXT}_key`, [placeholder]);
          data.visible = true;
        }
      }
    } else {
      const label = varsLocal[EDITOR_LABEL] || i18n.getMessage(EXT_NAME);
      const accKey = (vars[IS_WEBEXT] && placeholder) || ` ${placeholder}`;
      data.contexts = contexts;
      data.enabled = enabled;
      data.title = i18n.getMessage(`${key}_key`, [label, accKey]);
      if (key === MODE_EDIT) {
        data.visible = true;
      } else if (key === MODE_MATHML || key === MODE_SVG) {
        data.visible = false;
      } else {
        data.visible = !vars[ONLY_EDITABLE];
      }
    }
  }
  return data;
};

/**
 * create context menu
 *
 * @returns {Promise.<Array>} - results of each handler
 */
export const createContextMenu = async () => {
  const items = Object.keys(menuItems);
  const func = [];
  for (const item of items) {
    const itemData = createMenuItemData(item);
    if (isObjectNotEmpty(itemData)) {
      itemData.id = item;
      func.push(menus.create(itemData));
    }
  }
  return Promise.all(func);
};

/**
 * update context menu
 *
 * @param {object} data - context data
 * @param {boolean} all - update all items
 * @returns {Promise.<Array>} - results of each handler
 */
export const updateContextMenu = async (data, all = false) => {
  const func = [];
  if (isObjectNotEmpty(data)) {
    const items = Object.entries(data);
    const itemEnabled = !!varsLocal[MENU_ENABLED] &&
                        !!varsLocal[IS_EXECUTABLE] && !!hostStatus[HOST_COMPAT];
    for (const [key, value] of items) {
      const keys = [MODE_EDIT, MODE_SOURCE];
      if (keys.includes(key) && isObjectNotEmpty(value)) {
        const { enabled, mode } = value;
        if (key === MODE_EDIT) {
          func.push(menus.update(key, {
            enabled: !!enabled && itemEnabled
          }));
        } else {
          switch (mode) {
            case MODE_MATHML:
              func.push(
                menus.update(mode, {
                  enabled: itemEnabled,
                  visible: !vars[ONLY_EDITABLE]
                }),
                menus.update(MODE_SOURCE, {
                  visible: false
                }),
                menus.update(MODE_SVG, {
                  visible: false
                })
              );
              break;
            case MODE_SVG:
              func.push(
                menus.update(mode, {
                  enabled: itemEnabled,
                  visible: !vars[ONLY_EDITABLE]
                }),
                menus.update(MODE_MATHML, {
                  visible: false
                }),
                menus.update(MODE_SOURCE, {
                  visible: false
                })
              );
              break;
            default:
              func.push(
                menus.update(MODE_SOURCE, {
                  enabled: itemEnabled,
                  visible: !vars[ONLY_EDITABLE]
                }),
                menus.update(MODE_MATHML, {
                  visible: false
                }),
                menus.update(MODE_SVG, {
                  visible: false
                })
              );
          }
        }
      }
    }
  } else if (all) {
    const items = Object.keys(menuItems);
    for (const item of items) {
      const itemData = createMenuItemData(item);
      if (isObjectNotEmpty(itemData)) {
        func.push(menus.update(item, itemData));
      }
    }
  }
  return Promise.all(func);
};

/**
 * restore context menu
 *
 * @returns {Function} - promise chain
 */
export const restoreContextMenu = async () =>
  menus.removeAll().then(createContextMenu);

/* native application host */
export const host = runtime.connectNative(HOST);

/* host status */
export const hostStatus = {
  [HOST_COMPAT]: false,
  [HOST_CONNECTION]: false,
  [HOST_VERSION_LATEST]: null
};

/**
 * post message to host
 *
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
 *
 * @param {string} windowId - window ID
 * @param {string} tabId - tabId
 * @returns {object} - Map
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
 *
 * @param {object} data - disconnected port data
 * @returns {?Function} - restorePorts() (recursive)
 */
export const restorePorts = async (data = {}) => {
  const { tabId, windowId } = data;
  let func;
  if (windowId && tabId && ports.has(windowId)) {
    const portsWin = ports.get(windowId);
    portsWin.delete(tabId);
    if (portsWin.size === 0) {
      func = restorePorts({ windowId });
    }
  } else if (windowId) {
    ports.delete(windowId);
  }
  return func || null;
};

/**
 * remove port from ports collection
 *
 * @param {object} port - removed port
 * @returns {Promise.<Array>} - results of each handler
 */
export const removePort = async (port = {}) => {
  const { error, sender } = port;
  const e = error || (runtime.lastError?.message && runtime.lastError);
  const func = [];
  if (e) {
    func.push(logErr(e));
  }
  if (isObjectNotEmpty(sender)) {
    const { tab, url } = sender;
    const { incognito, windowId: wId, id: tId } = tab;
    const windowId = stringifyPositiveInt(wId, true);
    const portsWin = ports.get(windowId);
    if (portsWin) {
      const tabId = stringifyPositiveInt(tId, true);
      const portsTab = portsWin.get(tabId);
      if (portsTab) {
        const portUrl = removeQueryFromURI(url);
        const { hostname } = new URL(portUrl);
        portsTab.delete(portUrl);
        func.push(hostPostMsg({
          [TMP_FILE_DATA_REMOVE]: {
            tabId,
            windowId,
            dir: incognito ? TMP_FILES_PB : TMP_FILES,
            host: hostname
          }
        }));
      }
    }
  }
  return Promise.all(func);
};

/**
 * post message to port
 *
 * @param {*} msg - message
 * @param {object} opt - option
 * @returns {Promise.<Array>} - results of each handler
 */
export const portPostMsg = async (msg, opt = {}) => {
  const func = [];
  if (msg) {
    const { windowId, tabId, portKey, recurse } = opt;
    const portsWin = isString(windowId) && ports.get(windowId);
    const portsTab = portsWin && isString(tabId) && portsWin.get(tabId);
    const port = portsTab && isString(portKey) && portsTab.get(portKey);
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
    } else if (recurse) {
      if (portsWin) {
        const items = portsWin.keys();
        for (const itemKey of items) {
          func.push(portPostMsg(msg, {
            windowId,
            tabId: itemKey
          }));
        }
      } else {
        const items = ports.keys();
        for (const itemKey of items) {
          func.push(portPostMsg(msg, {
            recurse,
            windowId: itemKey
          }));
        }
      }
    }
  }
  return Promise.all(func);
};

/**
 * post context menu data
 *
 * @param {object} info - menus.OnClickData
 * @param {object} tab - tabs.Tab
 * @returns {?Function} - portPostMsg()
 */
export const postContextMenuData = async (info, tab) => {
  let func;
  if (info && tab) {
    const { frameUrl, pageUrl } = info;
    const { windowId: wId, id: tId } = tab;
    const windowId = stringifyPositiveInt(wId, true);
    const tabId = stringifyPositiveInt(tId, true);
    const portKey = removeQueryFromURI(frameUrl || pageUrl);
    if (windowId && tabId && portKey) {
      func = portPostMsg({
        [CONTENT_GET]: { info, tab }
      }, {
        windowId, tabId, portKey
      });
    }
  }
  return func || null;
};

/**
 * post tmp file data
 *
 * @param {string} key - message key
 * @param {object} msg - message
 * @returns {?Function} - portPostMsg()
 */
export const postTmpFileData = async (key, msg = {}) => {
  if (!isString(key)) {
    throw new TypeError(`Expected String but got ${getType(key)}.`);
  }
  const { data } = msg;
  let func;
  if (isObjectNotEmpty(data)) {
    const { tabId, windowId } = data;
    if (isString(tabId) && /^\d+$/.test(tabId) &&
        isString(windowId) && /^\d+$/.test(windowId)) {
      const activeTabId = await getActiveTabId(windowId * 1);
      if (activeTabId === tabId * 1) {
        func = portPostMsg({
          [key]: msg
        }, {
          windowId, tabId
        });
      }
    }
  }
  return func || null;
};

/**
 * post get content message to active tab
 *
 * @returns {?Function} - portPostMsg()
 */
export const postGetContent = async () => {
  const tab = await getActiveTab();
  let func;
  if (tab) {
    const { id: tId, windowId: wId } = tab;
    const windowId = stringifyPositiveInt(wId, true);
    const tabId = stringifyPositiveInt(tId, true);
    const msg = {
      [CONTENT_GET]: { tab }
    };
    func = portPostMsg(msg, {
      windowId, tabId
    });
  }
  return func || null;
};

/**
 * reload extension
 *
 * @param {boolean} reload - reload
 * @returns {void}
 */
export const reloadExt = async (reload = false) => {
  if (reload) {
    host?.disconnect();
    runtime.reload();
  }
};

/* message handlers */
/**
 * handle host message
 *
 * @param {object} msg - message
 * @returns {Promise.<Array>} - result of each handler
 */
export const handleHostMsg = async msg => {
  const func = [];
  if (isObjectNotEmpty(msg)) {
    const { message, status } = msg;
    const log = message && `${HOST}: ${message}`;
    const iconUrl = runtime.getURL(ICON);
    const notifyMsg = {
      iconUrl,
      message,
      title: `${HOST}: ${status}`,
      type: 'basic'
    };
    switch (status) {
      case `${PROCESS_CHILD}_stderr`:
      case 'error':
        if (log) {
          func.push(logErr(log));
        }
        func.push(createNotification(status, notifyMsg));
        break;
      case 'ready':
        hostStatus[HOST_CONNECTION] = true;
        func.push(hostPostMsg({
          [EDITOR_CONFIG_GET]: true,
          [HOST_VERSION_CHECK]: HOST_VERSION_MIN
        }));
        break;
      case 'warn':
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
 *
 * @param {*} msg - message
 * @param {object} sender - sender
 * @returns {Promise.<Array>} - results of each handler
 */
export const handleMsg = async (msg, sender) => {
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
          func.push(hostPostMsg({ [key]: value }));
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
          func.push(portPostMsg({
            [HOST_STATUS]: hostStatus
          }, {
            recurse: true
          }));
          break;
        case HOST_VERSION: {
          if (isObjectNotEmpty(value)) {
            const { isLatest, latest, result } = value;
            hostStatus[HOST_VERSION_LATEST] = !isLatest ? latest : null;
            if (isLatest) {
              hostStatus[HOST_COMPAT] = !!isLatest;
            } else if (Number.isInteger(result)) {
              hostStatus[HOST_COMPAT] = result >= 0;
            }
            func.push(toggleBadge());
          }
          break;
        }
        case OPTIONS_OPEN:
          func.push(openOptionsPage());
          break;
        case PORT_CONNECT: {
          if (sender) {
            const { tab } = sender;
            if (tab) {
              const { id: tabId, windowId } = tab;
              if (Number.isInteger(tabId) && tabId !== TAB_ID_NONE &&
                  Number.isInteger(windowId) &&
                  windowId !== WINDOW_ID_NONE) {
                func.push(sendMessage(tabId, {
                  [PORT_CONNECT]: true
                }));
              }
            }
          }
          break;
        }
        case STORAGE_SET:
          func.push(setStorage(value));
          break;
        case TMP_FILE_DATA_PORT:
          func.push(portPostMsg({
            [key]: value
          }, {
            recurse: true
          }));
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
 *
 * @param {object} port - runtime.Port
 * @returns {Function} - promise chain
 */
export const handlePortOnDisconnect = port => removePort(port).catch(throwErr);

/**
 * handle port on message
 *
 * @param {*} msg - message
 * @returns {Function} - promise chain
 */
export const handlePortOnMsg = msg => handleMsg(msg).catch(throwErr);

/**
 * handle connected port
 *
 * @param {object} port - runtime.Port
 * @returns {?Function} - updateContextMenu()
 */
export const handlePort = async (port = {}) => {
  const { name: portName, sender } = port;
  let func;
  if (sender) {
    const { tab, url } = sender;
    if (tab) {
      const { active, id: tId, incognito, status, windowId: wId } = tab;
      const windowId = stringifyPositiveInt(wId, true);
      const tabId = stringifyPositiveInt(tId, true);
      if (windowId && tabId && url) {
        const portsTab = await createPortsMap(windowId, tabId);
        const portUrl = removeQueryFromURI(url);
        port.onDisconnect.addListener(handlePortOnDisconnect);
        port.onMessage.addListener(handlePortOnMsg);
        portsTab.set(portUrl, port);
        port.postMessage({
          incognito,
          tabId,
          windowId,
          [VARS_SET]: vars
        });
      }
      if (portName === PORT_CONTENT && active && status === 'complete') {
        varsLocal[MENU_ENABLED] = true;
        func = updateContextMenu(null, true);
      }
    }
  }
  return func || null;
};

/* tab / window handlers */
/**
 * handle activated tab
 *
 * @param {!object} info - activated tab info
 * @returns {Promise.<Array>} - results of each handler
 */
export const onTabActivated = async info => {
  const { tabId: tId, windowId: wId } = info;
  const windowId = stringifyPositiveInt(wId, true);
  const tabId = stringifyPositiveInt(tId, true);
  const func = [];
  let bool;
  if (windowId && tabId) {
    const portsWin = ports.get(windowId);
    const portsTab = portsWin?.get(tabId);
    const items = portsTab?.values();
    if (items) {
      for (const item of items) {
        const { name } = item;
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
      [TMP_FILE_REQ]: bool
    }, {
      windowId, tabId
    }));
  }
  func.push(updateContextMenu(null, true));
  return Promise.all(func);
};

/**
 * handle updated tab
 *
 * @param {!number} id - tabId
 * @param {!object} info - changed tab info
 * @param {!object} tab - tabs.Tab
 * @returns {Promise.<Array>} - results of each handler
 */
export const onTabUpdated = async (id, info, tab) => {
  if (!Number.isInteger(id)) {
    throw new TypeError(`Expected Number but got ${getType(id)}.`);
  }
  const { active, url, windowId: wId } = tab;
  const func = [];
  if (active) {
    const { status } = info;
    const windowId = stringifyPositiveInt(wId, true);
    const tabId = stringifyPositiveInt(id, true);
    const portUrl = removeQueryFromURI(url);
    const portsWin = ports.get(windowId);
    const portsTab = portsWin?.get(tabId);
    const port = portsTab?.get(portUrl);
    if (port) {
      const { name } = port;
      varsLocal[MENU_ENABLED] = name === PORT_CONTENT;
    } else {
      varsLocal[MENU_ENABLED] = false;
    }
    if (status === 'complete') {
      func.push(updateContextMenu(null, true));
    }
  }
  return Promise.all(func);
};

/**
 * handle removed tab
 *
 * @param {!number} id - tabId
 * @param {!object} info - removed tab info
 * @returns {Promise.<Array>} - results of each handler
 */
export const onTabRemoved = async (id, info) => {
  if (!Number.isInteger(id)) {
    throw new TypeError(`Expected Number but got ${getType(id)}.`);
  }
  const { windowId: wId } = info;
  const func = [];
  const win = await getWindow(wId);
  if (win) {
    const { incognito } = win;
    const windowId = stringifyPositiveInt(wId, true);
    const tabId = stringifyPositiveInt(id, true);
    const portsWin = ports.get(windowId);
    const portsTab = portsWin?.get(tabId);
    if (portsTab) {
      func.push(
        restorePorts({ windowId, tabId }),
        hostPostMsg({
          [TMP_FILE_DATA_REMOVE]: {
            tabId,
            windowId,
            dir: incognito ? TMP_FILES_PB : TMP_FILES
          }
        })
      );
    }
  }
  return Promise.all(func);
};

/**
 * handle focus changed window
 *
 * @returns {Promise.<Array>} - results of each handler
 */
export const onWindowFocusChanged = async () => {
  const win = await getCurrentWindow();
  const { focused, id, type } = win;
  const func = [];
  if (focused && id !== WINDOW_ID_NONE && type === 'normal') {
    const tId = await getActiveTabId(id);
    const windowId = stringifyPositiveInt(id, true);
    const tabId = stringifyPositiveInt(tId, true);
    if (windowId && tabId) {
      func.push(portPostMsg({
        [TMP_FILE_REQ]: true
      }, {
        windowId, tabId
      }));
    }
    func.push(updateContextMenu(null, true));
  }
  return Promise.all(func);
};

/**
 * handle removed window
 *
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
    func.push(restorePorts({ windowId }));
  }
  if (!bool) {
    func.push(hostPostMsg({ [TMP_FILES_PB_REMOVE]: !bool }));
  }
  return Promise.all(func);
};

/**
 * handle command
 *
 * @param {!string} cmd - command
 * @returns {?Function} - postGetContent() / openOptionsPage()
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
 *
 * @param {object} obj - variable object
 * @returns {?Function} - portPostMsg()
 */
export const portPostVar = async obj => {
  let func;
  if (obj) {
    func = portPostMsg({
      [VARS_SET]: obj
    }, {
      recurse: true
    });
  }
  return func || null;
};

/**
 * set variable
 *
 * @param {string} item - item
 * @param {object} obj - value object
 * @param {boolean} changed - changed
 * @returns {Promise.<Array>} - results of each handler
 */
export const setVar = async (item, obj, changed = false) => {
  if (!isString(item)) {
    throw new TypeError(`Expected String but got ${getType(item)}.`);
  }
  const func = [];
  if (isObjectNotEmpty(obj)) {
    const { app, checked, value } = obj;
    const hasPorts = ports.size > 0;
    switch (item) {
      case EDITOR_FILE_NAME:
        varsLocal[IS_EXECUTABLE] = !!(app?.executable);
        if (changed) {
          func.push(toggleBadge());
        }
        break;
      case EDITOR_LABEL:
        varsLocal[item] = value;
        if (changed) {
          func.push(updateContextMenu(null, true));
        }
        break;
      case FILE_EXT_SELECT:
      case FILE_EXT_SELECT_HTML:
      case FILE_EXT_SELECT_MD:
      case FILE_EXT_SELECT_TXT:
        varsLocal[item] = !!checked;
        if (changed) {
          func.push(restoreContextMenu());
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
          func.push(setIcon(value));
        }
        break;
      case ONLY_EDITABLE:
        vars[item] = !!checked;
        if (hasPorts) {
          func.push(portPostVar({ [item]: !!checked }));
        }
        if (changed) {
          func.push(restoreContextMenu());
        }
        break;
      case SYNC_AUTO:
        vars[item] = !!checked;
        if (hasPorts) {
          func.push(portPostVar({ [item]: !!checked }));
        }
        break;
      case SYNC_AUTO_URL:
        vars[item] = value;
        if (hasPorts) {
          func.push(portPostVar({ [item]: value }));
        }
        break;
      default:
    }
  }
  return Promise.all(func);
};

/**
 * set variables
 *
 * @param {object} data - data
 * @returns {Promise.<Array>} - results of each handler
 */
export const setVars = async (data = {}) => {
  const items = Object.entries(data);
  const func = [];
  for (const [key, value] of items) {
    const { newValue } = value;
    func.push(setVar(key, newValue || value, !!newValue));
  }
  return Promise.all(func);
};

/**
 * set OS
 *
 * @returns {void}
 */
export const setOs = async () => {
  const os = await getOs();
  vars[IS_MAC] = os === 'mac';
};

/* editor config */
/**
 * extract editor config data
 *
 * @param {object} data - editor config data
 * @returns {Promise.<Array>} - results of each handler
 */
export const extractEditorConfig = async (data = {}) => {
  const { editorConfigTimestamp, editorName, executable } = data;
  const store = await getStorage([
    EDITOR_FILE_NAME,
    EDITOR_LABEL
  ]);
  const editorFileName = store && store[EDITOR_FILE_NAME]?.value;
  const editorLabel = store && store[EDITOR_LABEL]?.value;
  const editorNewLabel = (editorFileName === editorName && editorLabel) ||
                         (executable && editorName) || '';
  const func = [
    setStorage({
      [EDITOR_CONFIG_TS]: {
        id: EDITOR_CONFIG_TS,
        app: {
          executable: !!executable
        },
        checked: false,
        value: editorConfigTimestamp || 0
      },
      [EDITOR_FILE_NAME]: {
        id: EDITOR_FILE_NAME,
        app: {
          executable: !!executable
        },
        checked: false,
        value: executable ? editorName : ''
      },
      [EDITOR_LABEL]: {
        id: EDITOR_LABEL,
        app: {
          executable: false
        },
        checked: false,
        value: editorNewLabel
      }
    }),
    portPostMsg({
      [EDITOR_CONFIG_RES]: {
        editorConfigTimestamp,
        editorName,
        executable,
        editorLabel: editorNewLabel
      }
    }, {
      recurse: true
    }),
    restoreContextMenu()
  ];
  return Promise.all(func);
};

/* extension */
/**
 * handle disconnected host
 *
 * @param {object} port - runtime.Port
 * @returns {Promise.<Array>} - results of each handler
 */
export const handleDisconnectedHost = async (port = {}) => {
  const { error } = port;
  const e = error || (runtime.lastError?.message && runtime.lastError);
  const func = [toggleBadge()];
  if (e) {
    func.push(logErr(e));
  }
  hostStatus[HOST_CONNECTION] = false;
  return Promise.all(func);
};

/**
 * handle host on disconnect
 *
 * @param {object} port - removed host
 * @returns {Function} - promise chain
 */
export const handleHostOnDisconnect = port =>
  handleDisconnectedHost(port).catch(throwErr);

/**
 * set host
 *
 * @returns {void}
 */
export const setHost = async () => {
  host.onDisconnect.addListener(handleHostOnDisconnect);
  host.onMessage.addListener(handlePortOnMsg);
};

/**
 * startup
 *
 * @returns {Function} - promise chain
 */
export const startup = () => Promise.all([
  setHost(),
  setOs()
]).then(getAllStorage).then(setVars).then(setDefaultIcon).then(toggleBadge);
