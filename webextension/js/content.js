/**
 * content.js
 */
"use strict";
{
  /* constants */
  const GET_CONTENT = "getContent";
  const KEY_COMBO = "keyCombo";
  const NS_URI = "nsURI";
  const PORT_CONTENT = "portContent";
  const SET_VARS = "setVars";
  const SYNC_TEXT = "syncText";

  const ATTR_DATA_ID = "data-with_ex_editor_id";
  const ATTR_DATA_ID_NS = `html:${ATTR_DATA_ID}`;
  const ATTR_DATA_ID_CONTROLS = `${ATTR_DATA_ID}_controls`;
  const ATTR_DATA_TS = "data-with_ex_editor_timestamp";
  const ATTR_DATA_TS_NS = `html:${ATTR_DATA_TS}`;
  const MODE_EDIT_TEXT = "modeEditText";
  const MODE_VIEW_MATHML = "modeViewMathML";
  const MODE_VIEW_SELECTION = "modeViewSelection";
  const MODE_VIEW_SOURCE = "modeViewSource";
  const ELEMENT_NODE = 1;
  const TEXT_NODE = 3;
  const KEY = "e";
  const NS_URI_EXTEND_VALUE = 4;

  const EDITABLE_CONTEXT = "editableContext";
  const IS_ENABLED = "isEnabled";

  /* shortcut */
  const runtime = browser.runtime;

  /* port */
  const port = runtime.connect({name: PORT_CONTENT});

  /* variables */
  const vars = {
    contextNode: null,
    editableContext: false,
    isEnabled: false
  };

  /* RegExp */
  const reType = /^(?:application\/(?:(?:[\w\-\.]+\+)?(?:json|xml)|(?:(?:x-)?jav|ecm)ascript)|image\/[\w\-\.]+\+xml|text\/[\w\-\.]+)$/;

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

  /* classes */
  /* namespace URI class */
  class NsURI {
    constructor() {
      this._extended = false;
      this._ns = {
        html: "http://www.w3.org/1999/xhtml",
        math: "http://www.w3.org/1998/Math/MathML",
        svg: "http://www.w3.org/2000/svg",
        xmlns: "http://www.w3.org/2000/xmlns/"
      };
    }

    get extended() {
      return this._extended;
    }

    set extended(bool) {
      const items = Object.keys(this._ns);
      this._extended = items.length > NS_URI_EXTEND_VALUE && !!bool || false;
    }

    get ns() {
      return this._ns;
    }

    set ns(data) {
      const items = Object.keys(data);
      items.length > NS_URI_EXTEND_VALUE && (this._ns = data);
    }
  }

  /**
   * key combo class
   */
  class KeyCombo {
    /**
     * @param {Object} opt - key settings
     * @param {string} [opt.key] - key string
     * @param {boolean} [opt.alt] - altKey
     * @param {boolean} [opt.ctrl] - ctrlKey
     * @param {boolean} [opt.meta] - metaKey
     * @param {boolean} [opt.shift] - shiftKey
     * @param {boolean} [opt.enabled] - enabled
     */
    constructor(opt = {}) {
      this._key = isString(opt.key) && opt.key.length === 1 && opt.key || "";
      this._alt = opt.alt || false;
      this._ctrl = opt.ctrl || false;
      this._meta = opt.meta || false;
      this._shift = opt.shift || false;
      this._enabled = opt.enabled || false;
    }

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

  /* port message */
  /**
   * port content
   * @param {Object} msg - message
   * @return {void}
   */
  const portContent = async msg => {
    const items = Object.keys(msg);
    items.length > 0 && port.postMessage(msg);
  };

  /**
   * port context menu
   * @param {Object} evt - Event
   * @return {void}
   */
  const portContextMenu = async evt => {
    const node = evt && evt.target;
    const contextMenu = {
      node,
      nsURI: node.namespaceURI
    };
    vars.contextNode = node;
    node && port.postMessage({contextMenu});
  };

  /**
   * port temporary ID value
   * @param {Object} evt - event
   * @return {void}
   */
  const portTemporaryId = evt => {
    const elm = evt && evt.target === evt.currentTarget && evt.target;
    const attr = elm && (
                   elm.hasAttributeNS("", ATTR_DATA_ID) &&
                   elm.getAttributeNS("", ATTR_DATA_ID) ||
                   elm.hasAttributeNS("", ATTR_DATA_ID_CONTROLS) &&
                   elm.getAttributeNS("", ATTR_DATA_ID_CONTROLS)
                 );
    attr && attr.split(" ").forEach(value => {
      const syncText = {
        value
      };
      port.postMessage({syncText});
    });
  };

  /* get content */
  /* namespace URI */
  const nsURI = new NsURI();

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
        (obj.hasAttributeNS(nsURI.ns.svg, "requiredExtensions") ||
         document.documentElement.localName === "html") ? (
          ns.node = node,
          ns.name = node.localName,
          ns.uri = obj.hasAttributeNS(nsURI.ns.svg, "requiredExtensions") &&
                     obj.getAttributeNS(nsURI.ns.svg, "requiredExtensions") ||
                     nsURI.ns.html
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
                 nsURI.ns[node.localName.toLowerCase()] || ""
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
          attr.namespaceURI || prefix && nsURI.ns[prefix] || "",
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
      node.namespaceURI || prefix && nsURI.ns[prefix] ||
      (obj = await getNodeNS(node)) && obj.uri || nsURI.ns.html,
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
   * create DOM of MathML
   * @param {Object} node - element node of MathML
   * @return {?string} - serialized node string
   */
  const createDomMathML = async node => {
    let elm, range;
    while (node && node.parentNode && !elm) {
      node.localName === "math" && (elm = node);
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
   * get temporary ID / create temporary ID and add listener
   * @param {Object} elm - target element
   * @return {?string} - ID
   */
  const getId = elm => {
    let id = null;
    if (elm) {
      const html = !elm.namespaceURI || elm.namespaceURI === nsURI.ns.html;
      const ns = !html && nsURI.ns.html || "";
      elm.hasAttributeNS(ns, ATTR_DATA_ID) ?
        id = elm.getAttributeNS(ns, ATTR_DATA_ID) : (
        id = `withExEditor${window.performance.now()}`.replace(/\./, "_"),
        !html &&
          elm.setAttributeNS(nsURI.ns.xmlns, "xmlns:html", nsURI.ns.html),
        elm.setAttributeNS(ns, html && ATTR_DATA_ID || ATTR_DATA_ID_NS, id),
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
          (!elm.namespaceURI || elm.namespaceURI === nsURI.ns.html)) {
        editable = elm.isContentEditable;
        break;
      }
      elm = elm.parentNode;
    }
    if (editable) {
      const id = getId(node);
      const arr = elm.hasAttributeNS("", ATTR_DATA_ID_CONTROLS) &&
                    (elm.getAttributeNS("", ATTR_DATA_ID_CONTROLS)).split(" ");
      id && (
        arr ? (
          arr.push(id),
          elm.setAttributeNS(
            "",
            ATTR_DATA_ID_CONTROLS,
            (arr.filter((v, i, o) => o.indexOf(v) === i)).join(" ")
          )
        ) : (
          elm.setAttributeNS("", ATTR_DATA_ID_CONTROLS, id),
          elm.addEventListener("focus", portTemporaryId, false)
        )
      );
    }
    return editable;
  };

  /**
   * node content is text node
   * @param {Object} node - element node
   * @return {boolean}
   */
  const isContentTextNode = async node => {
    let isText = false;
    if (node && node.namespaceURI && node.namespaceURI !== nsURI.ns.html &&
        node.hasChildNodes()) {
      const nodes = node.childNodes;
      for (let child of nodes) {
        isText = child.nodeType === TEXT_NODE;
        if (!isText) {
          break;
        }
      }
    }
    isText && (isText = await isEditable(node));
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
   * get content data
   * @param {Object} elm - element
   * @return {Object} - content data
   */
  const getContent = async (elm = vars.contextNode) => {
    const cnt = {
      mode: MODE_VIEW_SOURCE,
      charset: window.top.document.characterSet,
      target: null,
      value: null,
      namespace: null
    };
    const sel = window.getSelection();
    const nodeNS = await getNodeNS(elm);
    let obj;
    elm && (
      sel.isCollapsed ?
        isEditControl(elm) && (obj = getId(elm)) ? (
          cnt.mode = MODE_EDIT_TEXT,
          cnt.target = obj,
          cnt.value = elm.value || ""
        ) :
        (elm.isContentEditable || await isContentTextNode(elm)) &&
        (obj = getId(elm)) ? (
          cnt.mode = MODE_EDIT_TEXT,
          cnt.target = obj,
          cnt.value = elm.hasChildNodes() &&
                      await getTextNode(elm.childNodes) || "",
          cnt.namespace = nodeNS.uri
        ) :
        nodeNS.uri === nsURI.ns.math &&
        (obj = await createDomMathML(elm)) && (
          cnt.mode = MODE_VIEW_MATHML,
          cnt.value = obj
        ) :
      (sel.anchorNode !== sel.focusNode ||
       sel.anchorNode.parentNode !== document.documentElement) && (
        sel.rangeCount === 1 &&
        (elm.isContentEditable ||
         sel.anchorNode === sel.focusNode && await isContentTextNode(elm)) &&
        (obj = getId(elm)) ? (
          cnt.mode = MODE_EDIT_TEXT,
          cnt.target = obj,
          cnt.value = elm.hasChildNodes() &&
                      await getTextNode(elm.childNodes) || "",
          cnt.namespace = nodeNS.uri
        ) :
        (obj = await createDomFromSelRange(sel)) && (
          cnt.mode = MODE_VIEW_SELECTION,
          cnt.value = obj
        )
      )
    );
    return {
      resContent: cnt
    };
  };

  /* sync edited text */
  /**
   * sync content editable element text
   * @param {Object} node - editable element
   * @param {Array} arr - array of values
   * @param {string} ns - namespace URI
   * @return {void}
   */
  const syncContentEditableText = async (node, arr = [""],
                                         ns = nsURI.html) => {
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
   * get target element and sync text
   * @param {Object} data - sync data
   * @return {void}
   */
  const syncText = async data => {
    const elm = document.activeElement;
    const namespace = data.namespace || nsURI.html;
    const target = data.target || "";
    const timestamp = data.timestamp || 0;
    const value = data.value || "";
    let html = !elm.namespaceURI || elm.namespaceURI === nsURI.html,
        ns = !html && nsURI.html || "",
        attr = html && ATTR_DATA_TS || ATTR_DATA_TS_NS;
    if (elm.hasAttributeNS(ns, ATTR_DATA_ID_CONTROLS)) {
      const arr = (elm.getAttributeNS(ns, ATTR_DATA_ID_CONTROLS)).split(" ");
      for (let id of arr) {
        if (id === target) {
          (id = document.querySelector(`[*|${ATTR_DATA_ID}=${id}]`)) && (
            html = !id.namespaceURI || id.namespaceURI === nsURI.html,
            ns = !html && nsURI.html || "",
            attr = html && ATTR_DATA_TS || `html:${ATTR_DATA_TS}`,
            (!id.hasAttributeNS(ns, ATTR_DATA_TS) ||
             timestamp > id.getAttributeNS(ns, ATTR_DATA_TS) * 1) && (
              id.setAttributeNS(ns, attr, timestamp),
              syncContentEditableText(id, value.split("\n"), namespace)
            )
          );
          break;
        }
      }
    }
    else {
      elm.hasAttributeNS(ns, ATTR_DATA_ID) &&
      elm.getAttributeNS(ns, ATTR_DATA_ID) === target &&
      (!elm.hasAttributeNS(ns, ATTR_DATA_TS) ||
       timestamp > elm.getAttributeNS(ns, ATTR_DATA_TS) * 1) && (
        elm.setAttributeNS(ns, attr, timestamp),
        /^(?:input|textarea)$/.test(elm.localName) ?
          elm.value = value :
        elm.isContentEditable &&
          syncContentEditableText(elm, value.split("\n"), namespace)
      );
    }
  };

  /* key combo */
  /* open options key */
  const openOptionsKey = new KeyCombo({
    key: KEY,
    alt: true,
    ctrl: true,
    meta: false,
    shift: false,
    enabled: true
  });

  /* execute editor key */
  const execEditorKey = new KeyCombo({
    key: KEY,
    alt: false,
    ctrl: true,
    meta: false,
    shift: true,
    enabled: true
  });

  /**
   * key combination matches
   * @param {Object} evt - Event
   * @param {Object} key - KeyCombo
   * @return {boolean}
   */
  const keyComboMatches = async (evt, key) =>
    /*vars.isEnabled &&*/ key.enabled &&
    evt.key && evt.key.toLowerCase() === key.key.toLowerCase() &&
    evt.altKey === key.altKey && evt.ctrlKey === key.ctrlKey &&
    evt.metaKey === key.metaKey && evt.shiftKey === key.shiftKey || false;

  /**
   * replace key combo props
   * @param {Object} obj - replace data
   * @return {void}
   */
  const replaceKeyCombo = async obj => {
    openOptionsKey.key = obj.key;
    execEditorKey.key = obj.key;
    openOptionsKey.enabled = !!obj.openOptions;
    execEditorKey.enabled = !!obj.execEditor;
  };

  /* handlers */
  /**
   * handle keypress event
   * @param {Object} evt - Event
   * @return {void}
   */
  const handleKeyEvt = async evt => {
    const openOptions = await keyComboMatches(evt, openOptionsKey);
    const execEditor = await keyComboMatches(evt, execEditorKey);
    if (openOptions) {
      portContent({openOptions});
    }
    else {
      const sel = window.getSelection();
      let elm = evt && evt.target;
      elm && execEditor && (
        vars.editableContext ?
          isEditControl(elm) || elm.isContentEditable ||
          sel.anchorNode === sel.focusNode && await isContentTextNode(elm) :
          reType.test(document.contentType)
      ) && (
        getContent(elm).then(portContent).catch(logError)
      );
    }
  };

  /**
   * handle message
   * @param {*} msg - message
   * @return {void}
   */
  const handleMsg = async msg => {
    const items = Object.keys(msg);
    if (items.length > 0) {
      for (let item of items) {
        const obj = msg[item];
        if (item === SET_VARS) {
          handleMsg(obj);
          break;
        }
        switch (item) {
          case EDITABLE_CONTEXT:
            vars[item] = !!obj.checked;
            break;
          case GET_CONTENT:
            getContent(vars.contextNode).then(portContent).catch(logError);
            break;
          case IS_ENABLED:
            vars[item] = !!obj;
            break;
          case KEY_COMBO:
            replaceKeyCombo(obj);
            break;
          case NS_URI:
            !nsURI.extended && (
              nsURI.ns = obj,
              nsURI.extended = true
            );
            break;
          case SYNC_TEXT:
            syncText(obj);
            break;
          default:
        }
      }
    }
  };

  /* add listeners */
  port.onMessage.addListener(handleMsg);

  document.addEventListener("DOMContentLoaded", () => {
    const root = document.documentElement;
    root.addEventListener("contextmenu", portContextMenu, false);
    root.addEventListener("keypress", handleKeyEvt, false);
  }, false);

  /* startup */
  port.postMessage({
    keyCombo: {
      key: KEY,
      openOptions: openOptionsKey.enabled,
      execEditor: execEditorKey.enabled
    },
    getNsURI: {
      extended: nsURI.extended
    }
  });
}
