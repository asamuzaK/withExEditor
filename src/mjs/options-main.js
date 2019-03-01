/**
 * options-main.js
 */

import {
  isObjectNotEmpty, isString, logErr, throwErr,
} from "./common.js";
import {
  getStorage, removePermission, requestPermission,
} from "./browser.js";

/* api */
const {i18n, runtime} = browser;

/* constants */
import {
  EDITOR_CONFIG_RES, EDITOR_FILE_NAME, EDITOR_LABEL, EXT_RELOAD,
  HOST_CONNECTION, HOST_ERR_NOTIFY, HOST_STATUS, HOST_STATUS_GET, HOST_VERSION,
  HOST_VERSION_LATEST, STORAGE_SET, SYNC_AUTO_URL, WARN,
} from "./constant.js";
const PORT_NAME = "portOptions";

/* port */
export const port = runtime.connect({name: PORT_NAME});

/**
 * post message
 * @param {*} msg - message
 * @returns {void}
 */
export const postMsg = async msg => {
  if (msg) {
    port.postMessage(msg);
  }
};

/**
 * get host status
 * @returns {AsyncFunction} - port message
 */
export const getHostStatus = async () => postMsg({[HOST_STATUS_GET]: true});

/**
 * create pref
 * @param {Object} elm - element
 * @param {boolean} executable - executable
 * @returns {Object} - pref data
 */
export const createPref = async (elm, executable = false) => {
  const id = elm && elm.id;
  return id && {
    [STORAGE_SET]: {
      [id]: {
        id,
        app: {
          executable: !!executable,
        },
        checked: !!elm.checked,
        value: elm.value || "",
      },
    },
  } || null;
};

/**
 * extract editor config
 * @param {string} obj - editor config object
 * @returns {void}
 */
export const extractEditorConfig = async (obj = {}) => {
  const {editorLabel, editorName, executable} = obj;
  const name = document.getElementById(EDITOR_FILE_NAME);
  const label = document.getElementById(EDITOR_LABEL);
  if (name) {
    name.value = editorName || "";
  }
  if (label) {
    if (executable && (editorLabel || editorName)) {
      label.value = editorLabel || editorName;
      label.disabled = false;
    } else {
      label.value = "";
      label.disabled = true;
    }
  }
};

/**
 * extract host status
 * @param {Object} status - host status
 * @returns {void}
 */
export const extractHostStatus = async status => {
  const {hostCompatibility, hostConnection, hostLatestVersion} = status;
  const latest = document.getElementById(HOST_VERSION_LATEST);
  const connect = document.getElementById(HOST_CONNECTION);
  const version = document.getElementById(HOST_VERSION);
  if (latest && hostLatestVersion) {
    latest.textContent =
      i18n.getMessage("hostLatestVersion", `v${hostLatestVersion}`);
  }
  if (connect) {
    connect.textContent = i18n.getMessage(`hostConnection_${hostConnection}`);
    if (hostConnection) {
      connect.classList.remove(WARN);
    } else {
      connect.classList.add(WARN);
    }
  }
  if (version) {
    version.textContent = i18n.getMessage(`hostVersion_${hostCompatibility}`);
    if (hostCompatibility) {
      version.classList.remove(WARN);
    } else {
      version.classList.add(WARN);
    }
  }
};

/**
 * extract sync urls input
 * @param {!Object} evt - Event
 * @returns {?AsyncFunction} - post message
 */
export const extractSyncUrls = async evt => {
  const {target} = evt;
  const {value} = target;
  const items = isString(value) && value.split("\n");
  let func;
  if (items && items.length) {
    let bool = false;
    for (let item of items) {
      item = item.trim();
      if (item.length) {
        try {
          bool = !!new URL(item);
        } catch (e) {
          logErr(e);
          bool = false;
          break;
        }
      }
    }
    if (bool) {
      func = createPref(target).then(postMsg);
    }
  }
  return func || null;
};

/**
 * store pref
 * @param {!Object} evt - Event
 * @returns {Promise.<Array>} - results of each handler
 */
export const storePref = async evt => {
  const {target} = evt;
  const {checked, id, name, type} = target;
  const func = [];
  if (id && isString(id)) {
    if (type === "radio") {
      const nodes = document.querySelectorAll(`[name=${name}]`);
      for (const node of nodes) {
        func.push(createPref(node).then(postMsg));
      }
    } else {
      switch (id) {
        case HOST_ERR_NOTIFY:
          if (checked) {
            target.checked = await requestPermission(["notifications"]);
          } else {
            await removePermission(["notifications"]);
          }
          func.push(createPref(target).then(postMsg));
          break;
        default:
          func.push(createPref(target).then(postMsg));
      }
    }
  }
  return Promise.all(func);
};

/* event handlers */
/**
 * handle reloadExtension click
 * @param {!Object} evt - Event
 * @returns {?AsyncFunction} - postMsg()
 */
export const handleReloadExtensionClick = evt => {
  const {currentTarget, target} = evt;
  let func;
  const reload = currentTarget === target;
  if (reload) {
    func = postMsg({
      [EXT_RELOAD]: reload,
    }).catch(throwErr);
  }
  evt.stopPropagation();
  evt.preventDefault();
  return func || null;
};

/**
 * handle sync urls input
 * @param {!Object} evt - Event
 * @returns {AsyncFunction} - extractSyncUrls()
 */
export const handleSyncUrlsInputInput = evt =>
  extractSyncUrls(evt).catch(throwErr);

/**
 * handle input change
 * @param {!Object} evt - Event
 * @returns {AsyncFunction} - storePref()
 */
export const handleInputChange = evt => storePref(evt).catch(throwErr);

/**
 * prevent event
 * @param {!Object} evt - Event
 * @returns {void}
 */
export const preventEvent = evt => {
  evt.stopPropagation();
  evt.preventDefault();
};

/* html */
/**
 * add event listener to reload extension button
 * @returns {void}
 */
export const addReloadExtensionListener = async () => {
  const elm = document.getElementById(EXT_RELOAD);
  if (elm) {
    elm.addEventListener("click", handleReloadExtensionClick);
  }
};

/**
 * add event listener to sync urls textarea
 * @returns {void}
 */
export const addSyncUrlsInputListener = async () => {
  const elm = document.getElementById(SYNC_AUTO_URL);
  if (elm) {
    elm.addEventListener("input", handleSyncUrlsInputInput);
  }
};

/**
 * add event listener to input elements
 * @returns {void}
 */
export const addInputChangeListener = async () => {
  const nodes = document.querySelectorAll("input");
  for (const node of nodes) {
    node.addEventListener("change", handleInputChange);
  }
};

/**
 * add event listener to form elements
 * @returns {void}
 */
export const addFormSubmitListener = async () => {
  const nodes = document.querySelectorAll("form");
  for (const node of nodes) {
    node.addEventListener("submit", preventEvent);
  }
};

/**
 * set html input value
 * @param {Object} data - data
 * @returns {void}
 */
export const setHtmlInputValue = async (data = {}) => {
  const {checked, id: dataId, value} = data;
  const elm = dataId && document.getElementById(dataId);
  if (elm) {
    const {id, type} = elm;
    switch (type) {
      case "checkbox":
      case "radio":
        elm.checked = !!checked;
        break;
      case "text":
        elm.value = isString(value) && value || "";
        if (id === EDITOR_LABEL && elm.value) {
          elm.disabled = false;
        }
        break;
      default:
        if (id === SYNC_AUTO_URL) {
          elm.value = isString(value) && value || "";
        }
    }
  }
};

/**
 * set html input values from storage
 * @returns {Promise.<Array>} - results of each handler
 */
export const setValuesFromStorage = async () => {
  const func = [];
  const pref = await getStorage();
  if (isObjectNotEmpty(pref)) {
    const items = Object.values(pref);
    for (const item of items) {
      if (isObjectNotEmpty(item)) {
        func.push(setHtmlInputValue(item));
      }
    }
  }
  return Promise.all(func);
};

/* handler */
/**
 * handle message
 * @param {*} msg - message
 * @returns {Promise.<Array>} - results of each handler
 */
export const handleMsg = async msg => {
  const func = [];
  const items = msg && Object.entries(msg);
  if (items && items.length) {
    for (const item of items) {
      const [key, value] = item;
      switch (key) {
        case EDITOR_CONFIG_RES:
          func.push(extractEditorConfig(value));
          break;
        case HOST_STATUS:
          func.push(extractHostStatus(value));
          break;
        default:
      }
    }
  }
  return Promise.all(func);
};
