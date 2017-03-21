/**
 * content.js
 */
"use strict";
{
  /* api */
  const {runtime} = browser;
  const storage = browser.storage.local;

  /* constants */
  const CONTENT_GET = "getContent";
  const CONTEXT_MENU = "contextMenu";
  const CONTEXT_MODE = "contextMode";
  const CONTEXT_NODE = "contextNode";
  const DATA_ATTR = "data-with_ex_editor";
  const DATA_ATTR_CTRLS = `${DATA_ATTR}_controls`;
  const DATA_ATTR_ID = `${DATA_ATTR}_id`;
  const DATA_ATTR_PREFIX = `${DATA_ATTR}_prefix`;
  const DATA_ATTR_TS = `${DATA_ATTR}_timestamp`;
  const FILE_EXT = "fileExt";
  const FILE_LEN = 128;
  const HTML = "html";
  const ID_TAB = "tabId";
  const ID_WIN = "windowId";
  const INCOGNITO = "incognito";
  const IS_ENABLED = "isEnabled";
  const KEY_ACCESS = "accessKey";
  const KEY_EDITOR = "editorShortCut";
  const KEY_OPTIONS = "optionsShortCut";
  const LABEL = "withExEditor";
  const LOCAL_FILE_VIEW = "viewLocalFile";
  const MODE_EDIT = "modeEditText";
  const MODE_MATHML = "modeViewMathML";
  const MODE_SELECTION = "modeViewSelection";
  const MODE_SOURCE = "modeViewSource";
  const MODE_SVG = "modeViewSVG";
  const NODE_COMMENT = Node.COMMENT_NODE;
  const NODE_ELEMENT = Node.ELEMENT_NODE;
  const NODE_TEXT = Node.TEXT_NODE;
  const NS_URI = "nsURI";
  const ONLY_EDITABLE = "enableOnlyEditable";
  const OPTIONS_OPEN = "openOptions";
  const PORT_NAME = "portContent";
  const RANGE_SEP = "Next Range";
  const SUBST = "index";
  const TEXT_SYNC = "syncText";
  const TMP_FILES = "tmpFiles";
  const TMP_FILES_PB = "tmpFilesPb";
  const TMP_FILE_CREATE = "createTmpFile";
  const TMP_FILE_DATA_PORT = "portTmpFileData";
  const TMP_FILE_GET = "getTmpFile";
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
    [KEY_ACCESS]: "e",
    [KEY_EDITOR]: true,
    [KEY_OPTIONS]: true,
    [ONLY_EDITABLE]: false,
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
   * is string
   * @param {*} o - object to check
   * @returns {boolean} - result
   */
  const isString = o => typeof o === "string" || o instanceof String;

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

  /* storage */
  /**
   * extend object items from storage
   * @param {Object} obj - object to extend items
   * @param {string} key - storage key
   * @returns {Object} - extended object
   */
  const extendObjItems = async (obj, key) => {
    if (obj && key) {
      let ext = await storage.get(key);
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

  /* data IDs */
  const dataIds = {};

  /**
   * port temporary file data
   * @param {string} dataId - data ID
   * @returns {Object} - ?Promise.<AsyncFunction>
   */
  const portTmpFileData = async dataId => {
    const data = dataId && dataIds[dataId];
    return data && portMsg({[TMP_FILE_GET]: data}) || null;
  };

  /**
   * port temporary file data to get temporary file
   * @param {!Object} evt - Event
   * @returns {Object} - Promise.<Array>
   */
  const requestTmpFile = async evt => {
    const func = [];
    const {target, currentTarget} = evt;
    if (target === currentTarget) {
      const attrs = target.hasAttributeNS("", DATA_ATTR_ID) &&
                    target.getAttributeNS("", DATA_ATTR_ID) ||
                    target.hasAttributeNS("", DATA_ATTR_CTRLS) &&
                    target.getAttributeNS("", DATA_ATTR_CTRLS);
      attrs && attrs.split(" ").forEach(dataId =>
        func.push(portTmpFileData(dataId))
      );
    }
    return Promise.all(func);
  };

  /**
   * store temporary file data
   * @param {Object} data - temporary file data
   * @returns {void}
   */
  const storeTmpFileData = async (data = {}) => {
    if (data[TMP_FILE_CREATE] && (data = data[TMP_FILE_CREATE])) {
      const {dataId, mode} = data;
      mode === MODE_EDIT && (dataIds[dataId] = data);
    }
  };

  /**
   * update temporary file data
   * @param {Object} obj - temporary file data object
   * @returns {void}
   */
  const updateTmpFileData = async (obj = {}) => {
    const {data} = obj;
    if (data) {
      const {dataId, mode} = data;
      mode === MODE_EDIT && dataIds[dataId] && (dataIds[dataId] = data);
    }
  };

  /* serialize content */
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
   * @returns {Object} - Promise.<Array>
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
      (node.nodeType === NODE_ELEMENT || node.nodeType === NODE_TEXT) &&
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
    if (elm && elm.nodeType === NODE_ELEMENT && node && node.hasChildNodes()) {
      const arr = [];
      const nodes = node.childNodes;
      if (nodes instanceof NodeList) {
        for (const child of nodes) {
          const {nodeType, nodeValue, parentNode} = child;
          if (nodeType === NODE_ELEMENT) {
            child === parentNode.firstChild &&
              arr.push(document.createTextNode("\n"));
            arr.push(appendChild(child, child));
            child === parentNode.lastChild &&
              arr.push(document.createTextNode("\n"));
          } else {
            nodeType === NODE_TEXT &&
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
              (nodeType === NODE_ELEMENT || nodeType === NODE_TEXT ||
               nodeType === NODE_COMMENT) &&
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
   * @returns {Object} - ?Promise.<Array>, range array
   */
  const createRangeArr = async (range, index, count) => {
    const arr = [];
    if (range) {
      const ancestor = range.commonAncestorContainer;
      let obj;
      count > 1 && arr.push(document.createTextNode("\n"));
      switch (ancestor.nodeType) {
        case NODE_ELEMENT:
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
        case NODE_TEXT:
          obj = await createElm(ancestor.parentNode);
          if (obj.nodeType === NODE_ELEMENT) {
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
        if (node.nodeType === NODE_ELEMENT) {
          node.localName === "br" && arr.push("\n") ||
          node.hasChildNodes() && arr.push(getText(node.childNodes));
        } else {
          node.nodeType === NODE_TEXT && arr.push(node.nodeValue);
        }
      }
      text = await Promise.all(arr).then(a => a.join(""));
    }
    return text || "";
  };

  /**
   * get / create temporary ID and add listener
   * @param {Object} elm - target element
   * @returns {?string} - ID
   */
  const getId = async elm => {
    let dataId;
    if (elm) {
      const isHtml = !elm.namespaceURI || elm.namespaceURI === nsURI.html;
      const ns = !isHtml && nsURI.html || "";
      if (elm.hasAttributeNS(ns, DATA_ATTR_ID)) {
        dataId = elm.getAttributeNS(ns, DATA_ATTR_ID);
      } else {
        const nsPrefix = ns && await getXmlnsPrefix(elm, ns, HTML);
        let attr;
        if (ns) {
          nsPrefix && elm.setAttributeNS(nsURI.xmlns, `xmlns:${nsPrefix}`, ns);
          attr = `${nsPrefix || HTML}:${DATA_ATTR_PREFIX}`;
          elm.setAttributeNS(ns, attr, nsPrefix || HTML);
        }
        attr = isHtml && DATA_ATTR_ID || `${nsPrefix || HTML}:${DATA_ATTR_ID}`;
        dataId = `${LABEL}_${elm.id || window.performance.now()}`
                   .replace(/[-:.]/g, "_");
        elm.setAttributeNS(ns, attr, dataId);
        isHtml && elm.addEventListener(
          "focus", evt => requestTmpFile(evt).catch(logError), false
        );
      }
    }
    return dataId || null;
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
        isText = child.nodeType === NODE_TEXT;
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
        if (typeof node.isContentEditable === "boolean" &&
            (!node.namespaceURI || node.namespaceURI === nsURI.html)) {
          elm = node;
          break;
        }
        node = node.parentNode;
      }
    }
    return elm || null;
  };

  /**
   * set data attribute and add listener
   * @param {Object} elm - element
   * @returns {void}
   */
  const setDataAttrs = async elm => {
    if (elm) {
      const dataId = await getId(elm);
      const ctrl = await getEditableElm(elm);
      if (dataId && ctrl) {
        const arr = ctrl.hasAttributeNS("", DATA_ATTR_CTRLS) &&
                      (ctrl.getAttributeNS("", DATA_ATTR_CTRLS)).split(" ");
        if (arr) {
          const attr = arr.push(dataId) && [...(new Set(arr))].join(" ");
          attr && ctrl.setAttributeNS("", DATA_ATTR_CTRLS, attr);
        } else {
          ctrl.setAttributeNS("", DATA_ATTR_CTRLS, dataId);
          ctrl.addEventListener(
            "focus", evt => requestTmpFile(evt).catch(logError), false
          );
        }
      }
    }
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
    const {characterSet, contentType, documentURI: uri} = document;
    let obj;
    if (window.location.protocol === "file:") {
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
        const [type] = (res.headers.get("Content-Type")).split(";");
        const dataId = await getFileNameFromURI(uri, SUBST);
        const fileName = dataId + await getFileExtension(type);
        const value = await res.text();
        obj = {
          [TMP_FILE_CREATE]: {
            dataId, dir, fileName, host, incognito, mode, tabId, windowId,
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
    const {dir, host, incognito, mode, tabId, windowId} = data;
    let {dataId, namespaceURI, value} = data, fileName, tmpFileData;
    namespaceURI = namespaceURI || "";
    switch (mode) {
      case MODE_EDIT:
        if (dataId) {
          fileName = `${dataId}.txt`;
          tmpFileData = {
            [TMP_FILE_CREATE]: {
              dataId, dir, fileName, host, incognito, mode, namespaceURI,
              tabId, windowId,
            },
            value,
          };
        }
        break;
      case MODE_MATHML:
      case MODE_SVG:
        if (value && (dataId = await getFileNameFromURI(uri, SUBST))) {
          fileName = `${dataId}.${mode === MODE_MATHML && "mml" || "svg"}`;
          tmpFileData = {
            [TMP_FILE_CREATE]: {
              dataId, dir, fileName, host, incognito, mode, tabId, windowId,
            },
            value,
          };
        }
        break;
      case MODE_SELECTION:
        dataId = await getFileNameFromURI(uri, SUBST);
        if (dataId && value &&
            /^(?:(?:application\/(?:[\w\-.]+\+)?|image\/[\w\-.]+\+)x|text\/(?:ht|x))ml$/.test(contentType)) {
          fileName = `${dataId}.xml`;
          tmpFileData = {
            [TMP_FILE_CREATE]: {
              dataId, dir, fileName, host, incognito, mode, tabId, windowId,
            },
            value,
          };
        } else if (dataId && value) {
          value = stripHtmlTags(value);
          fileName = dataId + await getFileExtension(contentType);
          tmpFileData = {
            [TMP_FILE_CREATE]: {
              dataId, dir, fileName, host, incognito, mode, tabId, windowId,
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
   * create content data
   * @param {Object} elm - element
   * @param {string} mode - context mode
   * @returns {Object} - content data
   */
  const createContentData = async (elm, mode) => {
    const {incognito, tabId, windowId} = vars;
    const data = {
      incognito, tabId, windowId,
      mode: MODE_SOURCE,
      dir: incognito && TMP_FILES_PB || TMP_FILES,
      host: window.location.hostname || LABEL,
      dataId: null,
      namespaceURI: null,
      value: null,
    };
    const sel = window.getSelection();
    const {anchorNode, isCollapsed} = sel;
    if (elm && mode) {
      let obj;
      switch (mode) {
        case MODE_EDIT:
          obj = await getId(elm);
          if (obj) {
            if (isCollapsed && await isEditControl(elm)) {
              data.mode = mode;
              data.dataId = obj;
              data.value = elm.value || "";
            } else {
              !elm.isContentEditable && !isCollapsed && anchorNode &&
                (elm = anchorNode.parentNode);
              data.mode = mode;
              data.dataId = obj;
              data.value = elm.hasChildNodes() &&
                           await getText(elm.childNodes) || "";
              data.namespaceURI = elm.namespaceURI ||
                                  await getNodeNS(elm).namespaceURI;
              setDataAttrs(elm);
            }
          }
          break;
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
   * @returns {Object} - Promise.<Array>
   */
  const portContent = async (elm, mode) => {
    const data = await createContentData(elm, mode).then(createTmpFileData);
    return Promise.all([
      createContentDataMsg(data).then(portMsg),
      storeTmpFileData(data),
    ]);
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
            (anchorNode.nodeType === NODE_TEXT && anchorNode.parentNode ||
             focusNode.nodeType === NODE_TEXT && focusNode.parentNode) || elm;
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
   * @returns {Object} - ?Promise.<AsyncFunction>
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
   * dispatch input event
   * @param {Object} elm - element
   * @returns {void}
   */
  const dispatchInputEvt = elm => {
    if (elm && elm.nodeType === NODE_ELEMENT) {
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
   * replace content editable element text
   * @param {Object} elm - owner element
   * @param {Object} node - editable element
   * @param {string} value - value
   * @param {string} ns - namespace URI
   * @returns {void}
   */
  const replaceContent = async (elm, node, value = "", ns = nsURI.html) => {
    if (node && node.nodeType === NODE_ELEMENT && isString(value)) {
      const changed = node.textContent !== value;
      const frag = document.createDocumentFragment();
      const arr = value.length && value.split("\n") || [""];
      const l = arr.length;
      let i = 0;
      while (i < l) {
        frag.append(document.createTextNode(arr[i]));
        i < l - 1 && ns === nsURI.html &&
          frag.append(document.createElementNS(ns, "br"));
        i++;
      }
      if (node.hasChildNodes()) {
        while (node.firstChild) {
          node.removeChild(node.firstChild);
        }
      }
      node.append(frag);
      changed && dispatchInputEvt(elm);
    }
  };

  /**
   * replace text edit control element value
   * @param {Object} elm - element
   * @param {string} value - value
   * @returns {void}
   */
  const replaceEditControlValue = async (elm, value) => {
    if (elm && elm.nodeType === NODE_ELEMENT && isString(value)) {
      let changed;
      if (/^input$/.test(elm.localName)) {
        while (value.length && /[\f\n\t\r\v]$/.test(value)) {
          value = value.replace(/[\f\n\t\r\v]$/, "");
        }
        changed = elm.value !== value;
      } else {
        /^textarea$/.test(elm.localName) && (changed = elm.value !== value);
      }
      isString(elm.value) && (elm.value = value);
      changed && dispatchInputEvt(elm);
    }
  };

  /**
   * get target element and synchronize text
   * @param {Object} obj - sync data object
   * @returns {Object} - Promise.<Array>
   */
  const syncText = async (obj = {}) => {
    const {data, value} = obj;
    const func = [];
    if (data) {
      const {dataId, namespaceURI, tabId, timestamp} = data;
      if (dataId && tabId === vars[ID_TAB]) {
        const elm = document.activeElement;
        let isHtml = !elm.namespaceURI || elm.namespaceURI === nsURI.html,
            ns = !isHtml && nsURI.html || "", attr, nsPrefix;
        if (elm.hasAttributeNS(ns, DATA_ATTR_CTRLS)) {
          const arr = (elm.getAttributeNS(ns, DATA_ATTR_CTRLS)).split(" ");
          for (let id of arr) {
            if (id === dataId &&
                (id = document.querySelector(`[*|${DATA_ATTR_ID}=${id}]`))) {
              isHtml = !id.namespaceURI || id.namespaceURI === nsURI.html;
              ns = !isHtml && nsURI.html || "";
              nsPrefix = id.getAttributeNS(ns, DATA_ATTR_PREFIX) || HTML;
              attr = isHtml && DATA_ATTR_TS || `${nsPrefix}:${DATA_ATTR_TS}`;
              if (!id.hasAttributeNS(ns, DATA_ATTR_TS) ||
                  timestamp > id.getAttributeNS(ns, DATA_ATTR_TS) * 1) {
                id.setAttributeNS(ns, attr, timestamp);
                func.push(replaceContent(elm, id, value, namespaceURI));
              }
              break;
            }
          }
        } else if (elm.hasAttributeNS(ns, DATA_ATTR_ID) &&
                   elm.getAttributeNS(ns, DATA_ATTR_ID) === dataId &&
                   (!elm.hasAttributeNS(ns, DATA_ATTR_TS) ||
                    timestamp > elm.getAttributeNS(ns, DATA_ATTR_TS) * 1)) {
          nsPrefix = elm.getAttributeNS(ns, DATA_ATTR_PREFIX) || HTML;
          attr = isHtml && DATA_ATTR_TS || `${nsPrefix}:${DATA_ATTR_TS}`;
          elm.setAttributeNS(ns, attr, timestamp);
          elm.isContentEditable &&
          func.push(replaceContent(elm, elm, value, namespaceURI)) ||
          /^(?:input|textarea)$/.test(elm.localName) &&
          func.push(replaceEditControlValue(elm, value));
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
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
    enabled: vars[KEY_OPTIONS],
  };

  /**
   * key combination matches
   * @param {Object} evt - Event
   * @param {Object} key - KeyCombo
   * @returns {boolean} - result
   */
  const keyComboMatches = async (evt, key) =>
    evt && key && key.enabled && key.key && evt.key &&
    evt.key.toLowerCase() === key.key.toLowerCase() &&
    evt.altKey === key.altKey && evt.ctrlKey === key.ctrlKey &&
    evt.metaKey === key.metaKey && evt.shiftKey === key.shiftKey || false;

  /* handlers */
  /**
   * handle message
   * @param {*} msg - message
   * @returns {Object} - Promise.<Array>
   */
  const handleMsg = async msg => {
    const func = [];
    const items = msg && Object.keys(msg);
    if (items && items.length) {
      for (const item of items) {
        const obj = msg[item];
        switch (item) {
          case CONTENT_GET:
            func.push(determinePortProcess(obj));
            break;
          case ID_TAB:
          case ID_WIN:
            vars[item] = obj;
            break;
          case INCOGNITO:
          case IS_ENABLED:
          case ONLY_EDITABLE:
            vars[item] = !!obj;
            break;
          case KEY_ACCESS:
            vars[item] = obj;
            execEditorKey.key = obj;
            openOptionsKey.key = obj;
            break;
          case KEY_EDITOR:
            vars[item] = !!obj;
            execEditorKey.enabled = !!obj;
            break;
          case KEY_OPTIONS:
            vars[item] = !!obj;
            openOptionsKey.enabled = !!obj;
            break;
          case TEXT_SYNC:
            func.push(syncText(obj));
            break;
          case TMP_FILE_DATA_PORT:
            func.push(updateTmpFileData(obj));
            break;
          case VARS_SET:
            func.push(handleMsg(obj));
            break;
          default:
        }
      }
    }
    return Promise.all(func);
  };

  /**
   * handle contextmenu event
   * @param {!Object} evt - Event
   * @returns {Object} - Promise.<AsyncFunction>
   */
  const handleContextMenu = async evt => {
    const {target} = evt;
    const {localName, namespaceURI, type} = target;
    const {anchorNode, focusNode, isCollapsed} = window.getSelection();
    const mode = namespaceURI === nsURI.math && MODE_MATHML ||
                 namespaceURI === nsURI.svg && MODE_SVG || MODE_SOURCE;
    let enabled;
    if (localName === "input") {
      enabled = !type || /^(?:(?:emai|te|ur)l|search|text)$/.test(type);
    } else {
      enabled = isCollapsed || anchorNode.parentNode === focusNode.parentNode;
    }
    vars[CONTEXT_MODE] = mode;
    vars[CONTEXT_NODE] = target;
    return portMsg({
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
  };

  /**
   * handle keypress event
   * @param {!Object} evt - Event
   * @returns {Object} - Promise.<Array>
   */
  const handleKeyPress = async evt => {
    const func = [];
    if (vars[IS_ENABLED]) {
      if (await keyComboMatches(evt, execEditorKey)) {
        if (/^(?:application\/(?:(?:[\w\-.]+\+)?(?:json|xml)|(?:(?:x-)?jav|ecm)ascript)|image\/[\w\-.]+\+xml|text\/[\w\-.]+)$/.test(document.contentType)) {
          const {target} = evt;
          const mode = await getContextMode(target);
          (!vars[ONLY_EDITABLE] || mode === MODE_EDIT) &&
            func.push(portContent(target, mode));
        }
      } else {
        const openOpt = await keyComboMatches(evt, openOptionsKey);
        openOpt && func.push(portMsg({[OPTIONS_OPEN]: openOpt}));
      }
    }
    return Promise.all(func);
  };

  /* listeners */
  port.onMessage.addListener(msg => handleMsg(msg).catch(logError));

  document.addEventListener("DOMContentLoaded", () => {
    const root = document.documentElement;
    root.addEventListener(
      "contextmenu", evt => handleContextMenu(evt).catch(logError), false
    );
    root.addEventListener(
      "keypress", evt => handleKeyPress(evt).catch(logError), false
    );
  }, false);

  /* startup */
  Promise.all([
    extendObjItems(fileExt, FILE_EXT),
    extendObjItems(nsURI, NS_URI),
  ]).catch(logError);
}
