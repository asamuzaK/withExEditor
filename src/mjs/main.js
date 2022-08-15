/**
 * main.js
 */

/* shared */
import {
  getType, isObjectNotEmpty, isString, logErr, logMsg, logWarn,
  stringifyPositiveInt, throwErr
} from './common.js';
import {
  checkIncognitoWindowExists, clearNotification, createNotification,
  getActiveTab, getActiveTabId, getAllStorage, getCurrentWindow, getOs,
  getStorage, getWindow, isTab, sendMessage, setStorage
} from './browser.js';
import {
  CONTENT_GET, CONTEXT_MENU, EDITOR_CONFIG_GET, EDITOR_CONFIG_RES,
  EDITOR_CONFIG_TS, EDITOR_EXEC, EDITOR_FILE_NAME, EDITOR_LABEL, EXT_NAME,
  EXT_RELOAD, FILE_EXT_SELECT, FILE_EXT_SELECT_HTML, FILE_EXT_SELECT_MD,
  FILE_EXT_SELECT_TXT, HOST, HOST_COMPAT, HOST_CONNECTION, HOST_ERR_NOTIFY,
  HOST_STATUS, HOST_STATUS_GET, HOST_VERSION, HOST_VERSION_CHECK,
  HOST_VERSION_LATEST, HOST_VERSION_MIN, ICON, ICON_AUTO, ICON_BLACK,
  ICON_COLOR, ICON_CONTEXT_ID, ICON_DARK, ICON_ID, ICON_LIGHT, ICON_WHITE,
  INFO_COLOR, INFO_TEXT, IS_CONNECTABLE, IS_EXECUTABLE, IS_MAC, IS_WEBEXT,
  LOCAL_FILE_VIEW, MENU_ENABLED, MODE_EDIT, MODE_EDIT_EXT, MODE_EDIT_HTML,
  MODE_EDIT_MD, MODE_EDIT_TXT, MODE_MATHML, MODE_SELECTION, MODE_SOURCE,
  MODE_SVG, ONLY_EDITABLE, OPTIONS_OPEN, PROCESS_CHILD, SYNC_AUTO,
  SYNC_AUTO_URL, TMP_FILES_PB, TMP_FILES_PB_REMOVE, TMP_FILE_CREATE,
  TMP_FILE_DATA_PORT, TMP_FILE_DATA_REMOVE, TMP_FILE_GET, TMP_FILE_REQ,
  TMP_FILE_RES, VARS_SET, WARN_COLOR, WARN_TEXT, WEBEXT_ID
} from './constant.js';

/* api */
const { browserAction, i18n, notifications, runtime, tabs, windows } = browser;
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

/* host status */
export const hostStatus = {
  [HOST_COMPAT]: false,
  [HOST_CONNECTION]: false,
  [HOST_VERSION_LATEST]: null
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

/* tab list */
// TODO: save tab list in storage.session
export const tabList = new Set();

/**
 * add id to tab list
 *
 * @param {number} id - tabId
 * @returns {object} - tab list
 */
export const addIdToTabList = async id => {
  if (!Number.isInteger(id)) {
    throw new TypeError(`Expected Number but got ${getType(id)}.`);
  }
  tabList.add(id);
  return tabList;
};

/**
 * remove id from tab list
 *
 * @param {number} id - tabId
 * @returns {object} - tab list
 */
export const removeIdFromTabList = async id => {
  if (!Number.isInteger(id)) {
    throw new TypeError(`Expected Number but got ${getType(id)}.`);
  }
  tabList.delete(id);
  return tabList;
};

/**
 * restore tab list
 *
 * @returns {void}
 */
export const restoreTabList = async () => {
  const func = [];
  tabList.forEach(async tabId => {
    const bool = await isTab(tabId);
    if (!bool) {
      func.push(removeIdFromTabList(tabId));
    }
  });
  await Promise.all(func);
};

/**
 * handle connectable tab
 *
 * @param {object} tab - tabs.Tab
 * @returns {Promise.<Array>} - results of each handler
 */
export const handleConnectableTab = async (tab = {}) => {
  const func = [];
  if (tab) {
    const { active, id: tId, incognito, status, windowId: wId } = tab;
    const windowId = stringifyPositiveInt(wId, true);
    const tabId = stringifyPositiveInt(tId, true);
    if (windowId && tabId) {
      func.push(
        addIdToTabList(tId),
        sendMessage(tId, {
          incognito,
          tabId,
          windowId,
          [VARS_SET]: vars
        })
      );
    }
    if (active && status === 'complete') {
      varsLocal[MENU_ENABLED] = true;
      func.push(updateContextMenu(null, true));
    }
  }
  return Promise.all(func);
};

/**
 * send context menu data
 *
 * @param {object} info - menus.OnClickData
 * @param {object} tab - tabs.Tab
 * @returns {?Function} - sendMessage()
 */
export const sendContextMenuData = async (info, tab) => {
  let func;
  if (info && tab) {
    const { id: tabId } = tab;
    if (tabList.has(tabId)) {
      func = sendMessage(tabId, {
        [CONTENT_GET]: { info, tab }
      });
    }
  }
  return func || null;
};

/**
 * send tmp file data
 *
 * @param {string} key - message key
 * @param {object} msg - message
 * @returns {?Function} - sendMessage()
 */
export const sendTmpFileData = async (key, msg = {}) => {
  if (!isString(key)) {
    throw new TypeError(`Expected String but got ${getType(key)}.`);
  }
  const { data } = msg;
  let func;
  if (isObjectNotEmpty(data)) {
    const { tabId } = data;
    if (isString(tabId) && /^\d+$/.test(tabId)) {
      const activeTabId = await getActiveTabId();
      if (activeTabId === tabId * 1) {
        func = sendMessage(activeTabId, {
          [key]: msg
        });
      }
    }
  }
  return func || null;
};

/**
 * send get content message to active tab
 *
 * @returns {?Function} - sendMessage()
 */
export const sendGetContent = async () => {
  const tab = await getActiveTab();
  let func;
  if (tab) {
    const { id } = tab;
    if (tabList.has(id)) {
      func = sendMessage(id, {
        [CONTENT_GET]: { tab }
      });
    }
  }
  return func || null;
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
    sendMessage(null, {
      [EDITOR_CONFIG_RES]: {
        editorConfigTimestamp,
        editorName,
        executable,
        editorLabel: editorNewLabel
      }
    }),
    restoreContextMenu()
  ];
  return Promise.all(func);
};

/* extension */
/**
 * open options page
 *
 * @returns {?Function} - runtime.openOptionsPage()
 */
export const openOptionsPage = async () => runtime.openOptionsPage();

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
          func.push(sendMessage(null, {
            [HOST_STATUS]: hostStatus
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
        case IS_CONNECTABLE: {
          if (sender) {
            const { tab } = sender;
            if (tab) {
              func.push(handleConnectableTab(tab));
            }
          }
          break;
        }
        case OPTIONS_OPEN:
          func.push(openOptionsPage());
          break;
        case TMP_FILE_DATA_PORT:
          tabList.forEach(id => {
            func.push(sendMessage(id, {
              [key]: value
            }));
          });
          break;
        case TMP_FILE_DATA_REMOVE:
        case TMP_FILE_RES:
          func.push(sendTmpFileData(key, value));
          break;
        default:
      }
    }
  }
  return Promise.all(func);
};

/* tab / window handlers */
/**
 * handle activated tab
 *
 * @param {!object} info - activated tab info
 * @returns {Promise.<Array>} - results of each handler
 */
export const onTabActivated = async info => {
  const { tabId } = info;
  const isListed = tabList.has(tabId);
  const func = [];
  if (isListed) {
    func.push(sendMessage(tabId, {
      [TMP_FILE_REQ]: isListed
    }));
  }
  varsLocal[MENU_ENABLED] = isListed;
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
  const { active } = tab;
  const func = [];
  if (active) {
    const { status } = info;
    varsLocal[MENU_ENABLED] = tabList.has(id);
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
  const func = [];
  if (tabList.has(id)) {
    const { windowId: wId } = info;
    const win = await getWindow(wId);
    if (win) {
      const { incognito } = win;
      if (incognito) {
        const windowId = stringifyPositiveInt(wId, true);
        const tabId = stringifyPositiveInt(id, true);
        func.push(hostPostMsg({
          [TMP_FILE_DATA_REMOVE]: {
            tabId,
            windowId,
            dir: TMP_FILES_PB
          }
        }));
      }
    }
    func.push(removeIdFromTabList(id));
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
    const tabId = await getActiveTabId(id);
    if (Number.isInteger(tabId) && tabId !== TAB_ID_NONE) {
      func.push(
        sendMessage(tabId, {
          [TMP_FILE_REQ]: true
        }),
        updateContextMenu(null, true)
      );
    }
  }
  return Promise.all(func);
};

/**
 * handle removed window
 *
 * @returns {Promise.<Array>} - results of each handler
 */
export const onWindowRemoved = async () => {
  const hasIncognito = await checkIncognitoWindowExists(); ;
  const func = [];
  if (!hasIncognito) {
    func.push(hostPostMsg({
      [TMP_FILES_PB_REMOVE]: !hasIncognito
    }));
  }
  func.push(restoreTabList());
  return Promise.all(func);
};

/**
 * handle command
 *
 * @param {!string} cmd - command
 * @returns {?Function} - sendGetContent() / openOptionsPage()
 */
export const handleCmd = async cmd => {
  if (!isString(cmd)) {
    throw new TypeError(`Expected String but got ${getType(cmd)}.`);
  }
  let func;
  switch (cmd) {
    case EDITOR_EXEC:
      func = sendGetContent();
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
 * send variables
 *
 * @param {object} obj - variable object
 * @returns {Promise.<Array>} - results of each handler
 */
export const sendVariables = async obj => {
  const func = [];
  if (obj) {
    const items = tabList.keys();
    for (const item of items) {
      func.push(sendMessage(item, {
        [VARS_SET]: obj
      }));
    }
  }
  return Promise.all(func);
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
    const hasTabList = tabList.size > 0;
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
        if (hasTabList) {
          func.push(sendVariables({ [item]: !!checked }));
        }
        if (changed) {
          func.push(restoreContextMenu());
        }
        break;
      case SYNC_AUTO:
        vars[item] = !!checked;
        if (hasTabList) {
          func.push(sendVariables({ [item]: !!checked }));
        }
        break;
      case SYNC_AUTO_URL:
        vars[item] = value;
        if (hasTabList) {
          func.push(sendVariables({ [item]: value }));
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
 * handle host on message
 *
 * @param {*} msg - message
 * @returns {Function} - promise chain
 */
export const handleHostOnMsg = msg => handleMsg(msg).catch(throwErr);

/**
 * set host
 *
 * @returns {void}
 */
export const setHost = async () => {
  host.onDisconnect.addListener(handleHostOnDisconnect);
  host.onMessage.addListener(handleHostOnMsg);
};

/**
 * startup
 *
 * @returns {Function} - promise chain
 */
export const startup = async () => {
  await Promise.all([
    setHost(),
    setOs()
  ]);
  return getAllStorage().then(setVars).then(setDefaultIcon).then(toggleBadge);
};
