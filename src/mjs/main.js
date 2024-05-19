/**
 * main.js
 */

/* shared */
import {
  checkIncognitoWindowExists, clearNotification, createNotification,
  getActiveTab, getActiveTabId, getAllStorage, getCurrentWindow, getOs,
  getStorage, getWindow, isTab, makeConnection, removeStorage, sendMessage,
  setStorage
} from './browser.js';
import {
  getType, isObjectNotEmpty, isString, logErr, logMsg, logWarn,
  stringifyPositiveInt, throwErr
} from './common.js';
import { setIcon, setIconBadge } from './icon.js';
import {
  CONTENT_GET, CONTEXT_MENU, EDITOR_CONFIG_GET, EDITOR_CONFIG_RES,
  EDITOR_CONFIG_TS, EDITOR_EXEC, EDITOR_FILE_NAME, EDITOR_LABEL, EXT_NAME,
  FILE_EXT_SELECT, FILE_EXT_SELECT_HTML, FILE_EXT_SELECT_MD,
  FILE_EXT_SELECT_TXT, HOST, HOST_COMPAT, HOST_CONNECTION, HOST_ERR_NOTIFY,
  HOST_STATUS, HOST_STATUS_GET, HOST_VERSION, HOST_VERSION_CHECK,
  HOST_VERSION_LATEST, HOST_VERSION_MIN, ICON, ICON_AUTO, ICON_BLACK,
  ICON_COLOR, ICON_DARK, ICON_LIGHT, ICON_WHITE, INFO_COLOR, INFO_TEXT,
  IS_CONNECTABLE, IS_EXECUTABLE, IS_MAC, LOCAL_FILE_VIEW, MENU_ENABLED,
  MODE_EDIT, MODE_EDIT_EXT, MODE_EDIT_HTML, MODE_EDIT_MD, MODE_EDIT_TXT,
  MODE_MATHML, MODE_SELECTION, MODE_SOURCE, MODE_SVG, ONLY_EDITABLE,
  OPTIONS_OPEN, PATH_OPTIONS_PAGE, PROCESS_CHILD, SYNC_AUTO, SYNC_AUTO_URL,
  TMP_FILES_PB, TMP_FILES_PB_REMOVE, TMP_FILE_CREATE, TMP_FILE_DATA_PORT,
  TMP_FILE_DATA_REMOVE, TMP_FILE_GET, TMP_FILE_REQ, TMP_FILE_RES, VARS_SET,
  WARN_COLOR, WARN_TEXT, WEBEXT_ID
} from './constant.js';

/* api */
const { i18n, notifications, runtime, tabs, windows } = browser;
const menus = browser.menus ?? browser.contextMenus;

/* constants */
const { WINDOW_ID_NONE } = windows;
const { TAB_ID_NONE } = tabs;

/* native application host */
export const appHost = new Map();

/* shared options */
export const globalOpts = new Map();

/* shared options keys */
export const globalOptsKeys = new Set([
  ONLY_EDITABLE,
  SYNC_AUTO,
  SYNC_AUTO_URL
]);

/* local options */
export const localOpts = new Map();

/* local options keys */
export const localOptsKeys = new Set([
  EDITOR_FILE_NAME,
  EDITOR_LABEL,
  FILE_EXT_SELECT,
  FILE_EXT_SELECT_HTML,
  FILE_EXT_SELECT_MD,
  FILE_EXT_SELECT_TXT
]);

/**
 * set options
 * @param {object} [opt] - user option
 * @param {boolean} [store] - get storage
 * @returns {Promise.<void>} - void
 */
export const setOpts = async (opt, store = false) => {
  let opts;
  if (isObjectNotEmpty(opt)) {
    opts = opt;
  } else {
    const os = await getOs();
    globalOpts.set(IS_MAC, os === 'mac');
    localOpts.set(MENU_ENABLED, false);
    if (store) {
      opts = await getStorage([...globalOptsKeys, ...localOptsKeys]);
    }
  }
  if (opts) {
    const items = Object.entries(opts);
    for (const [itemKey, itemValue] of items) {
      const { app, checked, value } = itemValue;
      if (globalOptsKeys.has(itemKey)) {
        if (itemKey === SYNC_AUTO_URL) {
          globalOpts.set(itemKey, value ?? null);
        } else {
          globalOpts.set(itemKey, !!checked);
        }
      } else if (localOptsKeys.has(itemKey)) {
        if (itemKey === EDITOR_FILE_NAME) {
          localOpts.set(IS_EXECUTABLE, !!app?.executable);
        } else if (itemKey === EDITOR_LABEL) {
          localOpts.set(itemKey, value ?? '');
        } else {
          localOpts.set(itemKey, !!checked);
        }
      }
    }
  }
};

/**
 * toggle badge
 * @returns {Promise} - setIconBadge()
 */
export const toggleBadge = async () => {
  const hostStatus = appHost.get('status') ?? {};
  let color, text;
  if (hostStatus[HOST_CONNECTION] && hostStatus[HOST_COMPAT] &&
      localOpts.get(IS_EXECUTABLE)) {
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
  return setIconBadge({ color, text });
};

/* context menu items */
export const menuItems = {
  [OPTIONS_OPEN]: {
    id: OPTIONS_OPEN,
    contexts: ['browser_action'],
    placeholder: '(&T)'
  },
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
 * @param {string} [key] - item key
 * @returns {object} - item data
 */
export const createMenuItemData = key => {
  const data = new Map();
  if (isString(key) && menuItems[key]) {
    const { contexts, placeholder, parentId } = menuItems[key];
    if (key === OPTIONS_OPEN) {
      if (runtime.id === WEBEXT_ID) {
        data.set('contexts', contexts);
        data.set('enabled', true);
        data.set('title',
          i18n.getMessage(`${OPTIONS_OPEN}_key`, [placeholder]));
        data.set('visible', true);
      }
    } else {
      const hostStatus = appHost.get('status') ?? {};
      const enabled = !!localOpts.get(MENU_ENABLED) &&
                      !!localOpts.get(IS_EXECUTABLE) &&
                      !!hostStatus[HOST_COMPAT];
      if (parentId) {
        const keys = [MODE_EDIT_HTML, MODE_EDIT_MD, MODE_EDIT_TXT];
        if (keys.includes(key) && localOpts.get(FILE_EXT_SELECT)) {
          let bool;
          switch (key) {
            case MODE_EDIT_HTML:
              bool = !!localOpts.get(FILE_EXT_SELECT_HTML);
              break;
            case MODE_EDIT_MD:
              bool = !!localOpts.get(FILE_EXT_SELECT_MD);
              break;
            default:
              bool = !!localOpts.get(FILE_EXT_SELECT_TXT);
          }
          if (bool) {
            data.set('contexts', contexts);
            data.set('enabled', enabled);
            data.set('parentId', parentId);
            data.set('title',
              i18n.getMessage(`${MODE_EDIT_EXT}_key`, [placeholder]));
            data.set('visible', true);
          }
        }
      } else {
        const label = localOpts.get(EDITOR_LABEL) || i18n.getMessage(EXT_NAME);
        const accKey = (runtime.id === WEBEXT_ID && placeholder) ||
                       ` ${placeholder}`;
        data.set('contexts', contexts);
        data.set('enabled', enabled);
        data.set('title', i18n.getMessage(`${key}_key`, [label, accKey]));
        if (key === MODE_EDIT) {
          data.set('visible', true);
        } else if (key === MODE_MATHML || key === MODE_SVG) {
          data.set('visible', false);
        } else {
          data.set('visible', !globalOpts.get(ONLY_EDITABLE));
        }
      }
    }
  }
  return Object.fromEntries(data);
};

/**
 * create context menu
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
 * @param {object} [data] - context data
 * @param {boolean} [all] - update all items
 * @returns {Promise.<Array>} - results of each handler
 */
export const updateContextMenu = async (data, all = false) => {
  const func = [];
  if (isObjectNotEmpty(data)) {
    const hostStatus = appHost.get('status') ?? {};
    const items = Object.entries(data);
    const itemEnabled = !!localOpts.get(MENU_ENABLED) &&
                        !!localOpts.get(IS_EXECUTABLE) &&
                        !!hostStatus[HOST_COMPAT];
    for (const [key, value] of items) {
      const keys = [MODE_EDIT, MODE_SOURCE];
      if (keys.includes(key) && isObjectNotEmpty(value)) {
        const { enabled, mode } = value;
        if (key === MODE_EDIT) {
          func.push(menus.update(key, {
            enabled: !!enabled && itemEnabled
          }));
        } else {
          const onlyEditable = globalOpts.get(ONLY_EDITABLE);
          switch (mode) {
            case MODE_MATHML:
              func.push(
                menus.update(mode, {
                  enabled: itemEnabled,
                  visible: !onlyEditable
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
                  visible: !onlyEditable
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
                  visible: !onlyEditable
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
 * @returns {Promise} - promise chain
 */
export const restoreContextMenu = async () =>
  menus.removeAll().then(createContextMenu);

/* extension */
/**
 * open options page
 * @returns {Promise} - runtime.openOptionsPage()
 */
export const openOptionsPage = async () => runtime.openOptionsPage();

/* tab list */
// TODO: save tab list in storage.session
export const tabList = new Set();

/**
 * add id to tab list
 * @param {number} id - tabId
 * @returns {Promise.<object>} - tab list
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
 * @param {number} id - tabId
 * @returns {Promise.<object>} - tab list
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
 * @returns {Promise.<void>} - void
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
 * @param {object} [tab] - tabs.Tab
 * @returns {Promise.<Array>} - results of each handler
 */
export const handleConnectableTab = async (tab = {}) => {
  const func = [];
  if (tab) {
    const { active, id: tId, incognito, status, windowId: wId } = tab;
    const windowId = stringifyPositiveInt(wId, true);
    const tabId = stringifyPositiveInt(tId, true);
    if (windowId && tabId) {
      const obj = Object.fromEntries(globalOpts);
      func.push(
        addIdToTabList(tId),
        sendMessage(tId, {
          incognito,
          tabId,
          windowId,
          [VARS_SET]: obj
        })
      );
    }
    if (active && status === 'complete') {
      localOpts.set(MENU_ENABLED, true);
      func.push(updateContextMenu(null, true));
    }
  }
  return Promise.all(func);
};

/**
 * handle clicked context menu
 * @param {object} [info] - menus.OnClickData
 * @param {object} [tab] - tabs.Tab
 * @returns {?Promise} - sendMessage()
 */
export const handleClickedMenu = async (info, tab) => {
  let func;
  if (isObjectNotEmpty(info) && isObjectNotEmpty(tab)) {
    const { menuItemId } = info;
    if (menuItemId === OPTIONS_OPEN) {
      func = openOptionsPage();
    } else {
      const { id: tabId } = tab;
      if (tabList.has(tabId)) {
        const { frameId } = info;
        const opt = {
          frameId
        };
        func = sendMessage(tabId, {
          [CONTENT_GET]: { info, tab }
        }, opt);
      }
    }
  }
  return func || null;
};

/**
 * send tmp file data
 * @param {string} key - message key
 * @param {object} [msg] - message
 * @returns {?Promise} - sendMessage()
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

/* editor config */
/**
 * extract editor config data
 * @param {object} [data] - editor config data
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
    restoreContextMenu()
  ];
  const tab = await getActiveTab();
  const { url: tabUrl } = tab;
  const optionsUrl = runtime.getURL(PATH_OPTIONS_PAGE);
  if (tabUrl === optionsUrl) {
    func.push(sendMessage(null, {
      [EDITOR_CONFIG_RES]: {
        editorConfigTimestamp,
        editorName,
        executable,
        editorLabel: editorNewLabel
      }
    }));
  }
  return Promise.all(func);
};

/* application host */
/**
 * post message to host
 * @param {*} msg - message
 * @returns {Promise.<void>} - void
 */
export const hostPostMsg = async msg => {
  const port = appHost.get('port');
  if (msg && port) {
    port.postMessage(msg);
  }
};

/**
 * handle host message
 * @param {object} [msg] - message
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
      case 'ready': {
        const hostStatus = appHost.get('status') ?? {};
        hostStatus[HOST_CONNECTION] = true;
        appHost.set('status', hostStatus);
        func.push(hostPostMsg({
          [EDITOR_CONFIG_GET]: true,
          [HOST_VERSION_CHECK]: HOST_VERSION_MIN
        }));
        break;
      }
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
 * handle disconnected host
 * @param {object} port - runtime.Port
 * @returns {Promise.<Array>} - results of each handler
 */
export const handleDisconnectedHost = async (port = {}) => {
  const { error } = port;
  const e = error || (runtime.lastError?.message && runtime.lastError);
  const func = [];
  appHost.clear();
  if (e) {
    func.push(logErr(e));
  }
  func.push(toggleBadge());
  return Promise.all(func);
};

/**
 * handle host on disconnect
 * @param {object} port - removed host
 * @returns {Promise} - promise chain
 */
export const handleHostOnDisconnect = port =>
  handleDisconnectedHost(port).catch(throwErr);

/**
 * handle host on message
 * @param {object} [msg] - message
 * @returns {Promise} - promise chain
 */
export const handleHostOnMsg = msg => {
  const func = [];
  if (msg) {
    const items = Object.entries(msg);
    for (const [key, value] of items) {
      switch (key) {
        case EDITOR_CONFIG_RES:
          func.push(extractEditorConfig(value));
          break;
        case HOST:
          func.push(handleHostMsg(value));
          break;
        case HOST_VERSION: {
          if (isObjectNotEmpty(value)) {
            const { isLatest, latest, result } = value;
            const hostStatus = appHost.get('status') ?? {};
            hostStatus[HOST_VERSION_LATEST] = !isLatest ? latest : null;
            if (isLatest) {
              hostStatus[HOST_COMPAT] = !!isLatest;
            } else if (Number.isInteger(result)) {
              hostStatus[HOST_COMPAT] = result >= 0;
            }
            appHost.set('status', hostStatus);
            func.push(toggleBadge());
          }
          break;
        }
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
  return Promise.all(func).catch(throwErr);
};

/**
 * set host
 * @returns {Promise.<void>} - void
 */
export const setHost = async () => {
  const port = await makeConnection(HOST, true);
  if (port) {
    port.onDisconnect.addListener(handleHostOnDisconnect);
    port.onMessage.addListener(handleHostOnMsg);
    appHost.set('port', port);
    appHost.set('status', {
      [HOST_COMPAT]: false,
      [HOST_CONNECTION]: false,
      [HOST_VERSION_LATEST]: null
    });
    appHost.set('tabs', new Set());
  }
};

/* message */
/**
 * handle message
 * @param {object} [msg] - message
 * @param {object} [sender] - sender
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
        case TMP_FILE_GET: {
          if (sender) {
            const { tab } = sender;
            if (tab) {
              const { id } = tab;
              if (Number.isInteger(id) && id !== TAB_ID_NONE) {
                let connectedTabs = appHost.get('tabs');
                if (connectedTabs instanceof Set) {
                  connectedTabs.add(id);
                } else {
                  connectedTabs = new Set([id]);
                }
                appHost.set('tabs', connectedTabs);
              }
            }
          }
          func.push(hostPostMsg({ [key]: value }));
          break;
        }
        case HOST_STATUS_GET: {
          const hostStatus = appHost.get('status') ?? {};
          func.push(sendMessage(null, {
            [HOST_STATUS]: hostStatus
          }));
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
        default:
      }
    }
  }
  return Promise.all(func);
};

/* tab / window handlers */
/**
 * handle activated tab
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
  localOpts.set(MENU_ENABLED, isListed);
  func.push(updateContextMenu(null, true));
  return Promise.all(func);
};

/**
 * handle updated tab
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
    localOpts.set(MENU_ENABLED, tabList.has(id));
    if (status === 'complete') {
      func.push(updateContextMenu(null, true));
    }
  }
  return Promise.all(func);
};

/**
 * handle removed tab
 * @param {!number} id - tabId
 * @param {!object} info - removed tab info
 * @returns {Promise.<Array>} - results of each handler
 */
export const onTabRemoved = async (id, info) => {
  if (!Number.isInteger(id)) {
    throw new TypeError(`Expected Number but got ${getType(id)}.`);
  }
  const func = [];
  const connectedTabs = appHost.get('tabs');
  if (connectedTabs instanceof Set && connectedTabs.has(id)) {
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
    connectedTabs.delete(id);
  }
  // FIXME: later
  /*
  if (!connectedTabs.size) {
    // disconnect host and clear appHost
  }
  */
  if (tabList.has(id)) {
    func.push(removeIdFromTabList(id));
  }
  return Promise.all(func);
};

/**
 * handle focus changed window
 * @returns {Promise.<Array>} - results of each handler
 */
export const onWindowFocusChanged = async () => {
  const win = await getCurrentWindow();
  const { focused, id, type } = win;
  const func = [];
  if (focused && id !== WINDOW_ID_NONE && type === 'normal') {
    const tabId = await getActiveTabId(id);
    if (tabList.has(tabId)) {
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
 * @returns {Promise.<Array>} - results of each handler
 */
export const onWindowRemoved = async () => {
  const hasIncognito = await checkIncognitoWindowExists();
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
 * @param {!string} cmd - command
 * @param {object} tab - tabs.Tab
 * @returns {?Promise} - sendMessage() / openOptionsPage()
 */
export const handleCmd = async (cmd, tab = {}) => {
  if (!isString(cmd)) {
    throw new TypeError(`Expected String but got ${getType(cmd)}.`);
  }
  let func;
  switch (cmd) {
    case EDITOR_EXEC: {
      const { id } = tab;
      if (tabList.has(id)) {
        func = sendMessage(id, {
          [CONTENT_GET]: { tab }
        });
      }
      break;
    }
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
 * set storage value
 * @param {string} item - item
 * @param {object} [obj] - value object
 * @param {boolean} [changed] - changed
 * @returns {Promise.<Array>} - results of each handler
 */
export const setStorageValue = async (item, obj, changed = false) => {
  if (!isString(item)) {
    throw new TypeError(`Expected String but got ${getType(item)}.`);
  }
  const func = [];
  if (isObjectNotEmpty(obj)) {
    const { checked, value } = obj;
    const hasTabList = tabList.size > 0;
    switch (item) {
      case EDITOR_FILE_NAME:
        func.push(setOpts({
          [item]: obj
        }));
        if (changed) {
          func.push(toggleBadge());
        }
        break;
      case EDITOR_LABEL:
        func.push(setOpts({
          [item]: obj
        }));
        if (changed) {
          func.push(updateContextMenu(null, true));
        }
        break;
      case FILE_EXT_SELECT:
      case FILE_EXT_SELECT_HTML:
      case FILE_EXT_SELECT_MD:
      case FILE_EXT_SELECT_TXT:
        func.push(setOpts({
          [item]: obj
        }));
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
        if (runtime.id === WEBEXT_ID) {
          func.push(removeStorage(item));
        } else if (checked) {
          func.push(setIcon(value));
        }
        break;
      case ONLY_EDITABLE:
        func.push(setOpts({
          [item]: {
            checked
          }
        }));
        if (hasTabList) {
          func.push(sendVariables({ [item]: !!checked }));
        }
        if (changed) {
          func.push(restoreContextMenu());
        }
        break;
      case SYNC_AUTO:
        func.push(setOpts({
          [item]: {
            checked
          }
        }));
        if (hasTabList) {
          func.push(sendVariables({ [item]: !!checked }));
        }
        break;
      case SYNC_AUTO_URL:
        func.push(setOpts({
          [item]: {
            value
          }
        }));
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
 * handle storage
 * @param {object} [data] - data
 * @param {string} [area] - storage area
 * @returns {Promise.<Array>} - results of each handler
 */
export const handleStorage = async (data, area = 'local') => {
  const func = [];
  if (isObjectNotEmpty(data) && area === 'local') {
    const items = Object.entries(data);
    if (items.length) {
      for (const [key, value] of items) {
        const { newValue } = value;
        func.push(setStorageValue(key, newValue || value, !!newValue));
      }
    }
  }
  return Promise.all(func);
};

/**
 * startup
 * @returns {Promise} - promise chain
 */
export const startup = async () => {
  await Promise.all([
    setHost(),
    setOpts()
  ]);
  return getAllStorage().then(handleStorage).then(toggleBadge);
};
