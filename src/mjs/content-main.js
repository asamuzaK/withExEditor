/**
 * content-main.js
 */

/* shared */
import {
  getType, isObjectNotEmpty, isString, logErr, throwErr
} from './common.js';
import { makeConnection, sendMessage } from './browser.js';
import {
  dispatchClipboardEvent, dispatchEvent, dispatchFocusEvent, dispatchInputEvent,
  dispatchKeyboardEvent
} from './dom-event.js';
import {
  createParagraphedContent, createDomStringFromSelectionRange,
  createXmlBasedDomString, getAncestorId, getEditableElm, getFileExtension,
  getNodeNS, getText, isContentTextNode, isEditControl, matchDocUrl,
  serializeDomString
} from './dom-util.js';
import liveEdit, {
  getLiveEditContent, getLiveEditElement, getLiveEditKey
} from './live-edit.js';
import { html as nsHtml, math as nsMath, svg as nsSvg } from './ns-uri.js';
import {
  CONTENT_GET, CONTEXT_MENU, ID_TAB, ID_WIN, IS_MAC, INCOGNITO, LABEL,
  LOCAL_FILE_VIEW, MIME_HTML, MIME_PLAIN,
  MODE_EDIT, MODE_EDIT_HTML, MODE_EDIT_MD, MODE_EDIT_TXT,
  MODE_MATHML, MODE_SELECTION, MODE_SOURCE, MODE_SVG,
  ONLY_EDITABLE, PORT_CONNECT, PORT_CONTENT, SUBST, SYNC_AUTO, SYNC_AUTO_URL,
  TMP_FILES, TMP_FILES_PB, TMP_FILE_CREATE, TMP_FILE_DATA_PORT,
  TMP_FILE_DATA_REMOVE, TMP_FILE_GET, TMP_FILE_REQ, TMP_FILE_RES, VARS_SET
} from './constant.js';

/* api */
const { runtime } = browser;

/* constants */
const EDIT_MENU = [MODE_EDIT, MODE_EDIT_HTML, MODE_EDIT_MD, MODE_EDIT_TXT];
const FILE_LEN = 128;
const FILE_NOT_FOUND_TIMESTAMP = -1;
const KEY_CODE_A = 65;
const KEY_CODE_BS = 8;
const MOUSE_BUTTON_RIGHT = 2;

/* variables */
export const vars = {
  [ID_TAB]: '',
  [ID_WIN]: '',
  [INCOGNITO]: false,
  [IS_MAC]: false,
  [ONLY_EDITABLE]: false,
  [SYNC_AUTO]: false,
  [SYNC_AUTO_URL]: null,
  contextMode: null,
  contextNode: null,
  keyBackSpace: {
    code: 'Backspace',
    key: 'Backspace',
    keyCode: KEY_CODE_BS
  },
  keyCtrlA: {
    code: 'KeyA',
    key: 'a',
    keyCode: KEY_CODE_A
  },
  port: null
};

/* keyboard shortcut */
/**
 * set modifier key
 *
 * @param {boolean} bool - is mac
 * @returns {void}
 */
export const setModifierKey = (bool = vars[IS_MAC]) => {
  if (bool) {
    vars.keyCtrlA.metaKey = true;
  } else {
    vars.keyCtrlA.ctrlKey = true;
  }
};

/* data IDs */
export const dataIds = new Map();

/**
 * set data ID
 *
 * @param {string} dataId - data ID
 * @param {object} data - data
 * @returns {object} - dataIds object
 */
export const setDataId = (dataId, data) => {
  if (!isString(dataId)) {
    throw new TypeError(`Expected String but got ${getType(dataId)}.`);
  }
  let obj;
  if (isObjectNotEmpty(data)) {
    if (dataIds.has(dataId)) {
      const storedData = dataIds.get(dataId);
      const items = Object.keys(data);
      for (const item of items) {
        storedData[item] = data[item];
      }
      obj = dataIds.set(dataId, storedData);
    } else {
      obj = dataIds.set(dataId, data);
    }
  }
  return obj || null;
};

/**
 * get target element from data ID
 *
 * @param {string} dataId - data ID
 * @returns {object} - target element
 */
export const getTargetElementFromDataId = dataId => {
  if (!isString(dataId)) {
    throw new TypeError(`Expected String but got ${getType(dataId)}.`);
  }
  let elm = document.getElementById(dataId);
  if (!elm) {
    const data = dataIds.get(dataId);
    if (isObjectNotEmpty(data)) {
      const { ancestorId, localName, prefix, queryIndex } = data;
      if (localName && Number.isInteger(queryIndex)) {
        const items = [];
        if (prefix) {
          const query = (ancestorId && `#${ancestorId} *|*`) ||
                        `${document.documentElement.localName} *|*`;
          const arr = [...document.querySelectorAll(query)].filter(item => {
            const { localName: itemLocalName } = item;
            return itemLocalName === localName && item;
          });
          items.push(...arr);
        } else {
          const query = ancestorId ? `#${ancestorId} ${localName}` : localName;
          items.push(...document.querySelectorAll(query));
        }
        elm = items[queryIndex];
      }
    }
  }
  return elm || null;
};

/**
 * get data ID from URI path
 *
 * @param {string} uri - URI
 * @param {string} subst - substitute file name
 * @returns {string} - data ID
 */
export const getDataIdFromURI = (uri, subst = SUBST) => {
  if (!isString(uri)) {
    throw new TypeError(`Expected String but got ${getType(uri)}.`);
  }
  const reg = /^.*\/((?:[\w\-~!$&'()*+,;=:@]|%[0-9A-F]{2})+)(?:\.(?:[\w\-~!$&'()*+,;=:@]|%[0-9A-F]{2})+)*$/;
  const { pathname, protocol } = new URL(uri);
  let dataId;
  if (pathname && reg.test(pathname) &&
      protocol && !/^(?:blob|data):/.test(protocol)) {
    const [, fileName] = reg.exec(pathname);
    dataId = decodeURIComponent(fileName);
  }
  return dataId && dataId.length < FILE_LEN ? dataId : subst;
};

/**
 * get queried items
 *
 * @param {object} elm - element
 * @returns {Array} - items
 */
export const getQueriedItems = elm => {
  const items = [];
  if (elm?.nodeType === Node.ELEMENT_NODE) {
    const { localName, prefix } = elm;
    const ancestorId = getAncestorId(elm);
    if (prefix) {
      const { localName: rootLocalName } = document.documentElement;
      const query = ancestorId
        ? `#${ancestorId} *|*`
        : `${rootLocalName} *|*`;
      const arr = [...document.querySelectorAll(query)].filter(item => {
        const { localName: itemLocalName } = item;
        return itemLocalName === localName && item;
      });
      items.push(...arr);
    } else {
      const query = ancestorId ? `#${ancestorId} ${localName}` : localName;
      items.push(...document.querySelectorAll(query));
    }
  }
  return items;
};

/**
 * create ID data
 *
 * @param {object} elm - target element
 * @returns {object} - ID data
 */
export const createIdData = elm => {
  let data;
  if (elm) {
    const { id, localName, prefix } = elm;
    if (id) {
      data = { dataId: id };
    } else {
      const items = getQueriedItems(elm);
      const l = items.length;
      let i = 0;
      let queryIndex;
      while (i < l) {
        const item = items[i];
        if (item === elm) {
          queryIndex = i;
          break;
        }
        i++;
      }
      if (Number.isInteger(queryIndex)) {
        const { localName: rootLocalName } = document.documentElement;
        const ancestorId = getAncestorId(elm);
        const targetElm = prefix ? `${prefix}:${localName}` : localName;
        const dataId = ancestorId
          ? `${ancestorId}_${targetElm}_${queryIndex}`
          : `${rootLocalName}_${targetElm}_${queryIndex}`;
        data = {
          ancestorId, localName, prefix, queryIndex, dataId
        };
      }
    }
  }
  return data || null;
};

/* temporary file data */
/**
 * set temporary file data
 *
 * @param {object} data - temporary file data
 * @returns {?Function} - set data ID
 */
export const setTmpFileData = (data = {}) => {
  const tmpFileData = data[TMP_FILE_CREATE];
  let func;
  if (tmpFileData) {
    const { dataId, mode } = tmpFileData;
    if (EDIT_MENU.includes(mode) && dataId) {
      func = setDataId(dataId, tmpFileData);
    }
  }
  return func || null;
};

/**
 * update temporary file data
 *
 * @param {object} obj - temporary file data object
 * @returns {?Function} - set data ID
 */
export const updateTmpFileData = (obj = {}) => {
  const { data } = obj;
  let func;
  if (data) {
    const { dataId, mode } = data;
    if (EDIT_MENU.includes(mode) && dataId) {
      func = setDataId(dataId, data);
    }
  }
  return func || null;
};

/**
 * remove temporary file data
 *
 * @param {object} obj - temporary file data object
 * @returns {boolean} - result
 */
export const removeTmpFileData = (obj = {}) => {
  const { data } = obj;
  let res;
  if (data) {
    const { dataId, tabId, timestamp } = data;
    if (dataId && tabId === vars[ID_TAB] &&
        timestamp === FILE_NOT_FOUND_TIMESTAMP) {
      res = dataIds.delete(dataId);
    }
  }
  return !!res;
};

/**
 * fetch file source and create temporary file data
 *
 * @param {object} data - content data
 * @returns {object} - temporary file data
 */
export const fetchSource = async (data = {}) => {
  const {
    characterSet, contentType, documentURI: uri, location: { protocol }
  } = document;
  let obj;
  if (protocol === 'file:') {
    obj = {
      [LOCAL_FILE_VIEW]: { uri }
    };
  } else {
    const headers = new Headers({
      Charset: characterSet,
      'Content-Type': contentType
    });
    const opt = {
      headers,
      cache: 'force-cache',
      credentials: 'include',
      method: 'GET',
      mode: 'cors'
    };
    const res = await fetch(uri, opt);
    if (res) {
      const { dir, host, incognito, mode, tabId, windowId } = data;
      const [type] = res.headers.get('Content-Type').split(';');
      const dataId = getDataIdFromURI(uri, SUBST);
      const extType = getFileExtension(type);
      const value = await res.text();
      obj = {
        [TMP_FILE_CREATE]: {
          dataId, dir, extType, host, incognito, mode, tabId, windowId
        },
        value
      };
    }
  }
  return obj || null;
};

/**
 * create temporary file data
 *
 * @param {object} data - content data
 * @returns {object} - temporary file data
 */
export const createTmpFileData = async (data = {}) => {
  const { contentType, documentURI: uri } = document;
  const {
    dir, host, incognito, liveEditKey, mode, syncAuto, tabId, value, windowId
  } = data;
  let { dataId, namespaceURI } = data;
  let tmpFileData;
  namespaceURI ??= '';
  switch (mode) {
    case MODE_EDIT:
    case MODE_EDIT_TXT:
      if (dataId) {
        tmpFileData = {
          [TMP_FILE_CREATE]: {
            extType: '.txt',
            dataId,
            dir,
            host,
            incognito,
            liveEditKey,
            mode,
            namespaceURI,
            syncAuto,
            tabId,
            windowId
          },
          value
        };
      }
      break;
    case MODE_EDIT_HTML:
      if (dataId) {
        tmpFileData = {
          [TMP_FILE_CREATE]: {
            extType: '.html',
            dataId,
            dir,
            host,
            incognito,
            liveEditKey,
            mode,
            namespaceURI,
            syncAuto,
            tabId,
            windowId
          },
          value
        };
      }
      break;
    case MODE_EDIT_MD:
      if (dataId) {
        tmpFileData = {
          [TMP_FILE_CREATE]: {
            extType: '.md',
            dataId,
            dir,
            host,
            incognito,
            liveEditKey,
            mode,
            namespaceURI,
            syncAuto,
            tabId,
            windowId
          },
          value
        };
      }
      break;
    case MODE_MATHML:
    case MODE_SVG:
      if (value && (dataId = getDataIdFromURI(uri, SUBST))) {
        tmpFileData = {
          [TMP_FILE_CREATE]: {
            extType: mode === MODE_MATHML ? '.mml' : '.svg',
            dataId,
            dir,
            host,
            incognito,
            mode,
            tabId,
            windowId
          },
          value
        };
      }
      break;
    case MODE_SELECTION:
      dataId = getDataIdFromURI(uri, SUBST);
      if (dataId && value &&
          /^(?:(?:application\/(?:[\w\-.]+\+)?|image\/[\w\-.]+\+)x|text\/(?:ht|x))ml$/.test(contentType)) {
        tmpFileData = {
          [TMP_FILE_CREATE]: {
            extType: '.xml',
            dataId,
            dir,
            host,
            incognito,
            mode,
            tabId,
            windowId
          },
          value
        };
      }
      break;
    default:
  }
  if (!tmpFileData) {
    tmpFileData = await fetchSource(data);
  }
  return tmpFileData || null;
};

/* post messages */
/**
 * post message to port
 *
 * @param {*} msg - message
 * @returns {void}
 */
export const postMsg = async msg => {
  const { port } = vars;
  if (port && msg) {
    port.postMessage(msg);
  }
};

/**
 * post each data ID
 *
 * @param {boolean} bool - post data ID
 * @returns {Promise.<Array>} - results of each handler
 */
export const postEachDataId = async (bool = false) => {
  const func = [];
  if (bool) {
    dataIds.forEach((value, key) => {
      const { controls } = value;
      const elm = getTargetElementFromDataId(key);
      elm && !controls && func.push(postMsg({ [TMP_FILE_GET]: value }));
    });
  }
  return Promise.all(func);
};

/**
 * post temporary file data
 *
 * @param {string} dataId - data ID
 * @returns {?Function} - postMsg()
 */
export const postTmpFileData = async dataId => {
  const data = dataIds.get(dataId);
  let func;
  if (data) {
    func = postMsg({ [TMP_FILE_GET]: data });
  }
  return func || null;
};

/**
 * request temporary file
 *
 * @param {!object} evt - Event
 * @returns {Promise.<Array|Error>} - promise chain
 */
export const requestTmpFile = evt => {
  const func = [];
  const { target, currentTarget } = evt;
  const data = createIdData(currentTarget);
  if (data) {
    const { dataId } = data;
    if (dataIds.has(dataId)) {
      if (target === currentTarget) {
        const { controls } = dataIds.get(dataId);
        if (controls) {
          controls.forEach(id => {
            dataIds.has(id) && func.push(postTmpFileData(id));
          });
        } else {
          func.push(postTmpFileData(dataId));
        }
      } else {
        const liveEditKey = getLiveEditKey(currentTarget);
        if (liveEditKey && isString(liveEditKey)) {
          const liveEditData = liveEdit[liveEditKey];
          if (isObjectNotEmpty(liveEditData)) {
            const { setContent } = liveEditData;
            const items = document.querySelectorAll(setContent);
            for (const item of items) {
              if (item === target) {
                func.push(postTmpFileData(dataId));
                break;
              }
            }
          }
        }
      }
    }
  }
  return Promise.all(func).catch(throwErr);
};

/* content data */
/**
 * set data ID controller
 *
 * @param {object} elm - element
 * @param {string} dataId - data ID
 * @returns {void}
 */
export const setDataIdController = (elm, dataId) => {
  const ctrl = getEditableElm(elm);
  if (ctrl && dataId) {
    const ctrlData = createIdData(ctrl);
    if (ctrlData) {
      const { dataId: ctrlId } = ctrlData;
      ctrl.addEventListener('focus', requestTmpFile, true);
      if (dataIds.has(ctrlId)) {
        const data = dataIds.get(ctrlId);
        if (Array.isArray(data.controls)) {
          const controls = new Set(data.controls);
          controls.add(dataId);
          data.controls = [...controls.values()];
        } else {
          data.controls = [dataId];
        }
        setDataId(ctrlId, data);
      } else {
        ctrlData.controls = [dataId];
        setDataId(ctrlId, ctrlData);
      }
      setDataId(dataId, {
        controlledBy: ctrlId
      });
    }
  }
};

/**
 * create content data
 *
 * @param {object} elm - element
 * @param {string} mode - context mode
 * @returns {object} - content data
 */
export const createContentData = async (elm, mode) => {
  const { incognito, enableSyncAuto, syncAutoUrls, tabId, windowId } = vars;
  const data = {
    dir: incognito ? TMP_FILES_PB : TMP_FILES,
    host: document.location.hostname || LABEL,
    dataId: null,
    liveEditKey: null,
    mode: MODE_SOURCE,
    namespaceURI: null,
    syncAuto: false,
    value: null,
    incognito,
    tabId,
    windowId
  };
  const sel = document.getSelection();
  const { anchorNode, isCollapsed } = sel;
  if (elm && mode) {
    switch (mode) {
      case MODE_EDIT:
      case MODE_EDIT_HTML:
      case MODE_EDIT_MD:
      case MODE_EDIT_TXT: {
        const obj = createIdData(elm);
        if (obj) {
          const { dataId } = obj;
          const { childNodes, isContentEditable, namespaceURI, value } = elm;
          const liveEditKey = getLiveEditKey(elm);
          const isHtml = !namespaceURI || namespaceURI === nsHtml;
          isHtml && elm.addEventListener('focus', requestTmpFile, true);
          !dataIds.has(dataId) && setDataId(dataId, obj);
          if (liveEditKey) {
            data.mode = mode;
            data.dataId = dataId;
            data.value = getLiveEditContent(elm, liveEditKey) || '';
            data.liveEditKey = liveEditKey;
          } else if (isCollapsed && isEditControl(elm)) {
            data.mode = mode;
            data.dataId = dataId;
            data.value = value || '';
          } else {
            if (!isContentEditable && !isCollapsed && anchorNode) {
              elm = anchorNode.parentNode;
            }
            data.mode = mode;
            data.dataId = dataId;
            data.value = elm.hasChildNodes() ? getText(childNodes) : '';
            data.namespaceURI = namespaceURI || getNodeNS(elm).namespaceURI;
            setDataIdController(elm, dataId);
          }
          if (!incognito && enableSyncAuto && isString(syncAutoUrls)) {
            data.syncAuto = matchDocUrl(syncAutoUrls.split(/\r?\n/));
          }
        }
        break;
      }
      case MODE_MATHML:
      case MODE_SVG: {
        const obj = createXmlBasedDomString(elm);
        if (obj) {
          data.mode = mode;
          data.value = obj;
        }
        break;
      }
      case MODE_SELECTION: {
        const obj = createDomStringFromSelectionRange(sel);
        if (obj) {
          data.mode = mode;
          data.value = obj;
        }
        break;
      }
      default:
    }
  }
  return data;
};

/**
 * create content data message
 *
 * @param {object} data - temporary file data
 * @returns {object} - message
 */
export const createContentDataMsg = async data => {
  let msg;
  if (isObjectNotEmpty(data)) {
    if (data[TMP_FILE_CREATE]) {
      msg = {
        [TMP_FILE_CREATE]: {
          data: data[TMP_FILE_CREATE],
          value: data.value
        }
      };
    } else if (data[LOCAL_FILE_VIEW]) {
      const { uri } = data[LOCAL_FILE_VIEW];
      msg = {
        [LOCAL_FILE_VIEW]: uri
      };
    }
  }
  return msg || null;
};

/**
 * post content data
 *
 * @param {object} elm - element
 * @param {string} mode - context mode
 * @returns {Promise.<Array>} - results of each handler
 */
export const postContent = async (elm, mode) => {
  const func = [];
  if (elm?.nodeType === Node.ELEMENT_NODE) {
    const data = await createContentData(elm, mode).then(createTmpFileData);
    func.push(
      createContentDataMsg(data).then(postMsg),
      setTmpFileData(data)
    );
  }
  return Promise.all(func);
};

/**
 * get context mode
 *
 * @param {object} elm - element
 * @returns {string} - context mode
 */
export const getContextMode = elm => {
  const {
    anchorNode, focusNode, isCollapsed, rangeCount
  } = document.getSelection();
  let mode = MODE_SOURCE;
  if (elm) {
    elm = (!isCollapsed &&
           ((anchorNode.nodeType === Node.TEXT_NODE && anchorNode.parentNode) ||
            (focusNode.nodeType === Node.TEXT_NODE && focusNode.parentNode))) ||
          elm;
    if ((elm.isContentEditable || isEditControl(elm) ||
         isContentTextNode(elm)) &&
        (isCollapsed ||
         (rangeCount && anchorNode.parentNode === focusNode.parentNode &&
          elm !== document.documentElement))) {
      mode = MODE_EDIT;
    } else if (isCollapsed) {
      if (elm.namespaceURI === nsMath) {
        mode = MODE_MATHML;
      } else if (elm.namespaceURI === nsSvg) {
        mode = MODE_SVG;
      }
    } else {
      mode = MODE_SELECTION;
    }
  }
  return mode;
};

/**
 * determine content process
 *
 * @param {object} obj - context menu obj
 * @returns {Function} - postContent()
 */
export const determineContentProcess = (obj = {}) => {
  const { info } = obj;
  const isTop = window.top === window.self;
  const elm = vars.contextNode || (isTop && document.activeElement);
  let mode;
  if (info) {
    const { menuItemId } = info;
    mode = (menuItemId !== MODE_SOURCE && menuItemId) || vars.contextMode ||
           (isTop && MODE_SOURCE);
  } else {
    mode = getContextMode(elm);
  }
  return postContent(elm, mode);
};

/* synchronize text */
/**
 * create replacing content
 *
 * @param {object} node - node
 * @param {object} opt - options
 * @returns {object} - document fragment
 */
export const createReplacingContent = (node, opt = {}) => {
  const frag = document.createDocumentFragment();
  if (node?.nodeType === Node.ELEMENT_NODE) {
    const { controlledBy, domstr, namespaceURI, value } = opt;
    const ctrl = controlledBy && isString(controlledBy) &&
                 getTargetElementFromDataId(controlledBy);
    if (!ctrl || ctrl === node) {
      if (domstr && isString(domstr)) {
        const dom = new DOMParser().parseFromString(domstr, MIME_HTML);
        const {
          body: {
            childNodes
          }
        } = dom;
        for (const child of childNodes) {
          frag.appendChild(child.cloneNode(true));
        }
      } else if (isString(value)) {
        const pContent = createParagraphedContent(value, namespaceURI);
        frag.appendChild(pContent);
      }
    } else {
      isString(value) && frag.appendChild(document.createTextNode(value));
    }
  }
  return frag;
};

/**
 * replace content of content editable element
 *
 * @param {object} node - editable element
 * @param {object} opt - options
 * @returns {void}
 */
export const replaceEditableContent = (node, opt = {}) => {
  const { controlledBy, dataId, namespaceURI, value } = opt;
  if (node?.nodeType === Node.ELEMENT_NODE &&
      dataIds.has(dataId) && isString(value)) {
    const changed = value !== node.textContent.replace(/^\s*/, '')
      .replace(/\n +/g, '\n').replace(/([^\n])$/, (m, c) => `${c}\n`);
    const data = dataIds.get(dataId);
    if (changed && !data.mutex) {
      const sel = node.ownerDocument.getSelection();
      const dataTransfer = new DataTransfer();
      const dataValue = value.replace(/\u200B/g, '');
      const domstr = serializeDomString(dataValue, MIME_HTML, true);
      data.mutex = true;
      setDataId(dataId, data);
      sel.selectAllChildren(node);
      dispatchEvent(node.ownerDocument, 'selectionchange', {
        bubbles: false,
        cancelable: false
      });
      dataTransfer.setData(MIME_PLAIN, dataValue);
      domstr && dataTransfer.setData(MIME_HTML, domstr);
      let proceed = dispatchClipboardEvent(node, 'paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer,
        composed: true
      });
      if (proceed) {
        const {
          endContainer, endOffset, startContainer, startOffset
        } = sel.getRangeAt(0);
        const insertTarget = new StaticRange({
          endContainer, endOffset, startContainer, startOffset
        });
        proceed = dispatchInputEvent(node, 'beforeinput', {
          dataTransfer,
          bubbles: true,
          cancelable: true,
          inputType: 'insertFromPaste',
          ranges: [insertTarget]
        });
        if (proceed) {
          const frag = createReplacingContent(node, {
            controlledBy,
            domstr,
            namespaceURI,
            value: dataValue
          });
          sel.deleteFromDocument();
          node.appendChild(frag);
          delete data.mutex;
          setDataId(dataId, data);
          dispatchInputEvent(node, 'input', {
            dataTransfer,
            bubbles: true,
            cancelable: false,
            inputType: 'insertFromPaste',
            ranges: [insertTarget]
          });
        }
      } else {
        delete data.mutex;
        setDataId(dataId, data);
      }
      if (!sel.isCollapsed) {
        sel.collapseToEnd();
        dispatchEvent(node.ownerDocument, 'selectionchange', {
          bubbles: false,
          cancelable: false
        });
      }
    }
  }
};

/**
 * replace text edit control element value
 *
 * @param {object} elm - element
 * @param {object} opt - options
 * @returns {void}
 */
export const replaceEditControlValue = (elm, opt = {}) => {
  const { dataId, value } = opt;
  if (elm?.nodeType === Node.ELEMENT_NODE &&
      /^(?:input|textarea)$/.test(elm.localName) &&
      dataIds.has(dataId) && isString(value)) {
    const data = dataIds.get(dataId);
    let dataValue = value.replace(/\u200B/g, '');
    if (/^input$/.test(elm.localName)) {
      dataValue = dataValue.trim();
    }
    const changed = elm.value !== dataValue;
    if (changed && !data.mutex) {
      data.mutex = true;
      setDataId(dataId, data);
      const proceed = dispatchInputEvent(elm, 'beforeinput', {
        bubbles: true,
        cancelable: true,
        data: dataValue,
        inputType: 'insertText'
      });
      if (proceed) {
        elm.value = dataValue;
        delete data.mutex;
        setDataId(dataId, data);
        dispatchInputEvent(elm, 'input', {
          bubbles: true,
          cancelable: false,
          data: dataValue,
          inputType: 'insertText'
        });
      } else {
        delete data.mutex;
        setDataId(dataId, data);
      }
    }
  }
};

/**
 * replace live edit content
 *
 * @param {object} elm - element
 * @param {object} opt - options
 * @returns {void}
 */
export const replaceLiveEditContent = (elm, opt = {}) => {
  const { dataId, liveEditKey, value } = opt;
  if (elm?.nodeType === Node.ELEMENT_NODE &&
      dataIds.has(dataId) && liveEdit[liveEditKey] && isString(value)) {
    const { isIframe, setContent } = liveEdit[liveEditKey];
    const data = dataIds.get(dataId);
    let liveElm;
    if (isIframe && elm.contentDocument) {
      liveElm = elm.contentDocument.querySelector(setContent);
    } else {
      liveElm = elm.querySelector(setContent);
    }
    if (liveElm && !data.mutex) {
      const { keyBackSpace, keyCtrlA } = vars;
      if (isEditControl(liveElm)) {
        const dataValue = value.replace(/\u200B/g, '');
        data.mutex = true;
        setDataId(dataId, data);
        dispatchFocusEvent(liveElm);
        dispatchKeyboardEvent(liveElm, 'keydown', keyCtrlA);
        dispatchKeyboardEvent(liveElm, 'keyup', keyCtrlA);
        dispatchKeyboardEvent(liveElm, 'keydown', keyBackSpace);
        dispatchKeyboardEvent(liveElm, 'keyup', keyBackSpace);
        dispatchInputEvent(liveElm, 'beforeinput', {
          bubbles: true,
          cancelable: true,
          data: dataValue,
          inputType: 'insertText'
        });
        liveElm.value = dataValue;
        delete data.mutex;
        setDataId(dataId, data);
        dispatchInputEvent(liveElm, 'input', {
          bubbles: true,
          cancelable: false,
          data: dataValue,
          inputType: 'insertText'
        });
      } else if (liveElm.isContentEditable) {
        dispatchFocusEvent(liveElm);
        dispatchKeyboardEvent(liveElm, 'keydown', keyCtrlA);
        dispatchKeyboardEvent(liveElm, 'keyup', keyCtrlA);
        dispatchKeyboardEvent(liveElm, 'keydown', keyBackSpace);
        dispatchKeyboardEvent(liveElm, 'keyup', keyBackSpace);
        replaceEditableContent(liveElm, opt);
      }
    }
  }
};

/**
 * get target element and synchronize text
 *
 * @param {object} obj - sync data object
 * @returns {Promise.<Array>} - results of each handler
 */
export const syncText = (obj = {}) => {
  const { data, value } = obj;
  const func = [];
  if (isObjectNotEmpty(data)) {
    const {
      controlledBy, dataId, lastUpdate, liveEditKey, namespaceURI, tabId,
      timestamp
    } = data;
    if (dataId && tabId === vars[ID_TAB]) {
      const elm = getTargetElementFromDataId(dataId);
      if (elm) {
        if (timestamp === FILE_NOT_FOUND_TIMESTAMP) {
          dataIds.delete(dataId);
        } else {
          const storedData = dataIds.get(dataId);
          const mutex = storedData?.mutex;
          const isUpdated = !lastUpdate ||
                            (Number.isInteger(timestamp) &&
                             Number.isInteger(lastUpdate) &&
                             timestamp > lastUpdate);
          if (!mutex && isUpdated) {
            const ctrl =
              controlledBy && getTargetElementFromDataId(controlledBy);
            data.lastUpdate = timestamp;
            if (liveEdit[liveEditKey]) {
              setDataId(dataId, data);
              func.push(replaceLiveEditContent(elm, {
                dataId, liveEditKey, value
              }));
            } else if (ctrl || elm.isContentEditable) {
              setDataId(dataId, data);
              func.push(replaceEditableContent(elm, {
                controlledBy, dataId, namespaceURI, value
              }));
            } else if (/^(?:input|textarea)$/.test(elm.localName)) {
              setDataId(dataId, data);
              func.push(replaceEditControlValue(elm, {
                dataId, value
              }));
            }
          }
        }
      }
    }
  }
  return Promise.all(func);
};

/* port */
/**
 * handle port message
 *
 * @param {*} msg - message
 * @returns {Promise.<Array>} - results of each handler
 */
export const handlePortMsg = async msg => {
  const func = [];
  const items = msg && Object.entries(msg);
  if (items?.length) {
    for (const [key, value] of items) {
      switch (key) {
        case CONTENT_GET:
          func.push(determineContentProcess(value));
          break;
        case ID_TAB:
        case ID_WIN:
        case SYNC_AUTO_URL:
          vars[key] = value;
          break;
        case INCOGNITO:
        case ONLY_EDITABLE:
        case SYNC_AUTO:
          vars[key] = !!value;
          break;
        case IS_MAC:
          vars[key] = !!value;
          func.push(setModifierKey(value));
          break;
        case TMP_FILE_RES:
          func.push(syncText(value));
          break;
        case TMP_FILE_DATA_PORT:
          func.push(updateTmpFileData(value));
          break;
        case TMP_FILE_DATA_REMOVE:
          func.push(removeTmpFileData(value));
          break;
        case TMP_FILE_REQ:
          func.push(postEachDataId(value));
          break;
        case VARS_SET:
          func.push(handlePortMsg(value));
          break;
        default:
      }
    }
  }
  return Promise.all(func);
};

/**
 * request port connection
 *
 * @returns {Function} - sendMessage()
 */
export const requestPortConnection = async () => {
  const msg = {
    [PORT_CONNECT]: {
      name: PORT_CONTENT
    }
  };
  return sendMessage(null, msg);
};

/**
 * handle disconnected port
 *
 * @param {object} port - runtime.Port
 * @returns {Function} - requestPortConnection()
 */
export const handleDisconnectedPort = async port => {
  const e = port.error || runtime.lastError;
  vars.port = null;
  e && logErr(e);
  return requestPortConnection();
};

/**
 * port on disconnect
 *
 * @param {object} port - runtime.Port
 * @returns {Function} - handleDisconnectedPort()
 */
export const portOnDisconnect = port =>
  handleDisconnectedPort(port).catch(throwErr);

/**
 * port on message
 *
 * @param {*} msg - message
 * @returns {Function} - handlePortMsg()
 */
export const portOnMsg = msg => handlePortMsg(msg).catch(throwErr);

/**
 * handle connected port
 *
 * @param {object} port - runtime.Port
 * @returns {void}
 */
export const portOnConnect = async port => {
  if (isObjectNotEmpty(port) && port.name === PORT_CONTENT) {
    port.onMessage.addListener(portOnMsg);
    port.onDisconnect.addListener(portOnDisconnect);
    vars.port = port;
  } else {
    vars.port = null;
  }
};

/**
 * check port
 *
 * @returns {Function} - requestPortConnection() / portOnConnect()
 */
export const checkPort = async () => {
  let func;
  if (vars.port) {
    func = requestPortConnection();
  } else {
    const port = await makeConnection({
      name: PORT_CONTENT
    });
    func = portOnConnect(port);
  }
  return func;
};

/* startup */
export const startup = () => checkPort().catch(throwErr);

/* runtime */
/**
 * handle message
 *
 * @param {*} msg - message
 * @returns {Promise.<Array>} - results of each handler
 */
export const handleMsg = async msg => {
  const func = [];
  if (isObjectNotEmpty(msg)) {
    const items = Object.entries(msg);
    for (const [key, value] of items) {
      if (key === PORT_CONNECT && value) {
        func.push(makeConnection({ name: PORT_CONTENT }).then(portOnConnect));
        break;
      }
    }
  }
  return Promise.all(func);
};

/**
 * runtime on message
 *
 * @param {*} msg - message
 * @returns {Function} - handleMsg();
 */
export const runtimeOnMsg = msg => handleMsg(msg).catch(throwErr);

/* handle events */
/**
 * handle before contextmenu event
 *
 * @param {!object} evt - Event
 * @returns {?Function} - postMsg()
 */
export const handleBeforeContextMenu = evt => {
  const { button, key, shiftKey, target } = evt;
  let func;
  if (button === MOUSE_BUTTON_RIGHT || key === 'ContextMenu' ||
      (shiftKey && key === 'F10')) {
    const { localName, namespaceURI, type } = target;
    const { anchorNode, focusNode, isCollapsed } = document.getSelection();
    const mode = (namespaceURI === nsMath && MODE_MATHML) ||
                 (namespaceURI === nsSvg && MODE_SVG) || MODE_SOURCE;
    const isChildNodeText = isContentTextNode(target);
    const editableElm = getEditableElm(target);
    const liveEditElm = getLiveEditElement(target);
    const isHtml = !namespaceURI || namespaceURI === nsHtml;
    let enabled;
    if (localName === 'input') {
      enabled = !type || /^(?:(?:emai|te|ur)l|search|text)$/.test(type);
    } else {
      enabled = isCollapsed || !!liveEditElm || !!editableElm ||
                anchorNode.parentNode === focusNode.parentNode;
    }
    vars.contextMode = mode;
    if (liveEditElm) {
      vars.contextNode =
        (isHtml && liveEditElm) || (isChildNodeText && target) || null;
    } else if (editableElm) {
      vars.contextNode =
        (isHtml && editableElm) || (isChildNodeText && target) || null;
    } else {
      vars.contextNode = !vars[ONLY_EDITABLE] ? target : null;
    }
    func = postMsg({
      [CONTEXT_MENU]: {
        [MODE_EDIT]: {
          enabled,
          menuItemId: MODE_EDIT
        },
        [MODE_SOURCE]: {
          mode,
          menuItemId: MODE_SOURCE
        }
      }
    }).catch(throwErr);
  }
  return func || null;
};

/**
 * handle keydown event
 *
 * @param {!object} evt - Event
 * @returns {?Function} - handleBeforeContextMenu()
 */
export const handleKeyDown = evt => {
  const { key, shiftKey, target } = evt;
  let func;
  if (key === 'ContextMenu' || (shiftKey && key === 'F10')) {
    func = handleBeforeContextMenu(evt);
  } else if (target && /^(?:application\/(?:(?:[\w\-.]+\+)?(?:json|xml)|(?:(?:x-)?jav|ecm)ascript)|image\/[\w\-.]+\+xml|text\/[\w\-.]+)$/.test(document.contentType)) {
    const { namespaceURI } = target;
    const mode = getContextMode(target);
    const isChildNodeText = isContentTextNode(target);
    const editableElm = getEditableElm(target);
    const liveEditElm = getLiveEditElement(target);
    const isHtml = !namespaceURI || namespaceURI === nsHtml;
    vars.contextMode = mode;
    if (liveEditElm) {
      vars.contextNode =
        (isHtml && liveEditElm) || (isChildNodeText && target) || null;
    } else if (editableElm) {
      vars.contextNode =
        (isHtml && editableElm) || (isChildNodeText && target) || null;
    } else {
      vars.contextNode = !vars[ONLY_EDITABLE] ? target : null;
    }
  }
  return func || null;
};

/**
 * handle readystatechange event
 *
 * @param {!object} evt - Event
 * @returns {?Function} - startup()
 */
export const handleReadyState = evt => {
  const { target } = evt;
  let func;
  if (target.readyState === 'complete') {
    target.removeEventListener('readystatechange', handleReadyState);
    func = startup();
  }
  return func || null;
};
