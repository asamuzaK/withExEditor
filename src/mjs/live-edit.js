/**
 * live-edit.js
 */

/* shared */
import { isString } from './common.js';
import { getText, isEditControl } from './dom-util.js';
import { html as nsHtml } from './ns-uri.js';

/* live editors */
const liveEdit = {
  aceEditor: {
    className: 'ace_editor',
    getContent: '.ace_line',
    setContent: '.ace_text-input',
    url: 'https://ace.c9.io/'
  },
  // NOTE: Up to CodeMirror 5. Not necessary for CodeMirror 6.
  codeMirror: {
    className: 'CodeMirror',
    getContent: '.CodeMirror-line',
    setContent: '.CodeMirror > div:nth-child(1) > textarea:nth-child(1), .CodeMirror .CodeMirror-code[contenteditable="true"]',
    url: 'https://codemirror.net/'
  },
  tiddlyWiki: {
    isIframe: true,
    className: 'tc-edit-texteditor-body',
    getContent: 'body > textarea:nth-child(1)',
    setContent: 'body > textarea:nth-child(1)',
    url: 'https://tiddlywiki.com/'
  },
  tinyMCE: {
    isIframe: true,
    className: null,
    getContent: '#tinymce',
    setContent: '#tinymce',
    url: 'https://www.tiny.cloud/'
  }
};

export { liveEdit as default };

/**
 * get live edit key
 *
 * @param {object} [elm] - element
 * @returns {?string} - live edit key
 */
export const getLiveEditKey = elm => {
  let liveEditKey;
  if (elm?.nodeType === Node.ELEMENT_NODE) {
    const items = Object.entries(liveEdit);
    for (const [key, value] of items) {
      const { className, getContent, isIframe, setContent } = value;
      if (isIframe && elm.contentDocument) {
        if ((!className || elm.classList.contains(className)) &&
            elm.contentDocument.querySelector(getContent) &&
            elm.contentDocument.querySelector(setContent)) {
          liveEditKey = key;
        }
      } else if (elm.classList.contains(className)) {
        liveEditKey = key;
      }
      if (liveEditKey) {
        break;
      }
    }
  }
  return liveEditKey || null;
};

/**
 * get live edit element from ancestor
 *
 * @param {object} [node] - node
 * @returns {object} - live edit element
 */
export const getLiveEditElement = node => {
  const items = Object.values(liveEdit);
  let elm;
  while (node?.parentNode && !elm) {
    const { classList, namespaceURI } = node;
    const isHtml = !namespaceURI || namespaceURI === nsHtml;
    if (isHtml) {
      for (const item of items) {
        const { className, getContent, isIframe, setContent } = item;
        if (isIframe) {
          const iframes = node.querySelectorAll('iframe');
          for (const iframe of iframes) {
            if ((!className || iframe.classList.contains(className)) &&
                iframe.contentDocument &&
                iframe.contentDocument.querySelector(getContent) &&
                iframe.contentDocument.querySelector(setContent)) {
              elm = iframe;
              break;
            }
          }
        } else if (classList.contains(className)) {
          elm = node;
          break;
        }
      }
    }
    node = node.parentNode;
  }
  return elm || null;
};

/**
 * get live edit content
 *
 * @param {object} [elm] - Element
 * @param {string} [key] - key
 * @returns {?string} - content
 */
export const getLiveEditContent = (elm, key) => {
  let content;
  if (elm?.nodeType === Node.ELEMENT_NODE && isString(key) && liveEdit[key]) {
    const { getContent, isIframe } = liveEdit[key];
    let items;
    if (isIframe && elm.contentDocument) {
      items = elm.contentDocument.querySelectorAll(getContent);
    } else {
      items = elm.querySelectorAll(getContent);
    }
    if (items?.length) {
      const arr = [];
      for (const item of items) {
        if (item.localName === 'br') {
          arr.push('\n');
        } else if (isEditControl(item)) {
          arr.push(item.value);
        } else if (item.isContentEditable) {
          if (item.hasChildNodes()) {
            arr.push(getText(item.childNodes, elm.localName === 'pre'));
          } else {
            arr.push('\n');
          }
        } else {
          const isPreFormatted =
            elm.localName === 'pre' || item.localName === 'pre';
          if (isPreFormatted) {
            arr.push(`${item.textContent}\n`);
          } else {
            arr.push(item.textContent);
          }
        }
      }
      content = arr.join('');
    }
  }
  return content || null;
};
