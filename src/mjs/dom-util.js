/**
 * dom-util.js
 */

/* shared */
import { sanitizeURLSync } from '../lib/url/url-sanitizer-wo-dompurify.min.js';
import { getType, isString, logErr } from './common.js';
import fileExt from './file-ext.js';
import nsURI, { html as nsHtml } from './ns-uri.js';
import { MIME_HTML, MIME_PLAIN } from './constant.js';

/* constants */
const TAGS_ALT = ['area', 'img', 'input'];
const TAGS_BLOCK = [
  'address', 'article', 'aside', 'blockquote', 'details', 'dialog', 'dd', 'div',
  'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'header',
  'hgroup', 'li', 'main', 'nav', 'ol', 'pre', 'section', 'table', 'ul'
];
const TAGS_BLOCK_SPACING = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'];
const TAGS_PHRASING = [
  'a', 'abbr', 'b', 'bdo', 'cite', 'code', 'data', 'datalist', 'del', 'dfn',
  'em', 'i', 'ins', 'kbd', 'mark', 'map', 'meter', 'output', 'progress', 'q',
  'ruby', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'var'
];
const TAGS_TABLE_CELL = ['td', 'th'];

/**
 * strip HTML tags and decode HTML escaped characters
 * @param {string} str - html string
 * @returns {string} - converted string
 */
export const getDecodedContent = str => {
  if (!isString(str)) {
    throw new TypeError(`Expected String but got ${getType(str)}.`);
  }
  const doc = new DOMParser().parseFromString(str, MIME_HTML);
  return doc.body.textContent.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
};

/**
 * check whether given array of URLs matches document URL
 * @param {Array} [arr] - array of URLs
 * @returns {boolean} - result
 */
export const matchDocUrl = arr => {
  let bool;
  if (Array.isArray(arr) && arr.length) {
    const {
      protocol: docProtocol, hostname: docHost, href: docHref
    } = document.location;
    for (const item of arr) {
      if (isString(item)) {
        try {
          const {
            protocol: itemProtocol, hostname: itemHost, href: itemHref
          } = new URL(item.trim());
          if (docProtocol === itemProtocol && docHost === itemHost &&
              docHref.startsWith(itemHref)) {
            bool = true;
            break;
          }
        } catch (e) {
          bool = false;
        }
      }
    }
  }
  return !!bool;
};

/**
 * get file extension from media type
 * @param {string} [media] - media type
 * @param {string} [subst] - substitute file extension
 * @returns {string} - file extension
 */
export const getFileExtension = (media = MIME_PLAIN, subst = 'txt') => {
  const arr =
    /^(application|image|text)\/([\w\-.]+)(?:\+(json|xml))?$/.exec(media);
  let ext;
  if (arr) {
    const [, type, subtype, suf] = arr;
    const suffix =
      suf ||
      (type === 'application' && /^(?:json|xml)$/.test(subtype) && subtype);
    const item = suffix && fileExt[type][suffix];
    if (item) {
      ext = item[subtype] || item[suffix];
    } else {
      ext = fileExt[type][subtype];
    }
  }
  return `.${ext || subst}`;
};

/* DOM handling */
/**
 * get namespace of node from ancestor
 * @param {object} [node] - element node
 * @returns {object} - namespace data
 */
export const getNodeNS = node => {
  const ns = { node: null, localName: null, namespaceURI: null };
  if (node.namespaceURI) {
    ns.node = node;
    ns.localName = node.localName;
    ns.namespaceURI = node.namespaceURI;
  } else {
    const root = document.documentElement;
    while (node && node !== root && !ns.node) {
      const { localName, parentNode, namespaceURI } = node;
      if (namespaceURI) {
        ns.node = node;
        ns.localName = localName;
        ns.namespaceURI = namespaceURI;
      } else {
        node = parentNode;
      }
    }
    if (!ns.node) {
      ns.node = root;
      ns.localName = root.localName;
      ns.namespaceURI =
        root.getAttribute('xmlns') || nsURI[root.localName] || '';
    }
  }
  return ns;
};

/**
 * get xmlns prefixed namespace
 * @param {object} [elm] - element
 * @param {string} [attr] - attribute
 * @returns {string} - namespace
 */
export const getXmlnsPrefixedNamespace = (elm, attr) => {
  let ns;
  if (elm?.nodeType === Node.ELEMENT_NODE) {
    let node = elm;
    while (node?.parentNode && !ns) {
      if (node.hasAttributeNS('', `xmlns:${attr}`)) {
        ns = node.getAttributeNS('', `xmlns:${attr}`);
      }
      node = node.parentNode;
    }
  }
  return ns || null;
};

/**
 * set namespaced attribute
 * @param {object} [elm] - element to append attributes
 * @param {object} [node] - element node to get attributes from
 * @returns {void}
 */
export const setAttributeNS = (elm, node = {}) => {
  const { attributes } = node;
  if (elm && attributes?.length) {
    for (const attr of attributes) {
      const { localName, name, namespaceURI, prefix, value } = attr;
      if (typeof node[name] !== 'function' && !localName.startsWith('on')) {
        const attrName = prefix ? `${prefix}:${localName}` : localName;
        const ns = namespaceURI || (prefix && nsURI[prefix]) || null;
        const { origin } = document.location;
        switch (localName) {
          case 'data':
          case 'href':
          case 'poster':
          case 'src': {
            const { href } = new URL(value, origin);
            const url = sanitizeURLSync(href, {
              only: ['http', 'https'],
              remove: true
            });
            if (url) {
              elm.setAttributeNS(ns, attrName, url);
            }
            break;
          }
          case 'ping': {
            const items = value.split(/\s+/);
            const arr = [];
            let bool = true;
            for (const item of items) {
              const { href } = new URL(item, origin);
              const url = sanitizeURLSync(href, {
                only: ['http', 'https'],
                remove: true
              });
              if (url) {
                arr.push(url);
              } else {
                bool = false;
                break;
              }
            }
            if (bool && arr.length) {
              elm.setAttributeNS(ns, attrName, arr.join(' '));
            }
            break;
          }
          case 'value': {
            elm.setAttributeNS(ns, attrName, '');
            break;
          }
          default:
            elm.setAttributeNS(ns, attrName, value);
        }
      }
    }
  }
};

/**
 * create namespaced element
 * @param {object} [node] - element node to create element from
 * @returns {object} - namespaced element
 */
export const createElement = node => {
  let elm;
  if (node?.nodeType === Node.ELEMENT_NODE) {
    const { attributes, localName, namespaceURI, prefix } = node;
    if (localName !== 'script') {
      const ns = namespaceURI || (prefix && nsURI[prefix]) ||
                 getNodeNS(node).namespaceURI || nsHtml;
      const name = prefix ? `${prefix}:${localName}` : localName;
      elm = document.createElementNS(ns, name);
      if (attributes && !(node instanceof HTMLUnknownElement)) {
        setAttributeNS(elm, node);
      }
    }
  }
  return elm || null;
};

/**
 * create document fragment from nodes array
 * @param {Array} [nodes] - nodes array
 * @returns {object} - document fragment
 */
export const createFragment = nodes => {
  const frag = document.createDocumentFragment();
  if (Array.isArray(nodes)) {
    for (const node of nodes) {
      if (node?.nodeType === Node.ELEMENT_NODE ||
          node?.nodeType === Node.TEXT_NODE) {
        frag.appendChild(node);
      }
    }
  }
  return frag;
};

/**
 * append child nodes
 * @param {object} elm - container element
 * @param {object} [node] - node containing child nodes to append
 * @returns {object} - element
 */
export const appendChildNodes = (elm, node) => {
  const parent = createElement(elm);
  if (parent?.nodeType === Node.ELEMENT_NODE && node?.hasChildNodes()) {
    const arr = [];
    const nodes = node.childNodes;
    for (const child of nodes) {
      const { nodeType, nodeValue, parentNode } = child;
      if (nodeType === Node.ELEMENT_NODE) {
        if (child === parentNode.firstChild) {
          arr.push(document.createTextNode('\n'));
        }
        arr.push(appendChildNodes(child, child.cloneNode(true)));
        if (child === parentNode.lastChild) {
          arr.push(document.createTextNode('\n'));
        }
      } else if (nodeType === Node.TEXT_NODE) {
        arr.push(document.createTextNode(nodeValue));
      }
    }
    if (arr.length) {
      const frag = createFragment(arr);
      parent.appendChild(frag);
    }
  }
  return parent;
};

/**
 * create DOM string of MathML / SVG
 * @param {object} [node] - element node
 * @returns {?string} - serialized node string
 */
export const createXmlBasedDomString = node => {
  let elm;
  if (node?.nodeType === Node.ELEMENT_NODE) {
    // FIXME:
    /*
    elm = node.closest('*|math, *|svg');
    */
    const root = document.documentElement;
    while (node && node !== root && !elm) {
      if (/^(?:math|svg)$/.test(node.localName)) {
        elm = node;
      }
      node = node.parentNode;
    }
    if (elm) {
      const range = document.createRange();
      range.selectNodeContents(elm);
      elm = appendChildNodes(elm, range.cloneContents());
    }
  }
  return elm ? `${new XMLSerializer().serializeToString(elm)}\n` : null;
};

/**
 * create range array
 * @param {object} [range] - range
 * @returns {Array} - range array
 */
export const createRangeArr = range => {
  const arr = [];
  if (range) {
    const ancestor = range.commonAncestorContainer;
    const obj = getNodeNS(ancestor);
    if (/^(?:svg|math)$/.test(obj.localName)) {
      if (!obj.node.parentNode) {
        return null;
      }
      const parent = obj.node.parentNode;
      range.setStart(parent, 0);
      range.setEnd(parent, parent.childNodes.length);
    }
    arr.push(
      appendChildNodes(ancestor, range.cloneContents()),
      document.createTextNode('\n')
    );
  }
  return arr;
};

/**
 * create DOM string from selection range
 * @param {object} [sel] - selection
 * @returns {?string} - serialized node string
 */
export const createDomStringFromSelectionRange = sel => {
  let frag;
  if (sel?.rangeCount) {
    const rangeArr = createRangeArr(sel.getRangeAt(0));
    frag = document.createDocumentFragment();
    frag.append(...rangeArr);
  }
  return frag ? new XMLSerializer().serializeToString(frag) : null;
};

/**
 *
 *serialize DOM string
 * @param {string} domstr - DOM string
 * @param {string} mime - mime type
 * @param {boolean} [reqElm] - require first element child
 * @returns {?string} - serialized DOM string
 */
export const serializeDomString = (domstr, mime, reqElm = false) => {
  if (!isString(domstr)) {
    throw new TypeError(`Expected String but got ${getType(domstr)}.`);
  }
  if (isString(mime)) {
    if (!/text\/(?:ht|x)ml|application\/(?:xhtml\+)?xml|image\/svg\+xml/.test(mime)) {
      throw new TypeError(`Unsupported MIME type ${mime}.`);
    }
  } else {
    throw new TypeError(`Expected String but got ${getType(mime)}.`);
  }
  const dom = new DOMParser().parseFromString(domstr, mime);
  if (dom.querySelector('parsererror')) {
    throw new Error('Error while parsing DOM string.');
  }
  const { body, documentElement: root } = dom;
  let frag;
  try {
    if (mime === MIME_HTML) {
      const { childNodes, firstElementChild } = body;
      if (body.hasChildNodes() && (!reqElm || firstElementChild)) {
        frag = document.createDocumentFragment();
        for (const child of childNodes) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const elm = appendChildNodes(child, child.cloneNode(true));
            if (elm?.nodeType === Node.ELEMENT_NODE) {
              frag.appendChild(elm);
            }
          } else if (child.nodeType === Node.TEXT_NODE && child.nodeValue) {
            frag.appendChild(document.createTextNode(child.nodeValue));
          }
        }
      }
    } else {
      const elm = appendChildNodes(root, root.cloneNode(true));
      frag = document.createDocumentFragment();
      frag.appendChild(elm);
    }
  } catch (e) {
    frag = null;
    logErr(e);
  }
  return frag ? new XMLSerializer().serializeToString(frag) : null;
};

/**
 * get text
 * @param {object} [nodes] - node list
 * @param {boolean} [pre] - preformatted
 * @returns {string} - text
 */
export const getText = (nodes, pre = false) => {
  const arr = [];
  if (nodes instanceof NodeList) {
    for (const node of nodes) {
      const {
        alt, lastChild, localName: nodeName, nextElementSibling: nextElm,
        nextSibling, nodeType, nodeValue: value, parentNode
      } = node;
      const {
        firstElementChild: parentFirstElmChild,
        lastElementChild: parentLastElmChild,
        lastChild: parentLastChild, localName: parentName
      } = parentNode;
      const isParentBlock = TAGS_BLOCK.includes(parentName) ||
                            TAGS_BLOCK_SPACING.includes(parentName);
      pre = pre || parentName === 'pre';
      switch (nodeType) {
        case Node.ELEMENT_NODE: {
          if (node.hasChildNodes()) {
            if (TAGS_BLOCK_SPACING.includes(nodeName) &&
                node !== parentFirstElmChild) {
              arr.push('\n');
            }
            arr.push(getText(node.childNodes, pre));
            if (isParentBlock) {
              if (node === parentLastChild) {
                const isLastChild =
                  (lastChild.nodeType === Node.TEXT_NODE &&
                   lastChild.nodeValue) ||
                  (lastChild.nodeType === Node.ELEMENT_NODE &&
                   TAGS_PHRASING.includes(nodeName) &&
                   TAGS_PHRASING.includes(lastChild.localName));
                if (isLastChild) {
                  arr.push('\n');
                }
              } else {
                const isPhrase = (!nextElm || nextElm.localName !== 'br') &&
                                 !pre && TAGS_PHRASING.includes(nodeName);
                if (isPhrase) {
                  arr.push(' ');
                }
              }
            }
            if (TAGS_TABLE_CELL.includes(nodeName) &&
                node !== parentLastElmChild) {
              arr.push('\t');
            } else if (nodeName === 'tr' ||
                       (TAGS_BLOCK_SPACING.includes(nodeName) &&
                        node !== parentLastElmChild &&
                        !TAGS_BLOCK_SPACING.includes(nextElm.localName))) {
              arr.push('\n');
            }
          } else if (TAGS_ALT.includes(nodeName)) {
            if ((nodeName !== 'input' || node.type === 'image') && alt) {
              const trail = isParentBlock && (
                node === parentLastChild ||
                (node === parentLastElmChild &&
                 nextSibling.nodeType === Node.TEXT_NODE &&
                 /^\s*$/.test(nextSibling.nodeValue))
              )
                ? '\n'
                : ' ';
              arr.push(`${alt}${trail}`);
            }
          } else if (nodeName === 'br') {
            arr.push('\n');
          }
          break;
        }
        case Node.TEXT_NODE: {
          if (pre) {
            arr.push(value);
          } else if (isParentBlock && node === parentLastChild) {
            arr.push(value.trim().replace(/([^\n])$/, (m, c) => `${c}\n`));
          } else {
            arr.push(value.trim());
          }
          break;
        }
        default:
      }
    }
  }
  return arr.join('');
};

/**
 * get ancestor element ID
 * @param {object} [elm] - element node
 * @returns {?string} - ID
 */
export const getAncestorId = elm => {
  let ancestorId;
  if (elm?.nodeType === Node.ELEMENT_NODE) {
    // FIXME:
    /*
    ancestorId = elm.closest('[id]');
    */
    let node = elm;
    while (node?.parentNode) {
      const { id: nodeId } = node;
      if (nodeId) {
        ancestorId = nodeId;
        break;
      }
      node = node.parentNode;
    }
  }
  return ancestorId || null;
};

/**
 * node or ancestor is editable
 * @param {object} [node] - element node
 * @returns {boolean} - result
 */
export const isEditable = node => {
  let editable;
  while (node?.parentNode) {
    if (!node.namespaceURI || node.namespaceURI === nsHtml) {
      editable = node.isContentEditable;
    }
    if (editable) {
      break;
    }
    node = node.parentNode;
  }
  return !!editable;
};

/**
 * content is text node
 * @param {object} node - element node
 * @returns {boolean} - result
 */
export const isContentTextNode = node => {
  let isText = isEditable(node);
  if (isText && node?.namespaceURI && node?.namespaceURI !== nsHtml &&
      node?.hasChildNodes()) {
    const nodes = node.childNodes;
    for (const child of nodes) {
      isText = child.nodeType === Node.TEXT_NODE;
      if (!isText) {
        break;
      }
    }
  }
  return !!isText;
};

/**
 * is text edit control element
 * @param {object} [elm] - element
 * @returns {boolean} - result
 */
export const isEditControl = elm => {
  let bool;
  if (elm) {
    const { localName, type } = elm;
    bool = localName === 'textarea' ||
           (localName === 'input' &&
            (!type || /^(?:(?:emai|te|ur)l|search|text)$/.test(type)));
  }
  return !!bool;
};

/**
 * get editable element from ancestor
 * @param {object} node - node
 * @returns {object} - editable element
 */
export const getEditableElm = node => {
  let elm;
  if (isEditControl(node)) {
    elm = node;
  } else {
    while (node?.parentNode) {
      if (node.hasAttribute('contenteditable') && node.isContentEditable &&
          (!node.namespaceURI || node.namespaceURI === nsHtml)) {
        elm = node;
        break;
      }
      node = node.parentNode;
    }
  }
  return elm || null;
};

/**
 * filter editable elements
 * @param {string} localName - element local name
 * @param {string} query - query selector
 * @param {boolean} [force] - force
 * @returns {Array} - filtered editable elements
 */
export const filterEditableElements = (localName, query, force = false) => {
  if (!isString(localName)) {
    throw new TypeError(`Expected String but got ${getType(localName)}.`);
  }
  if (!isString(query)) {
    throw new TypeError(`Expected String but got ${getType(query)}.`);
  }
  const arr = [...document.querySelectorAll(query)].filter(item => {
    const { localName: itemLocalName, namespaceURI } = item;
    let res;
    if (itemLocalName === localName) {
      res = namespaceURI !== nsHtml || getEditableElm(item) || force;
    }
    return res && item;
  });
  return arr;
};

/**
 * create paragraphed content
 * @param {string} [value] - value
 * @param {string} [ns] - namespace URI
 * @returns {object} - document fragment
 */
export const createParagraphedContent = (value, ns = nsHtml) => {
  const arr = isString(value) ? value.split(/\r?\n/) : [''];
  const l = arr.length;
  const frag = document.createDocumentFragment();
  if (l === 1) {
    const [text] = arr;
    if (text) {
      frag.appendChild(document.createTextNode(text));
    } else {
      frag.appendChild(document.createTextNode('\n'));
    }
  } else {
    const sep = document.queryCommandValue('defaultParagraphSeparator');
    let i = 0;
    while (i < l) {
      const text = arr[i];
      if (ns === nsHtml) {
        if (sep === 'div' || sep === 'p') {
          const elm = document.createElementNS(ns, sep);
          if (text) {
            elm.appendChild(document.createTextNode(text));
          } else if (i < l - 1) {
            const br = document.createElementNS(ns, 'br');
            elm.appendChild(br);
          }
          if (elm.hasChildNodes()) {
            frag.appendChild(elm);
          }
        } else {
          if (text) {
            frag.appendChild(document.createTextNode(text));
          } else {
            const br = document.createElementNS(ns, 'br');
            frag.appendChild(br);
          }
          if (i < l - 1) {
            const br = document.createElementNS(ns, 'br');
            frag.appendChild(br);
          }
        }
      } else if (text) {
        frag.appendChild(document.createTextNode(text));
      } else {
        frag.appendChild(document.createTextNode(''));
      }
      if (i < l - 1) {
        frag.appendChild(document.createTextNode('\n'));
      }
      i++;
    }
  }
  return frag;
};
