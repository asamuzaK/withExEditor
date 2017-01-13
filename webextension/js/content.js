/**
 * content.js
 */
"use strict";
{
  /* api */
  const {runtime} = browser;
  const storage = browser.storage.local;

  /* constants */
  const LABEL = "withExEditor";
  const PORT_NAME = "portContent";

  const CONTEXT_MENU = "contextMenu";
  const CREATE_TMP_FILE = "createTmpFile";
  const GET_CONTENT = "getContent";
  const GET_FILE_PATH = "getFilePath";
  const GET_TMP_FILE = "getTmpFile";
  const OPEN_OPTIONS = "openOptions";
  const PORT_FILE_PATH = "portFilePath";
  const PORT_HOST = "portHost";
  const SET_VARS = "setVars";
  const SYNC_TEXT = "syncText";

  const CHAR = "utf-8";
  const DATA_ATTR_ID = "data-with_ex_editor_id";
  const DATA_ATTR_ID_CTRL = `${DATA_ATTR_ID}_controls`;
  const DATA_ATTR_ID_NS = `html:${DATA_ATTR_ID}`;
  const DATA_ATTR_TS = "data-with_ex_editor_timestamp";
  const DATA_ATTR_TS_NS = `html:${DATA_ATTR_TS}`;
  const MODE_EDIT_TEXT = "modeEditText";
  const MODE_MATHML = "modeViewMathML";
  const MODE_SELECTION = "modeViewSelection";
  const MODE_SOURCE = "modeViewSource";
  const MODE_SVG = "modeViewSVG";
  const NODE_COMMENT = Node.COMMENT_NODE;
  const NODE_ELEMENT = Node.ELEMENT_NODE;
  const NODE_TEXT = Node.TEXT_NODE;
  const TMP_FILES = "tmpFiles";
  const TMP_FILES_PB = "tmpFilesPb";

  const FILE_EXT = "fileExt";
  const NS_URI = "nsURI";
  const NS_URI_DEFAULT_ITEMS = 4;

  const ENABLE_ONLY_EDITABLE = "enableOnlyEditable";
  const INCOGNITO = "incognito";
  const IS_ENABLED = "isEnabled";
  const KEY_ACCESS = "accessKey";
  const KEY_OPEN_OPTIONS = "optionsShortCut";
  const KEY_EXEC_EDITOR = "editorShortCut";
  const NODE_CONTEXT = "contextNode";
  const TAB_ID = "tabId";
  const WIN_ID = "windowId";

  /* variables */
  const vars = {
    [IS_ENABLED]: false,
    [KEY_ACCESS]: "e",
    [KEY_EXEC_EDITOR]: true,
    [KEY_OPEN_OPTIONS]: true,
    [ENABLE_ONLY_EDITABLE]: false,
    [INCOGNITO]: false,
    [NODE_CONTEXT]: null,
    [TAB_ID]: "",
    [WIN_ID]: "",
  };

  /**
   * log error
   * @param {!Object} e - Error
   * @return {boolean} - false
   */
  const logError = e => {
    console.error(e);
    return false;
  };

  /**
   * is string
   * @param {*} o - object to check
   * @return {boolean} - result
   */
  const isString = o =>
    o && (typeof o === "string" || o instanceof String) || false;

  /**
   * strip HTML tags and decode HTML escaped characters
   * @param {string} v - value
   * @return {string} - converted value
   */
  const convertValue = async v => {
    while (/^\n*<(?:[^>]+:)?[^>]+?>|<\/(?:[^>]+:)?[^>]+>\n*$/.test(v)) {
      v = v.replace(/^\n*<(?:[^>]+:)?[^>]+?>/, "")
            .replace(/<\/(?:[^>]+:)?[^>]+>\n*$/, "\n");
    }
    return v.replace(/<\/(?:[^>]+:)?[^>]+>\n*<!--.*-->\n*<(?:[^>]+:)?[^>]+>/g, "\n\n")
             .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  };

  /**
   * join array
   * @param {Array} arr - array
   * @return {string} - string
   */
  const joinArr = async arr =>
    Array.isArray(arr) && (arr.map(i => i || "")).join("") || "";

  /* file utils */
  /**
   * get file name from URI path
   * @param {string} uri - URI
   * @param {string} subst - substitute file name
   * @return {string} - file name
   */
  const getFileNameFromURI = async (uri, subst = LABEL) => {
    const name = isString(uri) && !/^data:/.test(uri) &&
                   /^.*\/((?:[\w\-~!$&'()*+,;=:@]|%[0-9A-F]{2})+)(?:(?:\.(?:[\w\-~!$&'()*+,;=:@]|%[0-9A-F]{2})+)*(?:\?(?:[\w\-.~!$&'()*+,;=:@/?]|%[0-9A-F]{2})*)?(?:#(?:[\w\-.~!$&'()*+,;=:@/?]|%[0-9A-F]{2})*)?)?$/.exec(uri);
    return name && name[1] || subst;
  };

  /* file extension */
  const fileExt = {};

  /**
   * get file extension from media type
   * @param {string} media - media type
   * @param {string} subst - substitute file extension
   * @return {string} - file extension
   */
  const getFileExtension = async (media = "text/plain", subst = "txt") => {
    const arr = /^(application|image|text)\/([\w\-.]+)(?:\+(json|xml))?$/.exec(media);
    let ext;
    if (arr) {
      const [, type, subtype] = arr;
      const suffix = arr[3] ||
                     type === "application" && /^(?:json|xml)$/.test(subtype) &&
                       subtype;
      const items = fileExt[type];
      if (items) {
        const item = suffix && items[suffix];
        ext = item && (item[subtype] || item[suffix]) || items[subtype];
      }
    }
    return `.${ext || subst}`;
  };

  /* port */
  const port = runtime.connect({name: PORT_NAME});

  /**
   * port message
   * @param {*} msg - message
   * @return {void}
   */
  const portMsg = async msg => {
    msg && port.postMessage(msg);
  };

  /* data IDs */
  const dataIds = {};

  /**
   * port temporary file data
   * @param {string} dataId - data ID
   * @return {Object} - ?Promise.<void>
   */
  const portTmpFileData = async dataId => {
    const data = dataId && dataIds[dataId];
    return data && portMsg({[GET_TMP_FILE]: data}) || null;
  };

  /**
   * port temporary file data to get temporary file
   * @param {!Object} evt - Event
   * @return {Object} - Promise.<Array.<*>>
   */
  const requestTmpFile = async evt => {
    const func = [];
    const elm = evt.target === evt.currentTarget && evt.target;
    const attrs = elm && (
      elm.hasAttributeNS("", DATA_ATTR_ID) &&
      elm.getAttributeNS("", DATA_ATTR_ID) ||
      elm.hasAttributeNS("", DATA_ATTR_ID_CTRL) &&
      elm.getAttributeNS("", DATA_ATTR_ID_CTRL)
    );
    attrs && attrs.split(" ").forEach(dataId =>
      func.push(portTmpFileData(dataId))
    );
    return Promise.all(func).catch(logError);
  };

  /**
   * store temporary file data
   * @param {Object} data - temporary file data
   * @return {void}
   */
  const storeTmpFileData = async (data = {}) => {
    if (data[CREATE_TMP_FILE] && (data = data[CREATE_TMP_FILE])) {
      const {dataId, mode} = data;
      mode === MODE_EDIT_TEXT && (dataIds[dataId] = data);
    }
  };

  /**
   * update temporary file data
   * @param {Object} obj - temporary file data object
   * @return {void}
   */
  const updateTmpFileData = async (obj = {}) => {
    const {data, path} = obj;
    if (data) {
      const {dataId, mode} = data;
      if (mode === MODE_EDIT_TEXT) {
        const keys = dataIds[dataId];
        if (keys && path) {
          data.path = path;
          dataIds[dataId] = data;
        }
      }
    }
  };

  /* serialize content */
  /* namespace URI */
  const nsURI = {
    html: "http://www.w3.org/1999/xhtml",
    math: "http://www.w3.org/1998/Math/MathML",
    svg: "http://www.w3.org/2000/svg",
    xmlns: "http://www.w3.org/2000/xmlns/",
  };

  /**
   * get namespace of node from ancestor
   * @param {Object} node - element node
   * @return {Object} - namespace data
   */
  const getNodeNS = async node => {
    const ns = {node: null, name: null, namespaceURI: null};
    if (node.namespaceURI) {
      ns.node = node;
      ns.localName = node.localName;
      ns.namespaceURI = node.namespaceURI;
    } else {
      const root = document.documentElement;
      while (node && node !== root && !ns.node) {
        if (node.namespaceURI) {
          ns.node = node;
          ns.localName = node.localName;
          ns.namespaceURI = node.namespaceURI;
        } else if (/^(?:math|svg)$/.test(node.localName)) {
          ns.node = node;
          ns.localName = node.localName;
          ns.namespaceURI = nsURI.ns[node.localName];
        } else {
          const obj = node.parentNode;
          if (obj.localName === "foreignObject" &&
              (obj.hasAttributeNS(nsURI.svg, "requiredExtensions") ||
               root.localName === "html")) {
            ns.node = node;
            ns.localName = node.localName;
            ns.namespaceURI = obj.hasAttributeNS(nsURI.svg,
                                                 "requiredExtensions") &&
                              obj.getAttributeNS(nsURI.svg,
                                                 "requiredExtensions") ||
                              nsURI.html;
          } else {
            node = obj;
          }
        }
      }
      if (!ns.node) {
        ns.node = root;
        ns.localName = root.localName;
        ns.namespaceURI = root.hasAttribute("xmlns") &&
                          root.getAttribute("xmlns") ||
                          nsURI[root.localName.toLowerCase()] || "";
      }
    }
    return ns;
  };

  /**
   * set namespaced attribute
   * @param {Object} elm - element to append attributes
   * @param {Object} node - element node to get attributes from
   * @return {void}
   */
  const setAttributeNS = async (elm, node) => {
    const attrs = node && node.attributes;
    if (elm && node && attrs) {
      for (const attr of attrs) {
        const {localName, name, namespaceURI, prefix, value} = attr;
        typeof node[name] !== "function" && elm.setAttributeNS(
          namespaceURI || prefix && nsURI[prefix] || "",
          prefix && `${prefix}:${localName}` || localName,
          value
        );
      }
    }
  };

  /**
   * create namespaced element
   * @param {Object} node - element node to create element from
   * @return {Object} - namespaced element
   */
  const createElm = async node => {
    let elm;
    if (node) {
      const {attributes, localName, namespaceURI, prefix} = node;
      elm = document.createElementNS(
        namespaceURI || prefix && nsURI[prefix] ||
        await getNodeNS(node).namespaceURI || nsURI.html,
        prefix && `${prefix}:${localName}` || localName
      );
      attributes && await setAttributeNS(elm, node);
    }
    return elm || null;
  };

  /**
   * create document fragment from nodes array
   * @param {Object} nodes - nodes array
   * @return {Object} - document fragment
   */
  const createFrag = async nodes => {
    const frag = document.createDocumentFragment();
    Array.isArray(nodes) && nodes.forEach(node => {
      (node.nodeType === NODE_ELEMENT || node.nodeType === NODE_TEXT) &&
        frag.appendChild(node);
    });
    return frag;
  };

  /**
   * append child nodes
   * @param {Object} elm - container element
   * @param {Object} node - node containing child nodes to append
   * @return {Object} - element or text node
   */
  const appendChild = async (elm, node) => {
    elm = await createElm(elm);
    if (elm && elm.nodeType === NODE_ELEMENT && node && node.hasChildNodes()) {
      const arr = [];
      const nodes = node.childNodes;
      if (nodes instanceof NodeList) {
        for (const child of nodes) {
          switch (child.nodeType) {
            case NODE_ELEMENT:
              child === child.parentNode.firstChild &&
                arr.push(document.createTextNode("\n"));
              arr.push(createElm(child).then(obj => appendChild(obj, child)));
              child === child.parentNode.lastChild &&
                arr.push(document.createTextNode("\n"));
              break;
            case NODE_TEXT:
              arr.push(document.createTextNode(child.nodeValue));
              break;
            default:
          }
        }
      }
      elm.appendChild(await Promise.all(arr).then(createFrag));
    }
    return elm || document.createTextNode("");
  };

  /**
   * create DOM of MathML / SVG
   * @param {Object} node - element node
   * @return {?string} - serialized node string
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
    return elm && elm.hasChildNodes() &&
             (new XMLSerializer()).serializeToString(elm) || null;
  };

  /**
   * create selection fragment
   * @param {Array} arr - array of nodes array
   * @return {Object} - document fragment
   */
  const createSelFrag = async arr => {
    let frag;
    if (Array.isArray(arr) && arr.length) {
      frag = document.createDocumentFragment();
      for (const nodes of arr) {
        if (!Array.isArray(nodes)) {
          return null;
        }
        for (const node of nodes) {
          if (node && (node.nodeType === NODE_ELEMENT ||
                       node.nodeType === NODE_TEXT ||
                       node.nodeType === NODE_COMMENT)) {
            frag.appendChild(node);
          }
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
   * @return {Object} - Promise.<Array>, range array
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
            obj.appendChild(range.cloneContents());
            arr.push(obj);
          }
          break;
        default:
      }
      arr.push(document.createTextNode("\n"));
      count > 1 && index < count - 1 &&
        arr.push(document.createComment("Next Range"));
    }
    return Promise.all(arr);
  };

  /**
   * create DOM from selection range
   * @param {Object} sel - selection
   * @return {?string} - serialized node string
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
          (obj = await createElm(document.documentElement)) &&
          obj.nodeType === NODE_ELEMENT) {
        obj.appendChild(frag);
        frag = document.createDocumentFragment();
        frag.appendChild(obj);
        frag.appendChild(document.createTextNode("\n"));
      }
    }
    return frag && frag.hasChildNodes() &&
             (new XMLSerializer()).serializeToString(frag) || null;
  };

  /**
   * get text
   * @param {Object} nodes - nodes
   * @return {Object} - Promise.<string>, text
   */
  const getText = async nodes => {
    const arr = [];
    if (nodes instanceof NodeList) {
      for (const node of nodes) {
        switch (node.nodeType) {
          case NODE_ELEMENT:
            if (node.localName === "br") {
              arr.push("\n");
            } else {
              node.hasChildNodes() && arr.push(getText(node.childNodes));
            }
            break;
          case NODE_TEXT:
            arr.push(node.nodeValue);
            break;
          default:
        }
      }
    }
    return Promise.all(arr).then(joinArr);
  };

  /**
   * get / create temporary ID and add listener
   * @param {Object} elm - target element
   * @return {?string} - ID
   */
  const getId = async elm => {
    let id;
    if (elm) {
      const isHtml = !elm.namespaceURI || elm.namespaceURI === nsURI.html;
      const ns = !isHtml && nsURI.html || "";
      if (elm.hasAttributeNS(ns, DATA_ATTR_ID)) {
        id = elm.getAttributeNS(ns, DATA_ATTR_ID);
      } else {
        id = `${LABEL}_${elm.id || window.performance.now()}`
               .replace(/[-:.]/g, "_");
        !isHtml && elm.setAttributeNS(nsURI.xmlns, "xmlns:html", nsURI.html);
        elm.setAttributeNS(ns, isHtml && DATA_ATTR_ID || DATA_ATTR_ID_NS, id);
        isHtml && elm.addEventListener("focus", requestTmpFile, false);
      }
    }
    return id || null;
  };

  /**
   * node or ancestor is editable
   * @param {Object} node - element node
   * @return {boolean} - result
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
   * @return {boolean} - result
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
   * @return {boolean} - result
   */
  const isEditControl = async elm => {
    let bool;
    if (elm) {
      switch (elm.localName) {
        case "textarea":
          bool = true;
          break;
        case "input":
          bool = elm.hasAttribute("type") ?
                   /^(?:(?:emai|te|ur)l|search|text)$/.test(elm.getAttribute("type")) :
                   true;
          break;
        default:
      }
    }
    return bool || false;
  };

  /**
   * get editable element from ancestor
   * @param {Object} node - node
   * @return {Object} - editable element
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
   * @return {void}
   */
  const setDataAttrs = async elm => {
    if (elm) {
      const id = await getId(elm);
      const ctrl = await getEditableElm(elm);
      if (id && ctrl) {
        const arr = ctrl.hasAttributeNS("", DATA_ATTR_ID_CTRL) &&
                      (ctrl.getAttributeNS("", DATA_ATTR_ID_CTRL)).split(" ");
        if (arr) {
          arr.push(id);
          ctrl.setAttributeNS(
            "", DATA_ATTR_ID_CTRL,
            (arr.filter((v, i, o) => o.indexOf(v) === i)).join(" ")
          );
        } else {
          ctrl.setAttributeNS("", DATA_ATTR_ID_CTRL, id);
          ctrl.addEventListener("focus", requestTmpFile, false);
        }
      }
    }
  };

  /* temporary file data */
  /**
   * create content data message
   * @param {Object} data - temporary file data
   * @return {Object} - Promise.<Array.<*>>
   */
  const createContentDataMsg = async data => {
    const func = [];
    if (data) {
      if (data[CREATE_TMP_FILE]) {
        func.push(portMsg({
          [CREATE_TMP_FILE]: {
            data: data[CREATE_TMP_FILE],
            value: data.value,
          },
        }));
      } else {
        data[GET_FILE_PATH] &&
          func.push(portMsg({[GET_FILE_PATH]: data[GET_FILE_PATH]}));
      }
    }
    return Promise.all(func);
  };

  /**
   * fetch file source and create temporary file data
   * @param {Object} data - content data
   * @return {Object} - temporary file data
   */
  const fetchSource = async data => {
    const {characterSet, contentType, documentURI: uri} = document;
    let obj;
    if (window.location.protocol === "file:") {
      obj = {
        [GET_FILE_PATH]: {uri},
      };
    } else {
      const {dir, host, incognito, mode, tabId, windowId} = data;
      const method = "GET";
      const cors = "cors";
      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set("Charset", characterSet);
      obj = await fetch(uri, {cors, headers, method}).then(async res => {
        const dataId = await getFileNameFromURI(uri, "index");
        const fileName = dataId + await getFileExtension(contentType);
        const value = await res.text();
        return {
          [CREATE_TMP_FILE]: {
            dataId, dir, fileName, host, incognito, mode, tabId, windowId,
          },
          value,
        };
      });
    }
    return obj || null;
  };

  /**
   * create temporary file data
   * @param {Object} data - content data
   * @return {Object} - temporary file data
   */
  const createTmpFileData = async data => {
    const {contentType, documentURI: uri} = document;
    const {dir, host, incognito, mode, tabId, windowId} = data;
    let {dataId, namespaceURI, value} = data, fileName, tmpFileData;
    namespaceURI = namespaceURI || "";
    switch (mode) {
      case MODE_EDIT_TEXT:
        if (dataId) {
          fileName = `${dataId}.txt`;
          tmpFileData = {
            [CREATE_TMP_FILE]: {
              dataId, dir, fileName, host, incognito, mode, namespaceURI,
              tabId, windowId,
            },
            value,
          };
        }
        break;
      case MODE_MATHML:
      case MODE_SVG:
        if (value && (dataId = await getFileNameFromURI(uri, "index"))) {
          fileName = `${dataId}.${mode === MODE_MATHML && "mml" || "svg"}`;
          tmpFileData = {
            [CREATE_TMP_FILE]: {
              dataId, dir, fileName, host, incognito, mode, tabId, windowId,
            },
            value,
          };
        }
        break;
      case MODE_SELECTION:
        dataId = await getFileNameFromURI(uri, "index");
        if (dataId && value &&
            /^(?:(?:application\/(?:[\w\-.]+\+)?|image\/[\w\-.]+\+)x|text\/(?:ht|x))ml$/.test(contentType)) {
          fileName = `${dataId}.xml`;
          tmpFileData = {
            [CREATE_TMP_FILE]: {
              dataId, dir, fileName, host, incognito, mode, tabId, windowId,
            },
            value,
          };
        } else if (dataId && value) {
          value = await convertValue(value);
          fileName = dataId + await getFileExtension(contentType);
          tmpFileData = {
            [CREATE_TMP_FILE]: {
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
   * @return {Object} - content data
   */
  const createContentData = async (elm, mode) => {
    const {incognito, tabId, windowId} = vars;
    const data = {
      incognito, tabId, windowId,
      mode: MODE_SOURCE,
      dir: incognito && TMP_FILES_PB || TMP_FILES,
      host: window.location.host || LABEL,
      dataId: null,
      namespaceURI: null,
      value: null,
    };
    const sel = window.getSelection();
    if (elm && mode) {
      let obj;
      switch (mode) {
        case MODE_EDIT_TEXT:
          obj = await getId(elm);
          if (obj) {
            if (sel.isCollapsed && await isEditControl(elm)) {
              data.mode = mode;
              data.dataId = obj;
              data.value = elm.value || "";
            } else {
              !elm.isContentEditable && !sel.isCollapsed && sel.anchorNode &&
                (elm = sel.anchorNode.parentNode);
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
   * @return {Object} - Promise.<Array.<*>>
   */
  const portContent = (elm, mode) =>
    createContentData(elm, mode).then(createTmpFileData).then(data =>
      Promise.all([
        createContentDataMsg(data),
        storeTmpFileData(data),
      ]));

  /**
   * get context mode
   * @param {Object} elm - element
   * @return {string} - context mode
   */
  const getContextMode = async elm => {
    let mode = MODE_SOURCE;
    if (elm) {
      const sel = window.getSelection();
      if (sel.isCollapsed) {
        if (elm.isContentEditable || await isEditControl(elm) ||
            await isContentTextNode(elm)) {
          mode = MODE_EDIT_TEXT;
        } else {
          switch (elm.namespaceURI) {
            case nsURI.math:
              mode = MODE_MATHML;
              break;
            case nsURI.svg:
              mode = MODE_SVG;
              break;
            default:
          }
        }
      } else {
        elm = sel.anchorNode.nodeType === NODE_TEXT &&
              sel.anchorNode.parentNode ||
              sel.focusNode.nodeType === NODE_TEXT &&
              sel.focusNode.parentNode || elm;
        if (sel.rangeCount === 1 &&
            sel.anchorNode.parentNode === sel.focusNode.parentNode &&
            elm !== document.documentElement &&
            (await isEditControl(elm) || elm.isContentEditable ||
             await isContentTextNode(elm))) {
          mode = MODE_EDIT_TEXT;
        } else {
          mode = MODE_SELECTION;
        }
      }
    }
    return mode;
  };

  /**
   * handle context menu item clicked info
   * @param {Object} info - context menu info
   * @return {Object} - Promise.<Array.<*>>
   */
  const menuClickedInfo = async (info = {}) => {
    const func = [];
    const {menuItemId} = info;
    const elm = vars[NODE_CONTEXT];
    menuItemId === MODE_SOURCE &&
    func.push(getContextMode(elm).then(mode => portContent(elm, mode))) ||
    func.push(portContent(menuItemId));
    return Promise.all(func);
  };

  /* synchronize edited text */
  /**
   * replace content editable element text
   * @param {Object} node - editable element
   * @param {string} value - value
   * @param {string} ns - namespace URI
   * @return {void}
   */
  const replaceContent = async (node, value = "", ns = nsURI.html) => {
    if (node && node.nodeType === NODE_ELEMENT) {
      const frag = document.createDocumentFragment();
      const arr = value && value.split("\n") || [""];
      const l = arr.length;
      let i = 0;
      while (i < l) {
        frag.appendChild(document.createTextNode(arr[i]));
        i < l - 1 && ns === nsURI.html &&
          frag.appendChild(document.createElementNS(ns, "br"));
        i++;
      }
      if (node.hasChildNodes()) {
        while (node.firstChild) {
          node.removeChild(node.firstChild);
        }
      }
      node.appendChild(frag);
    }
  };

  /**
   * get target element and synchronize text
   * @param {Object} obj - sync data object
   * @return {Object} - Promise.<Array.<*>>
   */
  const syncText = async (obj = {}) => {
    const func = [];
    const {data, dataId, tabId} = obj;
    if (data && dataId && tabId === vars[TAB_ID]) {
      const {namespaceURI, timestamp} = data;
      const value = await (new TextDecoder(CHAR)).decode(obj.value) || "";
      const elm = document.activeElement;
      let isHtml = !elm.namespaceURI || elm.namespaceURI === nsURI.html,
          ns = !isHtml && nsURI.html || "", attr;
      if (elm.hasAttributeNS(ns, DATA_ATTR_ID_CTRL)) {
        const arr = (elm.getAttributeNS(ns, DATA_ATTR_ID_CTRL)).split(" ");
        for (let id of arr) {
          if (id === dataId &&
              (id = document.querySelector(`[*|${DATA_ATTR_ID}=${id}]`))) {
            isHtml = !id.namespaceURI || id.namespaceURI === nsURI.html;
            ns = !isHtml && nsURI.html || "";
            attr = isHtml && DATA_ATTR_TS || DATA_ATTR_TS_NS;
            if (!id.hasAttributeNS(ns, DATA_ATTR_TS) ||
                timestamp > id.getAttributeNS(ns, DATA_ATTR_TS) * 1) {
              id.setAttributeNS(ns, attr, timestamp);
              func.push(replaceContent(id, value, namespaceURI));
            }
            break;
          }
        }
      } else if (elm.hasAttributeNS(ns, DATA_ATTR_ID) &&
                 elm.getAttributeNS(ns, DATA_ATTR_ID) === dataId &&
                 (!elm.hasAttributeNS(ns, DATA_ATTR_TS) ||
                  timestamp > elm.getAttributeNS(ns, DATA_ATTR_TS) * 1)) {
        attr = isHtml && DATA_ATTR_TS || DATA_ATTR_TS_NS;
        elm.setAttributeNS(ns, attr, timestamp);
        if (/^(?:input|textarea)$/.test(elm.localName)) {
          elm.value = value;
        } else {
          elm.isContentEditable &&
            func.push(replaceContent(elm, value, namespaceURI));
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
    enabled: vars[KEY_EXEC_EDITOR],
  };

  /* open options key combination */
  const openOptionsKey = {
    key: vars[KEY_ACCESS],
    altKey: true,
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
    enabled: vars[KEY_OPEN_OPTIONS],
  };

  /**
   * key combination matches
   * @param {Object} evt - Event
   * @param {Object} key - KeyCombo
   * @return {boolean} - result
   */
  const keyComboMatches = async (evt, key) =>
    evt && key && key.enabled && key.key && evt.key &&
    evt.key.toLowerCase() === key.key.toLowerCase() &&
    evt.altKey === key.altKey && evt.ctrlKey === key.ctrlKey &&
    evt.metaKey === key.metaKey && evt.shiftKey === key.shiftKey || false;

  /* storage */
  /**
   * extend object items from storage
   * @param {Object} obj - object to extend items
   * @param {string} key - storage key
   * @param {number} len - default items length
   * @return {void}
   */
  const extendObjItems = async (obj, key, len = 0) => {
    if (obj && key && Object.keys(obj).length <= len) {
      let ext = await storage.get(key);
      if (ext && Object.keys(ext).length && (ext = ext[key])) {
        const items = Object.keys(ext);
        if (items && items.length > len) {
          for (const item of items) {
            obj[item] = ext[item];
          }
        }
      }
    }
  };

  /* handlers */
  /**
   * handle message
   * @param {*} msg - message
   * @return {Object} - Promise.<Array<*>>
   */
  const handleMsg = async msg => {
    const func = [];
    const items = msg && Object.keys(msg);
    if (items && items.length) {
      for (const item of items) {
        const obj = msg[item];
        switch (item) {
          case SET_VARS:
            func.push(handleMsg(obj));
            break;
          case ENABLE_ONLY_EDITABLE:
          case INCOGNITO:
          case IS_ENABLED:
            vars[item] = !!obj;
            break;
          case GET_CONTENT:
            func.push(menuClickedInfo(obj.info));
            break;
          case KEY_ACCESS:
            vars[item] = obj;
            execEditorKey.key = obj;
            openOptionsKey.key = obj;
            break;
          case KEY_EXEC_EDITOR:
            vars[item] = !!obj;
            execEditorKey.enabled = !!obj;
            break;
          case KEY_OPEN_OPTIONS:
            vars[item] = !!obj;
            openOptionsKey.enabled = !!obj;
            break;
          case PORT_FILE_PATH:
            func.push(updateTmpFileData(obj));
            obj.path && func.push(portMsg({
              [PORT_HOST]: {path: obj.path},
            }));
            break;
          case SYNC_TEXT:
            func.push(syncText(obj));
            break;
          case TAB_ID:
          case WIN_ID:
            vars[item] = obj;
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
   * @return {Object} - Promise.<void>
   */
  const handleContextMenu = async evt => {
    const elm = vars[NODE_CONTEXT] = evt.target;
    const sel = window.getSelection();
    const item = {
      [MODE_EDIT_TEXT]: {
        menuItemId: MODE_EDIT_TEXT,
        enabled: sel.isCollapsed ||
                 sel.anchorNode.parentNode === sel.focusNode.parentNode,
      },
      [MODE_SOURCE]: {
        menuItemId: MODE_SOURCE,
        mode: elm.namespaceURI === nsURI.math && MODE_MATHML ||
              elm.namespaceURI === nsURI.svg && MODE_SVG || MODE_SOURCE,
      },
    };
    return portMsg({[CONTEXT_MENU]: item}).catch(logError);
  };

  /**
   * handle keypress event
   * @param {!Object} evt - Event
   * @return {Object} - Promise.<Array.<*>>
   */
  const handleKeyPress = async evt => {
    const func = [];
    if (vars[IS_ENABLED]) {
      if (await keyComboMatches(evt, execEditorKey)) {
        if (/^(?:application\/(?:(?:[\w\-.]+\+)?(?:json|xml)|(?:(?:x-)?jav|ecm)ascript)|image\/[\w\-.]+\+xml|text\/[\w\-.]+)$/.test(document.contentType)) {
          const elm = evt.target;
          const mode = await getContextMode(elm);
          (!vars[ENABLE_ONLY_EDITABLE] || mode === MODE_EDIT_TEXT) &&
            func.push(portContent(elm, mode));
        }
      } else {
        const openOpt = await keyComboMatches(evt, openOptionsKey);
        openOpt && func.push(portMsg({[OPEN_OPTIONS]: openOpt}));
      }
    }
    return Promise.all(func).catch(logError);
  };

  /* listeners */
  port.onMessage.addListener(msg => handleMsg(msg).catch(logError));

  document.addEventListener("DOMContentLoaded", () => {
    const root = document.documentElement;
    root.addEventListener("contextmenu", handleContextMenu, false);
    root.addEventListener("keypress", handleKeyPress, false);
  }, false);

  /* startup */
  Promise.all([
    extendObjItems(fileExt, FILE_EXT, 0),
    extendObjItems(nsURI, NS_URI, NS_URI_DEFAULT_ITEMS),
  ]).catch(logError);
}
