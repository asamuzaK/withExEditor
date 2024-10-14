/**
 * options-main.js
 */

/* shared */
import '../lib/purify/purify.min.js';
import { sanitizeURLSync } from '../lib/url/url-sanitizer-wo-dompurify.min.js';
import {
  getStorage, removePermission, requestPermission, sendMessage, setStorage
} from './browser.js';
import { isObjectNotEmpty, isString, throwErr } from './common.js';
import {
  EDITOR_CONFIG_GET, EDITOR_CONFIG_RES, EDITOR_FILE_NAME, EDITOR_LABEL,
  HOST_CONNECTION, HOST_ERR_NOTIFY, HOST_STATUS, HOST_STATUS_GET, HOST_VERSION,
  HOST_VERSION_LATEST, HOST_VERSION_MIN, INFO, IS_EXECUTABLE, SYNC_AUTO_URL,
  WARN
} from './constant.js';

/* api */
const { i18n } = browser;

/**
 * send message
 * @param {*} msg - message
 * @returns {?Promise} - sendMessage()
 */
export const sendMsg = async msg => {
  let func;
  if (msg) {
    func = sendMessage(null, msg);
  }
  return func || null;
};

/**
 * get host status
 * @returns {Promise} - sendMsg()
 */
export const getHostStatus = async () => sendMsg({
  [HOST_STATUS_GET]: true
});

/**
 * get editor config
 * @returns {Promise} - sendMsg()
 */
export const getEditorConfig = async () => sendMsg({
  [EDITOR_CONFIG_GET]: true
});

/**
 * create pref
 * @param {object} elm - element
 * @param {boolean} executable - executable
 * @returns {Promise.<object>} - pref data
 */
export const createPref = async (elm, executable = false) => {
  const id = elm?.id;
  const data = id && {
    [id]: {
      id,
      app: {
        executable: !!executable
      },
      checked: !!elm.checked,
      value: elm.value || ''
    }
  };
  return data || null;
};

/**
 * extract editor config
 * @param {object} obj - editor config object
 * @returns {Promise.<void>} - void
 */
export const extractEditorConfig = async (obj = {}) => {
  const { editorLabel, editorName, executable } = obj;
  const isExecutable = document.getElementById(IS_EXECUTABLE);
  const name = document.getElementById(EDITOR_FILE_NAME);
  const label = document.getElementById(EDITOR_LABEL);
  if (isExecutable) {
    isExecutable.textContent = i18n.getMessage(`isExecutable_${!!executable}`);
    if (executable) {
      isExecutable.classList.remove(WARN);
    } else {
      isExecutable.classList.add(WARN);
    }
  }
  if (name) {
    name.value = editorName || '';
  }
  if (label) {
    if (executable && (editorLabel || editorName)) {
      label.value = editorLabel || editorName;
      label.disabled = false;
    } else {
      label.value = '';
      label.disabled = true;
    }
  }
};

/**
 * extract host status
 * @param {object} status - host status
 * @returns {Promise.<void>} - void
 */
export const extractHostStatus = async status => {
  const { hostCompatibility, hostConnection, hostLatestVersion } = status;
  const latest = document.getElementById(HOST_VERSION_LATEST);
  const connect = document.getElementById(HOST_CONNECTION);
  const version = document.getElementById(HOST_VERSION);
  if (latest) {
    if (hostLatestVersion) {
      latest.classList.add(INFO);
      latest.textContent =
        i18n.getMessage('hostLatestVersion', `v${hostLatestVersion}`);
    } else {
      latest.classList.remove(INFO);
      latest.textContent = '';
    }
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
    version.textContent =
      i18n.getMessage(`hostVersion_${hostCompatibility}`, HOST_VERSION_MIN);
    if (hostCompatibility) {
      version.classList.remove(WARN);
    } else {
      version.classList.add(WARN);
    }
  }
};

/**
 * extract sync urls input
 * @param {!object} evt - Event
 * @returns {?Promise} - promise chain
 */
export const extractSyncUrls = async evt => {
  const { target } = evt;
  const { value } = target;
  const items = isString(value) && value.split('\n');
  let func;
  if (items?.length) {
    const arr = [];
    let bool = false;
    for (let item of items) {
      item = item.trim();
      if (item.length) {
        const url = sanitizeURLSync(item, {
          remove: true
        });
        if (url) {
          bool = true;
          arr.push(url);
        } else {
          bool = false;
          break;
        }
      }
    }
    if (bool && arr.length) {
      target.value = arr.join('\n');
      func = createPref(target).then(setStorage);
    }
  }
  return func || null;
};

/**
 * store pref
 * @param {!object} evt - Event
 * @returns {Promise.<Array>} - results of each handler
 */
export const storePref = async evt => {
  const { target } = evt;
  const { checked, id, name, type } = target;
  const func = [];
  if (id && isString(id)) {
    if (type === 'radio') {
      const nodes = document.querySelectorAll(`[name=${name}]`);
      for (const node of nodes) {
        func.push(createPref(node).then(setStorage));
      }
    } else {
      switch (id) {
        case HOST_ERR_NOTIFY:
          if (checked) {
            target.checked = await requestPermission(['notifications']);
          } else {
            await removePermission(['notifications']);
          }
          func.push(createPref(target).then(setStorage));
          break;
        default:
          func.push(createPref(target).then(setStorage));
      }
    }
  }
  return Promise.all(func);
};

/* event handlers */
/**
 * handle sync urls input
 * @param {!object} evt - Event
 * @returns {Promise} - extractSyncUrls()
 */
export const handleSyncUrlsInputInput = evt =>
  extractSyncUrls(evt).catch(throwErr);

/**
 * handle input change
 * @param {!object} evt - Event
 * @returns {Promise} - storePref()
 */
export const handleInputChange = evt => storePref(evt).catch(throwErr);

/**
 * prevent event
 * @param {!object} evt - Event
 * @returns {void}
 */
export const preventEvent = evt => {
  evt.stopPropagation();
  evt.preventDefault();
};

/* html */
/**
 * add event listener to sync urls textarea
 * @returns {Promise.<void>} - void
 */
export const addSyncUrlsInputListener = async () => {
  const elm = document.getElementById(SYNC_AUTO_URL);
  elm?.addEventListener('input', handleSyncUrlsInputInput);
};

/**
 * add event listener to input elements
 * @returns {Promise.<void>} - void
 */
export const addInputChangeListener = async () => {
  const nodes = document.querySelectorAll('input');
  for (const node of nodes) {
    node.addEventListener('change', handleInputChange);
  }
};

/**
 * add event listener to form elements
 * @returns {Promise.<void>} - void
 */
export const addFormSubmitListener = async () => {
  const nodes = document.querySelectorAll('form');
  for (const node of nodes) {
    node.addEventListener('submit', preventEvent);
  }
};

/**
 * set html input value
 * @param {object} data - data
 * @returns {Promise.<void>} - void
 */
export const setHtmlInputValue = async (data = {}) => {
  const { checked, id: dataId, value } = data;
  const elm = dataId && document.getElementById(dataId);
  if (elm) {
    const { id, type } = elm;
    switch (type) {
      case 'checkbox':
      case 'radio':
        elm.checked = !!checked;
        break;
      case 'text':
        elm.value = isString(value) ? value : '';
        if (id === EDITOR_LABEL && elm.value) {
          elm.disabled = false;
        }
        break;
      default: {
        if (id === SYNC_AUTO_URL) {
          const items = isString(value) && value.split('\n');
          if (items?.length) {
            const arr = [];
            for (const item of items) {
              const url = sanitizeURLSync(item, {
                remove: true
              });
              if (url) {
                arr.push(url);
              }
            }
            if (arr.length) {
              elm.value = arr.join('\n');
            } else {
              elm.value = '';
            }
          } else {
            elm.value = '';
          }
        }
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
 * @param {object} msg - message
 * @returns {Promise.<Array>} - results of each handler
 */
export const handleMsg = async msg => {
  const func = [];
  const items = msg && Object.entries(msg);
  if (items?.length) {
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
