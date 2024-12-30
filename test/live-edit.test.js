/**
 * live-edit.test.js
 */

/* api */
import { strict as assert } from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'mocha';
import sinon from 'sinon';
import { createJsdom, DataTransfer } from './mocha/setup.js';

/* test */
// eslint-disable-next-line import-x/order
import liveEdit, * as mjs from '../src/mjs/live-edit.js';

describe('live-edit', () => {
  let window, document;
  const globalKeys = [
    'ClipboardEvent', 'DataTransfer', 'DOMTokenList', 'DOMParser', 'Event',
    'FocusEvent', 'Headers', 'HTMLUnknownElement', 'InputEvent',
    'KeyboardEvent', 'Node', 'NodeList', 'Selection', 'StaticRange',
    'XMLSerializer'
  ];
  // NOTE: not implemented in jsdom https://github.com/jsdom/jsdom/issues/1670
  const isContentEditable = node => {
    if (node.nodeType !== 1) {
      return false;
    }
    if (typeof node.isContentEditable === 'boolean') {
      return node.isContentEditable;
    } else if (node.ownerDocument.designMode === 'on') {
      return true;
    } else {
      let attr;
      if (node.hasAttribute('contenteditable')) {
        attr = node.getAttribute('contenteditable');
      } else {
        attr = 'inherit';
      }
      switch (attr) {
        case '':
        case 'true': {
          return true;
        }
        case 'plaintext-only': {
          // FIXME:
          // @see https://github.com/w3c/editing/issues/470
          // @see https://github.com/whatwg/html/issues/10651
          return true;
        }
        case 'false': {
          return false;
        }
        default: {
          if (node?.parentNode?.nodeType === 1) {
            return isContentEditable(node.parentNode);
          }
          return false;
        }
      }
    }
  };

  beforeEach(() => {
    const dom = createJsdom();
    window = dom && dom.window;
    document = window && window.document;
    if (typeof document.queryCommandValue !== 'function') {
      document.queryCommandValue =
        sinon.stub().withArgs('defaultParagraphSeparator').returns('div');
    }
    global.window = window;
    global.document = document;
    for (const key of globalKeys) {
      // Not implemented in jsdom
      if (key === 'InputEvent') {
        if (typeof window.InputEvent.prototype.getTargetRanges !== 'function') {
          Object.defineProperty(window.InputEvent.prototype,
            'getTargetRanges', {
              value: sinon.stub()
            });
        }
        if (typeof window.InputEvent.prototype.dataTransfer === 'undefined') {
          window.InputEvent.prototype.dataTransfer = new DataTransfer();
        }
      } else if (!window[key]) {
        if (key === 'ClipboardEvent') {
          window[key] = class ClipboardEvent extends window.Event {
            constructor(arg, initEvt) {
              super(arg, initEvt);
              this.clipboardData = initEvt.clipboardData || null;
            }
          };
        } else if (key === 'DataTransfer') {
          window[key] = DataTransfer;
        }
      }
      if (window[key] && !global[key]) {
        global[key] = window[key];
      }
    }
  });
  afterEach(() => {
    window = null;
    document = null;
    delete global.window;
    delete global.document;
    for (const key of globalKeys) {
      delete global[key];
    }
  });

  describe('live editors', () => {
    it('should get key and value', () => {
      const itemKeys = ['aceEditor', 'codeMirror', 'tiddlyWiki', 'tinyMCE'];
      const items = Object.entries(liveEdit);
      for (const [key, value] of items) {
        assert.strictEqual(itemKeys.includes(key), true);
        assert.strictEqual(
          Object.prototype.hasOwnProperty.call(value, 'className'), true);
        assert.strictEqual(
          typeof value.className === 'string' || value.className === null,
          true);
        assert.strictEqual(typeof value.getContent, 'string');
        assert.strictEqual(typeof value.setContent, 'string');
        assert.strictEqual(typeof value.url, 'string');
        // optional keys
        if (Object.prototype.hasOwnProperty.call(value, 'isIframe')) {
          assert.strictEqual(typeof value.isIframe, 'boolean');
        }
      }
    });
  });

  describe('get live edit key', () => {
    const func = mjs.getLiveEditKey;

    it('should get null', () => {
      const res = func();
      assert.strictEqual(res, null, 'result');
    });

    it('should get null', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      p.classList.add('foo');
      body.appendChild(p);
      const res = func(p);
      assert.strictEqual(res, null, 'result');
    });

    it('should get null', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p);
      assert.strictEqual(res, null, 'result');
    });

    it('should get null', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      p.classList.add('quux');
      body.appendChild(p);
      const res = func(p);
      assert.strictEqual(res, null, 'result');
    });

    it('should get value, aceEditor', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      p.classList.add('ace_editor');
      body.appendChild(p);
      const res = func(p);
      assert.strictEqual(res, 'aceEditor', 'result');
    });

    it('should get value, codeMirror', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      p.classList.add('CodeMirror');
      body.appendChild(p);
      const res = func(p);
      assert.strictEqual(res, 'codeMirror', 'result');
    });

    it('should get value, tiddlyWiki', () => {
      const iframe = document.createElement('iframe');
      const textarea = document.createElement('textarea');
      const body = document.querySelector('body');
      iframe.classList.add('tc-edit-texteditor-body');
      body.appendChild(iframe);
      iframe.contentDocument.body.appendChild(textarea);
      const res = func(iframe);
      assert.strictEqual(res, 'tiddlyWiki', 'result');
    });

    it('should get value, tinyMCE', () => {
      const iframe = document.createElement('iframe');
      const div = document.createElement('div');
      const body = document.querySelector('body');
      body.appendChild(iframe);
      div.id = 'tinymce';
      iframe.contentDocument.body.appendChild(div);
      const res = func(iframe);
      assert.strictEqual(res, 'tinyMCE', 'result');
    });
  });

  describe('get live edit element from ancestor', () => {
    const func = mjs.getLiveEditElement;

    it('should get null', () => {
      const res = func();
      assert.strictEqual(res, null, 'result');
    });

    it('should get null', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p);
      assert.strictEqual(res, null, 'result');
    });

    it('should get null', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const body = document.querySelector('body');
      body.appendChild(svg);
      const res = func(svg);
      assert.strictEqual(res, null, 'result');
    });

    it('should get element, aceEditor', () => {
      const div = document.createElement('div');
      const p = document.createElement('p');
      const body = document.querySelector('body');
      div.classList.add('ace_editor');
      div.appendChild(p);
      body.appendChild(div);
      const res = func(p);
      assert.deepEqual(res, div, 'result');
    });

    it('should get element, CodeMirror', () => {
      const div = document.createElement('div');
      const p = document.createElement('p');
      const body = document.querySelector('body');
      div.classList.add('CodeMirror');
      div.appendChild(p);
      body.appendChild(div);
      const res = func(p);
      assert.deepEqual(res, div, 'result');
    });

    it('should get value, tiddlyWiki', () => {
      const iframe = document.createElement('iframe');
      const textarea = document.createElement('textarea');
      const body = document.querySelector('body');
      iframe.classList.add('tc-edit-texteditor-body');
      body.appendChild(iframe);
      iframe.contentDocument.body.appendChild(textarea);
      const res = func(iframe);
      assert.strictEqual(res, iframe, 'result');
    });

    it('should get element', () => {
      const div = document.createElement('div');
      const iframe = document.createElement('iframe');
      const elm = document.createElement('div');
      const body = document.querySelector('body');
      div.appendChild(iframe);
      body.appendChild(div);
      elm.setAttribute('contenteditable', 'true');
      if (typeof elm.isContentEditable !== 'boolean') {
        elm.isContentEditable = isContentEditable(elm);
      }
      elm.id = 'tinymce';
      iframe.contentDocument.body.appendChild(elm);
      const res = func(div);
      assert.deepEqual(res, iframe, 'result');
    });
  });

  describe('get live edit content', () => {
    const func = mjs.getLiveEditContent;

    it('should get null', () => {
      const res = func();
      assert.strictEqual(res, null, 'result');
    });

    it('should get null', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p);
      assert.strictEqual(res, null, 'result');
    });

    it('should get null', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p, 'foo');
      assert.strictEqual(res, null, 'result');
    });

    it('should get result', () => {
      const p = document.createElement('p');
      const span = document.createElement('span');
      const span2 = document.createElement('span');
      const br = document.createElement('br');
      const body = document.querySelector('body');
      span.classList.add('CodeMirror-line');
      span.textContent = 'baz';
      br.classList.add('CodeMirror-line');
      span2.classList.add('CodeMirror-line');
      span2.textContent = 'qux';
      p.setAttribute('contenteditable', 'true');
      if (typeof p.isContentEditable !== 'boolean') {
        p.isContentEditable = isContentEditable(p);
      }
      p.appendChild(span);
      p.appendChild(br);
      p.appendChild(span2);
      body.appendChild(p);
      const res = func(p, 'codeMirror');
      assert.strictEqual(res, 'baz\nqux', 'result');
    });

    it('should get result', () => {
      const div = document.createElement('div');
      const pre = document.createElement('pre');
      const pre2 = document.createElement('pre');
      const body = document.querySelector('body');
      pre.classList.add('ace_line');
      pre.textContent = 'baz';
      pre2.classList.add('ace_line');
      pre2.textContent = 'qux';
      div.appendChild(pre);
      div.appendChild(pre2);
      body.appendChild(div);
      const res = func(div, 'aceEditor');
      assert.strictEqual(res, 'baz\nqux\n', 'result');
    });

    it('should get result', () => {
      const pre = document.createElement('pre');
      const span = document.createElement('span');
      const span2 = document.createElement('span');
      const body = document.querySelector('body');
      span.classList.add('ace_line');
      span.textContent = 'baz';
      span2.classList.add('ace_line');
      span2.textContent = 'qux';
      pre.appendChild(span);
      pre.appendChild(span2);
      body.appendChild(pre);
      const res = func(pre, 'aceEditor');
      assert.strictEqual(res, 'baz\nqux\n', 'result');
    });

    it('should get result', () => {
      const iframe = document.createElement('iframe');
      const body = document.querySelector('body');
      body.appendChild(iframe);
      const textarea = iframe.contentDocument.createElement('textarea');
      textarea.value = 'foo\nbar\nbaz';
      iframe.contentDocument.body.appendChild(textarea);
      const res = func(iframe, 'tiddlyWiki');
      assert.strictEqual(res, 'foo\nbar\nbaz', 'result');
    });

    it('should get result', () => {
      const div = document.createElement('div');
      const body = document.querySelector('body');
      div.setAttribute('contenteditable', 'true');
      if (typeof div.isContentEditable !== 'boolean') {
        div.isContentEditable = isContentEditable(div);
      }
      div.classList.add('CodeMirror-line');
      body.appendChild(div);
      const res = func(body, 'codeMirror');
      assert.strictEqual(res, '\n', 'result');
    });

    it('should get result', () => {
      const div = document.createElement('div');
      const sec = document.createElement('section');
      const h1 = document.createElement('h1');
      const p = document.createElement('p');
      const p2 = document.createElement('p');
      const p3 = document.createElement('p');
      const img = document.createElement('img');
      const cmt = document.createComment('comment');
      const body = document.querySelector('body');
      div.setAttribute('contenteditable', 'true');
      if (typeof div.isContentEditable !== 'boolean') {
        div.isContentEditable = isContentEditable(div);
      }
      div.classList.add('CodeMirror-line');
      h1.textContent = 'foo bar';
      p.textContent = '  baz qux';
      p2.textContent = '  quux';
      p3.appendChild(img);
      p3.appendChild(document.createTextNode('corge'));
      sec.appendChild(h1);
      sec.appendChild(p);
      sec.appendChild(cmt);
      sec.appendChild(p2);
      sec.appendChild(p3);
      div.appendChild(sec);
      body.appendChild(div);
      const res = func(body, 'codeMirror');
      assert.strictEqual(res, 'foo bar\n\nbaz qux\n\nquux\n\ncorge\n\n',
        'result');
    });

    it('should get result', () => {
      const div = document.createElement('div');
      const sec = document.createElement('section');
      const h1 = document.createElement('h1');
      const p = document.createElement('div');
      const p2 = document.createElement('div');
      const p3 = document.createElement('div');
      const img = document.createElement('img');
      const cmt = document.createComment('comment');
      const body = document.querySelector('body');
      div.setAttribute('contenteditable', 'true');
      if (typeof div.isContentEditable !== 'boolean') {
        div.isContentEditable = isContentEditable(div);
      }
      div.classList.add('CodeMirror-line');
      h1.textContent = 'foo bar';
      p.textContent = '  baz qux';
      p2.textContent = '  quux';
      p3.appendChild(img);
      p3.appendChild(document.createTextNode('corge'));
      sec.appendChild(h1);
      sec.appendChild(p);
      sec.appendChild(cmt);
      sec.appendChild(p2);
      sec.appendChild(p3);
      div.appendChild(sec);
      body.appendChild(div);
      const res = func(body, 'codeMirror');
      assert.strictEqual(res, 'foo bar\n\nbaz qux\nquux\ncorge\n\n',
        'result');
    });
  });
});
