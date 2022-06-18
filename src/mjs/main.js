/**
 * main.js
 */

/* shared */
import {
  getType, isObjectNotEmpty, isString, logErr, logMsg, logWarn, throwErr
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
  text && typeof browserAction.setBadgeTextColor === 'function' &&
    func.push(browserAction.setBadgeTextColor({ color: 'white' }));
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

/* ports */
export const ports = new Map();

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
    const { allPorts, portId } = opt;
    if (allPorts) {
      const items = ports.keys();
      for (const itemKey of items) {
        const item = ports.get(itemKey);
        func.push(item.postMessage(msg));
      }
    } else {
      const port = isString(portId) && ports.get(portId);
      if (port) {
        func.push(port.postMessage(msg));
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
export const postContextMenuData = async (info, tab = {}) => {
  const { id: tabId, windowId } = tab;
  let func;
  if (Number.isInteger(tabId) && tabId !== TAB_ID_NONE &&
      Number.isInteger(windowId) && windowId !== WINDOW_ID_NONE) {
    const portId = `${PORT_CONTENT}_${windowId}_${tabId}`;
    func = portPostMsg({
      [CONTENT_GET]: {
        info,
        tab
      }
    }, {
      portId
    });
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
    const activeTabId = await getActiveTabId(windowId);
    if (`${activeTabId}` === `${tabId}`) {
      const portId = `${PORT_CONTENT}_${windowId}_${tabId}`;
      func = portPostMsg({
        [key]: msg
      }, {
        portId
      });
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
    const { id: tabId, windowId } = tab;
    const portId = `${PORT_CONTENT}_${windowId}_${tabId}`;
    func = portPostMsg({
      [CONTENT_GET]: {
        tab
      }
    }, {
      portId
    });
  }
  return func || null;
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
            allPorts: true
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
                  Number.isInteger(windowId) && windowId !== WINDOW_ID_NONE) {
                const portId = `${PORT_CONTENT}_${windowId}_${tabId}`;
                func.push(sendMessage(tabId, {
                  [PORT_CONNECT]: portId
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
            allPorts: true
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

/* port handlers */
/**
 * handle port on message
 *
 * @param {*} msg - message
 * @returns {Function} - promise chain
 */
export const handlePortOnMsg = msg => handleMsg(msg).catch(throwErr);

/**
 * handle disconnected port
 *
 * @param {object} port - runtime.Port
 * @returns {?Function} - logErr()
 */
export const handleDisconnectedPort = (port = {}) => {
  const { error, name: portId } = port;
  const e = error || (runtime.lastError?.message && runtime.lastError);
  let func;
  if (e) {
    func = logErr(e);
  }
  ports.delete(portId);
  return func || null;
};

/**
 * handle connected port
 *
 * @param {object} port - runtime.Port
 * @returns {Promise.<Array>} - results of each handler
 */
export const handleConnectedPort = async (port = {}) => {
  const { name: portId, sender } = port;
  const func = [];
  if (isString(portId)) {
    port.onDisconnect.addListener(handleDisconnectedPort);
    port.onMessage.addListener(handlePortOnMsg);
    ports.set(portId, port);
    if (sender) {
      const { tab } = sender;
      if (tab) {
        const { active, id: tabId, incognito, status, windowId } = tab;
        func.push(port.postMessage({
          incognito,
          tabId,
          windowId,
          [VARS_SET]: vars
        }));
        if (portId.startsWith(PORT_CONTENT) && active &&
            status === 'complete') {
          varsLocal[MENU_ENABLED] = true;
          func.push(updateContextMenu(null, true));
        }
      }
    }
  }
  return Promise.all(func);
};

/* tab / window handlers */
/**
 * handle activated tab
 *
 * @param {object} info - activated tab info
 * @returns {Promise.<Array>} - results of each handler
 */
export const handleActivatedTab = async (info = {}) => {
  const { tabId, windowId } = info;
  const func = [];
  let bool;
  if (Number.isInteger(tabId) && tabId !== TAB_ID_NONE &&
      Number.isInteger(windowId) && windowId !== WINDOW_ID_NONE) {
    const portId = `${PORT_CONTENT}_${windowId}_${tabId}`;
    bool = ports.has(portId);
    if (bool) {
      func.push(portPostMsg({
        [TMP_FILE_REQ]: bool
      }, {
        portId
      }));
    }
  }
  varsLocal[MENU_ENABLED] = !!bool;
  func.push(updateContextMenu(null, true));
  return Promise.all(func);
};

/**
 * handle updated tab
 *
 * @param {number} tabId - tabId
 * @param {object} info - changed tab info
 * @param {object} tab - tabs.Tab
 * @returns {?Function} - results of each handler
 */
export const handleUpdatedTab = async (tabId, info, tab = {}) => {
  const { active, windowId } = tab;
  let func;
  if (active && isObjectNotEmpty(info) &&
      Number.isInteger(tabId) && tabId !== TAB_ID_NONE &&
      Number.isInteger(windowId) && windowId !== WINDOW_ID_NONE) {
    const { status } = info;
    if (status === 'complete') {
      const portId = `${PORT_CONTENT}_${windowId}_${tabId}`;
      varsLocal[MENU_ENABLED] = ports.has(portId);
      func = updateContextMenu(null, true);
    }
  }
  return func || null;
};

/**
 * handle removed tab
 *
 * @param {number} tabId - tabId
 * @param {object} info - removed tab info
 * @returns {Promise.<Array>} - results of each handler
 */
export const handleRemovedTab = async (tabId, info = {}) => {
  const { windowId } = info;
  let func;
  if (Number.isInteger(tabId) && tabId !== TAB_ID_NONE &&
      Number.isInteger(windowId) && windowId !== WINDOW_ID_NONE) {
    const win = await getWindow(windowId);
    if (win) {
      const { incognito } = win;
      func = hostPostMsg({
        [TMP_FILE_DATA_REMOVE]: {
          tabId,
          windowId,
          dir: incognito ? TMP_FILES_PB : TMP_FILES
        }
      });
    }
  }
  return func || null;
};

/**
 * handle focused window
 *
 * @returns {Promise.<Array>} - results of each handler
 */
export const handleFocusedWindow = async () => {
  const win = await getCurrentWindow();
  const { focused, id: windowId, type } = win;
  const func = [];
  if (focused && windowId !== WINDOW_ID_NONE && type === 'normal') {
    const tabId = await getActiveTabId(windowId);
    let bool;
    if (Number.isInteger(tabId) && tabId !== TAB_ID_NONE) {
      const portId = `${PORT_CONTENT}_${windowId}_${tabId}`;
      bool = ports.has(portId);
      if (bool) {
        func.push(portPostMsg({
          [TMP_FILE_REQ]: true
        }, {
          portId
        }));
      }
    }
    varsLocal[MENU_ENABLED] = !!bool;
    func.push(updateContextMenu(null, true));
  }
  return Promise.all(func);
};

/**
 * handle removed window
 *
 * @returns {?Function} - hostPostMsg()
 */
export const handleRemovedWindow = async () => {
  const bool = await checkIncognitoWindowExists();
  let func;
  if (!bool) {
    func = hostPostMsg({ [TMP_FILES_PB_REMOVE]: !bool });
  }
  return func || null;
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
      allPorts: true
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
      allPorts: true
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
  const func = [];
  if (e) {
    func.push(logErr(e));
  }
  hostStatus[HOST_CONNECTION] = false;
  func.push(toggleBadge());
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

/**
 * startup
 *
 * @returns {Function} - promise chain
 */
export const startup = () => Promise.all([
  setHost(),
  setOs()
]).then(getAllStorage).then(setVars).then(setDefaultIcon).then(toggleBadge);
