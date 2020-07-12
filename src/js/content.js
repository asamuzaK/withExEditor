/**
 * content.js
 */
"use strict";
/* api */
const {
  runtime,
  storage: {
    local: localStorage,
  },
} = browser;

/* constants */
const CONTENT_GET = "getContent";
const CONTENT_VALUE = "contentValue";
const CONTEXT_MENU = "contextMenu";
const CONTEXT_MODE = "contextMode";
const CONTEXT_NODE = "contextNode";
const FILE_EXT = "fileExt";
const FILE_LEN = 128;
const FILE_NOT_FOUND_TIMESTAMP = -1;
const ID_TAB = "tabId";
const ID_WIN = "windowId";
const INCOGNITO = "incognito";
const IS_MAC = "isMac";
const KEY_CODE_A = 65;
const KEY_CODE_BS = 8;
const KEY_CODE_V = 86;
const KEY_CODE_X = 88;
const LABEL = "withExEditor";
const LIVE_EDIT = "liveEdit";
const LOCAL_FILE_VIEW = "viewLocalFile";
const MIME_HTML = "text/html";
const MIME_PLAIN = "text/plain";
const MODE_EDIT = "modeEditText";
const MODE_MATHML = "modeViewMathML";
const MODE_SELECTION = "modeViewSelection";
const MODE_SOURCE = "modeViewSource";
const MODE_SVG = "modeViewSVG";
const MOUSE_BUTTON_RIGHT = 2;
const NS_URI = "nsURI";
const ONLY_EDITABLE = "enableOnlyEditable";
const PORT_CONNECT = "connectPort";
const PORT_CONTENT = "portContent";
const SUBST = "index";
const SYNC_AUTO = "enableSyncAuto";
const SYNC_AUTO_URL = "syncAutoUrls";
const TMP_FILES = "tmpFiles";
const TMP_FILES_PB = "tmpFilesPb";
const TMP_FILE_CREATE = "createTmpFile";
const TMP_FILE_DATA_PORT = "portTmpFileData";
const TMP_FILE_DATA_REMOVE = "removeTmpFileData";
const TMP_FILE_GET = "getTmpFile";
const TMP_FILE_REQ = "requestTmpFile";
const TMP_FILE_RES = "resTmpFile";
const TYPE_FROM = 8;
const TYPE_TO = -1;
const VARS_SET = "setVars";
const W3C = "http://www.w3.org/";
const XMLNS = "xmlns";

/* variables */
const vars = {
  [CONTENT_VALUE]: null,
  [CONTEXT_MODE]: null,
  [CONTEXT_NODE]: null,
  [ID_TAB]: "",
  [ID_WIN]: "",
  [INCOGNITO]: false,
  [IS_MAC]: false,
  [ONLY_EDITABLE]: false,
  [SYNC_AUTO]: false,
  [SYNC_AUTO_URL]: null,
  port: null,
};

/* common */
/**
 * throw error
 *
 * @param {!object} e - Error
 * @throws
 */
const throwErr = e => {
  throw e;
};

/**
 * log error
 *
 * @param {!object} e - Error
 * @returns {boolean} - false
 */
const logErr = e => {
  if (e && e.message) {
    console.error(e.message);
  } else {
    console.error(e);
  }
  return false;
};

/**
 * get type
 *
 * @param {*} o - object to check
 * @returns {string} - type of object
 */
const getType = o =>
  Object.prototype.toString.call(o).slice(TYPE_FROM, TYPE_TO);

/**
 * is string
 *
 * @param {*} o - object to check
 * @returns {boolean} - result
 */
const isString = o => typeof o === "string" || o instanceof String;

/**
 * is object, and not an empty object
 *
 * @param {*} o - object to check;
 * @returns {boolean} - result
 */
const isObjectNotEmpty = o => {
  const items = /Object/i.test(getType(o)) && Object.keys(o);
  return !!(items && items.length);
};

/**
 * strip HTML tags and decode HTML escaped characters
 *
 * @param {string} str - html string
 * @returns {string} - converted string
 */
const getDecodedContent = str => {
  if (!isString(str)) {
    throw new TypeError(`Expected String but got ${getType(str)}.`);
  }
  const doc = new DOMParser().parseFromString(str, MIME_HTML);
  return doc.body.textContent.replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
};

/* file utils */
/**
 * get file name from URI path
 *
 * @param {string} uri - URI
 * @param {string} subst - substitute file name
 * @returns {string} - file name
 */
const getFileNameFromURI = (uri, subst = LABEL) => {
  if (!isString(uri)) {
    throw new TypeError(`Expected String but got ${getType(uri)}.`);
  }
  let file;
  const reg = /^.*\/((?:[\w\-~!$&'()*+,;=:@]|%[0-9A-F]{2})+)(?:\.(?:[\w\-~!$&'()*+,;=:@]|%[0-9A-F]{2})+)*$/;
  const {pathname, protocol} = new URL(uri);
  if (pathname && reg.test(pathname) &&
      protocol && !/^(?:blob|data):/.test(protocol)) {
    const [, fileName] = reg.exec(pathname);
    file = decodeURIComponent(fileName);
  }
  return file && file.length < FILE_LEN && file || subst;
};

/**
 * check whether given array of URLs matches document URL
 *
 * @param {Array} arr - array of URLs
 * @returns {boolean} - result
 */
const matchDocUrl = arr => {
  let bool;
  if (Array.isArray(arr) && arr.length) {
    const {
      protocol: docProtocol, hostname: docHost, href: docHref,
    } = document.location;
    for (const item of arr) {
      if (isString(item)) {
        try {
          const {
            protocol: itemProtocol, hostname: itemHost, href: itemHref,
          } = new URL(item.trim());
          if (docProtocol === itemProtocol && docHost === itemHost &&
              docHref.startsWith(itemHref)) {
            bool = true;
            break;
          }
        } catch (e) {
          bool = false;
        }
      }
    }
  }
  return !!bool;
};

/* common shortcut keys */
const KeyBackSpace = {
  code: "Backspace",
  key: "Backspace",
  keyCode: KEY_CODE_BS,
};

const KeyCtrlA = {
  code: "KeyA",
  key: "a",
  keyCode: KEY_CODE_A,
};

const KeyCtrlV = {
  code: "KeyV",
  key: "v",
  keyCode: KEY_CODE_V,
};

const KeyCtrlX = {
  code: "KeyX",
  key: "x",
  keyCode: KEY_CODE_X,
};

/**
 * set modifier keys
 *
 * @param {boolean} bool - is mac
 * @returns {void}
 */
const setModifierKeys = (bool = vars[IS_MAC]) => {
  const keys = [KeyCtrlA, KeyCtrlV, KeyCtrlX];
  for (const key of keys) {
    if (bool) {
      key.metaKey = true;
    } else {
      key.ctrlKey = true;
    }
  }
};

/* dispatch events */
/**
 * dispatch clipboard event
 *
 * @param {object} elm - Element
 * @param {string} type - event type
 * @param {object} opt - init options
 * @returns {boolean} - event permitted
 */
const dispatchClipboardEvent = (elm, type, opt = {
  bubbles: true,
  cancelable: true,
  clipboardData: null,
}) => {
  let res;
  if (elm && elm.nodeType === Node.ELEMENT_NODE &&
      isString(type) && /^(?:c(?:opy|ut)|paste)$/.test(type)) {
    const evt = new ClipboardEvent(type, opt);
    const {clipboardData} = opt;
    if (clipboardData) {
      const {types} = clipboardData;
      for (const mime of types) {
        const value = clipboardData.getData(mime);
        evt.clipboardData.setData(mime, value);
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
const dispatchFocusEvent = elm => {
  let res;
  if (elm && elm.nodeType === Node.ELEMENT_NODE) {
    const opt = {
      bubbles: false,
      cancelable: false,
    };
    const evt = new FocusEvent("focus", opt);
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
const dispatchInputEvent = (elm, type, opt) => {
  let res;
  if (elm && elm.nodeType === Node.ELEMENT_NODE &&
      isString(type) && /^(?:before)?input$/.test(type)) {
    if (!isObjectNotEmpty(opt)) {
      opt = {
        bubbles: true,
        cancelable: type === "beforeinput",
      };
    }
    const evt = new InputEvent(type, opt);
    const {dataTransfer} = opt;
    if (dataTransfer) {
      const {types} = dataTransfer;
      if (!evt.dataTransfer) {
        evt.dataTransfer = new DataTransfer();
      }
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
const dispatchKeyboardEvent = (elm, type, keyOpt = {}) => {
  let res;
  if (elm && elm.nodeType === Node.ELEMENT_NODE &&
      isString(type) && /^key(?:down|press|up)$/.test(type) &&
      isObjectNotEmpty(keyOpt)) {
    const {
      altKey, code, ctrlKey, key, keyCode, metaKey, shiftKey,
    } = keyOpt;
    if (isString(key) && isString(code) && Number.isInteger(keyCode)) {
      const opt = {
        key, code, keyCode,
        altKey: !!altKey,
        bubbles: true,
        cancelable: true,
        ctrlKey: !!ctrlKey,
        locale: "",
        location: 0,
        metaKey: !!metaKey,
        repeat: false,
        shiftKey: !!shiftKey,
      };
      const evt = new KeyboardEvent(type, opt);
      res = elm.dispatchEvent(evt);
    }
  }
  return !!res;
};

/* file extension */
const fileExt = {
  application: {
    javascript: "js",
    json: {
      json: "json",
    },
    xml: {
      mathml: "mml",
      xhtml: "xhtml",
      xml: "xml",
      xslt: "xsl",
    },
  },
  image: {
    xml: {
      svg: "svg",
    },
  },
  text: {
    css: "css",
    javascript: "js",
    html: "html",
    plain: "txt",
    xml: "xml",
  },
};

/**
 * get file extension from media type
 *
 * @param {string} media - media type
 * @param {string} subst - substitute file extension
 * @returns {string} - file extension
 */
const getFileExtension = (media = MIME_PLAIN, subst = "txt") => {
  let ext;
  const arr =
    /^(application|image|text)\/([\w\-.]+)(?:\+(json|xml))?$/.exec(media);
  if (arr) {
    const [, type, subtype, suf] = arr;
    const suffix = suf ||
                   type === "application" && /^(?:json|xml)$/.test(subtype) &&
                   subtype;
    const item = suffix && fileExt[type][suffix];
    if (item) {
      ext = item[subtype] || item[suffix];
    } else {
      ext = fileExt[type][subtype];
    }
  }
  return `.${ext || subst}`;
};

/* DOM handling */
/* namespace URI */
const nsURI = {
  html: `${W3C}1999/xhtml`,
  math: `${W3C}1998/Math/MathML`,
  svg: `${W3C}2000/svg`,
  xmlns: `${W3C}2000/xmlns/`,
};

/**
 * get namespace of node from ancestor
 *
 * @param {object} node - element node
 * @returns {object} - namespace data
 */
const getNodeNS = node => {
  const ns = {node: null, localName: null, namespaceURI: null};
  if (node.namespaceURI) {
    ns.node = node;
    ns.localName = node.localName;
    ns.namespaceURI = node.namespaceURI;
  } else {
    const root = document.documentElement;
    while (node && node !== root && !ns.node) {
      const {localName, parentNode, namespaceURI} = node;
      if (namespaceURI) {
        ns.node = node;
        ns.localName = localName;
        ns.namespaceURI = namespaceURI;
      } else {
        node = parentNode;
      }
    }
    if (!ns.node) {
      ns.node = root;
      ns.localName = root.localName;
      ns.namespaceURI = root.getAttribute(XMLNS) || nsURI[root.localName] || "";
    }
  }
  return ns;
};

/**
 * get xmlns prefixed namespace
 *
 * @param {object} elm - element
 * @param {string} attr - attribute
 * @returns {string} - namespace
 */
const getXmlnsPrefixedNamespace = (elm, attr) => {
  let ns;
  if (elm && elm.nodeType === Node.ELEMENT_NODE) {
    let node = elm;
    while (node && node.parentNode && !ns) {
      if (node.hasAttributeNS("", `xmlns:${attr}`)) {
        ns = node.getAttributeNS("", `xmlns:${attr}`);
      }
      node = node.parentNode;
    }
  }
  return ns || null;
};

/**
 * set namespaced attribute
 *
 * @param {object} elm - element to append attributes
 * @param {object} node - element node to get attributes from
 * @returns {void}
 */
const setAttributeNS = (elm, node = {}) => {
  const {attributes} = node;
  if (elm && attributes && attributes.length) {
    for (const attr of attributes) {
      const {localName, name, namespaceURI, prefix, value} = attr;
      if (typeof node[name] !== "function") {
        const attrName = prefix && `${prefix}:${localName}` || localName;
        const ns = namespaceURI || prefix && nsURI[prefix] || null;
        elm.setAttributeNS(ns, attrName, value);
      }
    }
  }
};

/**
 * create namespaced element
 *
 * @param {object} node - element node to create element from
 * @returns {object} - namespaced element
 */
const createElement = node => {
  let elm;
  if (node && node.nodeType === Node.ELEMENT_NODE) {
    const {attributes, localName, namespaceURI, prefix} = node;
    const ns = namespaceURI || prefix && nsURI[prefix] ||
               getNodeNS(node).namespaceURI || nsURI.html;
    const name = prefix && `${prefix}:${localName}` || localName;
    elm = document.createElementNS(ns, name);
    attributes && setAttributeNS(elm, node);
  }
  return elm || null;
};

/**
 * create document fragment from nodes array
 *
 * @param {Array} nodes - nodes array
 * @returns {object} - document fragment
 */
const createFragment = nodes => {
  const frag = document.createDocumentFragment();
  if (Array.isArray(nodes)) {
    for (const node of nodes) {
      if (node.nodeType === Node.ELEMENT_NODE ||
          node.nodeType === Node.TEXT_NODE) {
        frag.appendChild(node);
      }
    }
  }
  return frag;
};

/**
 * append child nodes
 *
 * @param {object} elm - container element
 * @param {object} node - node containing child nodes to append
 * @returns {object} - element
 */
const appendChildNodes = (elm, node) => {
  const parent = createElement(elm);
  if (parent && parent.nodeType === Node.ELEMENT_NODE &&
      node && node.hasChildNodes()) {
    const arr = [];
    const nodes = node.childNodes;
    for (const child of nodes) {
      const {nodeType, nodeValue, parentNode} = child;
      if (nodeType === Node.ELEMENT_NODE) {
        child === parentNode.firstChild &&
          arr.push(document.createTextNode("\n"));
        arr.push(appendChildNodes(child, child.cloneNode(true)));
        child === parentNode.lastChild &&
          arr.push(document.createTextNode("\n"));
      } else {
        nodeType === Node.TEXT_NODE &&
          arr.push(document.createTextNode(nodeValue));
      }
    }
    if (arr.length) {
      const frag = createFragment(arr);
      parent.appendChild(frag);
    }
  }
  return parent;
};

/**
 * create DOM of MathML / SVG
 *
 * @param {object} node - element node
 * @returns {?string} - serialized node string
 */
const createXmlBasedDom = node => {
  let elm;
  if (node) {
    const root = document.documentElement;
    while (node && node !== root && !elm) {
      if (/^(?:math|svg)$/.test(node.localName)) {
        elm = node;
      }
      node = node.parentNode;
    }
    if (elm) {
      const range = document.createRange();
      range.selectNodeContents(elm);
      elm = appendChildNodes(elm, range.cloneContents());
    }
  }
  return elm && `${new XMLSerializer().serializeToString(elm)}\n` || null;
};

/**
 * create range array
 *
 * @param {object} range - range
 * @returns {Array} - range array
 */
const createRangeArr = range => {
  const arr = [];
  if (range) {
    const ancestor = range.commonAncestorContainer;
    const obj = getNodeNS(ancestor);
    if (/^(?:svg|math)$/.test(obj.localName)) {
      if (!obj.node.parentNode) {
        return null;
      }
      const parent = obj.node.parentNode;
      range.setStart(parent, 0);
      range.setEnd(parent, parent.childNodes.length);
    }
    arr.push(
      appendChildNodes(ancestor, range.cloneContents()),
      document.createTextNode("\n"),
    );
  }
  return arr;
};

/**
 * create DOM from selection range
 *
 * @param {object} sel - selection
 * @returns {?string} - serialized node string
 */
const createDomFromSelectionRange = sel => {
  let frag;
  if (sel && sel.rangeCount) {
    const rangeArr = createRangeArr(sel.getRangeAt(0));
    frag = document.createDocumentFragment();
    for (const range of rangeArr) {
      frag.appendChild(range);
    }
  }
  return frag && new XMLSerializer().serializeToString(frag) || null;
};

/**
 * get text
 *
 * @param {object} nodes - nodes
 * @returns {string} - text
 */
const getText = nodes => {
  const arr = [];
  let text;
  if (nodes instanceof NodeList) {
    for (const node of nodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.localName === "br") {
          arr.push("\n");
        } else {
          node.hasChildNodes() && arr.push(getText(node.childNodes));
        }
      } else {
        node.nodeType === Node.TEXT_NODE && arr.push(
          node.nodeValue.replace(/^\s*/, "")
            .replace(/([^\n])$/, (m, c) => `${c}\n`),
        );
      }
    }
    text = arr.join("");
  }
  return text || "";
};

/**
 * get ancestor element ID
 *
 * @param {object} elm - element node
 * @returns {?string} - ID
 */
const getAncestorId = elm => {
  let ancestorId;
  if (elm && elm.nodeType === Node.ELEMENT_NODE) {
    let node = elm;
    while (node && node.parentNode) {
      const {id: nodeId} = node;
      if (nodeId) {
        ancestorId = nodeId;
        break;
      }
      node = node.parentNode;
    }
  }
  return ancestorId || null;
};

/**
 * node or ancestor is editable
 *
 * @param {object} node - element node
 * @returns {boolean} - result
 */
const isEditable = node => {
  let elm = node, editable;
  while (elm && elm.parentNode) {
    if (!elm.namespaceURI || elm.namespaceURI === nsURI.html) {
      editable = elm.isContentEditable;
    }
    if (editable) {
      break;
    }
    elm = elm.parentNode;
  }
  return !!editable;
};

/**
 * content is text node
 *
 * @param {object} node - element node
 * @returns {boolean} - result
 */
const isContentTextNode = node => {
  let isText = isEditable(node);
  if (isText && node && node.namespaceURI &&
      node.namespaceURI !== nsURI.html && node.hasChildNodes()) {
    const nodes = node.childNodes;
    for (const child of nodes) {
      isText = child.nodeType === Node.TEXT_NODE;
      if (!isText) {
        break;
      }
    }
  }
  return !!isText;
};

/**
 * is text edit control element
 *
 * @param {object} elm - element
 * @returns {boolean} - result
 */
const isEditControl = elm => {
  let bool;
  if (elm) {
    const {localName, type} = elm;
    bool = localName === "textarea" ||
           localName === "input" &&
           (!type || /^(?:(?:emai|te|ur)l|search|text)$/.test(type));
  }
  return !!bool;
};

/**
 * get editable element from ancestor
 *
 * @param {object} node - node
 * @returns {object} - editable element
 */
const getEditableElm = node => {
  let elm;
  if (isEditControl(node)) {
    elm = node;
  } else {
    while (node && node.parentNode) {
      if (node.hasAttribute("contenteditable") && node.isContentEditable &&
          (!node.namespaceURI || node.namespaceURI === nsURI.html)) {
        elm = node;
        break;
      }
      node = node.parentNode;
    }
  }
  return elm || null;
};

/* post messages */
/**
 * post message
 *
 * @param {*} msg - message
 * @returns {void}
 */
const postMsg = async msg => {
  const {port} = vars;
  if (port && msg) {
    port.postMessage(msg);
  }
};

/**
 * request port connection
 *
 * @returns {Function} - sendMessage()
 */
const requestPortConnection = async () => {
  const msg = {
    [PORT_CONNECT]: {
      name: PORT_CONTENT,
    },
  };
  return runtime.sendMessage(msg);
};

/* live editor */
const liveEdit = new Map();

/**
 * get live edit key from class list
 *
 * @param {object} classList - DOMTokenList
 * @returns {?string} - live edit key
 */
const getLiveEditKeyFromClassList = classList => {
  let liveEditKey;
  if (classList instanceof DOMTokenList && classList.length) {
    for (const [key, value] of liveEdit) {
      const {className} = value;
      liveEditKey = classList.contains(className) && key;
      if (liveEditKey) {
        break;
      }
    }
  }
  return liveEditKey || null;
};

/**
 * get live edit element from ancestor
 *
 * @param {object} node - node
 * @returns {object} - live edit element
 */
const getLiveEditElm = node => {
  let elm;
  const items = Array.from(liveEdit.values());
  while (node && node.parentNode && !elm) {
    const {classList, namespaceURI} = node;
    const isHtml = !namespaceURI || namespaceURI === nsURI.html;
    if (isHtml) {
      for (const item of items) {
        const {className, isIframe} = item;
        if (isIframe) {
          const iframe = node.querySelector(`iframe.${className}`);
          if (iframe) {
            elm = iframe;
            break;
          }
        } else if (classList.contains(className)) {
          elm = node;
          !elm.isContentEditable && elm.setAttribute("contenteditable", "");
          break;
        }
      }
    }
    node = node.parentNode;
  }
  return elm || null;
};

/**
 * get live edit content
 *
 * @param {object} elm - Element
 * @param {string} key - key
 * @returns {?string} - content
 */
const getLiveEditContent = (elm, key) => {
  let content;
  if (elm && elm.nodeType === Node.ELEMENT_NODE && liveEdit.has(key)) {
    const {getContent, isIframe} = liveEdit.get(key);
    let items;
    if (isIframe && elm.contentDocument) {
      items = elm.contentDocument.querySelectorAll(getContent);
    } else {
      items = elm.querySelectorAll(getContent);
    }
    if (items && items.length) {
      const arr = [];
      for (const item of items) {
        if (item.localName === "br") {
          arr.push("");
        } else if (isEditControl(item)) {
          arr.push(item.value);
        } else {
          arr.push(item.textContent);
        }
      }
      content = arr.join("\n");
    }
  }
  return content || null;
};

/* data IDs */
const dataIds = new Map();

/**
 * set data ID
 *
 * @param {string} dataId - data ID
 * @param {object} data - data
 * @returns {object} - dataIds object
 */
const setDataId = (dataId, data) => {
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
 * remove data ID
 *
 * @param {string} dataId - data ID
 * @returns {boolean} - result
 */
const removeDataId = dataId => dataIds.delete(dataId);

/**
 * get target element from data ID
 *
 * @param {string} dataId - data ID
 * @returns {object} - target element
 */
const getTargetElementFromDataId = dataId => {
  if (!isString(dataId)) {
    throw new TypeError(`Expected String but got ${getType(dataId)}.`);
  }
  let elm = document.getElementById(dataId);
  if (!elm) {
    const data = dataIds.get(dataId);
    if (isObjectNotEmpty(data)) {
      const {ancestorId, localName, prefix, queryIndex} = data;
      if (localName && Number.isInteger(queryIndex)) {
        let items;
        if (prefix) {
          const query = ancestorId && `#${ancestorId} *|*` ||
                        `${document.documentElement.localName} *|*`;
          items = Array.from(document.querySelectorAll(query)).filter(item => {
            const {localName: itemLocalName} = item;
            return itemLocalName === localName && item;
          });
        } else {
          const query = ancestorId && `#${ancestorId} ${localName}` ||
                        localName;
          items = document.querySelectorAll(query);
        }
        elm = items[queryIndex];
      }
    }
  }
  return elm || null;
};

/**
 * create ID data
 *
 * @param {object} elm - target element
 * @returns {object} - ID data
 */
const createIdData = elm => {
  let data;
  if (elm) {
    const {id, localName, prefix} = elm;
    if (id) {
      data = {dataId: id};
    } else {
      const ancestorId = getAncestorId(elm);
      const {localName: rootLocalName} = document.documentElement;
      let items, queryIndex, i = 0, l;
      if (prefix) {
        const query = ancestorId && `#${ancestorId} *|*` ||
                      `${rootLocalName} *|*`;
        items = Array.from(document.querySelectorAll(query)).filter(item => {
          const {localName: itemLocalName} = item;
          return itemLocalName === localName && item;
        });
        l = items.length;
      } else {
        const query = ancestorId && `#${ancestorId} ${localName}` || localName;
        items = document.querySelectorAll(query);
        l = items.length;
      }
      while (i < l) {
        const item = items[i];
        if (item === elm) {
          queryIndex = i;
          break;
        }
        i++;
      }
      if (Number.isInteger(queryIndex)) {
        const targetElm = prefix && `${prefix}:${localName}` || localName;
        const dataId = ancestorId &&
                       `${ancestorId}_${targetElm}_${queryIndex}` ||
                       `${rootLocalName}_${targetElm}_${queryIndex}`;
        data = {
          ancestorId, localName, prefix, queryIndex, dataId,
        };
      }
    }
  }
  return data || null;
};

/**
 * post each data ID
 *
 * @param {boolean} bool - post data ID
 * @returns {Promise.<Array>} - results of each handler
 */
const postEachDataId = async (bool = false) => {
  const func = [];
  if (bool) {
    dataIds.forEach((value, key) => {
      const elm = getTargetElementFromDataId(key);
      elm && func.push(postMsg({[TMP_FILE_GET]: value}));
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
const postTmpFileData = async dataId => {
  let func;
  const data = dataIds.get(dataId);
  if (data) {
    func = postMsg({[TMP_FILE_GET]: data});
  }
  return func || null;
};

/* temporary file data */
/**
 * set temporary file data
 *
 * @param {object} data - temporary file data
 * @returns {?Function} - set data ID
 */
const setTmpFileData = (data = {}) => {
  let func;
  const tmpFileData = data[TMP_FILE_CREATE];
  if (tmpFileData) {
    const {dataId, mode} = tmpFileData;
    if (mode === MODE_EDIT && dataId) {
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
const updateTmpFileData = (obj = {}) => {
  let func;
  const {data} = obj;
  if (data) {
    const {dataId, mode} = data;
    if (mode === MODE_EDIT && dataId) {
      func = setDataId(dataId, data);
    }
  }
  return func || null;
};

/**
 * remove temporary file data
 *
 * @param {object} obj - temporary file data object
 * @returns {?Function} - remove data ID
 */
const removeTmpFileData = (obj = {}) => {
  let func;
  const {data} = obj;
  if (data) {
    const {dataId, tabId, timestamp} = data;
    if (dataId && tabId === vars[ID_TAB] &&
        timestamp === FILE_NOT_FOUND_TIMESTAMP) {
      func = removeDataId(dataId);
    }
  }
  return func || null;
};

/**
 * fetch file source and create temporary file data
 *
 * @param {object} data - content data
 * @returns {object} - temporary file data
 */
const fetchSource = async (data = {}) => {
  const {
    characterSet, contentType, documentURI: uri, location: {protocol},
  } = document;
  let obj;
  if (protocol === "file:") {
    obj = {
      [LOCAL_FILE_VIEW]: {uri},
    };
  } else {
    const headers = new Headers({
      Charset: characterSet,
      "Content-Type": contentType,
    });
    const opt = {
      headers,
      cache: "force-cache",
      credentials: "include",
      method: "GET",
      mode: "cors",
    };
    const res = await fetch(uri, opt);
    if (res) {
      const {dir, host, incognito, mode, tabId, windowId} = data;
      const [type] = res.headers.get("Content-Type").split(";");
      const dataId = getFileNameFromURI(uri, SUBST);
      const extType = getFileExtension(type);
      const value = await res.text();
      obj = {
        [TMP_FILE_CREATE]: {
          dataId, dir, extType, host, incognito, mode, tabId, windowId,
        },
        value,
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
const createTmpFileData = async (data = {}) => {
  const {contentType, documentURI: uri} = document;
  const {
    dir, host, incognito, liveEditKey, mode, syncAuto, tabId, value, windowId,
  } = data;
  let {dataId, namespaceURI} = data, extType, tmpFileData;
  namespaceURI = namespaceURI || "";
  switch (mode) {
    case MODE_EDIT:
      if (dataId) {
        extType = ".txt";
        tmpFileData = {
          [TMP_FILE_CREATE]: {
            dataId, dir, extType, host, incognito, liveEditKey, mode,
            namespaceURI, syncAuto, tabId, windowId,
          },
          value,
        };
      }
      break;
    case MODE_MATHML:
    case MODE_SVG:
      if (value && (dataId = getFileNameFromURI(uri, SUBST))) {
        extType = mode === MODE_MATHML && ".mml" || ".svg";
        tmpFileData = {
          [TMP_FILE_CREATE]: {
            dataId, dir, extType, host, incognito, mode, tabId, windowId,
          },
          value,
        };
      }
      break;
    case MODE_SELECTION:
      dataId = getFileNameFromURI(uri, SUBST);
      if (dataId && value &&
          /^(?:(?:application\/(?:[\w\-.]+\+)?|image\/[\w\-.]+\+)x|text\/(?:ht|x))ml$/.test(contentType)) {
        extType = ".xml";
        tmpFileData = {
          [TMP_FILE_CREATE]: {
            dataId, dir, extType, host, incognito, mode, tabId, windowId,
          },
          value,
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

/**
 * request temporary file
 *
 * @param {!object} evt - Event
 * @returns {Promise.<Array|Error>} - promise chain
 */
const requestTmpFile = evt => {
  const func = [];
  const {target, currentTarget} = evt;
  const data = createIdData(currentTarget);
  if (data) {
    const {dataId} = data;
    if (dataIds.has(dataId)) {
      if (target === currentTarget) {
        const {controls} = dataIds.get(dataId);
        if (controls) {
          controls.forEach(id => {
            dataIds.has(id) && func.push(postTmpFileData(id));
          });
        } else {
          func.push(postTmpFileData(dataId));
        }
      } else {
        const liveEditKey =
          getLiveEditKeyFromClassList(currentTarget.classList);
        const liveEditData = liveEdit.get(liveEditKey);
        if (isObjectNotEmpty(liveEditData)) {
          const {setContent} = liveEditData;
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
  return Promise.all(func).catch(throwErr);
};

/**
 * set data ID controller
 *
 * @param {object} elm - element
 * @param {string} dataId - data ID
 * @returns {void}
 */
const setDataIdController = (elm, dataId) => {
  const ctrl = getEditableElm(elm);
  if (ctrl && dataId) {
    const ctrlData = createIdData(ctrl);
    if (ctrlData) {
      const {dataId: ctrlId} = ctrlData;
      ctrl.addEventListener("focus", requestTmpFile, true);
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
        controlledBy: ctrlId,
      });
    }
  }
};

/* content data */
/**
 * create content data
 *
 * @param {object} elm - element
 * @param {string} mode - context mode
 * @returns {object} - content data
 */
const createContentData = async (elm, mode) => {
  const {incognito, enableSyncAuto, syncAutoUrls, tabId, windowId} = vars;
  const data = {
    incognito, tabId, windowId,
    mode: MODE_SOURCE,
    dir: incognito && TMP_FILES_PB || TMP_FILES,
    host: document.location.hostname || LABEL,
    dataId: null,
    namespaceURI: null,
    value: null,
    liveEditKey: null,
    syncAuto: false,
  };
  const sel = document.getSelection();
  const {anchorNode, isCollapsed} = sel;
  if (elm && mode) {
    switch (mode) {
      case MODE_EDIT: {
        const obj = createIdData(elm);
        if (obj) {
          const {dataId} = obj;
          const {
            childNodes, classList, isContentEditable, namespaceURI, value,
          } = elm;
          const liveEditKey = getLiveEditKeyFromClassList(classList);
          const isHtml = !namespaceURI || namespaceURI === nsURI.html;
          isHtml && elm.addEventListener("focus", requestTmpFile, true);
          !dataIds.has(dataId) && setDataId(dataId, obj);
          if (liveEditKey) {
            data.mode = mode;
            data.dataId = dataId;
            data.value = getLiveEditContent(elm, liveEditKey) || "";
            data.liveEditKey = liveEditKey;
          } else if (isCollapsed && isEditControl(elm)) {
            data.mode = mode;
            data.dataId = dataId;
            data.value = value || "";
          } else {
            if (!isContentEditable && !isCollapsed && anchorNode) {
              elm = anchorNode.parentNode;
            }
            data.mode = mode;
            data.dataId = dataId;
            data.value = elm.hasChildNodes() && getText(childNodes) || "";
            data.namespaceURI = namespaceURI || getNodeNS(elm).namespaceURI;
            setDataIdController(elm, dataId);
          }
          if (!incognito && enableSyncAuto && isString(syncAutoUrls)) {
            data.syncAuto = matchDocUrl(syncAutoUrls.split("\n"));
          }
        }
        break;
      }
      case MODE_MATHML:
      case MODE_SVG: {
        const obj = createXmlBasedDom(elm);
        if (obj) {
          data.mode = mode;
          data.value = obj;
        }
        break;
      }
      case MODE_SELECTION: {
        const obj = createDomFromSelectionRange(sel);
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
const createContentDataMsg = async data => {
  let msg;
  if (isObjectNotEmpty(data)) {
    if (data[TMP_FILE_CREATE]) {
      msg = {
        [TMP_FILE_CREATE]: {
          data: data[TMP_FILE_CREATE],
          value: data.value,
        },
      };
    } else if (data[LOCAL_FILE_VIEW]) {
      const {uri} = data[LOCAL_FILE_VIEW];
      msg = {
        [LOCAL_FILE_VIEW]: uri,
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
const postContent = async (elm, mode) => {
  const func = [];
  if (elm && elm.nodeType === Node.ELEMENT_NODE) {
    const data = await createContentData(elm, mode).then(createTmpFileData);
    func.push(
      createContentDataMsg(data).then(postMsg),
      setTmpFileData(data),
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
const getContextMode = elm => {
  const {
    anchorNode, focusNode, isCollapsed, rangeCount,
  } = document.getSelection();
  let mode = MODE_SOURCE;
  if (elm) {
    elm = !isCollapsed &&
          (anchorNode.nodeType === Node.TEXT_NODE && anchorNode.parentNode ||
           focusNode.nodeType === Node.TEXT_NODE && focusNode.parentNode) ||
          elm;
    if ((elm.isContentEditable || isEditControl(elm) ||
         isContentTextNode(elm)) &&
        (isCollapsed ||
         rangeCount && anchorNode.parentNode === focusNode.parentNode &&
         elm !== document.documentElement)) {
      mode = MODE_EDIT;
    } else if (isCollapsed) {
      if (elm.namespaceURI === nsURI.math) {
        mode = MODE_MATHML;
      } else if (elm.namespaceURI === nsURI.svg) {
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
const determineContentProcess = (obj = {}) => {
  const {info} = obj;
  const isTop = window.top.location.href === document.URL;
  const elm = vars[CONTEXT_NODE] || isTop && document.activeElement;
  let mode;
  if (info) {
    const {menuItemId} = info;
    mode = menuItemId !== MODE_SOURCE && menuItemId || vars[CONTEXT_MODE] ||
           isTop && MODE_SOURCE;
  } else {
    mode = getContextMode(elm);
  }
  return postContent(elm, mode);
};

/* synchronize text */
/**
 * create paragraphed content
 *
 * @param {string} value - value
 * @param {string} ns - namespace URI
 * @returns {object} - document fragment
 */
const createParagraphedContent = (value, ns = nsURI.html) => {
  const arr = isString(value) && value.split("\n") || [""];
  const l = arr.length;
  const frag = document.createDocumentFragment();
  if (l === 1) {
    const [text] = arr;
    if (text) {
      frag.appendChild(document.createTextNode(text));
    } else {
      frag.appendChild(document.createTextNode("\n"));
    }
  } else {
    const sep = document.queryCommandValue("defaultParagraphSeparator");
    let i = 0;
    while (i < l) {
      const text = arr[i];
      if (ns === nsURI.html) {
        if (sep === "div" || sep === "p") {
          const elm = document.createElementNS(ns, sep);
          if (text) {
            elm.appendChild(document.createTextNode(text));
          } else if (i < l - 1) {
            const br = document.createElementNS(ns, "br");
            elm.appendChild(br);
          }
          elm.hasChildNodes() && frag.appendChild(elm);
        } else {
          if (text) {
            frag.appendChild(document.createTextNode(text));
          } else {
            const br = document.createElementNS(ns, "br");
            frag.appendChild(br);
          }
          if (i < l - 1) {
            const br = document.createElementNS(ns, "br");
            frag.appendChild(br);
          }
        }
      } else if (text) {
        frag.appendChild(document.createTextNode(text));
      } else {
        frag.appendChild(document.createTextNode(""));
      }
      if (i < l - 1) {
        frag.appendChild(document.createTextNode("\n"));
      }
      i++;
    }
  }
  return frag;
};

/**
 * paste content
 *
 * @param {object} elm - owner element
 * @param {object} node - editable element
 * @param {string} ns - namespace URI
 * @returns {boolean} - true if not prevented, false otherwise
 */
const pasteContent = (elm, node, ns = nsURI.html) => {
  let res;
  const value = vars[CONTENT_VALUE];
  const sel = document.getSelection();
  if (node && node.nodeType === Node.ELEMENT_NODE && isString(value)) {
    const dataTrans = new DataTransfer();
    dataTrans.setData(MIME_PLAIN, value);
    sel.collapse(null);
    sel.selectAllChildren(node);
    // TODO: StaticRange() constructor not implemented in Blink yet
    /*
    const insertTarget = new StaticRange({
      startContainer: sel.anchorNode,
      startOffset: sel.anchorOffset,
      endContainer: sel.focusNode,
      endOffset: sel.focusOffset,
    });
    */
    const insertTarget = {
      startContainer: sel.anchorNode,
      startOffset: sel.anchorOffset,
      endContainer: sel.focusNode,
      endOffset: sel.focusOffset,
      collapsed: sel.isCollapsed,
    };
    // TODO: add support for React, issue #123
    // NOTE: maybe synthetic paste turns drag data store mode to protected?
    const pasteNotPrevented = dispatchClipboardEvent(node, "paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: dataTrans,
    });
    if (pasteNotPrevented) {
      // TODO: beforeinput not enabled by default in Gecko yet
      try {
        res = dispatchInputEvent(node, "beforeinput", {
          bubbles: true,
          cancelable: true,
          // TODO: use plain text value instead?
          //data: value,
          //inputType: "insertText",
          dataTransfer: dataTrans,
          inputType: "insertFromPaste",
          ranges: [insertTarget],
        });
      } catch (e) {
        logErr(e);
        res = true;
      }
    } else {
      res = false;
    }
    if (res) {
      const frag = document.createDocumentFragment();
      if (elm === node) {
        const contentFrag = createParagraphedContent(value, ns);
        frag.appendChild(contentFrag);
      } else {
        frag.appendChild(document.createTextNode(value));
      }
      sel.deleteFromDocument();
      node.appendChild(frag);
      dispatchInputEvent(node, "input", {
        bubbles: true,
        cancelable: false,
        dataTransfer: dataTrans,
        inputType: "insertFromPaste",
        ranges: [insertTarget],
      });
    }
    sel.collapse(null);
  }
  return !!res;
};

/**
 * replace content of content editable element
 *
 * @param {object} elm - owner element
 * @param {object} node - editable element
 * @param {string} value - value
 * @param {string} ns - namespace URI
 * @returns {void}
 */
const replaceContent = (elm, node, value, ns = nsURI.html) => {
  if (node && node.nodeType === Node.ELEMENT_NODE && isString(value)) {
    const changed = value !== node.textContent.replace(/^\s*/, "")
      .replace(/\n +/g, "\n").replace(/([^\n])$/, (m, c) => `${c}\n`);
    if (changed) {
      vars[CONTENT_VALUE] = value;
      if (pasteContent(elm, node, ns)) {
        vars[CONTENT_VALUE] = null;
      }
    }
  }
};

/**
 * replace text edit control element value
 *
 * @param {object} elm - element
 * @param {string} value - value
 * @returns {void}
 */
const replaceEditControlValue = (elm, value) => {
  if (elm && elm.nodeType === Node.ELEMENT_NODE &&
      /^(?:input|textarea)$/.test(elm.localName) && isString(value)) {
    if (/^input$/.test(elm.localName)) {
      while (value.length && /[\f\n\t\r\v]$/.test(value)) {
        value = value.replace(/[\f\n\t\r\v]$/, "");
      }
    }
    const changed = elm.value !== value;
    if (changed) {
      value = value.replace(/\u200B/g, "");
      const beforeInputNotPrevented = dispatchInputEvent(elm, "beforeinput", {
        bubbles: true,
        cancelable: true,
        data: value,
        inputType: "insertText",
      });
      if (beforeInputNotPrevented) {
        elm.value = value;
        dispatchInputEvent(elm, "input", {
          bubbles: true,
          cancelable: false,
          data: value,
          inputType: "insertText",
        });
      }
    }
  }
};

/**
 * replace live edit content
 *
 * @param {object} elm - element
 * @param {string} value - value
 * @param {string} key - key
 * @returns {void}
 */
const replaceLiveEditContent = (elm, value, key) => {
  if (elm && elm.nodeType === Node.ELEMENT_NODE && isString(value) &&
      liveEdit.has(key)) {
    const {isIframe, setContent} = liveEdit.get(key);
    let liveElm;
    if (isIframe && elm.contentDocument) {
      liveElm = elm.contentDocument.querySelector(setContent);
    } else {
      liveElm = elm.querySelector(setContent);
    }
    if (isEditControl(liveElm)) {
      dispatchFocusEvent(liveElm);
      dispatchKeyboardEvent(liveElm, "keydown", KeyCtrlA);
      dispatchKeyboardEvent(liveElm, "keyup", KeyCtrlA);
      dispatchKeyboardEvent(liveElm, "keydown", KeyBackSpace);
      dispatchKeyboardEvent(liveElm, "keyup", KeyBackSpace);
      value = value.replace(/\u200B/g, "");
      dispatchInputEvent(liveElm, "beforeinput", {
        bubbles: true,
        cancelable: true,
        data: value,
        inputType: "insertText",
      });
      liveElm.value = value;
      dispatchInputEvent(liveElm, "input", {
        bubbles: true,
        cancelable: false,
        data: value,
        inputType: "insertText",
      });
    }
  }
};

/**
 * get target element and synchronize text
 *
 * @param {object} obj - sync data object
 * @returns {Promise.<Array>} - results of each handler
 */
const syncText = (obj = {}) => {
  const {data, value} = obj;
  const func = [];
  if (isObjectNotEmpty(data)) {
    const {
      controlledBy, dataId, lastUpdate, liveEditKey, namespaceURI, tabId,
      timestamp,
    } = data;
    if (dataId && tabId === vars[ID_TAB]) {
      const elm = getTargetElementFromDataId(dataId);
      if (elm) {
        if (timestamp === FILE_NOT_FOUND_TIMESTAMP) {
          func.push(removeDataId(dataId));
        } else if (!lastUpdate ||
                   Number.isInteger(timestamp) &&
                   Number.isInteger(lastUpdate) && timestamp > lastUpdate) {
          const controller =
            controlledBy && getTargetElementFromDataId(controlledBy);
          data.lastUpdate = timestamp;
          if (liveEdit.has(liveEditKey)) {
            func.push(
              replaceLiveEditContent(elm, value, liveEditKey),
              setDataId(dataId, data),
            );
          } else if (controller) {
            func.push(
              replaceContent(controller, elm, value, namespaceURI),
              setDataId(dataId, data),
            );
          } else if (elm.isContentEditable) {
            func.push(
              replaceContent(elm, elm, value, namespaceURI),
              setDataId(dataId, data),
            );
          } else {
            /^(?:input|textarea)$/.test(elm.localName) && func.push(
              replaceEditControlValue(elm, value),
              setDataId(dataId, data),
            );
          }
        }
      }
    }
  }
  return Promise.all(func);
};

/* local storage */
/**
 * extend object items from local storage
 *
 * @param {object} obj - object to extend items
 * @param {string} key - local storage key
 * @returns {object} - extended object
 */
const extendObjItems = async (obj, key) => {
  if (obj) {
    const value = await localStorage.get(key);
    if (isObjectNotEmpty(value)) {
      const ext = value[key];
      const items = Object.entries(ext);
      for (const [itemKey, itemValue] of items) {
        if (obj instanceof Map) {
          obj.set(itemKey, itemValue);
        } else {
          obj[itemKey] = itemValue;
        }
      }
    }
  }
  return obj;
};

/* port */
/**
 * handle port message
 *
 * @param {*} msg - message
 * @returns {Promise.<Array>} - results of each handler
 */
const handlePortMsg = async msg => {
  const func = [];
  const items = msg && Object.entries(msg);
  if (items && items.length) {
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
          func.push(setModifierKeys(value));
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
 * handle disconnected port
 *
 * @param {object} port - runtime.Port
 * @returns {Function} - requestPortConnection()
 */
const handleDisconnectedPort = async port => {
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
const portOnDisconnect = port => handleDisconnectedPort(port).catch(throwErr);

/**
 * port on message
 *
 * @param {*} msg - message
 * @returns {Function} - handlePortMsg()
 */
const portOnMsg = msg => handlePortMsg(msg).catch(throwErr);

/**
 * handle connected port
 *
 * @param {object} port - runtime.Port
 * @returns {void}
 */
const portOnConnect = async port => {
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
const checkPort = async () => {
  let func;
  if (vars.port) {
    func = requestPortConnection();
  } else {
    const port = runtime.connect({
      name: PORT_CONTENT,
    });
    func = portOnConnect(port);
  }
  return func;
};

/**
 * handle message
 *
 * @param {*} msg - message
 * @returns {Promise.<Array>} - results of each handler
 */
const handleMsg = async msg => {
  const func = [];
  if (isObjectNotEmpty(msg)) {
    const items = Object.entries(msg);
    for (const [key, value] of items) {
      if (key === PORT_CONNECT && value) {
        const port = runtime.connect({
          name: PORT_CONTENT,
        });
        func.push(portOnConnect(port));
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
const runtimeOnMsg = msg => handleMsg(msg).catch(throwErr);

/* handle events */
/**
 * handle before contextmenu event
 *
 * @param {!object} evt - Event
 * @returns {?Function} - postMsg()
 */
const handleBeforeContextMenu = evt => {
  const {button, key, shiftKey, target} = evt;
  let func;
  if (button === MOUSE_BUTTON_RIGHT || key === "ContextMenu" ||
      shiftKey && key === "F10") {
    const {localName, namespaceURI, type} = target;
    const {anchorNode, focusNode, isCollapsed} = document.getSelection();
    const mode = namespaceURI === nsURI.math && MODE_MATHML ||
                 namespaceURI === nsURI.svg && MODE_SVG || MODE_SOURCE;
    const isChildNodeText = isContentTextNode(target);
    const editableElm = getEditableElm(target);
    const liveEditElm = getLiveEditElm(target);
    let enabled;
    if (localName === "input") {
      enabled = !type || /^(?:(?:emai|te|ur)l|search|text)$/.test(type);
    } else {
      enabled = isCollapsed || !!liveEditElm || !!editableElm ||
                anchorNode.parentNode === focusNode.parentNode;
    }
    vars[CONTEXT_MODE] = mode;
    if (liveEditElm) {
      vars[CONTEXT_NODE] = (!namespaceURI || namespaceURI === nsURI.html) &&
                           liveEditElm || isChildNodeText && target || null;
    } else if (editableElm) {
      vars[CONTEXT_NODE] = (!namespaceURI || namespaceURI === nsURI.html) &&
                           editableElm || isChildNodeText && target || null;
    } else {
      vars[CONTEXT_NODE] = !vars[ONLY_EDITABLE] && target || null;
    }
    func = postMsg({
      [CONTEXT_MENU]: {
        [MODE_EDIT]: {
          enabled,
          menuItemId: MODE_EDIT,
        },
        [MODE_SOURCE]: {
          mode,
          menuItemId: MODE_SOURCE,
        },
      },
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
const handleKeyDown = evt => {
  const {key, shiftKey, target} = evt;
  let func;
  if (key === "ContextMenu" || shiftKey && key === "F10") {
    func = handleBeforeContextMenu(evt);
  } else if (target && /^(?:application\/(?:(?:[\w\-.]+\+)?(?:json|xml)|(?:(?:x-)?jav|ecm)ascript)|image\/[\w\-.]+\+xml|text\/[\w\-.]+)$/.test(document.contentType)) {
    const {namespaceURI} = target;
    const mode = getContextMode(target);
    const isChildNodeText = isContentTextNode(target);
    const editableElm = getEditableElm(target);
    const liveEditElm = getLiveEditElm(target);
    vars[CONTEXT_MODE] = mode;
    if (liveEditElm) {
      vars[CONTEXT_NODE] = (!namespaceURI || namespaceURI === nsURI.html) &&
                           liveEditElm || isChildNodeText && target || null;
    } else if (editableElm) {
      vars[CONTEXT_NODE] = (!namespaceURI || namespaceURI === nsURI.html) &&
                           editableElm || isChildNodeText && target || null;
    } else {
      vars[CONTEXT_NODE] = !vars[ONLY_EDITABLE] && target || null;
    }
  }
  return func || null;
};

/**
 * startup
 *
 * @returns {Promise.<Array|Error>} - promise chain
 */
const startup = () => Promise.all([
  checkPort(),
  extendObjItems(fileExt, FILE_EXT),
  extendObjItems(nsURI, NS_URI),
  extendObjItems(liveEdit, LIVE_EDIT),
]).catch(throwErr);

/* listeners */
runtime.onMessage.addListener(runtimeOnMsg);
window.addEventListener("mousedown", handleBeforeContextMenu, true);
window.addEventListener("keydown", handleKeyDown, true);
window.addEventListener("load", startup);
document.readyState === "complete" && startup();

/* export for tests */
if (typeof module !== "undefined" && module.hasOwnProperty("exports")) {
  module.exports = {
    appendChildNodes,
    checkPort,
    createContentData,
    createContentDataMsg,
    createDomFromSelectionRange,
    createElement,
    createFragment,
    createIdData,
    createParagraphedContent,
    createRangeArr,
    createTmpFileData,
    createXmlBasedDom,
    dataIds,
    determineContentProcess,
    dispatchClipboardEvent,
    dispatchFocusEvent,
    dispatchInputEvent,
    dispatchKeyboardEvent,
    extendObjItems,
    fetchSource,
    getAncestorId,
    getContextMode,
    getDecodedContent,
    getEditableElm,
    getFileExtension,
    getFileNameFromURI,
    getLiveEditContent,
    getLiveEditElm,
    getLiveEditKeyFromClassList,
    getNodeNS,
    getTargetElementFromDataId,
    getText,
    getType,
    getXmlnsPrefixedNamespace,
    handleBeforeContextMenu,
    handleDisconnectedPort,
    handleKeyDown,
    handleMsg,
    handlePortMsg,
    isContentTextNode,
    isEditControl,
    isEditable,
    isObjectNotEmpty,
    isString,
    KeyCtrlA,
    KeyCtrlV,
    KeyCtrlX,
    liveEdit,
    logErr,
    matchDocUrl,
    pasteContent,
    portOnConnect,
    portOnDisconnect,
    portOnMsg,
    postContent,
    postEachDataId,
    postMsg,
    postTmpFileData,
    removeDataId,
    removeTmpFileData,
    replaceContent,
    replaceEditControlValue,
    replaceLiveEditContent,
    requestPortConnection,
    requestTmpFile,
    runtimeOnMsg,
    setAttributeNS,
    setDataId,
    setDataIdController,
    setModifierKeys,
    setTmpFileData,
    startup,
    syncText,
    throwErr,
    updateTmpFileData,
    vars,
  };
}
