/**
 * content.js
 */
"use strict";
{
  /* constants */
  const LABEL = "withExEditor";
  const PORT_NAME = "portContent";

  const CREATE_TMP_FILE = "createTmpFile";
  const FAIL_GET_CONTENT = "failGetContent";
  const GET_CONTENT = "getContent";
  const GET_FILE_PATH = "getFilePath";
  const PORT_FILE_PATH = "portFilePath";
  const PORT_HOST = "portHost";
  const SET_VARS = "setVars";
  const SYNC_TEXT = "syncText";

  const DATA_ATTR_ID = "data-with_ex_editor_id";
  const DATA_ATTR_ID_NS = `html:${DATA_ATTR_ID}`;
  const DATA_ATTR_ID_CTRL = `${DATA_ATTR_ID}_controls`;
  const DATA_ATTR_TS = "data-with_ex_editor_timestamp";
  const DATA_ATTR_TS_NS = `html:${DATA_ATTR_TS}`;
  const MODE_EDIT_TEXT = "modeEditText";
  const MODE_MATHML = "modeViewMathML";
  const MODE_SELECTION = "modeViewSelection";
  const MODE_SOURCE = "modeViewSource";
  const MODE_SVG = "modeViewSVG";
  const CHAR = "utf-8";
  const NS_URI = "nsURI";
  const NS_URI_DEFAULT_ITEMS = 4;
  const ELEMENT_NODE = 1;
  const TEXT_NODE = 3;

  const KEY_ACCESS = "accessKey";
  const KEY_OPEN_OPTIONS = "optionsShortCut";
  const KEY_EXEC_EDITOR = "editorShortCut";
  const EDITABLE_CONTEXT = "editableContext";
  const IS_ENABLED = "isEnabled";
  const CONTEXT_NODE = "contextNode";
  const FILE_EXT = "fileExt";
  const INCOGNITO = "incognito";
  const TAB_ID = "tabId";

  /* shortcuts */
  const i18n = browser.i18n;
  const runtime = browser.runtime;
  const storage = browser.storage.local;

  /* variables */
  const vars = {
    [KEY_ACCESS]: "e",
    [KEY_OPEN_OPTIONS]: true,
    [KEY_EXEC_EDITOR]: true,
    [EDITABLE_CONTEXT]: false,
    [IS_ENABLED]: false,
    [CONTEXT_NODE]: null,
    [INCOGNITO]: false,
    [FILE_EXT]: null,
    [TAB_ID]: ""
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
   * @return {boolean}
   */
  const isString = o =>
    o && (typeof o === "string" || o instanceof String) || false;

  /* RegExp */
  const reExt = /^(application|image|text)\/([\w\-\.]+)(?:\+(json|xml))?$/;
  const rePath = /^.*\/((?:[\w\-~!\$&'\(\)\*\+,;=:@]|%[0-9A-F]{2})+)(?:(?:\.(?:[\w\-~!\$&'\(\)\*\+,;=:@]|%[0-9A-F]{2})+)*(?:\?(?:[\w\-\.~!\$&'\(\)\*\+,;=:@\/\?]|%[0-9A-F]{2})*)?(?:#(?:[\w\-\.~!\$&'\(\)\*\+,;=:@\/\?]|%[0-9A-F]{2})*)?)?$/;
  const reType = /^(?:application\/(?:(?:[\w\-\.]+\+)?(?:json|xml)|(?:(?:x-)?jav|ecm)ascript)|image\/[\w\-\.]+\+xml|text\/[\w\-\.]+)$/;
  const reXml = /^(?:(?:application\/(?:[\w\-\.]+\+)?|image\/[\w\-\.]+\+)x|text\/(?:ht|x))ml$/;

  /* file utils */
  /**
   * get file name from URI path
   * @param {string} uri - URI
   * @param {string} subst - substitute file name
   * @return {string} - file name
   */
  const getFileNameFromURI = (uri, subst = LABEL) => {
    const file = isString(uri) && !/^data:/.test(uri) && rePath.exec(uri);
    return file && file[1] || subst;
  };

  /**
   * get file extension from media type
   * @param {string} media - media type
   * @param {string} subst - substitute file extension
   * @return {string} - file extension
   */
  const getFileExtension = (media = "text/plain", subst = "txt") => {
    let ext = reExt.exec(media);
    if (ext) {
      const type = ext[1];
      const subtype = ext[2];
      const suffix = ext[3] ||
                     type === "application" && /^(?:json|xml)$/.test(subtype) &&
                       subtype;
      ext = suffix ?
              vars[FILE_EXT][type][suffix][subtype] ||
              vars[FILE_EXT][type][suffix][suffix] :
              vars[FILE_EXT][type][subtype];
    }
    return `.${ext || subst}`;
  };

  /* class */
  /**
   * key combo class
   */
  class KeyCombo {
    /**
     * @param {Object} opt - key settings
     */
    constructor(opt = {}) {
      this._key = isString(opt.key) && opt.key.length === 1 && opt.key || "";
      this._alt = opt.alt || false;
      this._ctrl = opt.ctrl || false;
      this._meta = opt.meta || false;
      this._shift = opt.shift || false;
      this._enabled = opt.enabled || false;
    }

    /* getter / setter */
    get key() {
      return this._key;
    }
    set key(key) {
      this._key = isString(key) && key.length === 1 && key || "";
    }
    get altKey() {
      return this._alt;
    }
    set altKey(bool) {
      this._alt = !!bool;
    }
    get ctrlKey() {
      return this._ctrl;
    }
    set ctrlKey(bool) {
      this._ctrl = !!bool;
    }
    get metaKey() {
      return this._meta;
    }
    set metaKey(bool) {
      this._meta = !!bool;
    }
    get shiftKey() {
      return this._shift;
    }
    set shiftKey(bool) {
      this._shift = !!bool;
    }
    get enabled() {
      return this._enabled;
    }
    set enabled(bool) {
      this._enabled = !!bool;
    }
  }

  /* port */
  const port = runtime.connect({name: PORT_NAME});

  /**
   * port message
   * @param {*} msg - message
   * @return {void}
   */
  const portMsg = async msg => {
    Object.keys(msg).length > 0 && port.postMessage(msg);
  };

  /**
   * port temporary ID
   * @param {Object} evt - event
   * @return {void}
   */
  const portTemporaryId = evt => {
    const elm = evt && evt.target === evt.currentTarget && evt.target;
    const attr = elm && (
                   elm.hasAttributeNS("", DATA_ATTR_ID) &&
                   elm.getAttributeNS("", DATA_ATTR_ID) ||
                   elm.hasAttributeNS("", DATA_ATTR_ID_CTRL) &&
                   elm.getAttributeNS("", DATA_ATTR_ID_CTRL)
                 );
    attr && attr.split(" ").forEach(value => {
      const getTmpFile = {
        dataId: value,
        host: window.location.host,
        tabId: vars[TAB_ID]
      };
      portMsg({getTmpFile});
    });
  };

  /* get content source */
  /* namespace URI */
  const nsURI = {
    html: "http://www.w3.org/1999/xhtml",
    math: "http://www.w3.org/1998/Math/MathML",
    svg: "http://www.w3.org/2000/svg",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };

  /**
   * extend nsURI namespace items
   * @return {void}
   */
  const extendNsURI = async () => {
    if (Object.keys(nsURI).length <= NS_URI_DEFAULT_ITEMS) {
      const ns = await storage.get(NS_URI);
      if (Object.keys(ns).length > 0) {
        const items = Object.keys(ns[NS_URI]);
        if (items.length > NS_URI_DEFAULT_ITEMS) {
          for (let item of items) {
            nsURI[item] = ns[NS_URI][item];
          }
        }
      }
    }
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
      ns.name = node.localName;
      ns.uri = node.namespaceURI;
    }
    else {
      while (node && node.parentNode && !ns.node) {
        const obj = node.parentNode;
        node.namespaceURI ? (
          ns.node = node,
          ns.name = node.localName,
          ns.uri = node.namespaceURI
        ) :
        /^foreignObject$/.test(obj.localName) &&
        (obj.hasAttributeNS(nsURI.svg, "requiredExtensions") ||
         document.documentElement.localName === "html") ? (
          ns.node = node,
          ns.name = node.localName,
          ns.uri = obj.hasAttributeNS(nsURI.svg, "requiredExtensions") &&
                     obj.getAttributeNS(nsURI.svg, "requiredExtensions") ||
                     nsURI.html
        ) :
        /^(?:math|svg)$/.test(node.localName) ? (
          ns.node = node,
          ns.name = node.localName,
          ns.uri = nsURI.ns[node.localName]
        ) :
          node = obj;
      }
      !ns.node && (
        node = document.documentElement,
        ns.node = node,
        ns.name = node.localName,
        ns.uri = node.hasAttribute("xmlns") && node.getAttribute("xmlns") ||
                 nsURI[node.localName.toLowerCase()] || ""
      );
    }
    return ns;
  };

  /**
   * set attribute NS
   * @param {Object} elm - element to append attributes
   * @param {Object} node - node to get attributes from
   * @return {void}
   */
  const setAttrNS = async (elm, node) => {
    if (elm && node) {
      const nodeAttr = node.attributes;
      for (let attr of nodeAttr) {
        const prefix = attr.prefix;
        const localName = attr.localName;
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
   * @param {boolean} bool - append child nodes
   * @return {Object} - namespaced element or text node
   */
  const getElement = async (node, bool = false) => {
    /**
     * append child nodes
     * @param {Object} nodes - child nodes
     * @return {Object} - document fragment
     */
    const appendChildNodes = async nodes => {
      const fragment = document.createDocumentFragment();
      if (nodes instanceof NodeList) {
        for (let child of nodes) {
          child.nodeType === ELEMENT_NODE ? (
            child === child.parentNode.firstChild &&
              fragment.appendChild(document.createTextNode("\n")),
            child = await getElement(child, true),
            child instanceof Node && fragment.appendChild(child)
          ) :
          child.nodeType === TEXT_NODE &&
            fragment.appendChild(document.createTextNode(child.nodeValue));
        }
      }
      return fragment;
    };

    let obj;
    const prefix = node && node.prefix;
    const localName = node && node.localName;
    const elm = node && document.createElementNS(
      node.namespaceURI || prefix && nsURI[prefix] ||
      (obj = await getNodeNS(node)) && obj.uri || nsURI.html,
      prefix && `${prefix}:${localName}` || localName
    );
    const childNode = bool && node.hasChildNodes() &&
                        await appendChildNodes(node.childNodes);
    elm && (
      node.attributes && await setAttrNS(elm, node),
      childNode instanceof Node && elm.appendChild(childNode)
    );
    return elm || document.createTextNode("");
  };

  /**
   * create DOM
   * @param {Object} nodes - child nodes
   * @return {Object} - document fragment
   */
  const createDom = async nodes => {
    const fragment = document.createDocumentFragment();
    if (nodes instanceof NodeList) {
      const l = nodes.length;
      let i = 0;
      while (i < l) {
        let obj = nodes[i];
        obj.nodeType === ELEMENT_NODE ?
          (obj = await getElement(obj, true)) && obj instanceof Node && (
            i === 0 && fragment.appendChild(document.createTextNode("\n")),
            fragment.appendChild(obj),
            i === l - 1 && fragment.appendChild(document.createTextNode("\n"))
          ) :
        obj.nodeType === TEXT_NODE &&
          fragment.appendChild(document.createTextNode(obj.nodeValue));
        i++;
      }
    }
    return fragment;
  };

  /**
   * create DOM tree
   * @param {Object} elm - container element of the DOM tree
   * @param {Object} node - node containing child nodes to append
   * @return {Object} - DOM tree or text node
   */
  const getDomTree = async (elm, node = null) => {
    let child;
    elm = await getElement(elm);
    elm.nodeType === ELEMENT_NODE && node && node.hasChildNodes() &&
    (child = await createDom(node.childNodes)) &&
      elm.appendChild(child);
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
      elm = await getDomTree(elm, range.cloneContents())
    );
    return elm && elm.hasChildNodes() &&
             (new XMLSerializer()).serializeToString(elm) || null;
  };

  /**
   * create DOM from selection range
   * @param {Object} sel - selection
   * @return {?string} - serialized node string
   */
  const createDomFromSelRange = async sel => {
    let fragment = document.createDocumentFragment();
    if (sel && sel.rangeCount) {
      const l = sel.rangeCount;
      let i = 0, obj;
      while (i < l) {
        const range = sel.getRangeAt(i);
        const ancestor = range.commonAncestorContainer;
        l > 1 && fragment.appendChild(document.createTextNode("\n"));
        if (ancestor.nodeType === ELEMENT_NODE) {
          obj = await getNodeNS(ancestor);
          if (/^(?:svg|math)$/.test(obj.name)) {
            if (obj.node === document.documentElement) {
              fragment = null;
              break;
            }
            else {
              obj.node.parentNode && (
                obj = obj.node.parentNode,
                range.setStart(obj, 0),
                range.setEnd(obj, obj.childNodes.length)
              );
            }
          }
          (obj = await getDomTree(ancestor, range.cloneContents())) &&
          obj instanceof Node &&
            fragment.appendChild(obj);
        }
        else {
          ancestor.nodeType === TEXT_NODE &&
          (obj = await getElement(ancestor.parentNode)) &&
          obj instanceof Node && (
            obj.appendChild(range.cloneContents()),
            fragment.appendChild(obj)
          );
        }
        fragment.appendChild(document.createTextNode("\n"));
        l > 1 && i < l - 1 &&
          fragment.appendChild(document.createComment("Next Range"));
        i++;
      }
      l > 1 && fragment.hasChildNodes() &&
      (obj = await getElement(document.documentElement)) &&
      obj instanceof Node && (
        obj.appendChild(fragment),
        fragment = document.createDocumentFragment(),
        fragment.appendChild(obj),
        fragment.appendChild(document.createTextNode("\n"))
      );
    }
    return fragment && fragment.hasChildNodes() &&
             (new XMLSerializer()).serializeToString(fragment) || null;
  };

  /**
   * get text node
   * @param {Object} nodes - child nodes
   * @return {string} - text
   */
  const getTextNode = async nodes => {
    const arr = [];
    if (nodes instanceof NodeList) {
      for (let node of nodes) {
        node.nodeType === TEXT_NODE ?
          arr.push(node.nodeValue) :
        node.nodeType === ELEMENT_NODE && (
          node.localName === "br" ?
            arr.push("\n") :
            node.hasChildNodes() &&
            (node = await getTextNode(node.childNodes)) &&
              arr.push(node)
        );
      }
    }
    return arr.join("");
  };

  /**
   * get / create temporary ID and add listener
   * @param {Object} elm - target element
   * @return {?string} - ID
   */
  const getId = elm => {
    let id = null;
    if (elm) {
      const html = !elm.namespaceURI || elm.namespaceURI === nsURI.html;
      const ns = !html && nsURI.html || "";
      elm.hasAttributeNS(ns, DATA_ATTR_ID) ?
        id = elm.getAttributeNS(ns, DATA_ATTR_ID) : (
        id = `withExEditor${window.performance.now()}`.replace(/\./, "_"),
        !html &&
          elm.setAttributeNS(nsURI.xmlns, "xmlns:html", nsURI.html),
        elm.setAttributeNS(ns, html && DATA_ATTR_ID || DATA_ATTR_ID_NS, id),
        html && elm.addEventListener("focus", portTemporaryId, false)
      );
    }
    return id;
  };

  /**
   * node or ancestor is editable
   * @param {Object} node - element node
   * @return {boolean}
   */
  const isEditable = async node => {
    let editable = false, elm = node;
    while (elm && elm.parentNode) {
      if (typeof elm.isContentEditable === "boolean" &&
          (!elm.namespaceURI || elm.namespaceURI === nsURI.html)) {
        editable = elm.isContentEditable;
        break;
      }
      elm = elm.parentNode;
    }
    return editable;
  };

  /**
   * node content is text node
   * @param {Object} node - element node
   * @return {boolean}
   */
  const isContentTextNode = async node => {
    let isText = await isEditable(node);
    if (isText && node && node.namespaceURI &&
        node.namespaceURI !== nsURI.html && node.hasChildNodes()) {
      const nodes = node.childNodes;
      for (let child of nodes) {
        isText = child.nodeType === TEXT_NODE;
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
   * @return {boolean}
   */
  const isEditControl = elm =>
    elm && (
      /^input$/.test(elm.localName) && elm.hasAttribute("type") &&
      /^(?:(?:emai|te|ur)l|search|text)$/.test(elm.getAttribute("type")) ||
      /^textarea$/.test(elm.localName)
    ) || false;

  /**
   * get editable element from ancestor
   * @param {Object} node - node
   * @return {Object} - editable element
   */
  const getEditableElm = async node => {
    let elm = null;
    if (isEditControl(node)) {
      elm = node;
    }
    else {
      while (node && node.parentNode) {
        if (typeof node.isContentEditable === "boolean" &&
            (!node.namespaceURI || node.namespaceURI === nsURI.html)) {
          elm = node;
          break;
        }
        node = node.parentNode;
      }
    }
    return elm;
  };

  /**
   * set data attribute and add listener
   * @param {Object} elm - element
   * @return {void}
   */
  const setDataAttrs = async elm => {
    if (elm) {
      const id = getId(elm);
      const ctrl = await getEditableElm(elm);
      if (ctrl) {
        const arr = ctrl.hasAttributeNS("", DATA_ATTR_ID_CTRL) &&
                      (ctrl.getAttributeNS("", DATA_ATTR_ID_CTRL)).split(" ");
        id && (
          arr ? (
            arr.push(id),
            ctrl.setAttributeNS(
              "",
              DATA_ATTR_ID_CTRL,
              (arr.filter((v, i, o) => o.indexOf(v) === i)).join(" ")
            )
          ) : (
            ctrl.setAttributeNS("", DATA_ATTR_ID_CTRL, id),
            ctrl.addEventListener("focus", portTemporaryId, false)
          )
        );
      }
    }
  };

  /**
   * get file source
   * @param {Object} data - temporary file data
   * @return {Object}
   */
  const getSource = async data => {
    const uri = data.documentURI;
    const protocol = data.protocol;
    const type = data.contentType;
    const charset = data.charset;
    let obj;
    if (protocol === "file:") {
      obj = {
        [GET_FILE_PATH]: {uri, data}
      };
    }
    else {
      const method = "GET";
      const mode = "cors";
      const headers = new Headers();
      headers.set("Content-Type", type);
      headers.set("Charset", charset);
      obj = uri && await fetch(uri, {headers, method, mode}).then(async res => {
        const value = await res.text();
        const target = await getFileNameFromURI(uri, "index");
        const file = target + await getFileExtension(type);
        return {
          [CREATE_TMP_FILE]: {
            file, target, type,
            mode: MODE_SOURCE,
            tabId: data.tabId,
            host: data.host || LABEL
          },
          value
        };
      });
    }
    return obj || null;
  };

  /**
   * strip HTML tags and decode HTML escaped characters
   * @param {string} v - value
   * @return {string} - converted value
   */
  const convertValue = async v => {
    while (/^\n*<(?:[^>]+:)?[^>]+?>|<\/(?:[^>]+:)?[^>]+>\n*$/.test(v)) {
      v = v.replace(/^\n*<(?:[^>]+:)?[^>]+?>/, "").
            replace(/<\/(?:[^>]+:)?[^>]+>\n*$/, "\n");
    }
    return v.replace(/<\/(?:[^>]+:)?[^>]+>\n*<!\-\-[^\-]*\-\->\n*<(?:[^>]+:)?[^>]+>/g, "\n\n").
             replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  };

  /**
   * create temporary file data
   * @param {Object} data - content data
   * @return {void}
   */
  const createTmpFileData = async data => {
    const mode = data.mode;
    const host = data.host || LABEL;
    const tabId = data.tabId;
    const type = data.contentType;
    const uri = data.documentURI;
    let value = data.value, target, tmpFileData;
    switch (mode) {
      case MODE_EDIT_TEXT:
        tmpFileData = (target = data.target) && {
          [CREATE_TMP_FILE]: {
            mode, tabId, host, target,
            type: "text/plain",
            file: `${target}.txt`,
            namespace: data.namespace || ""
          },
          value
        } ||
        await getSource(data);
        break;
      case MODE_MATHML:
        tmpFileData = value && (target = getFileNameFromURI(uri, "index")) && {
          [CREATE_TMP_FILE]: {
            mode, tabId, host, target,
            type: "application/mathml+xml",
            file: `${target}.mml`
          },
          value
        } ||
        await getSource(data);
        break;
      case MODE_SELECTION:
        if (value && (target = getFileNameFromURI(uri, "index"))) {
          tmpFileData = reXml.test(type) && {
            [CREATE_TMP_FILE]: {
              mode, tabId, host, target,
              type: "application/xml",
              file: `${target}.xml`
            },
            value
          } ||
          (value = await convertValue(value).catch(logError)) && {
            [CREATE_TMP_FILE]: {
              mode, tabId, host, target, type,
              file: target + getFileExtension(type)
            },
            value
          } ||
          await getSource(data);
        }
        else {
          tmpFileData = await getSource(data);
        }
        break;
      case MODE_SVG:
        tmpFileData = value && (target = getFileNameFromURI(uri, "index")) && {
          [CREATE_TMP_FILE]: {
            mode, tabId, host, target,
            type: "image/svg+xml",
            file: `${target}.svg`
          },
          value
        } ||
        await getSource(data);
        break;
      default:
        tmpFileData = await getSource(data);
    }
    return tmpFileData ||
           Promise.reject(`${LABEL}: ${i18n.getMessage(FAIL_GET_CONTENT)}`);
  };

  /**
   * get context type
   * @param {Object} elm - element
   * @return {Object} - context type data
   */
  const getContextType = async elm => {
    const contextType = {
      mode: MODE_SOURCE,
      namespace: ""
    };
    if (elm) {
      const sel = window.getSelection();
      const anchorElm = sel.anchorNode && sel.anchorNode.parentNode;
      const modeEdit = !sel.isCollapsed && sel.rangeCount === 1 && anchorElm &&
                       anchorElm === sel.focusNode.parentNode &&
                       anchorElm !== document.documentElement &&
                       (isEditControl(anchorElm) ||
                        anchorElm.isContentEditable ||
                        await isContentTextNode(anchorElm));
      let ns = await getNodeNS(elm);
      contextType.namespace = ns.uri;
      if (sel.isCollapsed) {
        isEditControl(elm) ?
          contextType.mode = MODE_EDIT_TEXT :
        elm.isContentEditable || await isContentTextNode(elm) ?
          contextType.mode = MODE_EDIT_TEXT :
        ns.uri === nsURI.math ?
          contextType.mode = MODE_MATHML :
          ns.uri === nsURI.svg && (contextType.mode = MODE_SVG);
      }
      else if (modeEdit) {
        ns = await getNodeNS(anchorElm);
        contextType.mode = MODE_EDIT_TEXT;
        contextType.namespace = ns.uri;
      }
      else {
        contextType.mode = MODE_SELECTION;
      }
    }
    return contextType;
  };

  /**
   * get content data
   * @param {Object} elm - element
   * @return {Object} - content data
   */
  const getContent = async elm => {
    const data = {
      mode: MODE_SOURCE,
      charset: document.characterSet,
      contentType: document.contentType,
      documentURI: document.documentURI,
      host: window.location.host,
      incognito: vars[INCOGNITO],
      namespace: null,
      protocol: window.location.protocol,
      tabId: vars[TAB_ID],
      target: null,
      value: null
    };
    if (elm) {
      const contextType = await getContextType(elm);
      const sel = window.getSelection();
      const anchorElm = sel.anchorNode && sel.anchorNode.parentNode;
      let obj;
      switch (contextType.mode) {
        case MODE_EDIT_TEXT:
          if (sel.isCollapsed) {
            isEditControl(elm) && (obj = getId(elm)) ? (
              data.mode = contextType.mode,
              data.target = obj,
              data.value = elm.value || ""
            ) :
            (elm.isContentEditable || await isContentTextNode(elm)) &&
            (obj = getId(elm)) && (
              data.mode = contextType.mode,
              data.target = obj,
              data.value = elm.hasChildNodes() &&
                                 await getTextNode(elm.childNodes) || "",
              data.namespace = contextType.namespace,
              setDataAttrs(elm)
            );
          }
          else {
            (isEditControl(anchorElm) || anchorElm.isContentEditable ||
             await isContentTextNode(anchorElm)) &&
            (obj = getId(anchorElm)) && (
              data.mode = contextType.mode,
              data.target = obj,
              data.value = anchorElm.hasChildNodes() &&
                                 await getTextNode(anchorElm.childNodes) || "",
              data.namespace = contextType.namespace,
              setDataAttrs(anchorElm)
            );
          }
          break;
        case MODE_MATHML:
          sel.isCollapsed && contextType.namespace === nsURI.math &&
          (obj = await createDomXmlBased(elm, "math")) && (
            data.mode = contextType.mode,
            data.value = obj
          );
          break;
        case MODE_SVG:
          sel.isCollapsed && contextType.namespace === nsURI.svg &&
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
   * port content data
   * @param {Object} elm - element
   * @return {Object} - Promise
   */
  const portContentData = elm =>
    getContent(elm).then(createTmpFileData).then(res => {
      if (res[CREATE_TMP_FILE]) {
        portMsg({
          [CREATE_TMP_FILE]: {
            data: res[CREATE_TMP_FILE],
            value: res.value
          }
        });
      }
      else {
        res[GET_FILE_PATH] &&
          portMsg({
            [GET_FILE_PATH]: res[GET_FILE_PATH]
          });
      }
    }).catch(logError);

  /* synchronize edited text */
  /**
   * synchronize content editable element text
   * @param {Object} node - editable element
   * @param {Array} arr - array of values
   * @param {string} ns - namespace URI
   * @return {void}
   */
  const syncContentText = async (node, arr = [""], ns = nsURI.html) => {
    if (node && node.nodeType === ELEMENT_NODE && Array.isArray(arr)) {
      const fragment = document.createDocumentFragment();
      const l = arr.length;
      let i = 0;
      while (i < l) {
        fragment.appendChild(document.createTextNode(arr[i]));
        i < l - 1 && ns === nsURI.html &&
          fragment.appendChild(document.createElementNS(ns, "br"));
        i++;
      }
      if (node.hasChildNodes()) {
        while (node.firstChild) {
          node.removeChild(node.firstChild);
        }
      }
      node.appendChild(fragment);
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
      const namespace = obj.data.namespace || nsURI.html;
      const target = obj.data.target || "";
      const timestamp = obj.data.timestamp || 0;
      const value = await (new TextDecoder(CHAR)).decode(obj.value) || "";
      let html = !elm.namespaceURI || elm.namespaceURI === nsURI.html,
          ns = !html && nsURI.html || "",
          attr = html && DATA_ATTR_TS || DATA_ATTR_TS_NS;
      if (elm.hasAttributeNS(ns, DATA_ATTR_ID_CTRL)) {
        const arr = (elm.getAttributeNS(ns, DATA_ATTR_ID_CTRL)).split(" ");
        for (let id of arr) {
          if (id === target) {
            (id = document.querySelector(`[*|${DATA_ATTR_ID}=${id}]`)) && (
              html = !id.namespaceURI || id.namespaceURI === nsURI.html,
              ns = !html && nsURI.html || "",
              attr = html && DATA_ATTR_TS || DATA_ATTR_TS_NS,
              (!id.hasAttributeNS(ns, DATA_ATTR_TS) ||
               timestamp > id.getAttributeNS(ns, DATA_ATTR_TS) * 1) && (
                id.setAttributeNS(ns, attr, timestamp),
                syncContentText(id, value.split("\n"), namespace)
              )
            );
            break;
          }
        }
      }
      else {
        elm.hasAttributeNS(ns, DATA_ATTR_ID) &&
        elm.getAttributeNS(ns, DATA_ATTR_ID) === target &&
        (!elm.hasAttributeNS(ns, DATA_ATTR_TS) ||
         timestamp > elm.getAttributeNS(ns, DATA_ATTR_TS) * 1) && (
          elm.setAttributeNS(ns, attr, timestamp),
          /^(?:input|textarea)$/.test(elm.localName) ?
            elm.value = value :
          elm.isContentEditable &&
            syncContentText(elm, value.split("\n"), namespace)
        );
      }
    }
  };

  /* key combo */
  /* open options key */
  const openOptionsKey = new KeyCombo({
    key: vars[KEY_ACCESS],
    alt: true,
    ctrl: true,
    meta: false,
    shift: false,
    enabled: vars[KEY_OPEN_OPTIONS]
  });

  /* execute editor key */
  const execEditorKey = new KeyCombo({
    key: vars[KEY_ACCESS],
    alt: false,
    ctrl: true,
    meta: false,
    shift: true,
    enabled: vars[KEY_EXEC_EDITOR]
  });

  /**
   * key combination matches
   * @param {Object} evt - Event
   * @param {Object} key - KeyCombo
   * @return {boolean}
   */
  const keyComboMatches = async (evt, key) =>
    vars[IS_ENABLED] && key.enabled &&
    evt.key && evt.key.toLowerCase() === key.key.toLowerCase() &&
    evt.altKey === key.altKey && evt.ctrlKey === key.ctrlKey &&
    evt.metaKey === key.metaKey && evt.shiftKey === key.shiftKey || false;

  /* handlers */
  /**
   * handle message
   * @param {*} msg - message
   * @return {void}
   */
  const handleMsg = async msg => {
    const items = Object.keys(msg);
    if (items.length > 0) {
      for (let item of items) {
        let obj = msg[item];
        switch (item) {
          case SET_VARS:
            handleMsg(obj);
            break;
          case EDITABLE_CONTEXT:
          case INCOGNITO:
          case IS_ENABLED:
            vars[item] = !!obj;
            break;
          case GET_CONTENT:
            portContentData(vars[CONTEXT_NODE]);
            break;
          case KEY_ACCESS:
            vars[item] = obj;
            openOptionsKey.key = obj;
            execEditorKey.key = obj;
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
                path: obj.path
              }
            });
            break;
          case SYNC_TEXT:
            syncText(obj);
            break;
          case FILE_EXT:
          case TAB_ID:
            vars[item] = obj;
            break;
          default:
        }
      }
    }
  };

  /**
   * handle context menu event
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
                 sel.anchorNode.parentNode === sel.focusNode.parentNode
      },
      [MODE_SOURCE]: {
        menuItemId: MODE_SOURCE,
        mode: elm.namespaceURI === nsURI.math && MODE_MATHML ||
              elm.namespaceURI === nsURI.svg && MODE_SVG ||
              MODE_SOURCE
      }
    };
    vars[CONTEXT_NODE] = elm;
    portMsg({contextMenu});
  };

  /**
   * handle keypress event
   * @param {Object} evt - Event
   * @return {void}
   */
  const handleKeyPress = async evt => {
    const elm = evt && evt.target;
    const sel = window.getSelection();
    const openOptions = await keyComboMatches(evt, openOptionsKey);
    const execEditor = await keyComboMatches(evt, execEditorKey);
    if (openOptions) {
      portMsg({openOptions});
    }
    else {
      execEditor && elm && (
        vars[EDITABLE_CONTEXT] ?
          isEditControl(elm) || elm.isContentEditable ||
          sel.anchorNode === sel.focusNode && await isContentTextNode(elm) :
          reType.test(document.contentType)
      ) && portContentData(elm);
    }
  };

  /* add listeners */
  port.onMessage.addListener(handleMsg);

  document.addEventListener("DOMContentLoaded", () => {
    const root = document.documentElement;
    root.addEventListener("contextmenu", handleContextMenu, false);
    root.addEventListener("keypress", handleKeyPress, false);
    extendNsURI();
  }, false);
}
