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

  const CREATE_TMP_FILE = "createTmpFile";
  const GET_CONTENT = "getContent";
  const GET_FILE_PATH = "getFilePath";
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
  };

  /**
   * log error
   * @param {Object} e - Error
   * @return {boolean} - false
   */
  const logError = e => {
    e && console.error(e);
    return false;
  };

  /**
   * is string
   * @param {*} o - object to check
   * @return {boolean} - result
   */
  const isString = o =>
    o && (typeof o === "string" || o instanceof String) || false;

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

  /**
   * port temporary ID
   * @param {Object} evt - event
   * @return {void}
   */
  const portTemporaryId = async evt => {
    const elm = evt && evt.target === evt.currentTarget && evt.target;
    const attr = elm && (
                   elm.hasAttributeNS("", DATA_ATTR_ID) &&
                   elm.getAttributeNS("", DATA_ATTR_ID) ||
                   elm.hasAttributeNS("", DATA_ATTR_ID_CTRL) &&
                   elm.getAttributeNS("", DATA_ATTR_ID_CTRL)
                 );
    attr && attr.split(" ").forEach(id => {
      const getTmpFile = {
        dataId: id,
        host: window.location.host,
        tabId: vars[TAB_ID],
      };
      portMsg({getTmpFile}).catch(logError);
    });
  };

  /* get content source */
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
    const ns = {node: null, name: null, uri: null};
    if (node.namespaceURI) {
      ns.node = node;
      ns.localName = node.localName;
      ns.namespaceURI = node.namespaceURI;
    } else {
      const root = document.documentElement;
      while (node && node.parentNode && !ns.node) {
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
      !ns.node && (
        node = root,
        ns.node = node,
        ns.localName = node.localName,
        ns.namespaceURI = node.hasAttribute("xmlns") &&
                          node.getAttribute("xmlns") ||
                          nsURI[node.localName.toLowerCase()] || ""
      );
    }
    return ns;
  };

  /**
   * set namespaced attribute
   * @param {Object} elm - element to append attributes
   * @param {Object} node - node to get attributes from
   * @return {void}
   */
  const setAttributeNS = async (elm, node) => {
    const attrs = node && node.attributes;
    if (elm && node && attrs) {
      for (const attr of attrs) {
        const {prefix, localName} = attr;
        typeof node[attr.name] !== "function" && elm.setAttributeNS(
          attr.namespaceURI || prefix && nsURI[prefix] || "",
          prefix && `${prefix}:${localName}` || localName,
          attr.value
        );
      }
    }
  };

  /**
   * create namespaced element
   * @param {Object} node - element node to create element from
   * @return {Object} - namespaced element
   */
  const createElementNS = async node => {
    let elm;
    if (node) {
      const {prefix, localName} = node;
      elm = document.createElementNS(
        node.namespaceURI || prefix && nsURI[prefix] ||
        await getNodeNS(node).namespaceURI || nsURI.html,
        prefix && `${prefix}:${localName}` || localName
      );
      elm && node.attributes && await setAttributeNS(elm, node);
    }
    return elm || null;
  };

  /**
   * create document fragment
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
   * create element
   * @param {Object} node - element node to create element from
   * @param {boolean} append - append child nodes
   * @return {Object} - element or text node
   */
  const createElm = async (node, append = false) => {
    let elm;
    if (node) {
      elm = await createElementNS(node);
      if (node.hasChildNodes() && append &&
          elm && elm.nodeType === NODE_ELEMENT) {
        const nodes = node.childNodes;
        const arr = [];
        let frag;
        for (const child of nodes) {
          switch (child.nodeType) {
            case NODE_ELEMENT:
              child === child.parentNode.firstChild &&
                arr.push(document.createTextNode("\n"));
              arr.push(createElm(child, true));
              child === child.parentNode.lastChild &&
                arr.push(document.createTextNode("\n"));
              break;
            case NODE_TEXT:
              arr.push(document.createTextNode(child.nodeValue));
              break;
            default:
          }
        }
        (frag = await Promise.all(arr).then(createFrag)) &&
          elm.appendChild(frag);
      }
    }
    return elm || document.createTextNode("");
  };

  /**
   * create DOM tree
   * @param {Object} elm - container element of the DOM tree
   * @param {Object} node - node containing child nodes to append
   * @return {Object} - DOM tree or text node
   */
  const createDomTree = async (elm, node) => {
    elm = await createElm(elm);
    if (elm.nodeType === NODE_ELEMENT && node && node.hasChildNodes()) {
      const arr = [];
      const nodes = node.childNodes;
      let frag;
      if (nodes instanceof NodeList) {
        for (const child of nodes) {
          switch (child.nodeType) {
            case NODE_ELEMENT:
              child === child.parentNode.firstChild &&
                arr.push(document.createTextNode("\n"));
              arr.push(createElm(child, true));
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
      (frag = await Promise.all(arr).then(createFrag)) &&
        elm.appendChild(frag);
    }
    return elm;
  };

  /**
   * create DOM of MathML / SVG
   * @param {Object} node - element node
   * @param {string} type - math / svg
   * @return {?string} - serialized node string
   */
  const createDomXmlBased = async (node, type) => {
    let elm, range;
    while (node && node.parentNode && !elm) {
      node.localName === type && (elm = node);
      node = node.parentNode;
    }
    elm && (
      range = document.createRange(),
      range.selectNodeContents(elm),
      elm = await createDomTree(elm, range.cloneContents())
    );
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
          node && (
            node.nodeType === NODE_ELEMENT || node.nodeType === NODE_TEXT ||
            node.nodeType === NODE_COMMENT
          ) &&
            frag.appendChild(node);
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
            obj.node.parentNode && (
              obj = obj.node.parentNode,
              range.setStart(obj, 0),
              range.setEnd(obj, obj.childNodes.length)
            );
          }
          arr.push(createDomTree(ancestor, range.cloneContents()));
          break;
        case NODE_TEXT:
          obj = await createElm(ancestor.parentNode);
          obj.nodeType === NODE_ELEMENT && (
            obj.appendChild(range.cloneContents()),
            arr.push(obj)
          );
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
      l > 1 && frag && frag.hasChildNodes() &&
      (obj = await createElm(document.documentElement)) &&
      obj.nodeType === NODE_ELEMENT && (
        obj.appendChild(frag),
        frag = document.createDocumentFragment(),
        frag.appendChild(obj),
        frag.appendChild(document.createTextNode("\n"))
      );
    }
    return frag && frag.hasChildNodes() &&
             (new XMLSerializer()).serializeToString(frag) || null;
  };

  /**
   * join array
   * @param {Array} arr - array
   * @return {string} - string
   */
  const joinArr = async arr =>
    Array.isArray(arr) && (arr.map(i => i || "")).join("") || "";

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
              node.hasChildNodes() &&
                arr.push(getText(node.childNodes));
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
        id = `withExEditor${window.performance.now()}`.replace(/\./, "_");
        !isHtml && elm.setAttributeNS(nsURI.xmlns, "xmlns:html", nsURI.html);
        elm.setAttributeNS(ns, isHtml && DATA_ATTR_ID || DATA_ATTR_ID_NS, id);
        isHtml && elm.addEventListener("focus", portTemporaryId, false);
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
          ctrl.addEventListener("focus", portTemporaryId, false);
        }
      }
    }
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
      const method = "GET";
      const mode = "cors";
      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set("Charset", characterSet);
      obj = await fetch(uri, {headers, method, mode}).then(async res => {
        const target = await getFileNameFromURI(uri, "index");
        const fileName = target + await getFileExtension(contentType);
        const value = await res.text();
        return {
          [CREATE_TMP_FILE]: {
            target, fileName,
            incognito: data.incognito,
            tabId: data.tabId,
            host: data.host,
          },
          value,
        };
      });
    }
    return obj || null;
  };

  /**
   * get context type
   * @param {Object} elm - element
   * @return {Object} - context type data
   */
  const getContextType = async elm => {
    const contextType = {
      mode: MODE_SOURCE,
      namespaceURI: "",
    };
    if (elm) {
      const sel = window.getSelection();
      let ns = await getNodeNS(elm);
      contextType.namespaceURI = ns.namespaceURI;
      if (sel.isCollapsed) {
        if (elm.isContentEditable || await isEditControl(elm) ||
            await isContentTextNode(elm)) {
          contextType.mode = MODE_EDIT_TEXT;
        } else {
          switch (ns.namespaceURI) {
            case nsURI.math:
              contextType.mode = MODE_MATHML;
              break;
            case nsURI.svg:
              contextType.mode = MODE_SVG;
              break;
            default:
          }
        }
      } else {
        const parent = sel.anchorNode && sel.anchorNode.parentNode;
        if (!sel.isCollapsed && sel.rangeCount === 1 && parent &&
            parent === sel.focusNode.parentNode &&
            parent !== document.documentElement &&
            (await isEditControl(parent) || parent.isContentEditable ||
             await isContentTextNode(parent))) {
          ns = await getNodeNS(parent);
          contextType.mode = MODE_EDIT_TEXT;
          contextType.namespaceURI = ns.namespaceURI;
        } else {
          contextType.mode = MODE_SELECTION;
        }
      }
    }
    return contextType;
  };

  /**
   * create content data
   * @param {Object} elm - element
   * @return {Object} - content data
   */
  const createContentData = async elm => {
    const data = {
      mode: MODE_SOURCE,
      host: window.location.host || LABEL,
      incognito: vars[INCOGNITO],
      tabId: vars[TAB_ID],
      namespaceURI: null,
      target: null,
      value: null,
    };
    if (elm) {
      const contextType = await getContextType(elm);
      const sel = window.getSelection();
      const parent = sel.anchorNode && sel.anchorNode.parentNode;
      let obj;
      switch (contextType.mode) {
        case MODE_EDIT_TEXT:
          if (sel.isCollapsed) {
            obj = await getId(elm);
            if (obj) {
              if (await isEditControl(elm)) {
                data.mode = contextType.mode;
                data.target = obj;
                data.value = elm.value || "";
              } else if (elm.isContentEditable ||
                         await isContentTextNode(elm)) {
                data.mode = contextType.mode;
                data.target = obj;
                data.value = elm.hasChildNodes() &&
                             await getText(elm.childNodes) || "";
                data.namespaceURI = contextType.namespaceURI;
                setDataAttrs(elm);
              }
            }
          } else if ((parent.isContentEditable || await isEditControl(parent) ||
                      await isContentTextNode(parent)) &&
                     (obj = await getId(parent))) {
            data.mode = contextType.mode;
            data.target = obj;
            data.value = parent.hasChildNodes() &&
                         await getText(parent.childNodes) || "";
            data.namespaceURI = contextType.namespaceURI;
            setDataAttrs(parent);
          }
          break;
        case MODE_MATHML:
          sel.isCollapsed && contextType.namespaceURI === nsURI.math &&
          (obj = await createDomXmlBased(elm, "math")) && (
            data.mode = contextType.mode,
            data.value = obj
          );
          break;
        case MODE_SVG:
          sel.isCollapsed && contextType.namespaceURI === nsURI.svg &&
          (obj = await createDomXmlBased(elm, "svg")) && (
            data.mode = contextType.mode,
            data.value = obj
          );
          break;
        case MODE_SELECTION:
          !sel.isCollapsed && (obj = await createDomFromSelRange(sel)) && (
            data.mode = contextType.mode,
            data.value = obj
          );
          break;
        default:
      }
    }
    return data;
  };

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
   * create temporary file data
   * @param {Object} data - content data
   * @return {Object} - temporary file data
   */
  const createTmpFileData = async data => {
    const {contentType, documentURI: uri} = document;
    const {mode, incognito, tabId, host} = data;
    let {target, value} = data, fileName, tmpFileData;
    switch (mode) {
      case MODE_EDIT_TEXT:
        tmpFileData = target && {
          [CREATE_TMP_FILE]: {
            incognito, tabId, host, target,
            fileName: `${target}.txt`,
            namespaceURI: data.namespaceURI || "",
          },
          value,
        } || await fetchSource(data);
        break;
      case MODE_MATHML:
      case MODE_SVG:
        if (value && (target = await getFileNameFromURI(uri, "index"))) {
          fileName = `${target}.${mode === MODE_MATHML && "mml" || "svg"}`;
          tmpFileData = {
            [CREATE_TMP_FILE]: {incognito, tabId, host, target, fileName},
            value,
          };
        } else {
          tmpFileData = await fetchSource(data);
        }
        break;
      case MODE_SELECTION:
        target = await getFileNameFromURI(uri, "index");
        if (target && value &&
            /^(?:(?:application\/(?:[\w\-.]+\+)?|image\/[\w\-.]+\+)x|text\/(?:ht|x))ml$/.test(contentType)) {
          tmpFileData = {
            [CREATE_TMP_FILE]: {
              incognito, tabId, host, target,
              fileName: `${target}.xml`,
            },
            value,
          };
        } else if (target && value) {
          value = await convertValue(value);
          fileName = target + await getFileExtension(contentType);
          tmpFileData = {
            [CREATE_TMP_FILE]: {incognito, tabId, host, target, fileName},
            value,
          };
        } else {
          tmpFileData = await fetchSource(data);
        }
        break;
      default:
        tmpFileData = await fetchSource(data);
    }
    return tmpFileData || null;
  };

  /**
   * create content data message
   * @param {Object} res - temporary file data
   * @return {void}
   */
  const createContentDataMsg = async res => {
    res && (
      res[CREATE_TMP_FILE] ?
        portMsg({
          [CREATE_TMP_FILE]: {
            data: res[CREATE_TMP_FILE],
            value: res.value,
          },
        }).catch(logError) :
        res[GET_FILE_PATH] &&
          portMsg({[GET_FILE_PATH]: res[GET_FILE_PATH]}).catch(logError)
    );
  };

  /**
   * port content data
   * @param {Object} elm - element
   * @return {Object} - Promise.<void>
   */
  const portContentData = elm =>
    createContentData(elm).then(createTmpFileData).then(createContentDataMsg);

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
   * @return {void}
   */
  const syncText = async obj => {
    if (obj.tabId === vars[TAB_ID]) {
      const elm = document.activeElement;
      const namespaceURI = obj.data.namespaceURI || nsURI.html;
      const target = obj.data.target || "";
      const timestamp = obj.data.timestamp || 0;
      const value = await (new TextDecoder(CHAR)).decode(obj.value) || "";
      let isHtml = !elm.namespaceURI || elm.namespaceURI === nsURI.html,
          ns = !isHtml && nsURI.html || "";
      if (elm.hasAttributeNS(ns, DATA_ATTR_ID_CTRL)) {
        const arr = (elm.getAttributeNS(ns, DATA_ATTR_ID_CTRL)).split(" ");
        for (let id of arr) {
          if (id === target &&
              (id = document.querySelector(`[*|${DATA_ATTR_ID}=${id}]`))) {
            isHtml = !id.namespaceURI || id.namespaceURI === nsURI.html;
            ns = !isHtml && nsURI.html || "";
            (!id.hasAttributeNS(ns, DATA_ATTR_TS) ||
             timestamp > id.getAttributeNS(ns, DATA_ATTR_TS) * 1) && (
              id.setAttributeNS(
                ns, isHtml && DATA_ATTR_TS || DATA_ATTR_TS_NS, timestamp
              ),
              replaceContent(id, value, namespaceURI).catch(logError)
            );
            break;
          }
        }
      } else if (elm.hasAttributeNS(ns, DATA_ATTR_ID) &&
                 elm.getAttributeNS(ns, DATA_ATTR_ID) === target &&
                 (!elm.hasAttributeNS(ns, DATA_ATTR_TS) ||
                  timestamp > elm.getAttributeNS(ns, DATA_ATTR_TS) * 1)) {
        elm.setAttributeNS(
          ns, isHtml && DATA_ATTR_TS || DATA_ATTR_TS_NS, timestamp
        );
        if (/^(?:input|textarea)$/.test(elm.localName)) {
          elm.value = value;
        } else if (elm.isContentEditable) {
          replaceContent(elm, value, namespaceURI).catch(logError);
        }
      }
    }
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
    vars[IS_ENABLED] && key.enabled && key.key && evt.key &&
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
  const extObjItems = async (obj, key, len = 0) => {
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
   * @return {void}
   */
  const handleMsg = async msg => {
    const items = msg && Object.keys(msg);
    if (items && items.length) {
      for (const item of items) {
        const obj = msg[item];
        switch (item) {
          case SET_VARS:
            handleMsg(obj).catch(logError);
            break;
          case ENABLE_ONLY_EDITABLE:
          case INCOGNITO:
          case IS_ENABLED:
            vars[item] = !!obj;
            break;
          case GET_CONTENT:
            portContentData(vars[NODE_CONTEXT]).catch(logError);
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
            obj.path && portMsg({
              [PORT_HOST]: {
                path: obj.path,
              },
            }).catch(logError);
            break;
          case SYNC_TEXT:
            syncText(obj).catch(logError);
            break;
          case TAB_ID:
            vars[item] = obj;
            break;
          default:
        }
      }
    }
  };

  /**
   * handle contextmenu event
   * @param {Object} evt - Event
   * @return {void}
   */
  const handleContextMenu = async evt => {
    const elm = evt && evt.target;
    const sel = window.getSelection();
    const contextMenu = {
      [MODE_EDIT_TEXT]: {
        menuItemId: MODE_EDIT_TEXT,
        enabled: sel.isCollapsed ||
                 sel.anchorNode.parentNode === sel.focusNode.parentNode,
      },
      [MODE_SOURCE]: {
        menuItemId: MODE_SOURCE,
        mode: elm.namespaceURI === nsURI.math && MODE_MATHML ||
              elm.namespaceURI === nsURI.svg && MODE_SVG ||
              MODE_SOURCE,
      },
    };
    vars[NODE_CONTEXT] = elm;
    portMsg({contextMenu}).catch(logError);
  };

  /**
   * handle keypress event
   * @param {Object} evt - Event
   * @return {void}
   */
  const handleKeyPress = async evt => {
    const openOptions = await keyComboMatches(evt, openOptionsKey);
    if (openOptions) {
      portMsg({openOptions}).catch(logError);
    } else {
      const elm = evt && evt.target;
      const sel = window.getSelection();
      await keyComboMatches(evt, execEditorKey) && elm && (
        vars[ENABLE_ONLY_EDITABLE] && (
          elm.isContentEditable || await isEditControl(elm) ||
          sel.anchorNode === sel.focusNode && await isContentTextNode(elm)
        ) ||
        /^(?:application\/(?:(?:[\w\-.]+\+)?(?:json|xml)|(?:(?:x-)?jav|ecm)ascript)|image\/[\w\-.]+\+xml|text\/[\w\-.]+)$/.test(document.contentType)
      ) && portContentData(elm).catch(logError);
    }
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
    extObjItems(fileExt, FILE_EXT, 0),
    extObjItems(nsURI, NS_URI, NS_URI_DEFAULT_ITEMS),
  ]).catch(logError);
}
