/**
 * content.js
 */
"use strict";
{
  /* api */
  const {
    runtime,
    storage: {
      local: localStorage,
    },
  } = browser;

  /* constants */
  const CONTENT_GET = "getContent";
  const CONTEXT_MENU = "contextMenu";
  const CONTEXT_MODE = "contextMode";
  const CONTEXT_NODE = "contextNode";
  const FILE_EXT = "fileExt";
  const FILE_LEN = 128;
  const HTML = "html";
  const ID_TAB = "tabId";
  const ID_WIN = "windowId";
  const INCOGNITO = "incognito";
  const IS_ENABLED = "isEnabled";
  const KEY_ACCESS = "accessKey";
  const KEY_CODE_A = 65;
  const KEY_CODE_BS = 8;
  const KEY_EDITOR = "editorShortCut";
  const KEY_OPTIONS = "optionsShortCut";
  const LABEL = "withExEditor";
  const LIVE_EDIT = "liveEdit";
  const LOCAL_FILE_VIEW = "viewLocalFile";
  const MODE_EDIT = "modeEditText";
  const MODE_MATHML = "modeViewMathML";
  const MODE_SELECTION = "modeViewSelection";
  const MODE_SOURCE = "modeViewSource";
  const MODE_SVG = "modeViewSVG";
  const MOUSE_BUTTON_RIGHT = 2;
  const NS_URI = "nsURI";
  const ONLY_EDITABLE = "enableOnlyEditable";
  const PORT_NAME = "portContent";
  const RANGE_SEP = "Next Range";
  const SUBST = "index";
  const SYNC_AUTO = "enableSyncAuto";
  const SYNC_AUTO_URL = "syncAutoUrls";
  const TEXT_SYNC = "syncText";
  const TMP_FILES = "tmpFiles";
  const TMP_FILES_PB = "tmpFilesPb";
  const TMP_FILE_CREATE = "createTmpFile";
  const TMP_FILE_DATA_PORT = "portTmpFileData";
  const TMP_FILE_GET = "getTmpFile";
  const TYPE_FROM = 8;
  const TYPE_TO = -1;
  const VARS_SET = "setVars";
  const W3C = "http://www.w3.org/";
  const XMLNS = "xmlns";

  /* variables */
  const vars = {
    [CONTEXT_MODE]: null,
    [CONTEXT_NODE]: null,
    [ID_TAB]: "",
    [ID_WIN]: "",
    [INCOGNITO]: false,
    [IS_ENABLED]: false,
    [KEY_ACCESS]: "u",
    [KEY_EDITOR]: true,
    [KEY_OPTIONS]: true,
    [ONLY_EDITABLE]: false,
    [SYNC_AUTO]: false,
    [SYNC_AUTO_URL]: null,
  };

  /**
   * log error
   * @param {!Object} e - Error
   * @returns {boolean} - false
   */
  const logError = e => {
    console.error(e);
    return false;
  };

  /**
   * get type
   * @param {*} o - object to check
   * @returns {string} - type of object
   */
  const getType = o =>
    Object.prototype.toString.call(o).slice(TYPE_FROM, TYPE_TO);

  /**
   * is string
   * @param {*} o - object to check
   * @returns {boolean} - result
   */
  const isString = o => typeof o === "string" || o instanceof String;

  /**
   * is object, and not an empty object
   * @param {*} o - object to check;
   * @returns {boolean} - result
   */
  const isObjectNotEmpty = o => {
    const items = /Object/i.test(getType(o)) && Object.keys(o);
    return !!(items && items.length);
  };

  /**
   * strip HTML tags and decode HTML escaped characters
   * @param {string} v - value
   * @returns {string} - converted value
   */
  const stripHtmlTags = v => {
    while (/^\n*<(?:[^>]+:)?[^>]+?>|<\/(?:[^>]+:)?[^>]+>\n*$/.test(v)) {
      v = v.replace(/^\n*<(?:[^>]+:)?[^>]+?>/, "")
        .replace(/<\/(?:[^>]+:)?[^>]+>\n*$/, "\n");
    }
    return v.replace(/<\/(?:[^>]+:)?[^>]+>\n*<!--.*-->\n*<(?:[^>]+:)?[^>]+>/g, "\n\n")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  };

  /* file utils */
  /**
   * get file name from URI path
   * @param {string} uri - URI
   * @param {string} subst - substitute file name
   * @returns {string} - file name
   */
  const getFileNameFromURI = async (uri, subst = LABEL) => {
    let name;
    if (isString(uri)) {
      const {pathname, protocol} = new URL(uri);
      if (pathname && protocol && !/^(?:blob|data):/.test(protocol)) {
        name = /^.*\/((?:[\w\-~!$&'()*+,;=:@]|%[0-9A-F]{2})+)(?:\.(?:[\w\-~!$&'()*+,;=:@]|%[0-9A-F]{2})+)*$/.exec(pathname);
        Array.isArray(name) && (name = decodeURIComponent(name[1]));
      }
    }
    return name && name.length < FILE_LEN && name || subst;
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
   * @param {string} media - media type
   * @param {string} subst - substitute file extension
   * @returns {string} - file extension
   */
  const getFileExtension = async (media = "text/plain", subst = "txt") => {
    const arr = /^(application|image|text)\/([\w\-.]+)(?:\+(json|xml))?$/.exec(media);
    let ext;
    if (arr) {
      const [, type, subtype] = arr;
      const suffix = arr[3] ||
                     type === "application" && /^(?:json|xml)$/.test(subtype) &&
                       subtype;
      if (fileExt[type]) {
        const item = suffix && fileExt[type][suffix];
        if (item) {
          ext = item[subtype] || item[suffix];
        } else {
          ext = fileExt[type][subtype];
        }
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
   * @param {Object} node - element node
   * @returns {Object} - namespace data
   */
  const getNodeNS = async node => {
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
        } else if (/^(?:math|svg)$/.test(localName)) {
          ns.node = node;
          ns.localName = localName;
          ns.namespaceURI = nsURI.ns[localName];
        } else {
          const attr = "requiredExtensions";
          if (parentNode.localName === "foreignObject" &&
              (parentNode.hasAttributeNS(nsURI.svg, attr) ||
               root.localName === HTML)) {
            ns.node = node;
            ns.localName = localName;
            ns.namespaceURI = parentNode.hasAttributeNS(nsURI.svg, attr) &&
                              parentNode.getAttributeNS(nsURI.svg, attr) ||
                              nsURI.html;
          } else {
            node = parentNode;
          }
        }
      }
      if (!ns.node) {
        ns.node = root;
        ns.localName = root.localName;
        ns.namespaceURI = root.hasAttribute(XMLNS) &&
                          root.getAttribute(XMLNS) ||
                          nsURI[root.localName] || "";
      }
    }
    return ns;
  };

  /**
   * get namespace prefix
   * @param {Object} elm - element
   * @param {string} ns - namespace URI
   * @param {string} prefix - namespace prefix
   * @returns {string} - namespace prefix
   */
  const getXmlnsPrefix = async (elm, ns = nsURI.html, prefix = HTML) => {
    if (elm) {
      const {attributes} = elm;
      const arr = [];
      if (attributes && attributes.length) {
        const item = attributes.getNamedItemNS(nsURI.xmlns, prefix);
        if (!item || item.value !== ns) {
          for (const attr of attributes) {
            const {name, value} = attr;
            if (value === ns) {
              arr.push(name.replace(/^xmlns:/, ""));
              break;
            } else if (name.includes(`${prefix}:`, 0) && !item &&
                       elm.parentNode) {
              arr.push(getXmlnsPrefix(elm.parentNode, ns, prefix));
              break;
            }
          }
          if (arr.length === 1) {
            const [p] = await Promise.all(arr);
            prefix = p !== prefix && p || null;
          }
        }
      }
    }
    return prefix;
  };

  /**
   * set namespaced attribute
   * @param {Object} elm - element to append attributes
   * @param {Object} node - element node to get attributes from
   * @returns {Promise.<Array>} - results of each handler
   */
  const setAttributeNS = async (elm, node = {}) => {
    const {attributes} = node;
    const func = [];
    if (elm && attributes && attributes.length) {
      for (const attr of attributes) {
        const {localName, name, namespaceURI, prefix, value} = attr;
        if (typeof node[name] !== "function") {
          let ns;
          if (/:/.test(localName)) {
            const [, p] = /^(.+):/.exec(localName);
            if (p === XMLNS) {
              func.push(elm.setAttributeNS(nsURI.xmlns, localName, value));
            } else {
              let n = node;
              while (n && n.parentNode && !ns) {
                n.hasAttributeNS("", `xmlns:${p}`) &&
                  (ns = n.getAttributeNS("", `xmlns:${p}`));
                n = n.parentNode;
              }
              ns && func.push(elm.setAttributeNS(ns, localName, value));
            }
          } else {
            const attrName = prefix && `${prefix}:${localName}` || localName;
            ns = namespaceURI || prefix && nsURI[prefix] || "";
            (ns || !prefix) &&
              func.push(elm.setAttributeNS(ns, attrName, value));
          }
        }
      }
    }
    return Promise.all(func);
  };

  /**
   * create namespaced element
   * @param {Object} node - element node to create element from
   * @returns {Object} - namespaced element
   */
  const createElm = async node => {
    let elm;
    if (node) {
      const {attributes, localName, namespaceURI, prefix} = node;
      const ns = namespaceURI ||
                 prefix && nsURI[prefix] ||
                 await getNodeNS(node).namespaceURI || nsURI.html;
      const name = prefix && `${prefix}:${localName}` || localName;
      elm = document.createElementNS(ns, name);
      attributes && await setAttributeNS(elm, node);
    }
    return elm || null;
  };

  /**
   * create document fragment from nodes array
   * @param {Array} nodes - nodes array
   * @returns {Object} - document fragment
   */
  const createFrag = async nodes => {
    const frag = document.createDocumentFragment();
    Array.isArray(nodes) && nodes.forEach(node => {
      (node.nodeType === Node.ELEMENT_NODE ||
       node.nodeType === Node.TEXT_NODE) &&
        frag.append(node);
    });
    return frag;
  };

  /**
   * append child nodes
   * @param {Object} elm - container element
   * @param {Object} node - node containing child nodes to append
   * @returns {Object} - element or text node
   */
  const appendChild = async (elm, node) => {
    elm = await createElm(elm);
    if (elm && elm.nodeType === Node.ELEMENT_NODE &&
        node && node.hasChildNodes()) {
      const arr = [];
      const nodes = node.childNodes;
      if (nodes instanceof NodeList) {
        for (const child of nodes) {
          const {nodeType, nodeValue, parentNode} = child;
          if (nodeType === Node.ELEMENT_NODE) {
            child === parentNode.firstChild &&
              arr.push(document.createTextNode("\n"));
            arr.push(appendChild(child, child));
            child === parentNode.lastChild &&
              arr.push(document.createTextNode("\n"));
          } else {
            nodeType === Node.TEXT_NODE &&
              arr.push(document.createTextNode(nodeValue));
          }
        }
        if (arr.length) {
          const frag = await Promise.all(arr).then(createFrag);
          elm.append(frag);
        }
      }
    }
    return elm || document.createTextNode("");
  };

  /**
   * create DOM of MathML / SVG
   * @param {Object} node - element node
   * @returns {?string} - serialized node string
   */
  const createDomXmlBased = async node => {
    let elm;
    if (node) {
      const root = document.documentElement;
      while (node && node !== root && !elm) {
        /^(?:math|svg)$/.test(node.localName) && (elm = node);
        node = node.parentNode;
      }
      if (elm) {
        const range = document.createRange();
        range.selectNodeContents(elm);
        elm = await appendChild(elm, range.cloneContents());
      }
    }
    return elm && (new XMLSerializer()).serializeToString(elm) || null;
  };

  /**
   * create selection fragment
   * @param {Array} arr - nodes array
   * @returns {Object} - document fragment
   */
  const createSelFrag = async arr => {
    let frag;
    if (Array.isArray(arr) && arr.length) {
      frag = document.createDocumentFragment();
      for (const nodes of arr) {
        if (Array.isArray(nodes)) {
          for (const node of nodes) {
            if (node) {
              const {nodeType} = node;
              (nodeType === Node.ELEMENT_NODE || nodeType === Node.TEXT_NODE ||
               nodeType === Node.COMMENT_NODE) &&
                frag.append(node);
            }
          }
        } else {
          frag = null;
          break;
        }
      }
    }
    return frag || null;
  };

  /**
   * create range array
   * @param {Object} range - range
   * @param {number} index - index
   * @param {number} count - range count
   * @returns {?Promise.<Array>} - range array
   */
  const createRangeArr = async (range, index, count) => {
    const arr = [];
    if (range) {
      const ancestor = range.commonAncestorContainer;
      let obj;
      count > 1 && arr.push(document.createTextNode("\n"));
      switch (ancestor.nodeType) {
        case Node.ELEMENT_NODE:
          obj = await getNodeNS(ancestor);
          if (/^(?:svg|math)$/.test(obj.localName)) {
            if (obj.node === document.documentElement) {
              return null;
            }
            if (obj.node.parentNode && (obj = obj.node.parentNode)) {
              range.setStart(obj, 0);
              range.setEnd(obj, obj.childNodes.length);
            }
          }
          arr.push(appendChild(ancestor, range.cloneContents()));
          break;
        case Node.TEXT_NODE:
          obj = await createElm(ancestor.parentNode);
          if (obj.nodeType === Node.ELEMENT_NODE) {
            obj.append(range.cloneContents());
            arr.push(obj);
          }
          break;
        default:
      }
      arr.push(document.createTextNode("\n"));
      count > 1 && index < count - 1 &&
        arr.push(document.createComment(RANGE_SEP));
    }
    return Promise.all(arr);
  };

  /**
   * create DOM from selection range
   * @param {Object} sel - selection
   * @returns {?string} - serialized node string
   */
  const createDomFromSelRange = async sel => {
    let frag;
    if (sel && sel.rangeCount) {
      const arr = [];
      const l = sel.rangeCount;
      let i = 0, obj;
      while (i < l) {
        arr.push(createRangeArr(sel.getRangeAt(i), i, l));
        i++;
      }
      frag = await Promise.all(arr).then(createSelFrag);
      if (l > 1 && frag && frag.hasChildNodes() &&
          (obj = await createElm(document.documentElement))) {
        obj.append(frag);
        frag = document.createDocumentFragment();
        frag.append(obj, document.createTextNode("\n"));
      }
    }
    return frag && (new XMLSerializer()).serializeToString(frag) || null;
  };

  /**
   * get text
   * @param {Object} nodes - nodes
   * @returns {string} - text
   */
  const getText = async nodes => {
    const arr = [];
    let text;
    if (nodes instanceof NodeList) {
      for (const node of nodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          node.localName === "br" && arr.push("\n") ||
          node.hasChildNodes() && arr.push(getText(node.childNodes));
        } else {
          node.nodeType === Node.TEXT_NODE && arr.push(
            node.nodeValue.replace(/^\s*/, "")
              .replace(/([^\n])$/, (m, c) => `${c}\n`)
          );
        }
      }
      text = await Promise.all(arr).then(a => a.join(""));
    }
    return text || "";
  };

  /**
   * get ancestor element ID
   * @param {Object} elm - element node
   * @returns {?string} - ID
   */
  const getAncestorId = async elm => {
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
   * @param {Object} node - element node
   * @returns {boolean} - result
   */
  const isEditable = async node => {
    let elm = node, editable;
    while (elm && elm.parentNode) {
      if (typeof elm.isContentEditable === "boolean" &&
          (!elm.namespaceURI || elm.namespaceURI === nsURI.html)) {
        editable = elm.isContentEditable;
        break;
      }
      elm = elm.parentNode;
    }
    return editable || false;
  };

  /**
   * node content is text node
   * @param {Object} node - element node
   * @returns {boolean} - result
   */
  const isContentTextNode = async node => {
    let isText = await isEditable(node);
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
    return isText;
  };

  /**
   * is text edit control element
   * @param {Object} elm - element
   * @returns {boolean} - result
   */
  const isEditControl = async elm => {
    let bool;
    if (elm) {
      const {localName, type} = elm;
      bool = localName === "textarea" ||
             localName === "input" &&
               (!type || /^(?:(?:emai|te|ur)l|search|text)$/.test(type));
    }
    return bool || false;
  };

  /* live editor */
  const liveEdit = {};

  /**
   * get live edit key from class list
   * @param {Object} classList - DOMTokenList
   * @returns {?string} - live edit key
   */
  const getLiveEditKeyFromClassList = async classList => {
    let liveEditKey;
    if (classList instanceof DOMTokenList && classList.length) {
      const liveEditKeys = Object.keys(liveEdit) || [];
      for (const key of liveEditKeys) {
        liveEditKey = classList.contains(key) && key;
        if (liveEditKey) {
          break;
        }
      }
    }
    return liveEditKey || null;
  };

  /**
   * get live edit element from ancestor
   * @param {Object} node - node
   * @returns {Object} - live edit element
   */
  const getLiveEditElm = async (node = {}) => {
    let elm;
    const items = Object.keys(liveEdit);
    if (items && items.length && node.nodeType === Node.ELEMENT_NODE) {
      const root = document.documentElement;
      while (node && node.parentNode && node.parentNode !== root && !elm) {
        for (const item of items) {
          const {classList, namespaceURI} = node;
          const isHtml = !namespaceURI || namespaceURI === nsURI.html;
          if (isHtml && classList.contains(item)) {
            elm = node;
            break;
          }
        }
        node = node.parentNode;
      }
    }
    return elm || null;
  };

  /**
   * get live edit content
   * @param {Object} elm - Element
   * @param {string} key - key
   * @returns {?string} - content
   */
  const getLiveEditContent = async (elm, key) => {
    const arr = [];
    if (elm && elm.nodeType === Node.ELEMENT_NODE &&
        isString(key) && liveEdit[key]) {
      const {getContent} = liveEdit[key];
      const items = elm.querySelectorAll(getContent);
      if (items && items.length) {
        for (const item of items) {
          arr.push(item.textContent);
        }
      }
    }
    return arr.length && arr.join("\n") || null;
  };

  /**
   * get editable element from ancestor
   * @param {Object} node - node
   * @returns {Object} - editable element
   */
  const getEditableElm = async node => {
    let elm;
    if (await isEditControl(node)) {
      elm = node;
    } else {
      while (node && node.parentNode) {
        if (node.hasAttribute("contentEditable") &&
            node.isContentEditable &&
            (!node.namespaceURI || node.namespaceURI === nsURI.html)) {
          elm = node;
          break;
        }
        node = node.parentNode;
      }
    }
    return elm || null;
  };

  /* data IDs */
  const dataIds = new Map();

  /**
   * set dataId
   * @param {string} dataId - data ID
   * @param {Object} data - data
   * @returns {Object} - dataIds object
   */
  const setDataId = async (dataId, data) => {
    let obj;
    if (isString(dataId) && isObjectNotEmpty(data)) {
      if (dataIds.has(dataId)) {
        const idData = dataIds.get(dataId);
        const items = Object.keys(data);
        for (const item of items) {
          idData[item] = data[item];
        }
        obj = dataIds.set(dataId, idData);
      } else {
        obj = dataIds.set(dataId, data);
      }
    }
    return obj || null;
  };

  /**
   * get ID data
   * @param {Object} elm - target element
   * @returns {Object} - ID data
   */
  const getIdData = async elm => {
    let data;
    if (elm) {
      const {id, localName, prefix} = elm;
      if (id) {
        data = {dataId: id};
      } else {
        const ancestorId = await getAncestorId(elm);
        const {localName: rootLocalName} = document.documentElement;
        let items;
        if (prefix) {
          items = Array.from(
            document.querySelectorAll(
              ancestorId && `#${ancestorId} *|*` || `${rootLocalName} *|*`
            )
          ).filter(item => {
            const {localName: itemLocalName} = item;
            return itemLocalName === `${prefix}:${localName}` && item;
          });
        } else {
          items = document.querySelectorAll(
            ancestorId && `#${ancestorId} ${localName}` || localName
          );
        }
        if (items && items.length) {
          const l = items.length;
          let i = 0, queryIndex;
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
            const dataId =
              ancestorId && `${ancestorId}_${targetElm}_${queryIndex}` ||
              `${rootLocalName}_${targetElm}_${queryIndex}`;
            data = {
              ancestorId, localName, prefix, queryIndex, dataId,
            };
          }
        }
      }
    }
    return data || null;
  };

  /**
   * get target element from data ID
   * @param {string} dataId - data ID
   * @returns {Object} - target element
   */
  const getTargetElementFromDataId = async dataId => {
    let elm;
    if (isString(dataId)) {
      const data = dataIds.get(dataId);
      if (data) {
        const {ancestorId, localName, prefix, queryIndex} = data;
        if (localName && Number.isInteger(queryIndex)) {
          let items;
          if (prefix) {
            const {localName: rootLocalName} = document.documentElement;
            const nodeList = document.querySelectorAll(
              ancestorId && `#${ancestorId} *|*` || `#${rootLocalName} *|*`
            );
            items = Array.from(nodeList).filter(item => {
              const {localName: itemLocalName} = item;
              return itemLocalName === `${prefix}:${localName}` && item;
            });
          } else {
            items = document.querySelectorAll(
              ancestorId && `#${ancestorId} ${localName}` || localName
            );
          }
          elm = items && items[queryIndex];
        } else {
          elm = document.getElementById(dataId);
        }
      }
    }
    return elm || null;
  };

  /* port */
  const port = runtime.connect({name: PORT_NAME});

  /**
   * port message
   * @param {*} msg - message
   * @returns {void}
   */
  const portMsg = async msg => {
    msg && port.postMessage(msg);
  };

  /**
   * port temporary file data
   * @param {string} dataId - data ID
   * @returns {?AsyncFunction} - port message
   */
  const portTmpFileData = async dataId => {
    let func;
    if (dataId) {
      const data = dataIds.get(dataId);
      data && (func = portMsg({[TMP_FILE_GET]: data}));
    }
    return func || null;
  };

  /**
   * port temporary file data to get temporary file
   * @param {!Object} evt - Event
   * @returns {Promise.<Array>} - results of each handler
   */
  const requestTmpFile = async evt => {
    const func = [];
    const {target, currentTarget} = evt;
    if (target === currentTarget) {
      const {dataId} = await getIdData(target) || {};
      if (dataId) {
        const {controls} = dataIds.get(dataId) || {};
        if (controls) {
          controls.forEach(id => {
            func.push(portTmpFileData(id));
          });
        } else {
          func.push(portTmpFileData(dataId));
        }
      }
    } else {
      const {classList: currentClassList} = currentTarget;
      const {localName: targetLocalName} = target;
      const liveEditKey = await getLiveEditKeyFromClassList(currentClassList);
      if (liveEditKey && targetLocalName === "textarea") {
        const {dataId} = await getIdData(currentTarget) || {};
        func.push(portTmpFileData(dataId));
      }
    }
    return Promise.all(func);
  };

  /**
   * handle focus event
   * @param {!Object} evt - event
   * @returns {AsyncFunction} - request tmp file
   */
  const handleFocusEvt = evt => requestTmpFile(evt).catch(logError);

  /**
   * store temporary file data
   * @param {Object} data - temporary file data
   * @returns {?AsyncFunction} - set data ID
   */
  const storeTmpFileData = async (data = {}) => {
    let func;
    if (data[TMP_FILE_CREATE] && (data = data[TMP_FILE_CREATE])) {
      const {dataId, mode} = data;
      mode === MODE_EDIT && dataId && (func = setDataId(dataId, data));
    }
    return func || null;
  };

  /**
   * update temporary file data
   * @param {Object} obj - temporary file data object
   * @returns {?AsyncFunction} - set data ID
   */
  const updateTmpFileData = async (obj = {}) => {
    let func;
    const {data} = obj;
    if (data) {
      const {dataId, mode} = data;
      mode === MODE_EDIT && dataId && (func = setDataId(dataId, data));
    }
    return func || null;
  };

  /* temporary file data */
  /**
   * create content data message
   * @param {Object} data - temporary file data
   * @returns {Object} - message
   */
  const createContentDataMsg = async data => {
    let msg;
    if (data) {
      if (data[TMP_FILE_CREATE]) {
        msg = {
          [TMP_FILE_CREATE]: {
            data: data[TMP_FILE_CREATE],
            value: data.value,
          },
        };
      } else {
        data[LOCAL_FILE_VIEW] &&
          (msg = {[LOCAL_FILE_VIEW]: data[LOCAL_FILE_VIEW].uri});
      }
    }
    return msg || null;
  };

  /**
   * fetch file source and create temporary file data
   * @param {Object} data - content data
   * @returns {Object} - temporary file data
   */
  const fetchSource = async data => {
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
      const res = await fetch(uri, {headers, method: "GET", mode: "cors"});
      if (res) {
        const {dir, host, incognito, mode, tabId, windowId} = data;
        const [type] = res.headers.get("Content-Type").split(";");
        const dataId = await getFileNameFromURI(uri, SUBST);
        const extType = await getFileExtension(type);
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
   * @param {Object} data - content data
   * @returns {Object} - temporary file data
   */
  const createTmpFileData = async data => {
    const {contentType, documentURI: uri} = document;
    const {
      dir, host, incognito, liveEditKey, mode, syncAuto, tabId, windowId,
    } = data;
    let {dataId, namespaceURI, value} = data, extType, tmpFileData;
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
        if (value && (dataId = await getFileNameFromURI(uri, SUBST))) {
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
        dataId = await getFileNameFromURI(uri, SUBST);
        if (dataId && value &&
            /^(?:(?:application\/(?:[\w\-.]+\+)?|image\/[\w\-.]+\+)x|text\/(?:ht|x))ml$/.test(contentType)) {
          extType = ".xml";
          tmpFileData = {
            [TMP_FILE_CREATE]: {
              dataId, dir, extType, host, incognito, mode, tabId, windowId,
            },
            value,
          };
        } else if (dataId && value) {
          value = stripHtmlTags(value);
          extType = await getFileExtension(contentType);
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
    !tmpFileData && (tmpFileData = await fetchSource(data));
    return tmpFileData || null;
  };

  /**
   * set data ID controller
   * @param {Object} elm - element
   * @param {string} dataId - data ID
   * @returns {void}
   */
  const setDataIdController = async (elm, dataId) => {
    if (elm && dataId) {
      const ctrl = await getEditableElm(elm);
      if (ctrl) {
        const ctrlData = await getIdData(ctrl);
        if (ctrlData) {
          const {dataId: ctrlId} = ctrlData;
          ctrl.addEventListener("focus", handleFocusEvt, true);
          if (dataIds.has(ctrlId)) {
            const data = dataIds.get(ctrlId);
            if (Array.isArray(data.controls)) {
              const controls = new Set(data.controls);
              controls.add(dataId);
              data.controls = [...controls.values()];
            } else {
              data.controls = [dataId];
            }
            await setDataId(ctrlId, data);
          } else {
            ctrlData.controls = [dataId];
            await setDataId(ctrlId, ctrlData);
          }
          await setDataId(dataId, {
            controlledBy: ctrlId,
          });
        }
      }
    }
  };

  /**
   * check whether given array of URLs matches document URL
   * @param {Array} arr - array of URLs
   * @returns {boolean} - result
   */
  const matchDocUrl = async (arr = []) => {
    let bool = false;
    if (Array.isArray(arr) && arr.length) {
      const {
        protocol: docProtocol, hostname: docHost, href: docHref,
      } = document.location;
      for (let item of arr) {
        if (isString(item)) {
          item = item.trim();
          if (item.length) {
            try {
              const {
                protocol: itemProtocol, hostname: itemHost, href: itemHref,
              } = new URL(item);
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
    }
    return bool;
  };

  /**
   * create content data
   * @param {Object} elm - element
   * @param {string} mode - context mode
   * @returns {Object} - content data
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
    const sel = window.getSelection();
    const {anchorNode, isCollapsed} = sel;
    if (elm && mode) {
      let obj;
      switch (mode) {
        case MODE_EDIT: {
          obj = await getIdData(elm);
          if (obj) {
            const {
              childNodes, classList, isContentEditable, namespaceURI, value,
            } = elm;
            const {dataId} = obj;
            const liveEditKey = await getLiveEditKeyFromClassList(classList);
            const isHtml = !namespaceURI || namespaceURI === nsURI.html;
            if (isHtml) {
              elm.addEventListener("focus", handleFocusEvt, true);
            }
            if (!dataIds.has(dataId)) {
              await setDataId(dataId, obj);
            }
            if (liveEditKey) {
              data.mode = mode;
              data.dataId = dataId;
              data.value = await getLiveEditContent(elm, liveEditKey) || "";
              data.liveEditKey = liveEditKey;
            } else if (isCollapsed && await isEditControl(elm)) {
              data.mode = mode;
              data.dataId = dataId;
              data.value = value || "";
            } else {
              !isContentEditable && !isCollapsed && anchorNode &&
                (elm = anchorNode.parentNode);
              data.mode = mode;
              data.dataId = dataId;
              data.value = elm.hasChildNodes() &&
                           await getText(childNodes) || "";
              data.namespaceURI = namespaceURI ||
                                  await getNodeNS(elm).namespaceURI;
              await setDataIdController(elm, dataId);
            }
            if (!incognito && enableSyncAuto && isString(syncAutoUrls)) {
              data.syncAuto = await matchDocUrl(syncAutoUrls.split("\n"));
            }
          }
          break;
        }
        case MODE_MATHML:
        case MODE_SVG:
          obj = await createDomXmlBased(elm);
          if (obj) {
            data.mode = mode;
            data.value = obj;
          }
          break;
        case MODE_SELECTION:
          obj = await createDomFromSelRange(sel);
          if (obj) {
            data.mode = mode;
            data.value = obj;
          }
          break;
        default:
      }
    }
    return data;
  };

  /**
   * port content data
   * @param {Object} elm - element
   * @param {string} mode - context mode
   * @returns {Promise.<Array>} - results of each handler
   */
  const portContent = async (elm, mode) => {
    const func = [];
    if (elm && elm.nodeType === Node.ELEMENT_NODE) {
      const data = await createContentData(elm, mode).then(createTmpFileData);
      func.push(
        createContentDataMsg(data).then(portMsg),
        storeTmpFileData(data),
      );
    }
    return Promise.all(func);
  };

  /**
   * get context mode
   * @param {Object} elm - element
   * @returns {string} - context mode
   */
  const getContextMode = async elm => {
    const {
      anchorNode, focusNode, isCollapsed, rangeCount,
    } = window.getSelection();
    let mode = MODE_SOURCE;
    if (elm) {
      elm = !isCollapsed &&
            (anchorNode.nodeType === Node.TEXT_NODE && anchorNode.parentNode ||
             focusNode.nodeType === Node.TEXT_NODE && focusNode.parentNode) ||
             elm;
      if ((elm.isContentEditable || await isEditControl(elm) ||
           await isContentTextNode(elm)) &&
          (isCollapsed || rangeCount === 1 &&
                          anchorNode.parentNode === focusNode.parentNode &&
                          elm !== document.documentElement)) {
        mode = MODE_EDIT;
      } else if (isCollapsed) {
        elm.namespaceURI === nsURI.math && (mode = MODE_MATHML) ||
        elm.namespaceURI === nsURI.svg && (mode = MODE_SVG);
      } else {
        mode = MODE_SELECTION;
      }
    }
    return mode;
  };

  /**
   * determine port content process
   * @param {Object} obj - context menu obj
   * @returns {?AsyncFunction} - port content
   */
  const determinePortProcess = async (obj = {}) => {
    const {info} = obj;
    const elm = vars[CONTEXT_NODE];
    let mode;
    if (info) {
      const {menuItemId} = info;
      mode = menuItemId !== MODE_SOURCE && menuItemId || vars[CONTEXT_MODE];
    } else {
      mode = await getContextMode(elm);
    }
    return mode && portContent(elm, mode) || null;
  };

  /* synchronize edited text */
  /**
   * dispatch focus event
   * @param {Object} elm - Element
   * @param {string} type - event type
   * @returns {void}
   */
  const dispatchFocusEvt = elm => {
    if (elm && elm.nodeType === Node.ELEMENT_NODE) {
      const opt = {
        bubbles: false,
        cancelable: false,
      };
      const evt = window.FocusEvent && new FocusEvent("focus", opt) ||
                  new Event("focus", opt);
      elm.dispatchEvent(evt);
    }
  };

  /**
   * dispatch input event
   * @param {Object} elm - element
   * @returns {void}
   */
  const dispatchInputEvt = elm => {
    if (elm && elm.nodeType === Node.ELEMENT_NODE) {
      const opt = {
        bubbles: true,
        cancelable: false,
      };
      const evt = window.InputEvent && new InputEvent("input", opt) ||
                  new Event("input", opt);
      elm.dispatchEvent(evt);
    }
  };

  /**
   * dispatch keyboard event
   * @param {Object} elm - Element
   * @param {string} type - event type
   * @param {Object} keyOpt - key options
   * @returns {void}
   */
  const dispatchKeyboardEvt = (elm, type, keyOpt = {}) => {
    if (elm && elm.nodeType === Node.ELEMENT_NODE &&
        isString(type) && /^key(?:down|press|up)$/.test(type) &&
        Object.keys(keyOpt)) {
      const {
        altKey, code, ctrlKey, key, keyCode, metaKey, shiftKey,
      } = keyOpt;
      if (isString(key) && isString(code) && Number.isInteger(keyCode)) {
        const opt = {
          key, code, keyCode,
          altKey: !!altKey,
          bubbles: true,
          ctrlKey: !!ctrlKey,
          cancelable: true,
          locale: "",
          location: 0,
          metaKey: !!metaKey,
          repeat: false,
          shiftKey: !!shiftKey,
        };
        const evt = window.KeyboardEvent && new KeyboardEvent(type, opt) ||
                    new Event(type, opt);
        elm.dispatchEvent(evt);
      }
    }
  };

  /**
   * create paragraph separated content
   * @param {string} value - value
   * @param {string} ns - namespace URI
   * @returns {Object} - document fragment
   */
  const createSeparatedContent = async (value, ns = nsURI.html) => {
    const arr = isString(value) && value.length && value.split("\n") || [""];
    const l = arr.length;
    const frag = document.createDocumentFragment();
    if (l === 1) {
      frag.append(document.createTextNode(arr[0]));
    } else {
      const cmd = "defaultParagraphSeparator";
      const sep = document.queryCommandSupported(cmd) &&
                    document.queryCommandValue(cmd);
      let i = 0;
      while (i < l) {
        const text = arr[i];
        if (ns === nsURI.html) {
          const br = document.createElementNS(ns, "br");
          if (sep === "div" || sep === "p") {
            const elm = document.createElementNS(ns, sep);
            text ?
              elm.append(document.createTextNode(text)) :
              i < l - 1 && elm.append(br);
            elm.hasChildNodes() && frag.append(elm);
          } else {
            frag.append(document.createTextNode(text));
            i < l - 1 && frag.append(br);
          }
        } else {
          frag.append(document.createTextNode(text));
        }
        i < l - 1 && frag.append(document.createTextNode("\n"));
        i++;
      }
    }
    return frag;
  };

  /**
   * replace content editable element text
   * @param {Object} elm - owner element
   * @param {Object} node - editable element
   * @param {string} value - value
   * @param {string} ns - namespace URI
   * @returns {void}
   */
  const replaceContent = async (elm, node, value, ns = nsURI.html) => {
    if (node && node.nodeType === Node.ELEMENT_NODE && isString(value)) {
      const changed = node.textContent.replace(/^\s*/, "")
        .replace(/\n +/g, "\n")
        .replace(/([^\n])$/, (m, c) => `${c}\n`) !== value;
      if (changed) {
        const frag = document.createDocumentFragment();
        const sep = elm === node && await createSeparatedContent(value, ns);
        frag.append(sep || document.createTextNode(value));
        if (node.hasChildNodes()) {
          while (node.firstChild) {
            node.removeChild(node.firstChild);
          }
        }
        node.append(frag);
        dispatchInputEvt(elm);
      }
    }
  };

  /**
   * replace text edit control element value
   * @param {Object} elm - element
   * @param {string} value - value
   * @returns {void}
   */
  const replaceEditControlValue = async (elm, value) => {
    if (elm && elm.nodeType === Node.ELEMENT_NODE && isString(elm.value) &&
        isString(value)) {
      let changed;
      if (/^input$/.test(elm.localName)) {
        while (value.length && /[\f\n\t\r\v]$/.test(value)) {
          value = value.replace(/[\f\n\t\r\v]$/, "");
        }
        changed = elm.value !== value;
      } else {
        /^textarea$/.test(elm.localName) && (changed = elm.value !== value);
      }
      if (changed) {
        elm.value = value;
        dispatchInputEvt(elm);
      }
    }
  };

  /**
   * replace live edit content
   * @param {Object} elm - element
   * @param {string} key - key
   * @param {string} value - value
   * @returns {void}
   */
  const replaceLiveEditContent = async (elm, key, value) => {
    if (elm && elm.nodeType === Node.ELEMENT_NODE &&
        isString(key) && liveEdit[key] && isString(value)) {
      const {setContent} = liveEdit[key];
      const liveElm = elm.querySelector(setContent);
      if (liveElm === document.activeElement) {
        const ctrlA = {
          key: "a",
          code: "KeyA",
          keyCode: KEY_CODE_A,
          ctrlKey: true,
        };
        const backSpace = {
          key: "Backspace",
          code: "Backspace",
          keyCode: KEY_CODE_BS,
        };
        await dispatchFocusEvt(liveElm);
        await dispatchKeyboardEvt(liveElm, "keydown", ctrlA);
        await dispatchKeyboardEvt(liveElm, "keypress", ctrlA);
        await dispatchKeyboardEvt(liveElm, "keyup", ctrlA);
        await dispatchKeyboardEvt(liveElm, "keydown", backSpace);
        await dispatchKeyboardEvt(liveElm, "keypress", backSpace);
        await dispatchKeyboardEvt(liveElm, "keyup", backSpace);
        liveElm.value = value.replace(/\u200B/g, "");
        dispatchInputEvt(liveElm);
      }
    }
  };

  /**
   * get target element and synchronize text
   * @param {Object} obj - sync data object
   * @returns {Promise.<Array>} - results of each handler
   */
  const syncText = async (obj = {}) => {
    const {data, value} = obj;
    const func = [];
    if (data) {
      const {
        controlledBy, dataId, lastUpdate, liveEditKey, namespaceURI, tabId,
        timestamp,
      } = data;
      if (dataId && tabId === vars[ID_TAB]) {
        const elm = await getTargetElementFromDataId(dataId);
        if (elm) {
          if (!lastUpdate ||
              Number.isInteger(timestamp) && Number.isInteger(lastUpdate) &&
              timestamp > lastUpdate) {
            const controller = await getTargetElementFromDataId(controlledBy);
            if (liveEditKey && liveEdit[liveEditKey]) {
              func.push(replaceLiveEditContent(elm, liveEditKey, value));
            } else if (controller) {
              func.push(replaceContent(controller, elm, value, namespaceURI));
            } else if (elm.isContentEditable) {
              func.push(replaceContent(elm, elm, value, namespaceURI));
            } else {
              /^(?:input|textarea)$/.test(elm.localName) &&
                func.push(replaceEditControlValue(elm, value));
            }
            data.lastUpdate = timestamp;
            func.push(setDataId(dataId, data));
          }
        }
      }
    }
    return Promise.all(func);
  };

  /* keyboard shortcuts */
  /* execute editor key combination */
  const execEditorKey = {
    key: vars[KEY_ACCESS],
    altKey: false,
    ctrlKey: true,
    metaKey: false,
    shiftKey: true,
    enabled: vars[KEY_EDITOR],
  };

  /* open options key combination */
  const openOptionsKey = {
    key: vars[KEY_ACCESS],
    altKey: true,
    ctrlKey: false,
    metaKey: false,
    shiftKey: true,
    enabled: vars[KEY_OPTIONS],
  };

  /**
   * update key combination
   * @param {string} key - key
   * @returns {void}
   */
  const updateKeyCombo = async key => {
    if (isString(key) && /^[a-z]$/i.test(key) && (key = key.toLowerCase())) {
      vars[KEY_ACCESS] = key;
      execEditorKey.key = key;
      openOptionsKey.key = key;
    }
  };

  /* local storage */
  /**
   * extend object items from local storage
   * @param {Object} obj - object to extend items
   * @param {string} key - local storage key
   * @returns {Object} - extended object
   */
  const extendObjItems = async (obj, key) => {
    if (obj && key) {
      let ext = await localStorage.get(key);
      if (ext && Object.keys(ext).length && (ext = ext[key])) {
        const items = Object.keys(ext);
        if (items && items.length) {
          for (const item of items) {
            obj[item] = ext[item];
          }
        }
      }
    }
    return obj;
  };

  /* handlers */
  /**
   * handle message
   * @param {*} msg - message
   * @returns {Promise.<Array>} - results of each handler
   */
  const handleMsg = async msg => {
    const func = [];
    const items = msg && Object.entries(msg);
    if (items && items.length) {
      for (const item of items) {
        const [key, value] = item;
        switch (key) {
          case CONTENT_GET:
            func.push(determinePortProcess(value));
            break;
          case ID_TAB:
          case ID_WIN:
          case SYNC_AUTO_URL:
            vars[key] = value;
            break;
          case INCOGNITO:
          case IS_ENABLED:
          case ONLY_EDITABLE:
          case SYNC_AUTO:
            vars[key] = !!value;
            break;
          case KEY_ACCESS:
            func.push(updateKeyCombo(value));
            break;
          case KEY_EDITOR:
            vars[key] = !!value;
            execEditorKey.enabled = !!value;
            break;
          case KEY_OPTIONS:
            vars[key] = !!value;
            openOptionsKey.enabled = !!value;
            break;
          case TEXT_SYNC:
            func.push(syncText(value));
            break;
          case TMP_FILE_DATA_PORT:
            func.push(updateTmpFileData(value));
            break;
          case VARS_SET:
            func.push(handleMsg(value));
            break;
          default:
        }
      }
    }
    return Promise.all(func);
  };

  /**
   * handle before contextmenu event
   * @param {!Object} evt - Event
   * @returns {?AsyncFunction} - port message
   */
  const handleBeforeContextMenu = async evt => {
    let func;
    if (vars[IS_ENABLED]) {
      const {button, key, shiftKey, target} = evt;
      if (button === MOUSE_BUTTON_RIGHT || key === "ContextMenu" ||
          shiftKey && key === "F10") {
        const {localName, namespaceURI, type} = target;
        const {anchorNode, focusNode, isCollapsed} = window.getSelection();
        const mode = namespaceURI === nsURI.math && MODE_MATHML ||
                     namespaceURI === nsURI.svg && MODE_SVG || MODE_SOURCE;
        const editableElm = (!namespaceURI || namespaceURI === nsURI.html) &&
                              await getEditableElm(target) ||
                              await getLiveEditElm(target);
        let enabled;
        if (localName === "input") {
          enabled = !type || /^(?:(?:emai|te|ur)l|search|text)$/.test(type);
        } else {
          enabled = isCollapsed || !!editableElm ||
                    anchorNode.parentNode === focusNode.parentNode;
        }
        vars[CONTEXT_MODE] = mode;
        vars[CONTEXT_NODE] = editableElm || target;
        func = portMsg({
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
        });
      }
    }
    return func || null;
  };

  /**
   * handle keydown event
   * @param {!Object} evt - Event
   * @returns {?AsyncFunction} - port content / port message
   */
  const handleKeyDown = async evt => {
    let func;
    if (vars[IS_ENABLED]) {
      const {key, target} = evt;
      const isShiftKeyActive = evt.getModifierState("Shift");
      const isParsable = /^(?:application\/(?:(?:[\w\-.]+\+)?(?:json|xml)|(?:(?:x-)?jav|ecm)ascript)|image\/[\w\-.]+\+xml|text\/[\w\-.]+)$/.test(document.contentType);
      if (isShiftKeyActive && key === "F10" || key === "ContextMenu") {
        func = handleBeforeContextMenu(evt).catch(logError);
      } else if (isParsable) {
        const mode = await getContextMode(target);
        const {namespaceURI} = target;
        const editableElm = (!namespaceURI || namespaceURI === nsURI.html) &&
                            await getEditableElm(target) ||
                            await getLiveEditElm(target);
        vars[CONTEXT_MODE] = mode || null;
        vars[CONTEXT_NODE] = editableElm || !vars[ONLY_EDITABLE] && target ||
                             null;
      }
    }
    return func || null;
  };

  /* listeners */
  port.onMessage.addListener(msg => handleMsg(msg).catch(logError));

  window.addEventListener("mousedown",
                          evt => handleBeforeContextMenu(evt).catch(logError),
                          true);
  window.addEventListener("keydown",
                          evt => handleKeyDown(evt).catch(logError),
                          true);

  /* startup */
  Promise.all([
    extendObjItems(fileExt, FILE_EXT),
    extendObjItems(nsURI, NS_URI),
    extendObjItems(liveEdit, LIVE_EDIT),
  ]).catch(logError);
}
