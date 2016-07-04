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

  /* namespace URI */
  const nsURI = {
    extended: false,
    ns: {
      html: "http://www.w3.org/1999/xhtml",
      math: "http://www.w3.org/1998/Math/MathML",
      svg: "http://www.w3.org/2000/svg",
      xmlns: "http://www.w3.org/2000/xmlns/"
    }
  };

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
        const parent = node.parentNode;
        node.namespaceURI ? (
          ns.node = node,
          ns.name = node.localName,
          ns.uri = node.namespaceURI
        ) :
        /^foreignObject$/.test(parent.localName) &&
        (parent.hasAttributeNS(nsURI.ns.svg, "requiredExtensions") ||
         document.documentElement.localName === "html") ? (
          ns.node = node,
          ns.name = node.localName,
          ns.uri = parent.hasAttributeNS(nsURI.ns.svg, "requiredExtensions") &&
                   parent.getAttributeNS(nsURI.ns.svg, "requiredExtensions") ||
                   nsURI.ns.html
        ) :
        /^(?:math|svg)$/.test(node.localName) ? (
          ns.node = node,
          ns.name = node.localName,
          ns.uri = nsURI.ns[node.localName]
        ) :
          node = parent;
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
   * get namespace URI
   * @param {Object} node - element node or attribute node
   * @param {boolean} bool - use getNodeNS
   * @return {Object} - namespace URI data
   */
  const getNsURI = (node, bool) =>
    node && {
      namespaceURI: node.namespaceURI ||
                    node.prefix && nsURI.ns[node.prefix] ||
                    bool && getNodeNS(node).uri || ""
    } || null;

  /**
   * create element NS
   * @param {Object} elm - element
   * @return {Object} - namespaced element
   */
  const createElmNS = elm => {
    const ns = getNsURI(elm, true);
    return ns && document.createElementNS(
             ns.namespaceURI || nsURI.ns.html,
             elm.prefix ? `${elm.prefix}:${elm.localName}` : elm.localName
           );
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
        const ns = getNsURI(attr, false);
        typeof node[attr.name] !== "function" && ns && elm.setAttributeNS(
          ns.namespaceURI || "",
          attr.prefix ?
            `${attr.prefix}:${attr.localName}` : attr.localName,
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

    let elm;
    node && (elm = createElmNS(node)) && (
      node.attributes && setAttrNS(elm, node),
      bool && node.hasChildNodes() &&
        elm.appendChild(appendChildNodes(node.childNodes))
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
    elm.nodeType === 1 && node && node.hasChildNodes() &&
      elm.appendChild(createDom(node.childNodes));
    return elm;
  };

  /**
   * create DOM of MathML
   * @param {Object} node - element node of MathML
   * @return {?string} - serialized node string
   */
  const onViewMathML = node => {
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
    return elm && elm.hasChildNodes() && window.XMLSerializer ?
             (new XMLSerializer()).serializeToString(elm) : null;
  };

  /**
   * create DOM from selection range
   * @param {Object} sel - selection
   * @return {?string} - serialized node string
   */
  const onViewSelection = sel => {
    let fragment = document.createDocumentFragment();
    if (sel && sel.rangeCount) {
      const l = sel.rangeCount;
      let obj, i = 0;
      while (i < l) {
        const range = sel.getRangeAt(i);
        l > 1 && fragment.appendChild(document.createTextNode("\n"));
        if (range.commonAncestorContainer.nodeType === ELEMENT_NODE) {
          obj = getNodeNS(range.commonAncestorContainer);
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
          (obj = getDomTree(range.commonAncestorContainer,
                            range.cloneContents())) &&
          obj instanceof Node &&
            fragment.appendChild(obj);
        }
        else {
          range.commonAncestorContainer.nodeType === TEXT_NODE &&
          (obj = getElement(range.commonAncestorContainer.parentNode)) &&
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
    return fragment && fragment.hasChildNodes() && window.XMLSerializer ?
             (new XMLSerializer()).serializeToString(fragment) : null;
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
        node.nodeType === TEXT_NODE ? arr.push(node.nodeValue) :
        node.nodeType === ELEMENT_NODE && (
          node.localName === "br" ? arr.push("\n") :
          node.hasChildNodes() && arr.push(getTextNode(node.childNodes))
        );
      }
    }
    return arr.join("");
  };

  /**
   * get text node from editable content
   * @param {Object} node - node
   * @return {string} - text
   */
  const onContentEditable = node =>
    node && node.hasChildNodes() && getTextNode(node.childNodes) || "";

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
        window.self.postMessage(value);
      }
    }
  };

  /**
   * set temporary ID to the target element and set event listener
   * @param {Object} elm - target element
   * @return {?string} - ID
   */
  const getId = elm => {
    let id = null;
    if (elm) {
      const html = !elm.namespaceURI || elm.namespaceURI === nsURI.ns.html;
      const ns = html ? "" : nsURI.ns.html;
      elm.hasAttributeNS(ns, DATA_ID) ?
        id = elm.getAttributeNS(ns, DATA_ID) : (
        id = `withExEditor${window.performance.now()}`.replace(/\./, "_"),
        !html &&
          elm.setAttributeNS(nsURI.ns.xmlns, "xmlns:html", nsURI.ns.html),
        elm.setAttributeNS(ns, html ? DATA_ID : `html:${DATA_ID}`, id),
        html && elm.addEventListener("focus", postTemporaryId, false)
      );
    }
    return id;
  };

  /**
   * get isContentEditable node from ancestor
   * @param {Object} node - element node
   * @return {boolean}
   */
  const getIsContentEditableNode = node => {
    let bool = false, elm = node;
    while (elm && elm.parentNode) {
      if (typeof elm.isContentEditable === "boolean" &&
          (!elm.namespaceURI || elm.namespaceURI === nsURI.ns.html)) {
        bool = elm.isContentEditable;
        break;
      }
      elm = elm.parentNode;
    }
    if (bool) {
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
    return bool;
  };

  /**
   * node content is editable or not
   * @param {Object} node - element node
   * @return {boolean}
   */
  const nodeContentIsEditable = node => {
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
    return isText && getIsContentEditableNode(node);
  };

  /* set context menu item label */
  window.self.on("context", elm => {
    const sel = window.getSelection();
    window.self.postMessage(
      /^input$/.test(elm.localName) && elm.hasAttribute("type") &&
      /^(?:(?:emai|te|ur)l|search|text)$/.test(elm.getAttribute("type")) ||
      /^textarea$/.test(elm.localName) || elm.isContentEditable ||
      sel.anchorNode === sel.focusNode && nodeContentIsEditable(elm) ?
        EDIT_TEXT :
      sel.isCollapsed ?
      getNodeNS(elm).uri === nsURI.ns.math ?
        VIEW_MATHML :
        VIEW_SOURCE :
        VIEW_SELECTION
    );
    return true;
  });

  /* switch mode by context */
  window.self.on("click", (elm, data) => {
    const mode = {
      mode: VIEW_SOURCE,
      charset: window.top.document.characterSet,
      target: null,
      value: null,
      namespace: null
    };
    const sel = window.getSelection();
    let obj = getId(elm);
    !nsURI.extended && data && (
      nsURI.ns = JSON.parse(data),
      nsURI.extended = true
    );
    obj ?
    sel.isCollapsed ?
    /^input$/.test(elm.localName) && elm.hasAttribute("type") &&
    /^(?:(?:emai|te|ur)l|search|text)$/.test(elm.getAttribute("type")) ||
    /^textarea$/.test(elm.localName) ? (
      mode.mode = EDIT_TEXT,
      mode.target = obj,
      mode.value = elm.value || ""
    ) :
    (elm.isContentEditable || nodeContentIsEditable(elm)) && (
      mode.mode = EDIT_TEXT,
      mode.target = obj,
      mode.value = onContentEditable(elm),
      mode.namespace = getNodeNS(elm).uri
    ) :
    (sel.anchorNode !== sel.focusNode ||
     sel.anchorNode.parentNode !== document.documentElement) &&
    sel.rangeCount === 1 &&
    (elm.isContentEditable ||
     sel.anchorNode === sel.focusNode && nodeContentIsEditable(elm)) && (
      mode.mode = EDIT_TEXT,
      mode.target = obj,
      mode.value = onContentEditable(elm),
      mode.namespace = getNodeNS(elm).uri
    ) :
    sel.isCollapsed ?
    getNodeNS(elm).uri === nsURI.ns.math && (obj = onViewMathML(elm)) && (
      mode.mode = VIEW_MATHML,
      mode.value = obj
    ) :
    (obj = onViewSelection(sel)) && (
      mode.mode = VIEW_SELECTION,
      mode.value = obj
    );
    window.self.postMessage(JSON.stringify(mode));
  });
}
