/**
 * contextMenu.js
 */
"use strict";
{
  const VIEW_SOURCE = "ViewSource";
  const VIEW_MATHML = "ViewMathML";
  const VIEW_SELECTION = "ViewSelection";
  const EDIT_TEXT = "EditText";
  const DATA_ID = "data-with_ex_editor_id";
  const CONTROLS = `${DATA_ID}_controls`;
  const ELEMENT_NODE = 1;
  const TEXT_NODE = 3;
  const EXP_MEDIA_TYPE = /^(?:application\/(?:(?:[\w\-\.]+\+)?(?:json|xml)|(?:(?:x-)?jav|ecm)ascript)|image\/[\w\-\.]+\+xml|text\/[\w\-\.]+)$/;

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
      typeof bool === "boolean" && (this._extended = bool);
    }

    get ns() {
      return this._ns;
    }

    set ns(data) {
      const _ns = typeof data === "string" && JSON.parse(data);
      _ns && (this._ns = _ns);
    }

    /**
     * extend namespace URI data
     * @param {string} data - stringified JSON
     * @return {void}
     */
    extend(data) {
      const _ns = typeof data === "string" && JSON.parse(data);
      _ns && (
        this._ns = _ns,
        this._extended = true
      );
    }
  }

  /* namespace URI */
  const nsURI = new NsURI();

  /**
   * get namespace of node from ancestor
   * @param {Object} node - element node
   * @return {Object} - namespace data
   */
  const getNodeNS = node => {
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
  const setAttrNS = (elm, node) => {
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
  const getElement = (node, bool = false) => {
    /**
     * append child nodes
     * @param {Object} nodes - child nodes
     * @return {Object} - document fragment
     */
    const appendChildNodes = nodes => {
      const fragment = document.createDocumentFragment();
      if (nodes instanceof NodeList) {
        for (let child of nodes) {
          child.nodeType === ELEMENT_NODE ? (
            child === child.parentNode.firstChild &&
              fragment.appendChild(document.createTextNode("\n")),
            child = getElement(child, true),
            child instanceof Node && fragment.appendChild(child)
          ) :
          child.nodeType === TEXT_NODE &&
            fragment.appendChild(document.createTextNode(child.nodeValue));
        }
      }
      return fragment;
    };

    const prefix = node && node.prefix;
    const localName = node && node.localName;
    const elm = node && document.createElementNS(
      node.namespaceURI || prefix && nsURI.ns[prefix] || getNodeNS(node).uri ||
        nsURI.ns.html,
      prefix && `${prefix}:${localName}` || localName
    );
    const childNode = bool && node.hasChildNodes() &&
                        appendChildNodes(node.childNodes);
    elm && (
      node.attributes && setAttrNS(elm, node),
      childNode instanceof Node && elm.appendChild(childNode)
    );
    return elm || document.createTextNode("");
  };

  /**
   * create DOM
   * @param {Object} nodes - child nodes
   * @return {Object} - document fragment
   */
  const createDom = nodes => {
    const fragment = document.createDocumentFragment();
    if (nodes instanceof NodeList) {
      const l = nodes.length;
      let i = 0;
      while (i < l) {
        let obj = nodes[i];
        obj.nodeType === ELEMENT_NODE ?
          (obj = getElement(obj, true)) && obj instanceof Node && (
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
  const getDomTree = (elm, node = null) => {
    elm = getElement(elm);
    elm.nodeType === ELEMENT_NODE && node && node.hasChildNodes() &&
      elm.appendChild(createDom(node.childNodes));
    return elm;
  };

  /**
   * create DOM of MathML
   * @param {Object} node - element node of MathML
   * @return {?string} - serialized node string
   */
  const createDomMathML = node => {
    let elm, range;
    while (node && node.parentNode && !elm) {
      node.localName === "math" && (elm = node);
      node = node.parentNode;
    }
    elm && (
      range = document.createRange(),
      range.selectNodeContents(elm),
      elm = getDomTree(elm, range.cloneContents())
    );
    return elm && elm.hasChildNodes() &&
             (new XMLSerializer()).serializeToString(elm) || null;
  };

  /**
   * create DOM from selection range
   * @param {Object} sel - selection
   * @return {?string} - serialized node string
   */
  const createDomFromSelRange = sel => {
    let fragment = document.createDocumentFragment();
    if (sel && sel.rangeCount) {
      const l = sel.rangeCount;
      let i = 0, obj;
      while (i < l) {
        const range = sel.getRangeAt(i);
        const ancestor = range.commonAncestorContainer;
        l > 1 && fragment.appendChild(document.createTextNode("\n"));
        if (ancestor.nodeType === ELEMENT_NODE) {
          obj = getNodeNS(ancestor);
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
          (obj = getDomTree(ancestor, range.cloneContents())) &&
          obj instanceof Node &&
            fragment.appendChild(obj);
        }
        else {
          ancestor.nodeType === TEXT_NODE &&
          (obj = getElement(ancestor.parentNode)) &&
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
      (obj = getElement(document.documentElement)) && obj instanceof Node && (
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
  const getTextNode = nodes => {
    const arr = [];
    if (nodes instanceof NodeList) {
      for (let node of nodes) {
        node.nodeType === TEXT_NODE ?
          arr.push(node.nodeValue) :
        node.nodeType === ELEMENT_NODE && (
          node.localName === "br" ?
            arr.push("\n") :
            node.hasChildNodes() && arr.push(getTextNode(node.childNodes))
        );
      }
    }
    return arr.join("");
  };

  /**
   * post temporary ID value
   * @param {Object} evt - event
   * @return {void}
   */
  const postTemporaryId = evt => {
    const elm = evt && evt.target === evt.currentTarget && evt.target;
    let attr = elm && (
                 elm.hasAttributeNS("", DATA_ID) &&
                 elm.getAttributeNS("", DATA_ID) ||
                 elm.hasAttributeNS("", CONTROLS) &&
                 elm.getAttributeNS("", CONTROLS)
               );
    if (attr) {
      attr = attr.split(" ");
      for (let value of attr) {
        window.self.port.emit &&
          window.self.port.emit("syncText", value) ||
          window.self.postMessage(value);
      }
    }
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
      elm.hasAttributeNS(ns, DATA_ID) ?
        id = elm.getAttributeNS(ns, DATA_ID) : (
        id = `withExEditor${window.performance.now()}`.replace(/\./, "_"),
        !html &&
          elm.setAttributeNS(nsURI.ns.xmlns, "xmlns:html", nsURI.ns.html),
        elm.setAttributeNS(ns, html && DATA_ID || `html:${DATA_ID}`, id),
        html && elm.addEventListener("focus", postTemporaryId, false)
      );
    }
    return id;
  };

  /**
   * node or ancestor is editable
   * @param {Object} node - element node
   * @return {boolean}
   */
  const isEditable = node => {
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
      const arr = elm.hasAttributeNS("", CONTROLS) &&
                    (elm.getAttributeNS("", CONTROLS)).split(" ");
      id && (
        arr ? (
          arr.push(id),
          elm.setAttributeNS(
            "",
            CONTROLS,
            (arr.filter((v, i, o) => o.indexOf(v) === i)).join(" ")
          )
        ) : (
          elm.setAttributeNS("", CONTROLS, id),
          elm.addEventListener("focus", postTemporaryId, false)
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
  const isContentTextNode = node => {
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
    return isText && isEditable(node);
  };

  /**
   * is text edit control element
   * @param {Object} elm - element
   * @return {boolean}
   */
  const isEditControl = elm =>
   /^input$/.test(elm.localName) && elm.hasAttribute("type") &&
   /^(?:(?:emai|te|ur)l|search|text)$/.test(elm.getAttribute("type")) ||
   /^textarea$/.test(elm.localName);

  /**
   * get content
   * @param {Object} elm - element node
   * @param {Object} data - extended nsURI data
   */
  const getContent = (elm, data) => {
    const mode = {
      mode: VIEW_SOURCE,
      charset: window.top.document.characterSet,
      target: null,
      value: null,
      namespace: null
    };
    const sel = window.getSelection();
    let obj;
    !nsURI.extended && data && nsURI.extend(data);
    sel.isCollapsed ?
      isEditControl(elm) && (obj = getId(elm)) ? (
        mode.mode = EDIT_TEXT,
        mode.target = obj,
        mode.value = elm.value || ""
      ) :
      (elm.isContentEditable || isContentTextNode(elm)) &&
      (obj = getId(elm)) ? (
        mode.mode = EDIT_TEXT,
        mode.target = obj,
        mode.value = elm.hasChildNodes() && getTextNode(elm.childNodes) || "",
        mode.namespace = getNodeNS(elm).uri
      ) :
      getNodeNS(elm).uri === nsURI.ns.math && (obj = createDomMathML(elm)) && (
        mode.mode = VIEW_MATHML,
        mode.value = obj
      ) :
    (sel.anchorNode !== sel.focusNode ||
     sel.anchorNode.parentNode !== document.documentElement) && (
      sel.rangeCount === 1 &&
      (elm.isContentEditable ||
       sel.anchorNode === sel.focusNode && isContentTextNode(elm)) &&
      (obj = getId(elm)) ? (
        mode.mode = EDIT_TEXT,
        mode.target = obj,
        mode.value = elm.hasChildNodes() && getTextNode(elm.childNodes) || "",
        mode.namespace = getNodeNS(elm).uri
      ) :
      (obj = createDomFromSelRange(sel)) && (
        mode.mode = VIEW_SELECTION,
        mode.value = obj
      )
    );
    return mode;
  };

  /* switch context menu item label */
  window.self.on("context", elm => {
    const sel = window.getSelection();
    window.self.postMessage(
      isEditControl(elm) || elm.isContentEditable ||
      sel.anchorNode === sel.focusNode && isContentTextNode(elm) ?
        EDIT_TEXT :
      sel.isCollapsed ?
      getNodeNS(elm).uri === nsURI.ns.math ?
        VIEW_MATHML :
        VIEW_SOURCE :
        VIEW_SELECTION
    );
    return true;
  });

  /* get content from context-menu click */
  window.self.on("click", (elm, data) => {
    window.self.postMessage(JSON.stringify(getContent(elm, data)));
  });

  /* get content from keypress */
  window.self.port.on("keyCombo", opt => {
    const attachKeyCombo = evt => {
      const sel = window.getSelection();
      const elm = evt && evt.target;
      elm &&
      evt.key.toLowerCase() === opt.key &&
      evt.ctrlKey === opt.ctrlKey &&
      evt.altKey === opt.altKey &&
      evt.shiftKey === opt.shiftKey &&
      evt.metaKey === opt.metaKey && (
        opt.onlyEdit ?
          isEditControl(elm) || elm.isContentEditable ||
          sel.anchorNode === sel.focusNode && isContentTextNode(elm) :
          EXP_MEDIA_TYPE.test(document.contentType)
      ) &&
        window.self.port.emit(
          "pageContent",
          JSON.stringify(getContent(elm, opt.data))
        );
    };

    const elm = document.documentElement;
    elm && elm.addEventListener("keypress", attachKeyCombo, false);
  });
}
