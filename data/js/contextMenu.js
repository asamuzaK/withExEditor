/**
 * contextMenu.js
 */
(() => {
  "use strict";
  const VIEW_SOURCE = "ViewSource";
  const VIEW_MATHML = "ViewMathML";
  const VIEW_SELECTION = "ViewSelection";
  const EDIT_TEXT = "EditText";
  const DATA_ID = "data-with_ex_editor_id";
  const CONTROLS = `${ DATA_ID }_controls`;

  /* namespace URI, rest will be loaded on click event */
  let nsURI = {
    html: "http://www.w3.org/1999/xhtml",
    math: "http://www.w3.org/1998/Math/MathML",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };

  /**
   * get namespace of node from ancestor
   * @param {Object} node - element node
   * @return {Object} - namespace data
   */
  const getNodeNS = node => {
    const ns = { node: null, name: null, uri: null };
    if(node.namespaceURI) {
      ns.node = node;
      ns.name = node.localName;
      ns.uri = node.namespaceURI;
    }
    else {
      while(node && node.parentNode && !ns.node) {
        const parent = node.parentNode;
        switch(true) {
          case node.namespaceURI:
            ns.node = node;
            ns.name = node.localName;
            ns.uri = node.namespaceURI;
            break;
          case /^foreignObject$/.test(parent.localName) &&
               (parent.hasAttributeNS(nsURI.svg, "requiredExtensions") ||
                document.documentElement.localName === "html"):
            ns.node = node;
            ns.name = node.localName;
            ns.uri = parent.hasAttributeNS(nsURI.svg, "requiredExtensions") &&
                     parent.getAttributeNS(nsURI.svg, "requiredExtensions") ||
                     nsURI.html;
            break;
          case /^(?:math|svg)$/.test(node.localName):
            ns.node = node;
            ns.name = node.localName;
            ns.uri = nsURI[node.localName];
            break;
          default:
            node = parent;
        }
      }
      !ns.node && (
        node = document.documentElement,
        ns.node = node,
        ns.name = node.localName,
        ns.uri = node.hasAttribute("xmlns") && node.getAttribute("xmlns") ||
                 nsURI[node.localName.toLowerCase()] || null
      );
    }
    return ns;
  };

  /**
   * get namespace URI
   * @param {Object} node - element node or attribute node
   * @param {boolean} bool - use getNodeNS
   * @return {?Object} - namespace URI data
   */
  const getNsURI = (node, bool) =>
    node ? {
      namespaceURI: node.namespaceURI || node.prefix && nsURI[node.prefix] ||
                    bool && getNodeNS(node).uri || null
    } : null;

  /**
   * create element NS
   * @param {Object} elm - element
   * @return {?Object} - namespaced element
   */
  const createElmNS = elm => {
    const ns = getNsURI(elm, true);
    return ns && document.createElementNS(
      ns.namespaceURI || nsURI.html,
      elm.prefix ? `${ elm.prefix }:${ elm.localName }` : elm.localName
    );
  };

  /**
   * set attribute NS
   * @param {Object} elm - element to append attributes
   * @param {Object} node - node to get attributes from
   */
  const setAttrNS = (elm, node) => {
    if(elm && node) {
      const nodeAttr = node.attributes;
      for(let attr of nodeAttr) {
        const ns = getNsURI(attr, false);
        typeof node[attr.name] !== "function" && ns &&
          elm.setAttributeNS(
            ns.namespaceURI || null,
            attr.prefix ?
              `${ attr.prefix }:${ attr.localName }` : attr.localName,
            attr.value
          );
      }
    }
  };

  /**
   * is NodeList type
   * @param {Object} obj - object
   * @return {boolean}
   */
  const isNodeList = obj =>
    obj ? /NodeList/.test(obj.toString()) : false;

  /**
   * append child nodes
   * @param {Object} nodes - child nodes
   * @return {Object} - document fragment
   */
  const appendChildNodes = nodes => {
    const fragment = document.createDocumentFragment();
    if(isNodeList(nodes)) {
      for(let node of nodes) {
        node.nodeType === 1 ? (
          node === node.parentNode.firstChild &&
            fragment.appendChild(document.createTextNode("\n")),
          fragment.appendChild(getElement(node, true))
        ) :
        node.nodeType === 3 &&
          fragment.appendChild(document.createTextNode(node.nodeValue));
      }
    }
    return fragment;
  };

  /**
   * create namespaced element
   * @param {Object} node - element node to create element from
   * @param {boolean} bool - append child nodes
   * @return {Object} - namespaced element or text node
   */
  const getElement = (node, bool = false) => {
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
    if(isNodeList(nodes)) {
      const l = nodes.length;
      let i = 0;
      while(i < l) {
        const obj = nodes[i];
        obj.nodeType === 1 ? (
          i === 0 && fragment.appendChild(document.createTextNode("\n")),
          fragment.appendChild(getElement(obj, true)),
          i === l - 1 && fragment.appendChild(document.createTextNode("\n"))
        ) :
        obj.nodeType === 3 &&
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
    while(node && node.parentNode && !elm) {
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
    if(sel && sel.rangeCount) {
      const l = sel.rangeCount;
      let obj, i = 0;
      while(i < l) {
        const range = sel.getRangeAt(i);
        l > 1 && fragment.appendChild(document.createTextNode("\n"));
        if(range.commonAncestorContainer.nodeType === 1) {
          obj = getNodeNS(range.commonAncestorContainer);
          if(/^(?:svg|math)$/.test(obj.name)) {
            if(obj.node === document.documentElement) {
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
          fragment.appendChild(
            getDomTree(range.commonAncestorContainer, range.cloneContents())
          );
        }
        else {
          range.commonAncestorContainer.nodeType === 3 && (
            obj = getElement(range.commonAncestorContainer.parentNode),
            obj.appendChild(range.cloneContents()),
            fragment.appendChild(obj)
          );
        }
        fragment.appendChild(document.createTextNode("\n"));
        l > 1 && i < l - 1 &&
          fragment.appendChild(document.createComment("Next Range"));
        i++;
      }
      l > 1 && fragment.hasChildNodes() && (
        obj = getElement(document.documentElement),
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
    if(isNodeList(nodes)) {
      for(let node of nodes) {
        if(node.nodeType === 3) {
          arr.push(node.nodeValue);
        }
        else {
          node.nodeType === 1 && (
            node.localName === "br" ? arr.push("\n") :
            node.hasChildNodes() && arr.push(getTextNode(node.childNodes))
          );
        }
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
    node && node.hasChildNodes() ? getTextNode(node.childNodes) : "";

  /**
   * post temporary ID value
   * @param { Object } evt - event
   */
  const postTemporaryId = evt => {
    const elm = evt && evt.target === evt.currentTarget && evt.target;
    let attr = elm && (
      elm.hasAttributeNS(null, DATA_ID) && elm.getAttributeNS(null, DATA_ID) ||
      elm.hasAttributeNS(null, CONTROLS) && elm.getAttributeNS(null, CONTROLS)
    );
    if(attr) {
      attr = attr.split(" ");
      for(let value of attr) {
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
    if(elm) {
      const html = !elm.namespaceURI || elm.namespaceURI === nsURI.html;
      const ns = html ? null : nsURI.html;
      elm.hasAttributeNS(ns, DATA_ID) ?
        id = elm.getAttributeNS(ns, DATA_ID) : (
        id = `withExEditor${ window.performance.now() }`.replace(/\./, "_"),
        !html && elm.setAttributeNS(nsURI.xmlns, "xmlns:html", nsURI.html),
        elm.setAttributeNS(ns, html ? DATA_ID : `html:${ DATA_ID }`, id),
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
    while(elm && elm.parentNode) {
      if(typeof elm.isContentEditable === "boolean") {
        (bool = elm.isContentEditable);
        break;
      }
      elm = elm.parentNode;
    }
    if(bool) {
      const id = getId(node);
      if(id) {
        if(elm.hasAttributeNS(null, CONTROLS)) {
          const arr = (elm.getAttributeNS(null, CONTROLS)).split(" ");
          arr.push(id);
          elm.setAttributeNS(
            null,
            CONTROLS,
            (arr.filter((v, i, o) => o.indexOf(v) === i)).join(" ")
          );
        }
        else {
          elm.setAttributeNS(null, CONTROLS, id);
          elm.addEventListener("focus", postTemporaryId, false);
        }
      }
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
    if(node && node.namespaceURI && node.namespaceURI !== nsURI.html &&
       node.hasChildNodes()) {
      const nodes = node.childNodes;
      for(let child of nodes) {
        isText = child.nodeType === 3;
        if(!isText) {
          break;
        }
      }
    }
    return isText && getIsContentEditableNode(node);
  };

  /**
   * set context menu item label
   * @param {Object} elm - the element that triggered context menu
   * @return {boolean} - true
   */
  window.self.on("context", elm => {
    const sel = window.getSelection();
    window.self.postMessage(
      /^input$/.test(elm.localName) && elm.hasAttribute("type") &&
      /^(?:(?:emai|te|ur)l|search|text)$/.test(elm.getAttribute("type")) ||
      /^textarea$/.test(elm.localName) || elm.isContentEditable ||
      sel.anchorNode === sel.focusNode && nodeContentIsEditable(elm) ?
        EDIT_TEXT :
      sel.isCollapsed && getNodeNS(elm).uri === nsURI.math ?
        VIEW_MATHML :
      !sel.isCollapsed ?
        VIEW_SELECTION :
        VIEW_SOURCE
    );
    return true;
  });

  /**
   * switch mode by context
   * @param {Object} elm - the element that triggered context menu
   * @param {string} data - nsURI data
   */
  window.self.on("click", (elm, data) => {
    const mode = {
      mode: VIEW_SOURCE,
      charset: window.top.document.characterSet,
      target: null,
      value: null,
      namespace: null
    };
    const sel = window.getSelection();
    let obj;
    !nsURI.xul && data && (nsURI = JSON.parse(data));
    if(sel.isCollapsed) {
      (/^input$/.test(elm.localName) && elm.hasAttribute("type") &&
       /^(?:(?:emai|te|ur)l|search|text)$/.test(elm.getAttribute("type")) ||
       /^textarea$/.test(elm.localName)) && (obj = getId(elm)) ? (
        mode.mode = EDIT_TEXT,
        mode.target = obj,
        mode.value = elm.value || ""
      ) :
      (elm.isContentEditable || nodeContentIsEditable(elm)) &&
      (obj = getId(elm)) ? (
        mode.mode = EDIT_TEXT,
        mode.target = obj,
        mode.value = onContentEditable(elm),
        mode.namespace = getNodeNS(elm).uri
      ) :
      getNodeNS(elm).uri === nsURI.math && (obj = onViewMathML(elm)) && (
        mode.mode = VIEW_MATHML,
        mode.value = obj
      );
    }
    else {
      (sel.anchorNode !== sel.focusNode ||
       sel.anchorNode.parentNode !== document.documentElement) && (
        sel.rangeCount === 1 &&
        (elm.isContentEditable ||
         sel.anchorNode === sel.focusNode && nodeContentIsEditable(elm)) &&
        (obj = getId(elm)) ? (
          mode.mode = EDIT_TEXT,
          mode.target = obj,
          mode.value = onContentEditable(elm),
          mode.namespace = getNodeNS(elm).uri
        ) :
        (obj = onViewSelection(sel)) && (
          mode.mode = VIEW_SELECTION,
          mode.value = obj
        )
      );
    }
    window.self.postMessage(JSON.stringify(mode));
  });
})();
