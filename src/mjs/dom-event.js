/**
 * dom-event.js
 */

import { isObjectNotEmpty, isString } from './common.js';

/* dispatch events */
/**
 * dispatch event
 *
 * @param {object} target - target
 * @param {string} type - type
 * @param {object} opt - options
 * @returns {boolean} - event permitted
 */
export const dispatchEvent = (target, type, opt) => {
  let res;
  if ((target.nodeType === Node.DOCUMENT_NODE ||
       target.nodeType === Node.ELEMENT_NODE) &&
      isString(type) && isObjectNotEmpty(opt)) {
    const evt = new Event(type, opt);
    res = target.dispatchEvent(evt);
  }
  return !!res;
};

/**
 * dispatch change event
 *
 * @param {object} elm - element
 * @returns {boolean} - event permitted
 */
export const dispatchChangeEvent = elm => {
  let res;
  if (elm && elm.nodeType === Node.ELEMENT_NODE) {
    const opt = {
      bubbles: true,
      cancelable: false
    };
    const evt = new Event('change', opt);
    res = elm.dispatchEvent(evt);
  }
  return !!res;
};

/**
 * dispatch clipboard event
 *
 * @param {object} elm - Element
 * @param {string} type - event type
 * @param {object} opt - init options
 * @returns {boolean} - event permitted
 */
export const dispatchClipboardEvent = (elm, type, opt = {
  bubbles: true,
  cancelable: true,
  composed: true
}) => {
  let res;
  if (elm && elm.nodeType === Node.ELEMENT_NODE &&
      isString(type) && /^(?:c(?:opy|ut)|paste)$/.test(type)) {
    const evt = new ClipboardEvent(type, opt);
    const { clipboardData } = opt;
    if (clipboardData) {
      const { types } = clipboardData;
      for (const mime of types) {
        const value = clipboardData.getData(mime);
        if (evt.wrappedJSObject) {
          evt.wrappedJSObject.clipboardData.setData(mime, value);
        } else {
          evt.clipboardData.setData(mime, value);
        }
      }
    }
    res = elm.dispatchEvent(evt);
  }
  return !!res;
};

/**
 * dispatch focus event
 *
 * @param {object} elm - Element
 * @returns {boolean} - event permitted
 */
export const dispatchFocusEvent = elm => {
  let res;
  if (elm && elm.nodeType === Node.ELEMENT_NODE) {
    const opt = {
      bubbles: false,
      cancelable: false
    };
    const evt = new FocusEvent('focus', opt);
    res = elm.dispatchEvent(evt);
  }
  return !!res;
};

/**
 * dispatch input event
 *
 * @param {object} elm - Element
 * @param {string} type - event type
 * @param {object} opt - init options
 * @returns {boolean} - event permitted
 */
export const dispatchInputEvent = (elm, type, opt) => {
  let res;
  if (elm && elm.nodeType === Node.ELEMENT_NODE &&
      isString(type) && /^(?:before)?input$/.test(type)) {
    if (!isObjectNotEmpty(opt)) {
      opt = {
        bubbles: true,
        cancelable: type === 'beforeinput'
      };
    }
    const evt = new InputEvent(type, opt);
    const { dataTransfer } = opt;
    if (dataTransfer) {
      if (!evt.dataTransfer) {
        evt.dataTransfer = new DataTransfer();
      }
      const { types } = dataTransfer;
      for (const mime of types) {
        const value = dataTransfer.getData(mime);
        evt.dataTransfer.setData(mime, value);
      }
    }
    res = elm.dispatchEvent(evt);
  }
  return !!res;
};

/**
 * dispatch keyboard event
 *
 * @param {object} elm - Element
 * @param {string} type - event type
 * @param {object} keyOpt - key options
 * @returns {boolean} - event permitted
 */
export const dispatchKeyboardEvent = (elm, type, keyOpt = {}) => {
  let res;
  if (elm && elm.nodeType === Node.ELEMENT_NODE &&
      isString(type) && /^key(?:down|press|up)$/.test(type) &&
      isObjectNotEmpty(keyOpt)) {
    const {
      altKey, code, ctrlKey, key, keyCode, metaKey, shiftKey
    } = keyOpt;
    if (isString(key) && isString(code) && Number.isInteger(keyCode)) {
      const opt = {
        key,
        code,
        keyCode,
        altKey: !!altKey,
        bubbles: true,
        cancelable: true,
        ctrlKey: !!ctrlKey,
        locale: '',
        location: 0,
        metaKey: !!metaKey,
        repeat: false,
        shiftKey: !!shiftKey
      };
      const evt = new KeyboardEvent(type, opt);
      res = elm.dispatchEvent(evt);
    }
  }
  return !!res;
};

/**
 * focus element
 *
 * @param {!object} evt - Event
 * @returns {object} - element
 */
export const focusElement = evt => {
  const { target } = evt;
  if (target) {
    target.focus();
  }
  return target || null;
};
