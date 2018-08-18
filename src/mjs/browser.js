/**
 * browser.js
 */

import {WEBEXT_ID} from "./constant.js";
import {isObjectNotEmpty, isString, throwErr} from "./common.js";

/* api */
const {
  commands, management, notifications, permissions, runtime, storage,
  tabs, windows,
} = browser;

/* constants */
const {TAB_ID_NONE} = tabs;

/* command */
/**
 * update command
 * @param {string} id - command ID
 * @param {string} value - key value
 * @returns {void}
 */
export const updateCmd = async (id, value = "") => {
  if (typeof commands.update === "function" &&
      isString(id) && isString(value)) {
    const shortcut =
      value.trim().replace(/\+([a-z])$/, (m, c) => `+${c.toUpperCase()}`);
    if (/^(?:(?:(?:Alt|Command|(?:Mac)?Ctrl)\+(?:Shift\+)?(?:[\dA-Z]|F(?:[1-9]|1[0-2])|(?:Page)?(?:Down|Up)|Left|Right|Comma|Period|Home|End|Delete|Insert|Space))|F(?:[1-9]|1[0-2]))$/.test(shortcut)) {
      await commands.update({
        shortcut,
        name: id,
      });
    } else if (shortcut === "") {
      await commands.reset(id);
    }
  }
};

/* management */
/**
 * get enabled theme
 * @returns {Array} - array of management.ExtensionInfo
 */
export const getEnabledTheme = async () => {
  const themes = await management.getAll().then(arr => arr.filter(info =>
    info.type && info.type === "theme" && info.enabled && info
  ));
  return themes;
};

/* notifications */
/**
 * handle notifications onclosed
 * @param {string} id - notification ID
 * @returns {?AsyncFunction} - notifications.clear()
 */
export const handleNotifyOnClosed = id => {
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
 * @returns {?AsyncFunction} - notifications.create
 */
export const createNotification = async (id, opt) => {
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

/* permissions */
/**
 * request permission
 * @param {string|Array} perm - permission
 * @returns {?AsyncFunction} - permission.request
 */
export const requestPerm = async perm => {
  let func;
  if (isString(perm)) {
    func = permissions.request({
      permissions: [perm],
    });
  } else if (Array.isArray(perm)) {
    func = permissions.request({
      permissions: perm,
    });
  }
  return func || null;
};

/**
 * remove permission
 * @param {string|Array} perm - permission
 * @returns {?AsyncFunction} - permission.remove
 */
export const removePerm = async perm => {
  let func;
  if (isString(perm)) {
    func = permissions.remove({
      permissions: [perm],
    });
  } else if (Array.isArray(perm)) {
    func = permissions.remove({
      permissions: perm,
    });
  }
  return func || null;
};

/* runtime */
/** send message
 * @param {number|string} id - tabId or extension ID
 * @param {*} msg - message
 * @param {Object} opt - options
 * @returns {?AsyncFunction} - tabs.sendMessage | runtime.sendMessage
 */
export const sendMessage = async (id, msg, opt) => {
  let func;
  if (msg) {
    opt = isObjectNotEmpty(opt) && opt || null;
    if (Number.isInteger(id) && id !== TAB_ID_NONE) {
      func = tabs.sendMessage(id, msg, opt);
    } else if (id && isString(id)) {
      func = runtime.sendMessage(id, msg, opt);
    } else {
      func = runtime.sendMessage(runtime.id, msg, opt);
    }
  }
  return func || null;
};

/* storage */
/**
 * remove storage
 * @param {*} key - key
 * @returns {AsyncFunction} - storage.local.remove
 */
export const removeStorage = async key => storage.local.remove(key);

/**
 * set storage
 * @param {Object} obj - object to store
 * @returns {?AsyncFunction} - storage.local.set
 */
export const setStorage = async obj =>
  obj && storage && storage.local.set(obj) || null;

/**
 * get storage
 * @param {*} key - key
 * @returns {AsyncFunction} - storage.local.get
 */
export const getStorage = async key => storage.local.get(key);

/**
 * get all storage
 * @returns {AsyncFunction} - storage.local.get
 */
export const getAllStorage = async () => storage.local.get();

/* tabs */
/**
 * get active tab
 * @returns {Object} - tabs.Tab
 */
export const getActiveTab = async () => {
  const arr = await tabs.query({
    active: true,
    currentWindow: true,
  });
  let tab;
  if (arr.length) {
    [tab] = arr;
  }
  return tab || null;
};

/**
 * get active tab ID
 * @returns {number} - tab ID
 */
export const getActiveTabId = async () => {
  let tabId;
  const tab = await getActiveTab();
  if (tab) {
    tabId = tab.id;
  }
  return tabId;
};

/**
 * is tab
 * @param {*} tabId - tab ID
 * @returns {boolean} - result
 */
export const isTab = async tabId => {
  let tab;
  if (Number.isInteger(tabId) && tabId !== TAB_ID_NONE) {
    tab = await tabs.get(tabId).catch(throwErr);
  }
  return !!tab;
};

/**
 * execute content script to existing tabs
 * NOTE: Exclude Blink due to the error "No source code or file specified.".
 * @param {string} src - content script path
 * @returns {Promise.<Array>} - results of each handler
 */
export const execScriptToExistingTabs = async src => {
  const func = [];
  if (runtime.id === WEBEXT_ID && isString(src)) {
    const contentScript = runtime.getURL(src);
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

/* windows */
/**
 * check if any of windows is incognito
 * @returns {boolean} - result
 */
export const checkWindowIncognito = async () => {
  const winArr = await windows.getAll({windowTypes: ["normal"]});
  let incog;
  if (winArr && winArr.length) {
    for (const win of winArr) {
      incog = win.incognito;
      if (incog) {
        break;
      }
    }
  }
  return incog || false;
};
