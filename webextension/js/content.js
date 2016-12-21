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
  const NODE_ELEMENT = 1;
  const NODE_TEXT = 3;

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

  /* shortcuts */
  const i18n = browser.i18n;
  const runtime = browser.runtime;
  const storage = browser.storage.local;

  /* variables */
  const vars = {
    [IS_ENABLED]: false,
    [KEY_ACCESS]: "e",
    [KEY_EXEC_EDITOR]: true,
    [KEY_OPEN_OPTIONS]: true,
    [ENABLE_ONLY_EDITABLE]: false,
    [INCOGNITO]: false,
    [NODE_CONTEXT]: null,
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
  const getFileNameFromURI = async (uri, subst = LABEL) => {
    const name = isString(uri) && !/^data:/.test(uri) && rePath.exec(uri);
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
    let ext = reExt.exec(media);
    if (ext) {
      const type = ext[1];
      const subtype = ext[2];
      const suffix = ext[3] ||
                     type === "application" && /^(?:json|xml)$/.test(subtype) &&
                       subtype;
      const items = fileExt[type];
      if (items) {
        const item = suffix && items[suffix];
        ext = item && (item[subtype] || item[suffix]) || items[subtype];
      }
      else {
        ext = subst;
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
        tabId: vars[TAB_ID]
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
    xmlns: "http://www.w3.org/2000/xmlns/"
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
    }
    else {
      while (node && node.parentNode && !ns.node) {
        if (node.namespaceURI) {
          ns.node = node;
          ns.localName = node.localName;
          ns.namespaceURI = node.namespaceURI;
        }
        else if (/^(?:math|svg)$/.test(node.localName)) {
          ns.node = node;
          ns.localName = node.localName;
          ns.namespaceURI = nsURI.ns[node.localName];
        }
        else {
          const obj = node.parentNode;
          if (/^foreignObject$/.test(obj.localName) &&
              (obj.hasAttributeNS(nsURI.svg, "requiredExtensions") ||
               document.documentElement.localName === "html")) {
            ns.node = node;
            ns.localName = node.localName;
            ns.namespaceURI = obj.hasAttributeNS(nsURI.svg,
                                                 "requiredExtensions") &&
                              obj.getAttributeNS(nsURI.svg,
                                                 "requiredExtensions") ||
                              nsURI.html;
          }
          else {
            node = obj;
          }
        }
      }
      !ns.node && (
        node = document.documentElement,
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
    if (elm && node) {
      const attrs = node.attributes;
      for (let attr of attrs) {
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
   * @return {Object} - namespaced element
   */
  const createElementNS = async node => {
    const prefix = node && node.prefix;
    const localName = node && node.localName;
    const elm = node && document.createElementNS(
      node.namespaceURI || prefix && nsURI[prefix] ||
      await getNodeNS(node).namespaceURI || nsURI.html,
      prefix && `${prefix}:${localName}` || localName
    );
    elm && node.attributes && await setAttributeNS(elm, node);
    return elm || null;
  };

  /**
   * create element
   * @param {Object} node - element node to create element from
   * @param {boolean} append - append child nodes
   * @return {Object} - Promise, returns element or text node on fulfill
   */
  const createElm = (node, append = false) =>
    createElementNS(node).then(async elm => {
      if (append && node && node.hasChildNodes() &&
          elm && elm.nodeType === NODE_ELEMENT) {
        const fragment = document.createDocumentFragment();
        const nodes = node.childNodes;
        for (let child of nodes) {
          if (child.nodeType === NODE_ELEMENT) {
            child === child.parentNode.firstChild &&
              fragment.appendChild(document.createTextNode("\n"));
            fragment.appendChild(await createElm(child, true));
          }
          else {
            child.nodeType === NODE_TEXT &&
              fragment.appendChild(document.createTextNode(child.nodeValue));
          }
        }
        elm.appendChild(fragment);
      }
      return elm || document.createTextNode("");
    });

  /**
   * create DOM
   * @param {Object} nodes - child nodes
   * @return {Object} - document fragment
   */
  const createDom = async nodes => {
    const fragment = document.createDocumentFragment();
    if (nodes instanceof NodeList) {
      for (let node of nodes) {
        if (node.nodeType === NODE_ELEMENT) {
          node === node.parentNode.firstChild &&
            fragment.appendChild(document.createTextNode("\n"));
          fragment.appendChild(await createElm(node, true));
          node === node.parentNode.lastChild &&
            fragment.appendChild(document.createTextNode("\n"));
        }
        else {
          node.nodeType === NODE_TEXT &&
            fragment.appendChild(document.createTextNode(node.nodeValue));
        }
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
  const createDomTree = async (elm, node = null) => {
    let child;
    elm = await createElm(elm);
    elm.nodeType === NODE_ELEMENT && node && node.hasChildNodes() &&
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
      elm = await createDomTree(elm, range.cloneContents())
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
        if (ancestor.nodeType === NODE_ELEMENT) {
          obj = await getNodeNS(ancestor);
          if (/^(?:svg|math)$/.test(obj.localName)) {
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
          fragment.appendChild(
            await createDomTree(ancestor, range.cloneContents())
          );
        }
        else {
          ancestor.nodeType === NODE_TEXT &&
          (obj = await createElm(ancestor.parentNode)) &&
          obj.nodeType === NODE_ELEMENT && (
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
      (obj = await createElm(document.documentElement)) &&
      obj.nodeType === NODE_ELEMENT && (
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
        if (node.nodeType === NODE_ELEMENT) {
          if (node.localName === "br") {
            arr.push("\n");
          }
          else {
            node.hasChildNodes() &&
            (node = await getTextNode(node.childNodes)) &&
              arr.push(node);
          }
        }
        else {
          node.nodeType === NODE_TEXT && arr.push(node.nodeValue);
        }
      }
    }
    return arr.join("");
  };

  /**
   * get / create temporary ID and add listener
   * @param {Object} elm - target element
   * @return {?string} - ID
   */
  const getId = async elm => {
    let id = null;
    if (elm) {
      const isHtml = !elm.namespaceURI || elm.namespaceURI === nsURI.html;
      const ns = !isHtml && nsURI.html || "";
      if (elm.hasAttributeNS(ns, DATA_ATTR_ID)) {
        id = elm.getAttributeNS(ns, DATA_ATTR_ID);
      }
      else {
        id = `withExEditor${window.performance.now()}`.replace(/\./, "_");
        !isHtml && elm.setAttributeNS(nsURI.xmlns, "xmlns:html", nsURI.html);
        elm.setAttributeNS(ns, isHtml && DATA_ATTR_ID || DATA_ATTR_ID_NS, id);
        isHtml && elm.addEventListener("focus", portTemporaryId, false);
      }
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
   * @return {boolean}
   */
  const isEditControl = async elm =>
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
    if (await isEditControl(node)) {
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
      const id = await getId(elm);
      const ctrl = await getEditableElm(elm);
      if (id && ctrl) {
        const arr = ctrl.hasAttributeNS("", DATA_ATTR_ID_CTRL) &&
                      (ctrl.getAttributeNS("", DATA_ATTR_ID_CTRL)).split(" ");
        if (arr) {
          arr.push(id);
          ctrl.setAttributeNS(
            "",
            DATA_ATTR_ID_CTRL,
            (arr.filter((v, i, o) => o.indexOf(v) === i)).join(" ")
          );
        }
        else {
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
    const uri = document.documentURI;
    let obj;
    if (window.location.protocol === "file:") {
      obj = {
        [GET_FILE_PATH]: {uri}
      };
    }
    else {
      const contentType = document.contentType;
      const method = "GET";
      const mode = "cors";
      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set("Charset", document.characterSet);
      obj = await fetch(uri, {headers, method, mode}).then(async res => {
        const target = await getFileNameFromURI(uri, "index");
        const fileName = target + await getFileExtension(contentType);
        const value = await res.text();
        return {
          [CREATE_TMP_FILE]: {
            target, fileName,
            incognito: data.incognito,
            tabId: data.tabId,
            host: data.host
          },
          value
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
      namespaceURI: ""
    };
    if (elm) {
      const sel = window.getSelection();
      const anchorElm = sel.anchorNode && sel.anchorNode.parentNode;
      const modeEdit = !sel.isCollapsed && sel.rangeCount === 1 && anchorElm &&
                       anchorElm === sel.focusNode.parentNode &&
                       anchorElm !== document.documentElement &&
                       (await isEditControl(anchorElm) ||
                        anchorElm.isContentEditable ||
                        await isContentTextNode(anchorElm));
      let ns = await getNodeNS(elm);
      contextType.namespaceURI = ns.namespaceURI;
      if (sel.isCollapsed) {
        if (ns.namespaceURI === nsURI.math) {
          contextType.mode = MODE_MATHML;
        }
        else if (ns.namespaceURI === nsURI.svg) {
          contextType.mode = MODE_SVG;
        }
        else {
          elm.isContentEditable || await isEditControl(elm) ||
          await isContentTextNode(elm) &&
            (contextType.mode = MODE_EDIT_TEXT);
        }
      }
      else if (modeEdit) {
        ns = await getNodeNS(anchorElm);
        contextType.mode = MODE_EDIT_TEXT;
        contextType.namespaceURI = ns.namespaceURI;
      }
      else {
        contextType.mode = MODE_SELECTION;
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
            if (await isEditControl(elm) && (obj = await getId(elm))) {
              data.mode = contextType.mode;
              data.target = obj;
              data.value = elm.value || "";
            }
            else {
              (elm.isContentEditable || await isContentTextNode(elm)) &&
              (obj = await getId(elm)) && (
                data.mode = contextType.mode,
                data.target = obj,
                data.value = elm.hasChildNodes() &&
                               await getTextNode(elm.childNodes) || "",
                data.namespaceURI = contextType.namespaceURI,
                setDataAttrs(elm)
              );
            }
          }
          else {
            (await isEditControl(anchorElm) || anchorElm.isContentEditable ||
             await isContentTextNode(anchorElm)) &&
            (obj = await getId(anchorElm)) && (
              data.mode = contextType.mode,
              data.target = obj,
              data.value = anchorElm.hasChildNodes() &&
                             await getTextNode(anchorElm.childNodes) || "",
              data.namespaceURI = contextType.namespaceURI,
              setDataAttrs(anchorElm)
            );
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
      v = v.replace(/^\n*<(?:[^>]+:)?[^>]+?>/, "").
            replace(/<\/(?:[^>]+:)?[^>]+>\n*$/, "\n");
    }
    return v.replace(/<\/(?:[^>]+:)?[^>]+>\n*<!\-\-[^\-]*\-\->\n*<(?:[^>]+:)?[^>]+>/g, "\n\n").
             replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  };

  /**
   * create temporary file data
   * @param {Object} data - content data
   * @return {Object} - temporary file data
   */
  const createTmpFileData = async data => {
    const mode = data.mode;
    const incognito = data.incognito;
    const tabId = data.tabId;
    const host = data.host;
    const contentType = document.contentType;
    const uri = document.documentURI;
    let value = data.value, target, fileName, tmpFileData;
    switch (mode) {
      case MODE_EDIT_TEXT:
        target = data.target;
        if (target) {
          tmpFileData = {
            [CREATE_TMP_FILE]: {
              incognito, tabId, host, target,
              fileName: `${target}.txt`,
              namespaceURI: data.namespaceURI || ""
            },
            value
          };
        }
        else {
          tmpFileData = await fetchSource(data);
        }
        break;
      case MODE_MATHML:
      case MODE_SVG:
        if (value && (target = await getFileNameFromURI(uri, "index"))) {
          fileName = `${target}.${mode === MODE_MATHML && "mml" || "svg"}`;
          tmpFileData = {
            [CREATE_TMP_FILE]: {incognito, tabId, host, target, fileName},
            value
          };
        }
        else {
          tmpFileData = await fetchSource(data);
        }
        break;
      case MODE_SELECTION:
        target = await getFileNameFromURI(uri, "index");
        if (target && value && reXml.test(contentType)) {
          tmpFileData = {
            [CREATE_TMP_FILE]: {
              incognito, tabId, host, target,
              fileName: `${target}.xml`
            },
            value
          };
        }
        else if (target && value) {
          value = await convertValue(value);
          fileName = target + await getFileExtension(contentType);
          tmpFileData = {
            [CREATE_TMP_FILE]: {incognito, tabId, host, target, fileName},
            value
          };
        }
        else {
          tmpFileData = await fetchSource(data);
        }
        break;
      default:
        tmpFileData = await fetchSource(data);
    }
    return tmpFileData ||
           Promise.reject(`${LABEL}: ${i18n.getMessage(FAIL_GET_CONTENT)}`);
  };

  /**
   * create content data message
   * @param {Object} res - temporary file data
   * @return {void}
   */
  const createContentDataMsg = async res => {
    if (res[CREATE_TMP_FILE]) {
      portMsg({
        [CREATE_TMP_FILE]: {
          data: res[CREATE_TMP_FILE],
          value: res.value
        }
      }).catch(logError);
    }
    else {
      res[GET_FILE_PATH] &&
        portMsg({[GET_FILE_PATH]: res[GET_FILE_PATH]}).catch(logError);
    }
  };

  /**
   * port content data
   * @param {Object} elm - element
   * @return {Object} - Promise
   */
  const portContentData = elm =>
    createContentData(elm).then(createTmpFileData).then(createContentDataMsg);

  /* synchronize edited text */
  /**
   * synchronize content editable element text
   * @param {Object} node - editable element
   * @param {Array} arr - array of values
   * @param {string} ns - namespace URI
   * @return {void}
   */
  const syncContentText = async (node, arr = [""], ns = nsURI.html) => {
    if (node && node.nodeType === NODE_ELEMENT && Array.isArray(arr)) {
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
      const namespaceURI = obj.data.namespaceURI || nsURI.html;
      const target = obj.data.target || "";
      const timestamp = obj.data.timestamp || 0;
      const value = await (new TextDecoder(CHAR)).decode(obj.value) || "";
      let isHtml = !elm.namespaceURI || elm.namespaceURI === nsURI.html,
          ns = !isHtml && nsURI.html || "",
          attr = isHtml && DATA_ATTR_TS || DATA_ATTR_TS_NS;
      if (elm.hasAttributeNS(ns, DATA_ATTR_ID_CTRL)) {
        const arr = (elm.getAttributeNS(ns, DATA_ATTR_ID_CTRL)).split(" ");
        for (let id of arr) {
          if (id === target) {
            (id = document.querySelector(`[*|${DATA_ATTR_ID}=${id}]`)) && (
              isHtml = !id.namespaceURI || id.namespaceURI === nsURI.html,
              ns = !isHtml && nsURI.html || "",
              attr = isHtml && DATA_ATTR_TS || DATA_ATTR_TS_NS,
              (!id.hasAttributeNS(ns, DATA_ATTR_TS) ||
               timestamp > id.getAttributeNS(ns, DATA_ATTR_TS) * 1) && (
                id.setAttributeNS(ns, attr, timestamp),
                syncContentText(id, value.split("\n"), namespaceURI)
              )
            );
            break;
          }
        }
      }
      else if (elm.hasAttributeNS(ns, DATA_ATTR_ID) &&
               elm.getAttributeNS(ns, DATA_ATTR_ID) === target &&
               (!elm.hasAttributeNS(ns, DATA_ATTR_TS) ||
                timestamp > elm.getAttributeNS(ns, DATA_ATTR_TS) * 1)) {
        elm.setAttributeNS(ns, attr, timestamp);
        if (/^(?:input|textarea)$/.test(elm.localName)) {
          elm.value = value;
        }
        else {
          elm.isContentEditable &&
            syncContentText(elm, value.split("\n"), namespaceURI);
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
    enabled: vars[KEY_EXEC_EDITOR]
  };

  /* open options key combination */
  const openOptionsKey = {
    key: vars[KEY_ACCESS],
    altKey: true,
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
    enabled: vars[KEY_OPEN_OPTIONS]
  };

  /**
   * key combination matches
   * @param {Object} evt - Event
   * @param {Object} key - KeyCombo
   * @return {boolean}
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
      if (ext && Object.keys(ext).length > 0 && (ext = ext[key])) {
        const items = Object.keys(ext);
        if (items && items.length > len) {
          for (let item of items) {
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
    const items = Object.keys(msg);
    if (items.length > 0) {
      for (let item of items) {
        let obj = msg[item];
        switch (item) {
          case SET_VARS:
            handleMsg(obj);
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
                path: obj.path
              }
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
      portMsg({openOptions});
    }
    else {
      const elm = evt && evt.target;
      const sel = window.getSelection();
      await keyComboMatches(evt, execEditorKey) && elm && (
        vars[ENABLE_ONLY_EDITABLE] && (
          elm.isContentEditable || await isEditControl(elm) ||
          sel.anchorNode === sel.focusNode && await isContentTextNode(elm)
        ) ||
        reType.test(document.contentType)
      ) && portContentData(elm).catch(logError);
    }
  };

  /* listeners */
  port.onMessage.addListener(handleMsg);

  document.addEventListener("DOMContentLoaded", () => {
    const root = document.documentElement;
    root.addEventListener("contextmenu", handleContextMenu, false);
    root.addEventListener("keypress", handleKeyPress, false);
  }, false);

  /* startup */
  Promise.all([
    extObjItems(fileExt, FILE_EXT, 0),
    extObjItems(nsURI, NS_URI, NS_URI_DEFAULT_ITEMS)
  ]).catch(logError);
}
