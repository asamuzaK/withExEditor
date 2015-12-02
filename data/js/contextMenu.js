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

  /* namespace URI */
  const nsURI = {
    ag: "http://purl.org/rss/1.0/modules/aggregation/",
    annotate: "http://purl.org/rss/1.0/modules/annotate/",
    app: "http://www.w3.org/2007/app",
    atom: "http://www.w3.org/2005/Atom",
    cc: "http://creativecommons.org/ns#",
    cnt: "http://www.w3.org/2008/content#",
    company: "http://purl.org/rss/1.0/modules/company",
    content: "http://purl.org/rss/1.0/modules/content/",
    csvw: "http://www.w3.org/ns/csvw#",
    ctag: "http://commontag.org/ns#",
    dc: "http://purl.org/dc/terms/",
    dc11: "http://purl.org/dc/elements/1.1/",
    dcat: "http://www.w3.org/ns/dcat#",
    dcterms: "http://purl.org/dc/terms/",
    earl: "http://www.w3.org/ns/earl#",
    em: "http://www.mozilla.org/2004/em-rdf#",
    email: "http://purl.org/rss/1.0/modules/email/",
    ev: "http://www.w3.org/2001/xml-events",
    fh: "http://purl.org/syndication/history/1.0",
    foaf: "http://xmlns.com/foaf/0.1/",
    geo: "http://www.w3.org/2003/01/geo/wgs84_pos#",
    gr: "http://purl.org/goodrelations/v1#",
    grddl: "http://www.w3.org/2003/g/data-view#",
    ht: "http://www.w3.org/2006/http#",
    html: "http://www.w3.org/1999/xhtml",
    ical: "http://www.w3.org/2002/12/cal/icaltzd#",
    image: "http://purl.org/rss/1.0/modules/image/",
    itms: "http://phobos.apple.com/rss/1.0/modules/itms/",
    itunes: "http://www.itunes.com/dtds/podcast-1.0.dtd",
    l: "http://purl.org/rss/1.0/modules/link/",
    ma: "http://www.w3.org/ns/ma-ont#",
    math: "http://www.w3.org/1998/Math/MathML",
    oa: "http://www.w3.org/ns/oa#",
    og: "http://ogp.me/ns#",
    org: "http://www.w3.org/ns/org#",
    owl: "http://www.w3.org/2002/07/owl#",
    prov: "http://www.w3.org/ns/prov#",
    ptr: "http://www.w3.org/2009/pointers#",
    qb: "http://purl.org/linked-data/cube#",
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    rdfa: "http://www.w3.org/ns/rdfa#",
    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
    rev: "http://purl.org/stuff/rev#",
    rif: "http://www.w3.org/2007/rif#",
    rr: "http://www.w3.org/ns/r2rml#",
    rss1: "http://purl.org/rss/1.0/",
    rss11: "http://purl.org/net/rss1.1#",
    schema: "http://schema.org/",
    sd: "http://www.w3.org/ns/sparql-service-description#",
    search: "http://purl.org/rss/1.0/modules/search/",
    sioc: "http://rdfs.org/sioc/ns#",
    skos: "http://www.w3.org/2004/02/skos/core#",
    skosxl: "http://www.w3.org/2008/05/skos-xl#",
    slash: "http://purl.org/rss/1.0/modules/slash/",
    ss: "http://purl.org/rss/1.0/modules/servicestatus/",
    sub: "http://purl.org/rss/1.0/modules/subscription/",
    svg: "http://www.w3.org/2000/svg",
    sy: "http://purl.org/rss/1.0/modules/syndication/",
    taxo: "http://purl.org/rss/1.0/modules/taxonomy/",
    thr: "http://purl.org/syndication/thread/1.0",
    v: "http://rdf.data-vocabulary.org/#",
    vcard: "http://www.w3.org/2006/vcard/ns#",
    void: "http://rdfs.org/ns/void#",
    wdr: "http://www.w3.org/2007/05/powder#",
    wdrs: "http://www.w3.org/2007/05/powder-s#",
    wiki: "http://purl.org/rss/1.0/modules/wiki/",
    xbl: "http://www.mozilla.org/xbl",
    xhv: "http://www.w3.org/1999/xhtml/vocab#",
    xi: "http://www.w3.org/2001/XInclude",
    xhtml: "http://www.w3.org/1999/xhtml",
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/",
    xsd: "http://www.w3.org/2001/XMLSchema#",
    xsl: "http://www.w3.org/1999/XSL/Transform",
    xul: "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
  };

  /**
   * get namespace of node from ancestor
   * @param {Object} node - element node
   * @return {Object} - namespace data
   */
  const getNodeNS = node => {
    const ns = {
      node: null,
      name: null,
      uri: null
    };
    if(node.namespaceURI) {
      ns.node = node;
      ns.name = node.localName;
      ns.uri = node.namespaceURI;
    }
    else {
      while(node && node.parentNode && !ns.node) {
        switch(true) {
          case node.namespaceURI:
            ns.node = node;
            ns.name = node.localName;
            ns.uri = node.namespaceURI;
            break;
          case /^foreignObject$/.test(node.parentNode.localName) &&
               (node.parentNode.hasAttributeNS(nsURI.svg, "requiredExtensions") ||
                document.documentElement.localName === "html"):
            ns.node = node;
            ns.name = node.localName;
            ns.uri = node.parentNode.hasAttributeNS(nsURI.svg, "requiredExtensions") ?
              node.parentNode.getAttributeNS(nsURI.svg, "requiredExtensions") :
              nsURI.html;
            break;
          case /^(?:math|svg)$/.test(node.localName):
            ns.node = node;
            ns.name = node.localName;
            ns.uri = nsURI[node.localName];
            break;
          default:
        }
        node = node.parentNode;
      }
      !ns.node && (
        node = document.documentElement,
        ns.node = node,
        ns.name = node.localName,
        ns.uri = node.hasAttribute("xmlns") ?
          node.getAttribute("xmlns") : nsURI[node.localName.toLowerCase()] ?
          nsURI[node.localName.toLowerCase()] : null
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
      namespaceURI: node.namespaceURI ?
        node.namespaceURI : node.prefix && nsURI[node.prefix] ?
        nsURI[node.prefix] : bool ? getNodeNS(node).uri : null
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
      elm.prefix ?
        `${ elm.prefix }:${ elm.localName }` : elm.localName
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
            ns.namespaceURI || "",
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
      if(isNodeList(nodes)) {
        for(let node of nodes) {
          node.nodeType === 1 ? (
            node === node.parentNode.firstChild &&
              fragment.appendChild(document.createTextNode("\n")),
            fragment.appendChild(getElement(node, true))
          ) : node.nodeType === 3 &&
            fragment.appendChild(document.createTextNode(node.nodeValue));
        }
      }
      return fragment;
    };

    let elm;
    node && (
      elm = createElmNS(node),
      elm && (
        node.attributes && setAttrNS(elm, node),
        bool && node.hasChildNodes() &&
          elm.appendChild(appendChildNodes(node.childNodes))
      )
    );
    return elm ? elm : document.createTextNode("");
  };

  /**
   * create DOM tree
   * @param {Object} elm - container element of the DOM tree
   * @param {Object} node - node containing child nodes to append
   * @return {Object} - DOM tree or text node
   */
  const getDomTree = (elm, node = null) => {
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
            i === 0 &&
              fragment.appendChild(document.createTextNode("\n")),
            fragment.appendChild(getElement(obj, true)),
            i === l - 1 &&
              fragment.appendChild(document.createTextNode("\n"))
          ) : obj.nodeType === 3 &&
            fragment.appendChild(document.createTextNode(obj.nodeValue));
          i++;
        }
      }
      return fragment;
    };

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
   * get text node from editable content
   * @param {Object} node - node
   * @return {string} - text
   */
  const onContentEditable = node => {
    /**
     * get text node
     * @param {Object} nodes - child nodes
     * @return {string} - text
     */
    const getTextNode = nodes => {
      const array = [];
      if(isNodeList(nodes)) {
        for(let node of nodes) {
          switch(true) {
            case node.nodeType === 3:
              array.push(node.nodeValue);
              break;
            case node.nodeType === 1 && node.localName === "br":
              array.push("\n");
              break;
            case node.nodeType === 1 && node.hasChildNodes():
              array.push(getTextNode(node.childNodes));
              break;
            default:
          }
        }
      }
      return array.length > 0 ? array.join("") : "";
    };
    return node && node.hasChildNodes() ? getTextNode(node.childNodes) : "";
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
          html && elm.addEventListener("focus", evt => {
            evt && evt.currentTarget === elm &&
              self.postMessage(evt.target.getAttributeNS(ns, DATA_ID));
          }, false)
        );
    }
    return id;
  };

  /**
   * node content is editable or not
   * @param {Object} node - element node
   * @return {boolean}
   */
  const nodeContentIsEditable = node => {
    /**
     * set controller of content editable node
     * @param {object} elm - controller element
     * @param {string} id - ID of the content editable node
     */
    const setController = (elm, id) => {
      if(elm && id) {
        if(elm.hasAttributeNS(null, `${ DATA_ID }_controls`)) {
          const arr = (
            elm.getAttributeNS(null, `${ DATA_ID }_controls`)
          ).split(" ");
          arr.push(id);
          elm.setAttributeNS(
            null,
            `${ DATA_ID }_controls`,
            (arr.filter((v, i, o) => o.indexOf(v) === i)).join(" ")
          );
        }
        else {
          elm.setAttributeNS(null, `${ DATA_ID }_controls`, id)
          elm.addEventListener("focus", evt => {
            if(evt && evt.currentTarget === elm) {
              let attr = elm.getAttributeNS(null, `${ DATA_ID }_controls`);
              if(/\s/.exec(attr)) {
                let i = 0, l;
                attr = attr.split(" ");
                l = attr.length;
                while(i < l) {
                  self.postMessage(attr[i]);
                  i++;
                }
              }
              else {
                self.postMessage(attr);
              }
            }
          }, false)
        }
      }
    };

    /**
     * get isContentEditable node from ancestor
     * @return {boolean}
     */
    const getIsContentEditableNode = () => {
      let bool = false, elm = node;
      while(elm) {
        if(typeof elm.isContentEditable === "boolean" &&
           (!elm.namespaceURI || elm.namespaceURI === nsURI.html)) {
          bool = elm.isContentEditable;
          bool && setController(elm, getId(node));
          break;
        }
        if(elm.parentNode) {
          elm = elm.parentNode;
        }
        else {
          break;
        }
      }
      return bool;
    };

    let isText = false;
    if(node && node.namespaceURI && node.namespaceURI !== nsURI.html &&
       node.hasChildNodes()) {
      const l = node.childNodes.length;
      let i = 0;
      while(i < l) {
        isText = node.childNodes[i].nodeType === 3 ? true : false;
        if(!isText) {
          break;
        }
        i++;
      }
    }
    return isText && getIsContentEditableNode();
  };

  /**
   * set context menu item label
   * @param {Object} elm - the element that triggered context menu
   * @return {boolean} - true
   */
  self.on("context", elm => {
    const sel = window.getSelection();
    let label;
    switch(true) {
      case /^input$/.test(elm.localName) && elm.hasAttribute("type") &&
           /^(?:(?:emai|te|ur)l|search|text)$/.test(elm.getAttribute("type")) ||
           /^textarea$/.test(elm.localName) || elm.isContentEditable ||
           sel.anchorNode === sel.focusNode && nodeContentIsEditable(elm):
        label = EDIT_TEXT;
        break;
      case sel.isCollapsed && getNodeNS(elm).uri === nsURI.math:
        label = VIEW_MATHML;
        break;
      case !sel.isCollapsed:
        label = VIEW_SELECTION;
        break;
      default:
        label = VIEW_SOURCE;
    }
    self.postMessage(label);
    return true;
  });

  /**
   * switch mode by context
   * @param {Object} elm - the element that triggered context menu
   */
  self.on("click", elm => {
    const mode = {
      mode: VIEW_SOURCE,
      charset: window.top.document.characterSet,
      target: null,
      value: null,
      namespace: null
    };
    const sel = window.getSelection();
    let obj;
    if(sel.isCollapsed) {
      switch(true) {
        case /^input$/.test(elm.localName) && elm.hasAttribute("type") &&
             /^(?:(?:emai|te|ur)l|search|text)$/.test(elm.getAttribute("type")) ||
             /^textarea$/.test(elm.localName):
          obj = getId(elm);
          obj && (
            mode.mode = EDIT_TEXT,
            mode.target = obj,
            mode.value = elm.value ? elm.value : ""
          );
          break;
        case elm.isContentEditable || nodeContentIsEditable(elm):
          obj = getId(elm);
          obj && (
            mode.mode = EDIT_TEXT,
            mode.target = obj,
            mode.value = onContentEditable(elm),
            mode.namespace = getNodeNS(elm).uri
          );
          break;
        case getNodeNS(elm).uri === nsURI.math:
          obj = onViewMathML(elm);
          obj && (
            mode.mode = VIEW_MATHML,
            mode.value = obj
          );
          break;
        default:
      }
    }
    else {
      switch(true) {
        case sel.anchorNode === sel.focusNode &&
             sel.anchorNode.parentNode === document.documentElement:
          break;
        case sel.rangeCount === 1 &&
             (elm.isContentEditable ||
              sel.anchorNode === sel.focusNode && nodeContentIsEditable(elm)):
          obj = getId(elm);
          obj && (
            mode.mode = EDIT_TEXT,
            mode.target = obj,
            mode.value = onContentEditable(elm),
            mode.namespace = getNodeNS(elm).uri
          );
          break;
        default:
          obj = onViewSelection(sel);
          obj && (
            mode.mode = VIEW_SELECTION,
            mode.value = obj
          );
      }
    }
    self.postMessage(JSON.stringify(mode));
  });
})();
