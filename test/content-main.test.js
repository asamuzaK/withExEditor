/**
 * content-main.test.js
 */
/* eslint-disable import-x/order */

/* api */
import { strict as assert } from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'mocha';
import sinon from 'sinon';
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';
import {
  browser, createJsdom, DataTransfer
} from './mocha/setup.js';

/* test */
import {
  CONTENT_GET, IS_MAC, ID_TAB, ID_WIN, INCOGNITO, LABEL,
  LOCAL_FILE_VIEW, MODE_EDIT, MODE_EDIT_HTML, MODE_EDIT_MD, MODE_EDIT_TXT,
  MODE_MATHML, MODE_SELECTION, MODE_SOURCE, MODE_SVG, ONLY_EDITABLE,
  SYNC_AUTO, SYNC_AUTO_URL,
  TMP_FILES_PB, TMP_FILE_CREATE, TMP_FILE_DATA_PORT,
  TMP_FILE_DATA_REMOVE, TMP_FILE_REQ, TMP_FILE_RES, VARS_SET
} from '../src/mjs/constant.js';
import * as mjs from '../src/mjs/content-main.js';

describe('content-main', () => {
  let window, document;
  const globalKeys = [
    'ClipboardEvent', 'DataTransfer', 'DOMPurify', 'DOMTokenList', 'DOMParser',
    'Event', 'FocusEvent', 'Headers', 'HTMLUnknownElement', 'InputEvent',
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
    delete global.DOMPurify;
    for (const key of globalKeys) {
      delete global[key];
    }
  });

  describe('set modifier keys', () => {
    const func = mjs.setModifierKey;
    beforeEach(() => {
      const { vars } = mjs;
      vars[IS_MAC] = false;
      delete vars.keyCtrlA.ctrlKey;
      delete vars.keyCtrlA.metaKey;
    });
    afterEach(() => {
      const { vars } = mjs;
      vars[IS_MAC] = false;
      delete vars.keyCtrlA.ctrlKey;
      delete vars.keyCtrlA.metaKey;
    });

    it('should set value', () => {
      const { vars } = mjs;
      func(true);
      assert.strictEqual(vars.keyCtrlA.metaKey, true, 'meta');
      assert.strictEqual(vars.keyCtrlA.ctrlKey, undefined, 'meta');
    });

    it('should set value', () => {
      const { vars } = mjs;
      func(false);
      assert.strictEqual(vars.keyCtrlA.metaKey, undefined, 'meta');
      assert.strictEqual(vars.keyCtrlA.ctrlKey, true, 'meta');
    });

    it('should set value', () => {
      const { vars } = mjs;
      vars[IS_MAC] = true;
      func();
      assert.strictEqual(vars.keyCtrlA.metaKey, true, 'meta');
      assert.strictEqual(vars.keyCtrlA.ctrlKey, undefined, 'meta');
    });
  });

  describe('set data ID', () => {
    const func = mjs.setDataId;
    beforeEach(() => {
      mjs.dataIds.clear();
    });
    afterEach(() => {
      mjs.dataIds.clear();
    });

    it('should throw', async () => {
      assert.throws(() => func(), TypeError,
        'Expected String but got Undefined.');
    });

    it('should not set map', () => {
      const res = func('foo');
      assert.strictEqual(mjs.dataIds.has('foo'), false, 'not set');
      assert.strictEqual(res, null, 'result');
    });

    it('should set map', () => {
      const res = func('foo', {
        bar: 'baz'
      });
      assert.strictEqual(mjs.dataIds.has('foo'), true, 'set');
      assert.deepEqual(mjs.dataIds.get('foo'), {
        bar: 'baz'
      }, 'map');
      assert.strictEqual(res instanceof Map, true, 'result');
    });

    it('should set map', () => {
      mjs.dataIds.set('foo', {
        bar: 'qux'
      });
      const res = func('foo', {
        bar: 'baz'
      });
      assert.strictEqual(mjs.dataIds.has('foo'), true, 'set');
      assert.deepEqual(mjs.dataIds.get('foo'), {
        bar: 'baz'
      }, 'map');
      assert.strictEqual(res instanceof Map, true, 'result');
    });
  });

  describe('get target element from data ID', () => {
    const func = mjs.getTargetElementFromDataId;
    beforeEach(() => {
      mjs.dataIds.clear();
    });
    afterEach(() => {
      mjs.dataIds.clear();
    });

    it('should throw', async () => {
      assert.throws(() => func(), TypeError,
        'Expected String but got Undefined.');
    });

    it('should get null', () => {
      const p = document.createElement('p');
      p.id = 'foo';
      const res = func(p.id);
      assert.strictEqual(res, null, 'result');
    });

    it('should get element', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      p.id = 'foo';
      body.appendChild(p);
      const res = func(p.id);
      assert.deepEqual(res, p, 'result');
    });

    it('should get null', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(p);
      const dataId = 'html_p_0';
      mjs.dataIds.set(dataId, {
        dataId,
        ancestorId: null,
        localName: 'p',
        prefix: null,
        queryIndex: null
      });
      const res = func(dataId);
      assert.strictEqual(res, null, 'result');
    });

    it('should get element', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(p);
      const dataId = 'html_p_0';
      mjs.dataIds.set(dataId, {
        dataId,
        ancestorId: null,
        localName: 'p',
        prefix: null,
        queryIndex: 0
      });
      const res = func(dataId);
      assert.deepEqual(res, p, 'result');
    });

    it('should get element', () => {
      const p = document.createElement('p');
      const p2 = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(p);
      body.appendChild(p2);
      const dataId = 'html_p_1';
      mjs.dataIds.set(dataId, {
        dataId,
        ancestorId: null,
        localName: 'p',
        prefix: null,
        queryIndex: 1
      });
      const res = func(dataId);
      assert.deepEqual(res, p2, 'result');
    });

    it('should get element', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      body.id = 'foo';
      body.appendChild(p);
      const dataId = 'foo_p_0';
      mjs.dataIds.set(dataId, {
        ancestorId: 'foo',
        dataId: 'foo_p_0',
        localName: 'p',
        prefix: null,
        queryIndex: 0
      });
      const res = func(dataId);
      assert.deepEqual(res, p, 'result');
    });

    it('should get element', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const fo =
        document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      const p =
        document.createElementNS('http://www.w3.org/1999/xhtml', 'html:p');
      const body = document.querySelector('body');
      svg.id = 'foo';
      svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:html',
        'http://www.w3.org/1999/xhtml');
      fo.appendChild(p);
      svg.appendChild(fo);
      body.appendChild(svg);
      const dataId = 'foo_html:p_0';
      mjs.dataIds.set(dataId, {
        dataId,
        ancestorId: 'foo',
        localName: 'p',
        prefix: 'html',
        queryIndex: 0
      });
      const res = func(dataId);
      assert.deepEqual(res, p, 'result');
    });

    it('should get element', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const fo =
        document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      const p =
        document.createElementNS('http://www.w3.org/1999/xhtml', 'html:p');
      const p2 =
        document.createElementNS('http://www.w3.org/1999/xhtml', 'html:p');
      const body = document.querySelector('body');
      svg.id = 'foo';
      svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:html',
        'http://www.w3.org/1999/xhtml');
      fo.appendChild(p);
      fo.appendChild(p2);
      svg.appendChild(fo);
      body.appendChild(svg);
      const dataId = 'foo_html:p_1';
      mjs.dataIds.set(dataId, {
        dataId,
        ancestorId: 'foo',
        localName: 'p',
        prefix: 'html',
        queryIndex: 1
      });
      const res = func(dataId);
      assert.deepEqual(res, p2, 'result');
    });

    it('should get element', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const fo =
        document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      const p =
        document.createElementNS('http://www.w3.org/1999/xhtml', 'html:p');
      const body = document.querySelector('body');
      svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:html',
        'http://www.w3.org/1999/xhtml');
      fo.appendChild(p);
      svg.appendChild(fo);
      body.appendChild(svg);
      const dataId = 'html_html:p_0';
      mjs.dataIds.set(dataId, {
        dataId,
        ancestorId: null,
        localName: 'p',
        prefix: 'html',
        queryIndex: 0
      });
      const res = func(dataId);
      assert.deepEqual(res, p, 'result');
    });

    it('should get element', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const fo =
        document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      const p =
        document.createElementNS('http://www.w3.org/1999/xhtml', 'html:p');
      const p2 =
        document.createElementNS('http://www.w3.org/1999/xhtml', 'html:p');
      const body = document.querySelector('body');
      svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:html',
        'http://www.w3.org/1999/xhtml');
      fo.appendChild(p);
      fo.appendChild(p2);
      svg.appendChild(fo);
      body.appendChild(svg);
      const dataId = 'html_html:p_1';
      mjs.dataIds.set(dataId, {
        dataId,
        ancestorId: null,
        localName: 'p',
        prefix: 'html',
        queryIndex: 1
      });
      const res = func(dataId);
      assert.deepEqual(res, p2, 'result');
    });

    it('should get element', () => {
      const div = document.createElement('div');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const text =
        document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const body = document.querySelector('body');
      svg.appendChild(text);
      div.setAttribute('contenteditable', 'true');
      if (typeof div.isContentEditable !== 'boolean') {
        div.isContentEditable = isContentEditable(div);
      }
      div.appendChild(svg);
      body.appendChild(div);
      const dataId = 'html_text_0';
      mjs.dataIds.set(dataId, {
        dataId,
        ancestorId: null,
        localName: 'text',
        namespaceURI: 'http://www.w3.org/2000/svg',
        prefix: null,
        queryIndex: 0
      });
      const res = func(dataId);
      assert.deepEqual(res, text, 'result');
    });
  });

  describe('get dataId from URI path', () => {
    const func = mjs.getDataIdFromURI;

    it('should throw', async () => {
      assert.throws(() => func(), TypeError,
        'Expected String but got Undefined.');
    });

    it('should get value', () => {
      const res = func('https://example.com/foo');
      assert.strictEqual(res, 'foo', 'result');
    });

    it('should get value', () => {
      const res = func('https://example.com/foo', 'bar');
      assert.strictEqual(res, 'foo', 'result');
    });

    it('should get value', () => {
      const res = func('https://example.com/', 'bar');
      assert.strictEqual(res, 'bar', 'result');
    });

    it('should get value', () => {
      const res = func('https://example.com/');
      assert.strictEqual(res, 'index', 'result');
    });

    it('should get value', () => {
      const res = func('https://example.com/foo%20bar');
      assert.strictEqual(res, 'foo bar', 'result');
    });

    it('should get value', () => {
      const res = func('data:image/svg+xml;utf8,<svg></svg>');
      assert.strictEqual(res, 'index', 'result');
    });

    it('should get value', () => {
      const res = func('data:,https://example.com/#<script>alert(1);</script>');
      assert.strictEqual(res, 'index', 'result');
    });
  });

  describe('get queried items', () => {
    const func = mjs.getQueriedItems;

    it('should get empty array', () => {
      const res = func();
      assert.deepEqual(res, [], 'result');
    });

    it('should get empty array', () => {
      const res = func('foo');
      assert.deepEqual(res, [], 'result');
    });

    it('should get result', () => {
      const div = document.createElement('div');
      const p = document.createElement('p');
      const body = document.querySelector('body');
      div.id = 'foo';
      div.appendChild(p);
      body.appendChild(div);
      const res = func(p);
      assert.deepEqual(res, [p], 'result');
    });

    it('should get result', () => {
      const div = document.createElement('div');
      const p = document.createElement('p');
      const p2 = document.createElement('p');
      const body = document.querySelector('body');
      div.id = 'foo';
      div.appendChild(p);
      div.appendChild(p2);
      body.appendChild(div);
      const res = func(p2);
      assert.deepEqual(res, [p, p2], 'result');
    });

    it('should get result', () => {
      const div = document.createElement('div');
      const div2 = document.createElement('div');
      const p = document.createElement('p');
      const p2 = document.createElement('p');
      const body = document.querySelector('body');
      div.id = 'foo';
      div.appendChild(p);
      div2.id = 'bar';
      div2.appendChild(p2);
      body.appendChild(div);
      body.appendChild(div2);
      const res = func(p2);
      assert.deepEqual(res, [p2], 'result');
    });

    it('should get result', () => {
      const div = document.createElement('div');
      const div2 = document.createElement('div');
      const p = document.createElement('p');
      const p2 = document.createElement('p');
      const body = document.querySelector('body');
      div.appendChild(p);
      div2.appendChild(p2);
      body.appendChild(div);
      body.appendChild(div2);
      const res = func(p2);
      assert.deepEqual(res, [p, p2], 'result');
    });

    it('should get result', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const fo =
        document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      const p =
        document.createElementNS('http://www.w3.org/1999/xhtml', 'html:p');
      const div =
        document.createElementNS('http://www.w3.org/1999/xhtml', 'html:div');
      const body = document.querySelector('body');
      svg.id = 'foo';
      svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:html',
        'http://www.w3.org/1999/xhtml');
      fo.appendChild(p);
      fo.appendChild(div);
      svg.appendChild(fo);
      body.appendChild(svg);
      const res = func(p);
      assert.deepEqual(res, [p], 'result');
    });

    it('should get result', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const fo =
        document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      const p =
        document.createElementNS('http://www.w3.org/1999/xhtml', 'html:p');
      const div =
        document.createElementNS('http://www.w3.org/1999/xhtml', 'html:div');
      const body = document.querySelector('body');
      svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:html',
        'http://www.w3.org/1999/xhtml');
      fo.appendChild(p);
      fo.appendChild(div);
      svg.appendChild(fo);
      body.appendChild(svg);
      const res = func(p);
      assert.deepEqual(res, [p], 'result');
    });
  });

  describe('create ID data', () => {
    const func = mjs.createIdData;

    it('should get null', () => {
      const res = func();
      assert.strictEqual(res, null, 'result');
    });

    it('should get null', () => {
      const p = document.createElement('p');
      const res = func(p);
      assert.strictEqual(res, null, 'result');
    });

    it('should get result', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p);
      assert.deepEqual(res, {
        ancestorId: null,
        dataId: 'html_p_0',
        localName: 'p',
        prefix: null,
        queryIndex: 0
      }, 'result');
    });

    it('should get result', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      body.id = 'foo';
      body.appendChild(p);
      const res = func(p);
      assert.deepEqual(res, {
        ancestorId: 'foo',
        dataId: 'foo_p_0',
        localName: 'p',
        prefix: null,
        queryIndex: 0
      }, 'result');
    });

    it('should get result', () => {
      const p = document.createElement('p');
      const p2 = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(p);
      body.appendChild(p2);
      const res = func(p2);
      assert.deepEqual(res, {
        ancestorId: null,
        dataId: 'html_p_1',
        localName: 'p',
        prefix: null,
        queryIndex: 1
      }, 'result');
    });

    it('should get result', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      p.id = 'foo';
      body.appendChild(p);
      const res = func(p);
      assert.deepEqual(res, {
        dataId: 'foo'
      }, 'result');
    });

    it('should get value', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const fo =
        document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      const p =
        document.createElementNS('http://www.w3.org/1999/xhtml', 'html:p');
      const body = document.querySelector('body');
      svg.id = 'foo';
      svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:html',
        'http://www.w3.org/1999/xhtml');
      fo.appendChild(p);
      svg.appendChild(fo);
      body.appendChild(svg);
      const res = func(p);
      assert.deepEqual(res, {
        ancestorId: 'foo',
        dataId: 'foo_html:p_0',
        localName: 'p',
        prefix: 'html',
        queryIndex: 0
      }, 'result');
    });

    it('should get value', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const fo =
        document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      const p =
        document.createElementNS('http://www.w3.org/1999/xhtml', 'html:p');
      const body = document.querySelector('body');
      svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:html',
        'http://www.w3.org/1999/xhtml');
      fo.appendChild(p);
      svg.appendChild(fo);
      body.appendChild(svg);
      const res = func(p);
      assert.deepEqual(res, {
        ancestorId: null,
        dataId: 'html_html:p_0',
        localName: 'p',
        prefix: 'html',
        queryIndex: 0
      }, 'result');
    });
  });

  describe('set temporary file data', () => {
    const func = mjs.setTmpFileData;
    beforeEach(() => {
      mjs.dataIds.clear();
    });
    afterEach(() => {
      mjs.dataIds.clear();
    });

    it('should not set data', () => {
      const res = func();
      assert.strictEqual(mjs.dataIds.size, 0, 'size');
      assert.strictEqual(res, null, 'result');
    });

    it('should set data', () => {
      const res = func({
        [TMP_FILE_CREATE]: {
          dataId: 'foo',
          mode: MODE_EDIT
        }
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('foo'), true, 'set');
      assert.strictEqual(res instanceof Map, true, 'result');
    });

    it('should set data', () => {
      const res = func({
        [TMP_FILE_CREATE]: {
          dataId: 'foo',
          mode: MODE_EDIT_HTML
        }
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('foo'), true, 'set');
      assert.strictEqual(res instanceof Map, true, 'result');
    });

    it('should set data', () => {
      const res = func({
        [TMP_FILE_CREATE]: {
          dataId: 'foo',
          mode: MODE_EDIT_MD
        }
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('foo'), true, 'set');
      assert.strictEqual(res instanceof Map, true, 'result');
    });

    it('should set data', () => {
      const res = func({
        [TMP_FILE_CREATE]: {
          dataId: 'foo',
          mode: MODE_EDIT_TXT
        }
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('foo'), true, 'set');
      assert.strictEqual(res instanceof Map, true, 'result');
    });

    it('should not set data', () => {
      const res = func({
        [TMP_FILE_CREATE]: {
          dataId: 'foo',
          mode: MODE_SOURCE
        }
      });
      assert.strictEqual(mjs.dataIds.size, 0, 'size');
      assert.strictEqual(res, null, 'result');
    });
  });

  describe('update temporary file data', () => {
    const func = mjs.updateTmpFileData;
    beforeEach(() => {
      mjs.dataIds.clear();
    });
    afterEach(() => {
      mjs.dataIds.clear();
    });

    it('should not set data', () => {
      const res = func();
      assert.strictEqual(mjs.dataIds.size, 0, 'size');
      assert.strictEqual(res, null, 'result');
    });

    it('should set data', () => {
      const res = func({
        data: {
          dataId: 'foo',
          mode: MODE_EDIT
        }
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('foo'), true, 'set');
      assert.strictEqual(res instanceof Map, true, 'result');
    });

    it('should set data', () => {
      const res = func({
        data: {
          dataId: 'foo',
          mode: MODE_EDIT_HTML
        }
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('foo'), true, 'set');
      assert.strictEqual(res instanceof Map, true, 'result');
    });

    it('should set data', () => {
      const res = func({
        data: {
          dataId: 'foo',
          mode: MODE_EDIT_MD
        }
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('foo'), true, 'set');
      assert.strictEqual(res instanceof Map, true, 'result');
    });

    it('should set data', () => {
      const res = func({
        data: {
          dataId: 'foo',
          mode: MODE_EDIT_TXT
        }
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('foo'), true, 'set');
      assert.strictEqual(res instanceof Map, true, 'result');
    });

    it('should not set data', () => {
      const res = func({
        data: {
          dataId: 'foo',
          mode: MODE_SOURCE
        }
      });
      assert.strictEqual(mjs.dataIds.size, 0, 'size');
      assert.strictEqual(res, null, 'result');
    });
  });

  describe('remove temporary file data', () => {
    const func = mjs.removeTmpFileData;
    beforeEach(() => {
      mjs.dataIds.clear();
      mjs.vars[ID_TAB] = '1';
    });
    afterEach(() => {
      mjs.dataIds.clear();
      mjs.vars[ID_TAB] = '';
    });

    it('should not remove data', () => {
      mjs.dataIds.set('foo', 'bar');
      const res = func();
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('foo'), true, 'map');
      assert.strictEqual(res, false, 'result');
    });

    it('should remove data', () => {
      mjs.dataIds.set('foo', 'bar');
      const res = func({
        data: {
          dataId: 'foo',
          tabId: '1',
          timestamp: -1
        }
      });
      assert.strictEqual(mjs.dataIds.size, 0, 'size');
      assert.strictEqual(res, true, 'result');
    });

    it('should not remove data', () => {
      mjs.dataIds.set('foo', 'bar');
      const res = func({
        data: {
          dataId: 'foo',
          tabId: '1',
          timestamp: 0
        }
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('foo'), true, 'map');
      assert.strictEqual(res, false, 'result');
    });
  });

  describe('fetch file source and create temporary file data', () => {
    const func = mjs.fetchSource;
    const globalDispatcher = getGlobalDispatcher();
    const mockAgent = new MockAgent();
    beforeEach(() => {
      setGlobalDispatcher(mockAgent);
      mockAgent.disableNetConnect();
    });
    afterEach(() => {
      mockAgent.enableNetConnect();
      setGlobalDispatcher(globalDispatcher);
    });

    it('should get object', async () => {
      const url = new URL('https://localhost/');
      mockAgent.get(url.origin)
        .intercept({ path: url.pathname, method: 'GET' }).reply(200, 'foo', {
          headers: {
            'content-type': 'text/plain'
          }
        });
      const res = await func({});
      assert.strictEqual(
        Object.hasOwn(res, 'createTmpFile'), true,
        'prop');
      assert.strictEqual(Object.hasOwn(res, 'value'),
        true, 'prop');
      assert.strictEqual(res.value, 'foo', 'value');
    });

    it('should get object', async () => {
      const url = new URL('file:///foo/bar');
      const dom = createJsdom('file:///foo/bar');
      window = dom.window;
      document = window.document;
      global.window = window;
      global.document = document;
      const res = await func({});
      assert.deepEqual(res, {
        [LOCAL_FILE_VIEW]: {
          uri: url.href
        }
      }, 'result');
    });
  });

  describe('create temporary file data', () => {
    const func = mjs.createTmpFileData;
    const globalDispatcher = getGlobalDispatcher();
    const mockAgent = new MockAgent();
    beforeEach(() => {
      setGlobalDispatcher(mockAgent);
      mockAgent.disableNetConnect();
    });
    afterEach(() => {
      mockAgent.enableNetConnect();
      setGlobalDispatcher(globalDispatcher);
    });

    it('should get object', async () => {
      const url = new URL('https://localhost/');
      mockAgent.get(url.origin)
        .intercept({ path: url.pathname, method: 'GET' }).reply(200, 'foo', {
          headers: {
            'content-type': 'text/plain'
          }
        });
      const res = await func();
      assert.strictEqual(
        Object.hasOwn(res, 'createTmpFile'), true,
        'prop');
      assert.strictEqual(Object.hasOwn(res, 'value'),
        true, 'prop');
      assert.strictEqual(res.value, 'foo', 'value');
    });

    it('should get object', async () => {
      const url = new URL('https://localhost/');
      mockAgent.get(url.origin)
        .intercept({ path: url.pathname, method: 'GET' }).reply(200, 'foo', {
          headers: {
            'content-type': 'text/plain'
          }
        });
      const res = await func({
        mode: MODE_SOURCE
      });
      assert.strictEqual(
        Object.hasOwn(res, 'createTmpFile'), true,
        'prop');
      assert.strictEqual(Object.hasOwn(res, 'value'),
        true, 'prop');
      assert.strictEqual(res.value, 'foo', 'value');
    });

    it('should get object', async () => {
      const res = await func({
        mode: MODE_EDIT,
        dataId: 'foo',
        value: 'bar'
      });
      assert.strictEqual(
        Object.hasOwn(res, 'createTmpFile'), true,
        'prop');
      assert.strictEqual(res.createTmpFile.dataId, 'foo', 'value');
      assert.strictEqual(res.createTmpFile.extType, '.txt', 'value');
      assert.strictEqual(Object.hasOwn(res, 'value'),
        true, 'prop');
      assert.strictEqual(res.value, 'bar', 'value');
    });

    it('should get object', async () => {
      const res = await func({
        mode: MODE_EDIT,
        dataId: 'foo',
        namespaceURI: 'http://www.w3.org/1999/xhtml',
        value: 'bar'
      });
      assert.strictEqual(
        Object.hasOwn(res, 'createTmpFile'), true,
        'prop');
      assert.strictEqual(res.createTmpFile.dataId, 'foo', 'value');
      assert.strictEqual(res.createTmpFile.extType, '.txt', 'value');
      assert.strictEqual(res.createTmpFile.namespaceURI,
        'http://www.w3.org/1999/xhtml', 'value');
      assert.strictEqual(Object.hasOwn(res, 'value'),
        true, 'prop');
      assert.strictEqual(res.value, 'bar', 'value');
    });

    it('should get object', async () => {
      const res = await func({
        mode: MODE_EDIT_TXT,
        dataId: 'foo',
        value: 'bar'
      });
      assert.strictEqual(
        Object.hasOwn(res, 'createTmpFile'), true,
        'prop');
      assert.strictEqual(res.createTmpFile.dataId, 'foo', 'value');
      assert.strictEqual(res.createTmpFile.extType, '.txt', 'value');
      assert.strictEqual(Object.hasOwn(res, 'value'),
        true, 'prop');
      assert.strictEqual(res.value, 'bar', 'value');
    });

    it('should get object', async () => {
      const res = await func({
        mode: MODE_EDIT_TXT,
        dataId: 'foo',
        namespaceURI: 'http://www.w3.org/1999/xhtml',
        value: 'bar'
      });
      assert.strictEqual(
        Object.hasOwn(res, 'createTmpFile'), true,
        'prop');
      assert.strictEqual(res.createTmpFile.dataId, 'foo', 'value');
      assert.strictEqual(res.createTmpFile.extType, '.txt', 'value');
      assert.strictEqual(res.createTmpFile.namespaceURI,
        'http://www.w3.org/1999/xhtml', 'value');
      assert.strictEqual(Object.hasOwn(res, 'value'),
        true, 'prop');
      assert.strictEqual(res.value, 'bar', 'value');
    });

    it('should get object', async () => {
      const res = await func({
        mode: MODE_EDIT_HTML,
        dataId: 'foo',
        value: 'bar'
      });
      assert.strictEqual(
        Object.hasOwn(res, 'createTmpFile'), true,
        'prop');
      assert.strictEqual(res.createTmpFile.dataId, 'foo', 'value');
      assert.strictEqual(res.createTmpFile.extType, '.html', 'value');
      assert.strictEqual(Object.hasOwn(res, 'value'),
        true, 'prop');
      assert.strictEqual(res.value, 'bar', 'value');
    });

    it('should get object', async () => {
      const res = await func({
        mode: MODE_EDIT_HTML,
        dataId: 'foo',
        namespaceURI: 'http://www.w3.org/1999/xhtml',
        value: 'bar'
      });
      assert.strictEqual(
        Object.hasOwn(res, 'createTmpFile'), true,
        'prop');
      assert.strictEqual(res.createTmpFile.dataId, 'foo', 'value');
      assert.strictEqual(res.createTmpFile.extType, '.html', 'value');
      assert.strictEqual(res.createTmpFile.namespaceURI,
        'http://www.w3.org/1999/xhtml', 'value');
      assert.strictEqual(Object.hasOwn(res, 'value'),
        true, 'prop');
      assert.strictEqual(res.value, 'bar', 'value');
    });

    it('should get object', async () => {
      const res = await func({
        mode: MODE_EDIT_MD,
        dataId: 'foo',
        value: 'bar'
      });
      assert.strictEqual(
        Object.hasOwn(res, 'createTmpFile'), true,
        'prop');
      assert.strictEqual(res.createTmpFile.dataId, 'foo', 'value');
      assert.strictEqual(res.createTmpFile.extType, '.md', 'value');
      assert.strictEqual(Object.hasOwn(res, 'value'),
        true, 'prop');
      assert.strictEqual(res.value, 'bar', 'value');
    });

    it('should get object', async () => {
      const res = await func({
        mode: MODE_EDIT_MD,
        dataId: 'foo',
        namespaceURI: 'http://www.w3.org/1999/xhtml',
        value: 'bar'
      });
      assert.strictEqual(
        Object.hasOwn(res, 'createTmpFile'), true,
        'prop');
      assert.strictEqual(res.createTmpFile.dataId, 'foo', 'value');
      assert.strictEqual(res.createTmpFile.extType, '.md', 'value');
      assert.strictEqual(res.createTmpFile.namespaceURI,
        'http://www.w3.org/1999/xhtml', 'value');
      assert.strictEqual(Object.hasOwn(res, 'value'),
        true, 'prop');
      assert.strictEqual(res.value, 'bar', 'value');
    });

    it('should get object', async () => {
      const url = new URL('https://localhost/');
      mockAgent.get(url.origin)
        .intercept({ path: url.pathname, method: 'GET' }).reply(200, 'foo', {
          headers: {
            'content-type': 'text/plain'
          }
        });
      const res = await func({
        mode: MODE_EDIT
      });
      assert.strictEqual(
        Object.hasOwn(res, 'createTmpFile'), true,
        'prop');
      assert.strictEqual(Object.hasOwn(res, 'value'),
        true, 'prop');
      assert.strictEqual(res.value, 'foo', 'value');
    });

    it('should get object', async () => {
      const res = await func({
        mode: MODE_MATHML,
        value: 'bar'
      });
      assert.strictEqual(
        Object.hasOwn(res, 'createTmpFile'), true,
        'prop');
      assert.strictEqual(res.createTmpFile.dataId, 'index', 'value');
      assert.strictEqual(res.createTmpFile.extType, '.mml', 'value');
      assert.strictEqual(Object.hasOwn(res, 'value'),
        true, 'prop');
      assert.strictEqual(res.value, 'bar', 'value');
    });

    it('should get object', async () => {
      const res = await func({
        mode: MODE_SVG,
        value: 'bar'
      });
      assert.strictEqual(
        Object.hasOwn(res, 'createTmpFile'), true,
        'prop');
      assert.strictEqual(res.createTmpFile.dataId, 'index', 'value');
      assert.strictEqual(res.createTmpFile.extType, '.svg', 'value');
      assert.strictEqual(Object.hasOwn(res, 'value'),
        true, 'prop');
      assert.strictEqual(res.value, 'bar', 'value');
    });

    it('should get object', async () => {
      const url = new URL('https://localhost/');
      mockAgent.get(url.origin)
        .intercept({ path: url.pathname, method: 'GET' }).reply(200, 'foo', {
          headers: {
            'content-type': 'text/plain'
          }
        });
      const res = await func({
        mode: MODE_SVG
      });
      assert.strictEqual(
        Object.hasOwn(res, 'createTmpFile'), true,
        'prop');
      assert.strictEqual(Object.hasOwn(res, 'value'),
        true, 'prop');
      assert.strictEqual(res.value, 'foo', 'value');
    });

    it('should get object', async () => {
      const res = await func({
        mode: MODE_SELECTION,
        value: 'bar'
      });
      assert.strictEqual(
        Object.hasOwn(res, 'createTmpFile'), true,
        'prop');
      assert.strictEqual(res.createTmpFile.dataId, 'index', 'value');
      assert.strictEqual(res.createTmpFile.extType, '.xml', 'value');
      assert.strictEqual(Object.hasOwn(res, 'value'),
        true, 'prop');
      assert.strictEqual(res.value, 'bar', 'value');
    });

    it('should get object', async () => {
      const url = new URL('https://localhost/');
      mockAgent.get(url.origin)
        .intercept({ path: url.pathname, method: 'GET' }).reply(200, 'foo', {
          headers: {
            'content-type': 'text/plain'
          }
        });
      const res = await func({
        mode: MODE_SELECTION
      });
      assert.strictEqual(
        Object.hasOwn(res, 'createTmpFile'), true,
        'prop');
      assert.strictEqual(Object.hasOwn(res, 'value'),
        true, 'prop');
      assert.strictEqual(res.value, 'foo', 'value');
    });
  });

  describe('send message', () => {
    const func = mjs.sendMsg;

    it('should not call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const res = await func();
      assert.strictEqual(browser.runtime.sendMessage.callCount, i,
        'not called');
      assert.strictEqual(res, null, 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const res = await func('foo');
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(res, {}, 'result');
    });
  });

  describe('sendEachDataId', () => {
    const func = mjs.sendEachDataId;
    beforeEach(() => {
      mjs.dataIds.clear();
    });
    afterEach(() => {
      mjs.dataIds.clear();
    });

    it('should not call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const res = await func();
      assert.strictEqual(browser.runtime.sendMessage.callCount, i,
        'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const p = document.createElement('p');
      const p2 = document.createElement('p');
      const body = document.querySelector('body');
      p.id = 'foo';
      p2.id = 'bar';
      body.appendChild(p);
      body.appendChild(p2);
      mjs.dataIds.set('foo', {
        dataId: 'foo'
      });
      mjs.dataIds.set('bar', {
        dataId: 'bar'
      });
      const res = await func(true);
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 2,
        'called');
      assert.deepEqual(res, [{}, {}], 'result');
    });
  });

  describe('send temporary file data', () => {
    const func = mjs.sendTmpFileData;
    beforeEach(() => {
      mjs.dataIds.clear();
    });
    afterEach(() => {
      mjs.dataIds.clear();
    });

    it('should not call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const res = await func();
      assert.strictEqual(browser.runtime.sendMessage.callCount, i,
        'not called');
      assert.strictEqual(res, null, 'result');
    });

    it('should call function', async () => {
      mjs.dataIds.set('foo', 'bar');
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const res = await func('foo');
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(res, {}, 'result');
    });
  });

  describe('request temporary file', () => {
    const func = mjs.requestTmpFile;
    beforeEach(() => {
      mjs.dataIds.clear();
    });
    afterEach(() => {
      mjs.dataIds.clear();
    });

    it('should not call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const p = document.createElement('p');
      const res = await func({
        currentTarget: p,
        target: p
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i,
        'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const p = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = await func({
        currentTarget: p,
        target: p
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i,
        'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const p = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(p);
      mjs.dataIds.set('html_p_0', {});
      const res = await func({
        currentTarget: p,
        target: p
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(res, [{}], 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const p = document.createElement('p');
      const p2 = document.createElement('p');
      const p3 = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(p);
      body.appendChild(p2);
      body.appendChild(p3);
      mjs.dataIds.set('html_p_0', {
        controls: ['html_p_1', 'html_p_2']
      });
      mjs.dataIds.set('html_p_1', {});
      const res = await func({
        currentTarget: p,
        target: p
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(res, [{}], 'result');
    });

    it('should not call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const p = document.createElement('p');
      const textarea = document.createElement('textarea');
      const body = document.querySelector('body');
      p.appendChild(textarea);
      body.appendChild(p);
      const res = await func({
        currentTarget: p,
        target: textarea
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i,
        'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const p = document.createElement('p');
      const textarea = document.createElement('textarea');
      const body = document.querySelector('body');
      p.classList.add('ace_editor');
      p.appendChild(textarea);
      body.appendChild(p);
      mjs.dataIds.set('html_p_0', {});
      const res = await func({
        currentTarget: p,
        target: textarea
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i,
        'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const p = document.createElement('p');
      const textarea = document.createElement('textarea');
      const body = document.querySelector('body');
      textarea.classList.add('ace_text-input');
      p.classList.add('ace_editor');
      p.appendChild(textarea);
      body.appendChild(p);
      mjs.dataIds.set('html_p_0', {});
      const res = await func({
        currentTarget: p,
        target: textarea
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(res, [{}], 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const p = document.createElement('p');
      const textarea0 = document.createElement('textarea');
      const textarea = document.createElement('textarea');
      const body = document.querySelector('body');
      textarea.classList.add('ace_text-input');
      p.classList.add('ace_editor');
      p.appendChild(textarea0);
      p.appendChild(textarea);
      body.appendChild(p);
      mjs.dataIds.set('html_p_0', {});
      const res = await func({
        currentTarget: p,
        target: textarea
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(res, [{}], 'result');
    });
  });

  describe('set data ID controller', () => {
    const func = mjs.setDataIdController;
    beforeEach(() => {
      mjs.dataIds.clear();
    });
    afterEach(() => {
      mjs.dataIds.clear();
    });

    it('should not set data', () => {
      func();
      assert.strictEqual(mjs.dataIds.size, 0, 'size');
    });

    it('should not set data', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(p);
      func(p, 'foo');
      assert.strictEqual(mjs.dataIds.size, 0, 'size');
    });

    it('should not set data', () => {
      const span = document.createElement('span');
      const p = document.createElement('p');
      const div = document.createElement('div');
      p.appendChild(span);
      p.setAttribute('contenteditable', 'true');
      if (typeof p.isContentEditable !== 'boolean') {
        p.isContentEditable = isContentEditable(p);
      }
      div.appendChild(p);
      func(span, 'foo');
      assert.strictEqual(mjs.dataIds.size, 0, 'size');
    });

    it('should set data', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      p.setAttribute('contenteditable', 'true');
      if (typeof p.isContentEditable !== 'boolean') {
        p.isContentEditable = isContentEditable(p);
      }
      body.appendChild(p);
      func(p, 'foo');
      assert.strictEqual(mjs.dataIds.size, 2, 'size');
      assert.strictEqual(mjs.dataIds.has('html_p_0'), true, 'map');
      assert.deepEqual(mjs.dataIds.get('html_p_0').controls, ['foo'],
        'controls');
      assert.strictEqual(mjs.dataIds.has('foo'), true, 'map');
      assert.strictEqual(mjs.dataIds.get('foo').controlledBy, 'html_p_0',
        'controlled by');
    });

    it('should set data', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      p.setAttribute('contenteditable', 'true');
      if (typeof p.isContentEditable !== 'boolean') {
        p.isContentEditable = isContentEditable(p);
      }
      body.appendChild(p);
      mjs.dataIds.set('html_p_0', {
        controls: ['bar']
      });
      func(p, 'foo');
      assert.strictEqual(mjs.dataIds.size, 2, 'size');
      assert.strictEqual(mjs.dataIds.has('html_p_0'), true, 'map');
      assert.deepEqual(mjs.dataIds.get('html_p_0').controls, ['bar', 'foo'],
        'controls');
      assert.strictEqual(mjs.dataIds.has('foo'), true, 'map');
      assert.strictEqual(mjs.dataIds.get('foo').controlledBy, 'html_p_0',
        'controlled by');
    });

    it('should set data', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      p.setAttribute('contenteditable', 'true');
      if (typeof p.isContentEditable !== 'boolean') {
        p.isContentEditable = isContentEditable(p);
      }
      body.appendChild(p);
      mjs.dataIds.set('html_p_0', {});
      func(p, 'foo');
      assert.strictEqual(mjs.dataIds.size, 2, 'size');
      assert.strictEqual(mjs.dataIds.has('html_p_0'), true, 'map');
      assert.deepEqual(mjs.dataIds.get('html_p_0').controls, ['foo'],
        'controls');
      assert.strictEqual(mjs.dataIds.has('foo'), true, 'map');
      assert.strictEqual(mjs.dataIds.get('foo').controlledBy, 'html_p_0',
        'controlled by');
    });
  });

  describe('create content data', () => {
    const func = mjs.createContentData;
    beforeEach(() => {
      mjs.dataIds.clear();
      mjs.vars.enableSyncAuto = false;
      mjs.vars.incognito = false;
      mjs.vars.syncAutoUrls = null;
    });
    afterEach(() => {
      mjs.dataIds.clear();
      mjs.vars.enableSyncAuto = false;
      mjs.vars.incognito = false;
      mjs.vars.syncAutoUrls = null;
    });

    it('should get default object', async () => {
      const res = await func();
      assert.strictEqual(res.mode, MODE_SOURCE, 'result');
    });

    it('should get default object', async () => {
      const body = document.querySelector('body');
      const res = await func(body, MODE_SOURCE);
      assert.strictEqual(res.mode, MODE_SOURCE, 'result');
    });

    it('should get object', async () => {
      mjs.vars.incognito = true;
      const body = document.querySelector('body');
      const res = await func(body, MODE_SOURCE);
      assert.strictEqual(res.mode, MODE_SOURCE, 'mode');
      assert.strictEqual(res.incognito, true, 'incognito');
      assert.strictEqual(res.dir, TMP_FILES_PB, 'dir');
    });

    it('should get default object', async () => {
      const dom = createJsdom('file:///foo/bar');
      window = dom.window;
      document = window.document;
      global.window = window;
      global.document = document;
      const body = document.querySelector('body');
      const res = await func(body, MODE_SOURCE);
      assert.strictEqual(res.mode, MODE_SOURCE, 'mode');
      assert.strictEqual(res.host, LABEL, 'host');
    });

    it('should get default object', async () => {
      const textarea = document.createElement('textarea');
      const res = await func(textarea, MODE_EDIT);
      assert.strictEqual(res.mode, MODE_SOURCE, 'result');
    });

    it('should get object', async () => {
      const textarea = document.createElement('textarea');
      const body = document.querySelector('body');
      body.appendChild(textarea);
      const res = await func(textarea, MODE_EDIT);
      assert.strictEqual(res.mode, MODE_EDIT, 'mode');
      assert.strictEqual(res.dataId, 'html_textarea_0', 'data ID');
    });

    it('should get object', async () => {
      const textarea = document.createElement('textarea');
      const body = document.querySelector('body');
      body.appendChild(textarea);
      mjs.vars.enableSyncAuto = true;
      mjs.vars.syncAutoUrls = document.location.href;
      const res = await func(textarea, MODE_EDIT);
      assert.strictEqual(res.mode, MODE_EDIT, 'mode');
      assert.strictEqual(res.dataId, 'html_textarea_0', 'data ID');
      assert.strictEqual(res.syncAuto, true, 'sync');
    });

    it('should get object', async () => {
      const p = document.createElement('p');
      const span = document.createElement('span');
      const span2 = document.createElement('span');
      const br = document.createElement('br');
      const body = document.querySelector('body');
      span.textContent = 'baz qux';
      span.classList.add('CodeMirror-line');
      span2.textContent = 'quux';
      span2.classList.add('CodeMirror-line');
      br.classList.add('CodeMirror-line');
      p.id = 'foobar';
      p.classList.add('CodeMirror');
      p.setAttribute('contenteditable', 'true');
      if (typeof p.isContentEditable !== 'boolean') {
        p.isContentEditable = isContentEditable(p);
      }
      p.appendChild(span);
      p.appendChild(br);
      p.appendChild(span2);
      body.appendChild(p);
      const res = await func(p, MODE_EDIT);
      assert.strictEqual(res.mode, MODE_EDIT, 'mode');
      assert.strictEqual(res.dataId, 'foobar', 'dataId');
      assert.strictEqual(res.value, 'baz qux\nquux', 'value');
      assert.strictEqual(res.liveEditKey, 'codeMirror', 'key');
    });

    it('should get object', async () => {
      const p = document.createElement('p');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      span.classList.add('CodeMirror-line');
      p.id = 'foobar';
      p.classList.add('CodeMirror');
      p.setAttribute('contenteditable', 'true');
      if (typeof p.isContentEditable !== 'boolean') {
        p.isContentEditable = isContentEditable(p);
      }
      p.appendChild(span);
      body.appendChild(p);
      const res = await func(p, MODE_EDIT);
      assert.strictEqual(res.mode, MODE_EDIT, 'mode');
      assert.strictEqual(res.dataId, 'foobar', 'dataId');
      assert.strictEqual(res.value, '', 'value');
      assert.strictEqual(res.liveEditKey, 'codeMirror', 'key');
    });

    it('should get object', async () => {
      const p = document.createElement('p');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      p.setAttribute('contenteditable', 'true');
      if (typeof p.isContentEditable !== 'boolean') {
        p.isContentEditable = isContentEditable(p);
      }
      p.appendChild(span);
      body.appendChild(p);
      const res = await func(p, MODE_EDIT);
      assert.strictEqual(res.mode, MODE_EDIT, 'mode');
      assert.strictEqual(res.dataId, 'html_p_0', 'dataId');
      assert.strictEqual(res.value, '', 'value');
    });

    it('should get object', async () => {
      const p = document.createElement('p');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      p.setAttribute('contenteditable', 'true');
      if (typeof p.isContentEditable !== 'boolean') {
        p.isContentEditable = isContentEditable(p);
      }
      p.appendChild(span);
      body.appendChild(p);
      const res = await func(span, MODE_EDIT);
      assert.strictEqual(res.mode, MODE_EDIT, 'mode');
      assert.strictEqual(res.dataId, 'html_span_0', 'dataId');
      assert.strictEqual(res.value, '', 'value');
    });

    it('should get object', async () => {
      const sel = window.getSelection();
      const range = document.createRange();
      const div = document.createElement('div');
      const p = document.createElement('p');
      const span = document.createElement('span');
      const span2 = document.createElement('span');
      const body = document.querySelector('body');
      span.textContent = 'foo';
      span.textContent = 'bar';
      p.appendChild(span);
      p.appendChild(span2);
      div.setAttribute('contenteditable', 'true');
      if (typeof div.isContentEditable !== 'boolean') {
        div.isContentEditable = isContentEditable(div);
      }
      div.appendChild(p);
      body.appendChild(div);
      range.setStart(span, 0);
      range.setEnd(span2, 0);
      sel.addRange(range);
      const res = await func(span, MODE_EDIT);
      assert.strictEqual(res.mode, MODE_EDIT, 'mode');
      assert.strictEqual(res.dataId, 'html_span_0', 'dataId');
      assert.strictEqual(res.value, 'bar', 'value');
    });

    it('should get object', async () => {
      const div = document.createElement('div');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const text =
        document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const body = document.querySelector('body');
      text.textContent = 'foo';
      svg.appendChild(text);
      div.setAttribute('contenteditable', 'true');
      if (typeof div.isContentEditable === 'boolean') {
        div.isContentEditable = isContentEditable(div);
      }
      div.appendChild(svg);
      body.appendChild(div);
      const res = await func(text, MODE_EDIT);
      assert.strictEqual(res.mode, MODE_EDIT, 'mode');
      assert.strictEqual(res.dataId, 'html_text_0', 'dataId');
      assert.strictEqual(res.value, 'foo', 'value');
      assert.strictEqual(res.namespaceURI, 'http://www.w3.org/2000/svg', 'ns');
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('html_text_0'), true, 'dataId');
    });

    it('should get object', async () => {
      const div = document.createElement('div');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const text =
        document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const body = document.querySelector('body');
      svg.appendChild(text);
      div.setAttribute('contenteditable', 'true');
      if (typeof div.isContentEditable === 'boolean') {
        div.isContentEditable = isContentEditable(div);
      }
      div.appendChild(svg);
      body.appendChild(div);
      const res = await func(text, MODE_EDIT);
      assert.strictEqual(res.mode, MODE_EDIT, 'mode');
      assert.strictEqual(res.dataId, 'html_text_0', 'dataId');
      assert.strictEqual(res.value, '', 'value');
      assert.strictEqual(res.namespaceURI, 'http://www.w3.org/2000/svg', 'ns');
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('html_text_0'), true, 'dataId');
    });

    it('should get object', async () => {
      const sel = window.getSelection();
      const range = document.createRange();
      const div = document.createElement('div');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const text =
        document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const body = document.querySelector('body');
      text.textContent = 'foo';
      svg.appendChild(text);
      div.setAttribute('contenteditable', 'true');
      if (typeof div.isContentEditable === 'boolean') {
        div.isContentEditable = isContentEditable(div);
      }
      div.appendChild(svg);
      body.appendChild(div);
      range.selectNodeContents(text);
      sel.removeAllRanges();
      sel.addRange(range);
      const res = await func(text, MODE_EDIT);
      assert.strictEqual(res.mode, MODE_EDIT, 'mode');
      assert.strictEqual(res.dataId, 'html_text_0', 'dataId');
      assert.strictEqual(res.value, 'foo', 'value');
      assert.strictEqual(res.namespaceURI, 'http://www.w3.org/2000/svg', 'ns');
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('html_text_0'), true, 'dataId');
    });

    it('should get default object', async () => {
      const body = document.querySelector('body');
      const res = await func(body, MODE_MATHML);
      assert.strictEqual(res.mode, MODE_SOURCE, 'result');
    });

    it('should get object', async () => {
      const math =
        document.createElementNS('http://www.w3.org/1998/Math/MathML', 'math');
      const body = document.querySelector('body');
      body.appendChild(math);
      const res = await func(math, MODE_MATHML);
      assert.strictEqual(res.mode, MODE_MATHML, 'mode');
      assert.strictEqual(res.value,
        '<math xmlns="http://www.w3.org/1998/Math/MathML"/>\n',
        'value');
    });

    it('should get default object', async () => {
      const body = document.querySelector('body');
      const res = await func(body, MODE_SVG);
      assert.strictEqual(res.mode, MODE_SOURCE, 'result');
    });

    it('should get object', async () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const body = document.querySelector('body');
      body.appendChild(svg);
      const res = await func(svg, MODE_SVG);
      assert.strictEqual(res.mode, MODE_SVG, 'mode');
      assert.strictEqual(res.value,
        '<svg xmlns="http://www.w3.org/2000/svg"/>\n',
        'value');
    });

    it('should get default object', async () => {
      const body = document.querySelector('body');
      const res = await func(body, MODE_SELECTION);
      assert.strictEqual(res.mode, MODE_SOURCE, 'result');
    });

    it('should get object', async () => {
      const sel = window.getSelection();
      const range = document.createRange();
      const elm = document.createElement('p');
      const text = document.createTextNode('foo');
      const body = document.querySelector('body');
      elm.appendChild(text);
      body.appendChild(elm);
      range.selectNode(text);
      sel.removeAllRanges();
      sel.addRange(range);
      const res = await func(body, MODE_SELECTION);
      assert.strictEqual(res.mode, MODE_SELECTION, 'mode');
      assert.strictEqual(res.value,
        '<p xmlns="http://www.w3.org/1999/xhtml">foo</p>\n',
        'value');
    });
  });

  describe('create content data message', () => {
    const func = mjs.createContentDataMsg;

    it('should get null', async () => {
      const res = await func();
      assert.strictEqual(res, null, 'result');
    });

    it('should get null', async () => {
      const res = await func({
        foo: 'bar'
      });
      assert.strictEqual(res, null, 'result');
    });

    it('should get object', async () => {
      const res = await func({
        [TMP_FILE_CREATE]: {},
        value: 'foo'
      });
      assert.deepEqual(res, {
        [TMP_FILE_CREATE]: {
          data: {},
          value: 'foo'
        }
      }, 'result');
    });

    it('should get object', async () => {
      const res = await func({
        [LOCAL_FILE_VIEW]: {
          uri: 'file:///foo/bar'
        }
      });
      assert.deepEqual(res, {
        [LOCAL_FILE_VIEW]: 'file:///foo/bar'
      }, 'result');
    });
  });

  describe('send content data', () => {
    const func = mjs.sendContent;
    beforeEach(() => {
      mjs.dataIds.clear();
    });
    afterEach(() => {
      mjs.dataIds.clear();
    });

    it('should not call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const res = await func();
      assert.strictEqual(browser.runtime.sendMessage.callCount, i,
        'not called');
      assert.strictEqual(mjs.dataIds.size, 0, 'data');
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const text = document.createElement('textarea');
      const body = document.querySelector('body');
      body.appendChild(text);
      const res = await func(text, MODE_EDIT);
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.strictEqual(mjs.dataIds.size, 1, 'data');
      assert.deepEqual(res[0], {}, 'result');
      assert.strictEqual(res[1] instanceof Map, true, 'map');
    });
  });

  describe('get context mode', () => {
    const func = mjs.getContextMode;

    it('should get result', () => {
      const res = func();
      assert.strictEqual(res, MODE_SOURCE, 'result');
    });

    it('should get result', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const body = document.querySelector('body');
      body.appendChild(svg);
      const res = func(svg);
      assert.strictEqual(res, MODE_SVG, 'result');
    });

    it('should get result', () => {
      const math =
        document.createElementNS('http://www.w3.org/1998/Math/MathML', 'math');
      const body = document.querySelector('body');
      body.appendChild(math);
      const res = func(math);
      assert.strictEqual(res, MODE_MATHML, 'result');
    });

    it('should get result', () => {
      const sel = window.getSelection();
      const range = document.createRange();
      const elm = document.createElement('p');
      const text = document.createTextNode('foo');
      const body = document.querySelector('body');
      elm.appendChild(text);
      body.appendChild(elm);
      range.selectNode(text);
      sel.removeAllRanges();
      sel.addRange(range);
      const res = func(elm);
      assert.strictEqual(res, MODE_SELECTION, 'result');
    });

    it('should get result', () => {
      const sel = window.getSelection();
      const range = document.createRange();
      const elm = document.createElement('p');
      const text = document.createTextNode('foo');
      const body = document.querySelector('body');
      elm.appendChild(text);
      body.appendChild(elm);
      range.setStart(elm, 0);
      range.setEnd(text, 1);
      sel.removeAllRanges();
      sel.addRange(range);
      const res = func(elm);
      assert.strictEqual(res, MODE_SELECTION, 'result');
    });

    it('should get result', () => {
      const sel = window.getSelection();
      const range = document.createRange();
      const elm = document.createElement('p');
      const text = document.createTextNode('foo');
      const body = document.querySelector('body');
      elm.appendChild(text);
      body.appendChild(elm);
      range.setStart(text, 0);
      range.setEnd(text, 1);
      sel.removeAllRanges();
      sel.addRange(range);
      const res = func(elm);
      assert.strictEqual(res, MODE_SELECTION, 'result');
    });

    it('should get result', () => {
      const sel = window.getSelection();
      const range = document.createRange();
      const elm = document.createElement('p');
      const text = document.createTextNode('foo');
      const body = document.querySelector('body');
      elm.setAttribute('contenteditable', 'true');
      if (typeof elm.isContentEditable !== 'boolean') {
        elm.isContentEditable = isContentEditable(elm);
      }
      elm.appendChild(text);
      body.appendChild(elm);
      range.selectNode(text);
      sel.removeAllRanges();
      sel.addRange(range);
      const res = func(elm);
      assert.strictEqual(res, MODE_EDIT, 'result');
    });
  });

  describe('determine content process', () => {
    const func = mjs.determineContentProcess;
    const globalDispatcher = getGlobalDispatcher();
    const mockAgent = new MockAgent();
    beforeEach(() => {
      setGlobalDispatcher(mockAgent);
      mockAgent.disableNetConnect();
      mjs.vars.contextNode = null;
    });
    afterEach(() => {
      mockAgent.enableNetConnect();
      setGlobalDispatcher(globalDispatcher);
      mjs.vars.contextNode = null;
    });

    it('should call function', async () => {
      const url = new URL('https://localhost/');
      mockAgent.get(url.origin)
        .intercept({ path: url.pathname, method: 'GET' }).reply(200, 'foo', {
          headers: {
            'content-type': 'text/plain'
          }
        });
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const res = await func();
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(res, [
        {},
        null
      ], 'result');
    });

    it('should call function', async () => {
      const url = new URL('https://localhost/');
      mockAgent.get(url.origin)
        .intercept({ path: url.pathname, method: 'GET' }).reply(200, 'foo', {
          headers: {
            'content-type': 'text/plain'
          }
        });
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const p = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(p);
      mjs.vars.contextNode = p;
      const res = await func();
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(res, [
        {},
        null
      ], 'result');
    });

    it('should call function', async () => {
      const url = new URL('https://localhost/');
      mockAgent.get(url.origin)
        .intercept({ path: url.pathname, method: 'GET' }).reply(200, 'foo', {
          headers: {
            'content-type': 'text/plain'
          }
        });
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const p = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(p);
      mjs.vars.contextNode = p;
      const res = await func({
        info: {
          menuItemId: MODE_SOURCE
        }
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(res, [
        {},
        null
      ], 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const text = document.createElement('textarea');
      const body = document.querySelector('body');
      body.appendChild(text);
      mjs.vars.contextNode = text;
      const res = await func({
        info: {
          menuItemId: MODE_EDIT
        }
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(res[0], {}, 'result');
      assert.strictEqual(res[1] instanceof Map, true, 'map');
    });
  });

  describe('create replacing content', () => {
    const func = mjs.createReplacingContent;

    it('should not have child nodes', () => {
      const res = func();
      assert.strictEqual(res.hasChildNodes(), false, 'child nodes');
    });

    it('should not have child nodes', () => {
      const elm = document.createElement('div');
      const body = document.querySelector('body');
      body.appendChild(elm);
      const res = func(elm);
      assert.strictEqual(res.hasChildNodes(), false, 'child nodes');
    });

    it('should not have child nodes', () => {
      const elm = document.createElement('div');
      const body = document.querySelector('body');
      body.appendChild(elm);
      const opt = {
        domstr: true
      };
      const res = func(elm, opt);
      assert.strictEqual(res.hasChildNodes(), false, 'child nodes');
    });

    it('should not have child nodes', () => {
      const elm = document.createElement('div');
      const body = document.querySelector('body');
      body.appendChild(elm);
      const opt = {
        value: true
      };
      const res = func(elm, opt);
      assert.strictEqual(res.hasChildNodes(), false, 'child nodes');
    });

    it('should have child nodes', () => {
      const elm = document.createElement('div');
      const body = document.querySelector('body');
      body.appendChild(elm);
      const opt = {
        value: 'foo'
      };
      const res = func(elm, opt);
      assert.strictEqual(res.hasChildNodes(), true, 'child nodes');
      assert.strictEqual(res.childNodes.length, 1, 'length');
      assert.strictEqual(res.childNodes[0].nodeType, 3, 'type');
      assert.strictEqual(res.childNodes[0].nodeValue, 'foo', 'value');
      assert.strictEqual(res.textContent, 'foo', 'text');
    });

    it('should have child nodes', () => {
      const elm = document.createElement('div');
      const elm2 = document.createElement('div');
      const body = document.querySelector('body');
      elm2.id = 'bar';
      body.appendChild(elm);
      body.appendChild(elm2);
      const opt = {
        controlledBy: 'bar',
        value: 'foo'
      };
      const res = func(elm, opt);
      assert.strictEqual(res.hasChildNodes(), true, 'child nodes');
      assert.strictEqual(res.childNodes.length, 1, 'length');
      assert.strictEqual(res.childNodes[0].nodeType, 3, 'type');
      assert.strictEqual(res.childNodes[0].nodeValue, 'foo', 'value');
      assert.strictEqual(res.textContent, 'foo', 'text');
    });

    it('should have child nodes', () => {
      const elm = document.createElement('div');
      const elm2 = document.createElement('div');
      const body = document.querySelector('body');
      elm2.id = 'bar';
      body.appendChild(elm);
      body.appendChild(elm2);
      const opt = {
        value: 'foo\nbar\n'
      };
      const res = func(elm, opt);
      assert.strictEqual(res.hasChildNodes(), true, 'child nodes');
      assert.strictEqual(res.childNodes.length, 4, 'length');
      assert.strictEqual(res.firstChild.nodeType, 1, 'type');
      assert.strictEqual(res.firstChild.textContent, 'foo', 'content');
      assert.strictEqual(res.lastChild.nodeType, 3, 'type');
      assert.strictEqual(res.lastChild.nodeValue, '\n', 'value');
      assert.strictEqual(res.textContent, 'foo\nbar\n', 'text');
    });

    it('should have child nodes', () => {
      const elm = document.createElement('div');
      const body = document.querySelector('body');
      elm.id = 'bar';
      body.appendChild(elm);
      const opt = {
        controlledBy: 'bar',
        value: 'foo\nbar\n'
      };
      const res = func(elm, opt);
      assert.strictEqual(res.hasChildNodes(), true, 'child nodes');
      assert.strictEqual(res.childNodes.length, 4, 'length');
      assert.strictEqual(res.firstChild.nodeType, 1, 'type');
      assert.strictEqual(res.firstChild.textContent, 'foo', 'content');
      assert.strictEqual(res.lastChild.nodeType, 3, 'type');
      assert.strictEqual(res.lastChild.nodeValue, '\n', 'value');
      assert.strictEqual(res.textContent, 'foo\nbar\n', 'text');
    });

    it('should have child nodes', () => {
      const elm = document.createElement('div');
      const elm2 = document.createElement('div');
      const body = document.querySelector('body');
      elm2.id = 'bar';
      body.appendChild(elm);
      body.appendChild(elm2);
      const opt = {
        domstr: '<p>foo</p>\n<p>bar</p>\n'
      };
      const res = func(elm, opt);
      assert.strictEqual(res.hasChildNodes(), true, 'child nodes');
      assert.strictEqual(res.childNodes.length, 4, 'length');
      assert.strictEqual(res.firstChild.nodeType, 1, 'type');
      assert.strictEqual(res.firstChild.textContent, 'foo', 'content');
      assert.strictEqual(res.lastChild.nodeType, 3, 'type');
      assert.strictEqual(res.lastChild.nodeValue, '\n', 'value');
      assert.strictEqual(res.textContent, 'foo\nbar\n', 'text');
    });

    it('should have child nodes', () => {
      const elm = document.createElement('div');
      const body = document.querySelector('body');
      elm.id = 'bar';
      body.appendChild(elm);
      const opt = {
        controlledBy: 'bar',
        domstr: '<p>foo</p>\n<p>bar</p>\n'
      };
      const res = func(elm, opt);
      assert.strictEqual(res.hasChildNodes(), true, 'child nodes');
      assert.strictEqual(res.childNodes.length, 4, 'length');
      assert.strictEqual(res.firstChild.nodeType, 1, 'type');
      assert.strictEqual(res.firstChild.textContent, 'foo', 'content');
      assert.strictEqual(res.lastChild.nodeType, 3, 'type');
      assert.strictEqual(res.lastChild.nodeValue, '\n', 'value');
      assert.strictEqual(res.textContent, 'foo\nbar\n', 'text');
    });
  });

  describe('replace content of editable element', () => {
    const func = mjs.replaceEditableContent;
    beforeEach(() => {
      mjs.dataIds.clear();
      mjs.vars.contextNode = null;
    });
    afterEach(() => {
      mjs.dataIds.clear();
      mjs.vars.contextNode = null;
    });

    it('should not call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      p.appendChild(span);
      body.appendChild(p);
      func(p);
      assert.strictEqual(spy.called, false, 'not called');
      assert.strictEqual(p.childNodes.length, 1, 'length');
      assert.deepEqual(p.firstChild, span, 'child');
      assert.strictEqual(span.hasChildNodes(), false, 'content');
    });

    it('should not call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      span.textContent = 'foo';
      p.appendChild(span);
      body.appendChild(p);
      func(p, {
        value: 'foo\n'
      });
      assert.strictEqual(spy.called, false, 'not called');
      assert.strictEqual(p.childNodes.length, 1, 'length');
      assert.deepEqual(p.firstChild, span, 'child');
      assert.strictEqual(span.textContent, 'foo', 'content');
    });

    it('should not call function', () => {
      const div = document.createElement('div');
      const spy = sinon.spy(div, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(div);
      mjs.vars.contextNode = div;
      func(div, {
        value: 'foo\n'
      });
      assert.strictEqual(spy.called, false, 'not called');
      assert.strictEqual(div.childNodes.length, 0, 'length');
      assert.strictEqual(div.textContent, '', 'content');
    });

    it('should call function', () => {
      const div = document.createElement('div');
      const stubEvt = sinon.stub(div, 'dispatchEvent');
      stubEvt.returns(true);
      const body = document.querySelector('body');
      body.appendChild(div);
      mjs.vars.contextNode = div;
      mjs.dataIds.set('foo', {});
      func(div, {
        dataId: 'foo',
        value: 'foo\n'
      });
      assert.strictEqual(stubEvt.callCount, 3, 'called');
      assert.strictEqual(div.childNodes.length, 2, 'length');
      assert.strictEqual(div.firstChild.nodeType, 1, 'child');
      assert.strictEqual(div.firstChild.localName, 'div', 'name');
      assert.strictEqual(div.firstChild.textContent, 'foo', 'content');
      assert.strictEqual(div.lastChild.nodeType, 3, 'child');
      assert.strictEqual(div.lastChild.nodeValue, '\n', 'value');
      assert.strictEqual(div.textContent, 'foo\n', 'content');
    });

    it('should call function', () => {
      const div = document.createElement('div');
      const stubEvt = sinon.stub(div, 'dispatchEvent');
      stubEvt.onFirstCall().returns(true);
      stubEvt.onSecondCall().returns(false);
      const body = document.querySelector('body');
      body.appendChild(div);
      mjs.vars.contextNode = div;
      mjs.dataIds.set('foo', {});
      func(div, {
        dataId: 'foo',
        value: 'foo\n'
      });
      assert.strictEqual(stubEvt.callCount, 2, 'called');
      assert.strictEqual(div.childNodes.length, 0, 'length');
      assert.strictEqual(div.textContent, '', 'content');
    });

    it('should not call function', () => {
      const div = document.createElement('div');
      const spy = sinon.spy(div, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(div);
      mjs.vars.contextNode = div;
      mjs.dataIds.set('foo', {
        mutex: true
      });
      func(div, {
        dataId: 'foo',
        value: 'foo\n'
      });
      assert.strictEqual(spy.called, false, 'not called');
      assert.strictEqual(div.childNodes.length, 0, 'length');
      assert.strictEqual(div.textContent, '', 'content');
    });

    it('should not call function', () => {
      const div = document.createElement('div');
      const spy = sinon.spy(div, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(div);
      mjs.vars.contextNode = div;
      func(div, {
        value: 'foo\nbar\n'
      });
      assert.strictEqual(spy.called, false, 'not called');
      assert.strictEqual(div.childNodes.length, 0, 'length');
      assert.strictEqual(div.textContent, '', 'content');
    });

    it('should replace content', () => {
      const div = document.createElement('div');
      const spy = sinon.spy(div, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(div);
      mjs.vars.contextNode = div;
      mjs.dataIds.set('foo', {});
      func(div, {
        dataId: 'foo',
        value: 'foo\nbar\n'
      });
      assert.strictEqual(spy.callCount, 3, 'called');
      assert.strictEqual(div.childNodes.length, 4, 'length');
      assert.strictEqual(div.firstChild.nodeType, 1, 'child');
      assert.strictEqual(div.firstChild.localName, 'div', 'name');
      assert.strictEqual(div.firstChild.textContent, 'foo', 'content');
      assert.strictEqual(div.lastChild.nodeType, 3, 'child');
      assert.strictEqual(div.lastChild.nodeValue, '\n', 'value');
      assert.strictEqual(div.textContent, 'foo\nbar\n', 'content');
    });

    it('should replace content', () => {
      const div = document.createElement('div');
      const spy = sinon.spy(div, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(div);
      mjs.vars.contextNode = div;
      mjs.dataIds.set('foo', {});
      func(div, {
        dataId: 'foo',
        value: '<p>foo</p>\n<p>bar</p>\n'
      });
      assert.strictEqual(spy.callCount, 3, 'called');
      assert.strictEqual(div.childNodes.length, 4, 'length');
      assert.strictEqual(div.firstChild.nodeType, 1, 'child');
      assert.strictEqual(div.firstChild.localName, 'p', 'name');
      assert.strictEqual(div.firstChild.textContent, 'foo', 'content');
      assert.strictEqual(div.lastChild.nodeType, 3, 'child');
      assert.strictEqual(div.lastChild.nodeValue, '\n', 'value');
      assert.strictEqual(div.textContent, 'foo\nbar\n', 'content');
    });

    it('should not call function', () => {
      const div = document.createElement('div');
      const spy = sinon.spy(div, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(div);
      mjs.vars.contextNode = div;
      mjs.dataIds.set('foo', {
        mutex: true
      });
      func(div, {
        dataId: 'foo',
        value: 'foo\nbar\n'
      });
      assert.strictEqual(spy.called, false, 'not called');
      assert.strictEqual(div.childNodes.length, 0, 'length');
      assert.strictEqual(div.textContent, '', 'content');
    });

    it('should not call function', () => {
      const div = document.createElement('div');
      const spy = sinon.spy(div, 'dispatchEvent');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      span.textContent = 'bar';
      div.appendChild(span);
      body.appendChild(div);
      mjs.vars.contextNode = div;
      func(div, {
        value: 'foo\n'
      });
      assert.strictEqual(spy.called, false, 'not called');
      assert.strictEqual(div.childNodes.length, 1, 'length');
      assert.strictEqual(div.firstChild.nodeType, 1, 'child');
      assert.strictEqual(div.firstChild.localName, 'span', 'name');
      assert.strictEqual(div.firstChild.textContent, 'bar', 'content');
      assert.strictEqual(div.textContent, 'bar', 'content');
    });

    it('should replace content', () => {
      const div = document.createElement('div');
      const spy = sinon.spy(div, 'dispatchEvent');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      span.textContent = 'bar';
      div.appendChild(span);
      body.appendChild(div);
      mjs.vars.contextNode = div;
      mjs.dataIds.set('foo', {});
      func(div, {
        dataId: 'foo',
        value: 'foo\n'
      });
      assert.strictEqual(spy.callCount, 3, 'called');
      assert.strictEqual(div.childNodes.length, 2, 'length');
      assert.strictEqual(div.firstChild.nodeType, 1, 'child');
      assert.strictEqual(div.firstChild.localName, 'div', 'name');
      assert.strictEqual(div.firstChild.textContent, 'foo', 'content');
      assert.strictEqual(div.lastChild.nodeType, 3, 'child');
      assert.strictEqual(div.lastChild.nodeValue, '\n', 'value');
      assert.strictEqual(div.textContent, 'foo\n', 'content');
    });

    it('should not call function', () => {
      const div = document.createElement('div');
      const spy = sinon.spy(div, 'dispatchEvent');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      span.textContent = 'bar';
      div.appendChild(span);
      body.appendChild(div);
      mjs.vars.contextNode = div;
      mjs.dataIds.set('foo', {
        mutex: true
      });
      func(div, {
        dataId: 'foo',
        value: 'foo\n'
      });
      assert.strictEqual(spy.called, false, 'not called');
      assert.strictEqual(div.childNodes.length, 1, 'length');
      assert.strictEqual(div.firstChild.nodeType, 1, 'child');
      assert.strictEqual(div.firstChild.localName, 'span', 'name');
      assert.strictEqual(div.firstChild.textContent, 'bar', 'content');
      assert.strictEqual(div.textContent, 'bar', 'content');
    });

    it('should not call function', () => {
      const div = document.createElement('div');
      const spy = sinon.spy(div, 'dispatchEvent');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      span.textContent = 'bar';
      div.appendChild(span);
      body.appendChild(div);
      mjs.vars.contextNode = div;
      func(div, {
        value: 'foo\n'
      });
      assert.strictEqual(spy.called, false, 'not called');
      assert.strictEqual(div.childNodes.length, 1, 'length');
      assert.strictEqual(div.firstChild.nodeType, 1, 'child');
      assert.strictEqual(div.firstChild.localName, 'span', 'name');
      assert.strictEqual(div.firstChild.textContent, 'bar', 'content');
      assert.strictEqual(div.textContent, 'bar', 'content');
    });

    it('should replace content', () => {
      const div = document.createElement('div');
      const span = document.createElement('span');
      const spy = sinon.spy(span, 'dispatchEvent');
      const body = document.querySelector('body');
      div.id = 'div';
      span.textContent = 'bar';
      div.appendChild(span);
      mjs.vars.contextNode = div;
      mjs.dataIds.set('foo', {});
      body.appendChild(div);
      func(span, {
        controlledBy: '#div',
        dataId: 'foo',
        value: 'foo\n'
      });
      assert.strictEqual(spy.callCount, 3, 'called');
      assert.strictEqual(div.childNodes.length, 1, 'length');
      assert.strictEqual(div.firstChild.nodeType, 1, 'child');
      assert.strictEqual(div.firstChild.localName, 'span', 'name');
      assert.strictEqual(div.firstChild.textContent, 'foo\n', 'content');
      assert.strictEqual(div.textContent, 'foo\n', 'content');
    });

    it('should not call function', () => {
      const div = document.createElement('div');
      const span = document.createElement('span');
      const spy = sinon.spy(span, 'dispatchEvent');
      const body = document.querySelector('body');
      div.id = 'div';
      span.textContent = 'bar';
      div.appendChild(span);
      mjs.vars.contextNode = div;
      mjs.dataIds.set('foo', {
        mutex: true
      });
      body.appendChild(div);
      func(span, {
        controlledBy: '#div',
        dataId: 'foo',
        value: 'foo\n'
      });
      assert.strictEqual(spy.called, false, 'not called');
      assert.strictEqual(div.childNodes.length, 1, 'length');
      assert.strictEqual(div.firstChild.nodeType, 1, 'child');
      assert.strictEqual(div.firstChild.localName, 'span', 'name');
      assert.strictEqual(div.firstChild.textContent, 'bar', 'content');
      assert.strictEqual(div.textContent, 'bar', 'content');
    });

    it('should not replace content', () => {
      const div = document.createElement('div');
      const stub = sinon.stub(div, 'dispatchEvent').returns(true);
      stub.onCall(0).returns(false);
      const body = document.querySelector('body');
      body.appendChild(div);
      mjs.vars.contextNode = div;
      mjs.dataIds.set('foo', {});
      func(div, {
        dataId: 'foo',
        value: 'foo\nbar\n'
      });
      assert.strictEqual(stub.called, true, 'called');
      assert.strictEqual(stub.callCount, 1, 'call count');
      assert.strictEqual(div.childNodes.length, 0, 'length');
    });

    it('should not replace content', () => {
      const div = document.createElement('div');
      const span = document.createElement('span');
      const stub = sinon.stub(span, 'dispatchEvent').returns(true);
      stub.onCall(1).returns(false);
      const body = document.querySelector('body');
      div.id = 'div';
      span.textContent = 'bar';
      div.appendChild(span);
      mjs.vars.contextNode = div;
      mjs.dataIds.set('foo', {});
      body.appendChild(div);
      func(span, {
        controlledBy: '#div',
        dataId: 'foo',
        value: 'foo\n'
      });
      assert.strictEqual(stub.called, true, 'called');
      assert.strictEqual(stub.callCount, 2, 'call count');
      assert.strictEqual(div.childNodes.length, 1, 'length');
      assert.strictEqual(div.firstChild.nodeType, 1, 'child');
      assert.strictEqual(div.firstChild.localName, 'span', 'name');
      assert.strictEqual(div.firstChild.textContent, 'bar', 'content');
      assert.strictEqual(div.textContent, 'bar', 'content');
    });

    it('should replace content', () => {
      const div = document.createElement('div');
      const span = document.createElement('span');
      const stub = sinon.stub(span, 'dispatchEvent').returns(true);
      const stubErr = sinon.stub(console, 'error');
      const body = document.querySelector('body');
      div.id = 'div';
      span.textContent = 'bar';
      div.appendChild(span);
      mjs.vars.contextNode = div;
      mjs.dataIds.set('foo', {});
      body.appendChild(div);
      func(span, {
        controlledBy: '#div',
        dataId: 'foo',
        value: '<span>foo</span>\n<span>bar</span>\n'
      });
      const { called: errCalled } = stubErr;
      stubErr.restore();
      assert.strictEqual(stub.called, true, 'called');
      assert.strictEqual(stub.callCount, 3, 'call count');
      assert.strictEqual(errCalled, false, 'error not called');
      assert.strictEqual(div.childNodes.length, 1, 'length');
      assert.strictEqual(div.firstChild.nodeType, 1, 'child');
      assert.strictEqual(div.firstChild.localName, 'span', 'name');
      assert.strictEqual(div.firstChild.childNodes.length, 4, 'child length');
      assert.strictEqual(div.firstChild.firstChild.nodeType, 1, 'child first');
      assert.strictEqual(div.firstChild.lastChild.nodeType, 3, 'child last');
      assert.strictEqual(div.firstChild.textContent, 'foo\nbar\n', 'content');
      assert.strictEqual(div.textContent, 'foo\nbar\n', 'content');
    });

    it('should replace content', () => {
      const div = document.createElement('div');
      const span = document.createElement('span');
      const stub = sinon.stub(span, 'dispatchEvent').returns(true);
      const stubErr = sinon.stub(console, 'error');
      const body = document.querySelector('body');
      div.id = 'div';
      span.textContent = 'bar';
      div.appendChild(span);
      mjs.vars.contextNode = div;
      mjs.dataIds.set('foo', {});
      body.appendChild(div);
      func(span, {
        controlledBy: '#div',
        dataId: 'foo',
        value: 'foo <foo@example.dom> wrote:\nbar\n'
      });
      const { calledOnce: errCalled } = stubErr;
      stubErr.restore();
      assert.strictEqual(stub.called, true, 'called');
      assert.strictEqual(stub.callCount, 3, 'call count');
      assert.strictEqual(errCalled, true, 'error called');
      assert.strictEqual(div.childNodes.length, 1, 'length');
      assert.strictEqual(div.firstChild.nodeType, 1, 'child');
      assert.strictEqual(div.firstChild.localName, 'span', 'name');
      assert.strictEqual(div.firstChild.textContent,
        'foo <foo@example.dom> wrote:\nbar\n', 'content');
      assert.strictEqual(div.textContent,
        'foo <foo@example.dom> wrote:\nbar\n', 'content');
    });

    it('should throw if StaticRange is not supported', () => {
      delete global.StaticRange;
      const div = document.createElement('div');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      div.id = 'div';
      span.textContent = 'bar';
      div.appendChild(span);
      mjs.vars.contextNode = div;
      mjs.dataIds.set('foo', {});
      body.appendChild(div);
      assert.throws(() => func(span, {
        controlledBy: '#div',
        dataId: 'foo',
        value: 'foo\n'
      }));
    });
  });

  describe('replace text edit control element value', () => {
    const func = mjs.replaceEditControlValue;
    beforeEach(() => {
      mjs.dataIds.clear();
    });
    afterEach(() => {
      mjs.dataIds.clear();
    });

    it('should not call function', () => {
      const elm = document.createElement('p');
      const spy = sinon.spy(elm, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(elm);
      func(elm, {
        value: 'foo'
      });
      assert.strictEqual(spy.called, false, 'not called');
      assert.strictEqual(elm.value, undefined, 'value');
    });

    it('should not call function', () => {
      const elm = document.createElement('input');
      const spy = sinon.spy(elm, 'dispatchEvent');
      const body = document.querySelector('body');
      elm.value = 'foo';
      body.appendChild(elm);
      func(elm);
      assert.strictEqual(spy.called, false, 'not called');
      assert.strictEqual(elm.value, 'foo', 'value');
    });

    it('should not call function', () => {
      const elm = document.createElement('input');
      const spy = sinon.spy(elm, 'dispatchEvent');
      const body = document.querySelector('body');
      elm.value = 'foo';
      body.appendChild(elm);
      func(elm, {
        value: 'bar\n'
      });
      assert.strictEqual(spy.called, false, 'called');
      assert.strictEqual(elm.value, 'foo', 'value');
    });

    it('should call function', () => {
      const elm = document.createElement('input');
      const spy = sinon.spy(elm, 'dispatchEvent');
      const body = document.querySelector('body');
      elm.value = 'foo';
      body.appendChild(elm);
      mjs.dataIds.set('foo', {});
      func(elm, {
        dataId: 'foo',
        value: 'bar\n'
      });
      assert.strictEqual(spy.called, true, 'called');
      assert.strictEqual(elm.value, 'bar', 'value');
    });

    it('should not call function', () => {
      const elm = document.createElement('input');
      const spy = sinon.spy(elm, 'dispatchEvent');
      const body = document.querySelector('body');
      elm.value = 'foo';
      body.appendChild(elm);
      mjs.dataIds.set('foo', {
        mutex: true
      });
      func(elm, {
        dataId: 'foo',
        value: 'bar\n'
      });
      assert.strictEqual(spy.called, false, 'called');
      assert.strictEqual(elm.value, 'foo', 'value');
    });

    it('should not call function', () => {
      const elm = document.createElement('input');
      const spy = sinon.spy(elm, 'dispatchEvent');
      const body = document.querySelector('body');
      elm.value = 'foo';
      body.appendChild(elm);
      func(elm, {
        value: 'foo\n'
      });
      assert.strictEqual(spy.called, false, 'note called');
      assert.strictEqual(elm.value, 'foo', 'value');
    });

    it('should not call function', () => {
      const elm = document.createElement('textarea');
      const stub = sinon.stub(elm, 'dispatchEvent').returns(false);
      const body = document.querySelector('body');
      elm.value = 'foo\nbar';
      body.appendChild(elm);
      func(elm, {
        value: 'foo\nbar baz\nqux\n'
      });
      assert.strictEqual(stub.called, false, 'not called');
      assert.strictEqual(elm.value, 'foo\nbar', 'value');
    });

    it('should call function', () => {
      const elm = document.createElement('textarea');
      const stub = sinon.stub(elm, 'dispatchEvent').returns(false);
      const body = document.querySelector('body');
      elm.value = 'foo\nbar';
      body.appendChild(elm);
      mjs.dataIds.set('foo', {});
      func(elm, {
        dataId: 'foo',
        value: 'foo\nbar baz\nqux\n'
      });
      assert.strictEqual(stub.called, true, 'called');
      assert.strictEqual(elm.value, 'foo\nbar', 'value');
    });

    it('should not call function', () => {
      const elm = document.createElement('textarea');
      const stub = sinon.stub(elm, 'dispatchEvent').returns(false);
      const body = document.querySelector('body');
      elm.value = 'foo\nbar';
      body.appendChild(elm);
      mjs.dataIds.set('foo', {
        mutex: true
      });
      func(elm, {
        dataId: 'foo',
        value: 'foo\nbar baz\nqux\n'
      });
      assert.strictEqual(stub.called, false, 'called');
      assert.strictEqual(elm.value, 'foo\nbar', 'value');
    });

    it('should not call function', () => {
      const elm = document.createElement('textarea');
      const spy = sinon.spy(elm, 'dispatchEvent');
      const body = document.querySelector('body');
      elm.value = 'foo\nbar';
      body.appendChild(elm);
      func(elm, {
        value: 'foo\nbar baz\nqux\n'
      });
      assert.strictEqual(spy.called, false, 'called');
      assert.strictEqual(elm.value, 'foo\nbar', 'value');
    });

    it('should call function', () => {
      const elm = document.createElement('textarea');
      const spy = sinon.spy(elm, 'dispatchEvent');
      const body = document.querySelector('body');
      elm.value = 'foo\nbar baz\nqux';
      body.appendChild(elm);
      mjs.dataIds.set('foo', {});
      func(elm, {
        dataId: 'foo',
        value: 'foo\nbar baz\nqux\nquux\n'
      });
      assert.strictEqual(spy.called, true, 'called');
      assert.strictEqual(elm.value, 'foo\nbar baz\nqux\nquux\n', 'value');
    });

    it('should not call function', () => {
      const elm = document.createElement('textarea');
      const spy = sinon.spy(elm, 'dispatchEvent');
      const body = document.querySelector('body');
      elm.value = 'foo\nbar';
      body.appendChild(elm);
      mjs.dataIds.set('foo', {
        mutex: true
      });
      func(elm, {
        dataId: 'foo',
        value: 'foo\nbar baz\nqux\n'
      });
      assert.strictEqual(spy.called, false, 'called');
      assert.strictEqual(elm.value, 'foo\nbar', 'value');
    });
  });

  describe('replace live edit content', () => {
    const func = mjs.replaceLiveEditContent;
    beforeEach(() => {
      mjs.dataIds.clear();
    });
    afterEach(() => {
      mjs.dataIds.clear();
    });

    it('should not dispatch event', () => {
      const stub = sinon.stub();
      const body = document.querySelector('body');
      body.addEventListener('input', stub, true);
      func();
      assert.strictEqual(stub.called, false, 'not dispatched');
    });

    it('should not replace content', () => {
      const stub = sinon.stub();
      const elm = document.createElement('div');
      const text = document.createElement('p');
      const body = document.querySelector('body');
      elm.classList.add('ace_editor');
      elm.appendChild(text);
      body.addEventListener('input', stub, true);
      body.appendChild(elm);
      func(body, {
        liveEditKey: 'aceEditor',
        value: 'bar baz'
      });
      assert.strictEqual(stub.called, false, 'not dispatched');
    });

    it('should not replace content', () => {
      const stub = sinon.stub();
      const elm = document.createElement('div');
      const text = document.createElement('textarea');
      const body = document.querySelector('body');
      elm.classList.add('ace_editor');
      elm.appendChild(text);
      body.addEventListener('input', stub, true);
      body.appendChild(elm);
      func(body, {
        liveEditKey: 'aceEditor',
        value: 'bar baz'
      });
      assert.strictEqual(stub.called, false, 'not dispatched');
      assert.strictEqual(text.value, '', 'content');
    });

    it('should replace content', () => {
      const stub = sinon.stub();
      const elm = document.createElement('div');
      const text = document.createElement('textarea');
      const body = document.querySelector('body');
      text.classList.add('ace_text-input');
      elm.classList.add('ace_editor');
      elm.appendChild(text);
      body.addEventListener('input', stub, true);
      body.appendChild(elm);
      mjs.dataIds.set('foo', {});
      func(body, {
        dataId: 'foo',
        liveEditKey: 'aceEditor',
        value: 'bar baz'
      });
      assert.strictEqual(stub.called, true, 'dispatched');
      assert.strictEqual(text.value, 'bar baz', 'content');
    });

    it('should not replace content', () => {
      const stub = sinon.stub();
      const elm = document.createElement('div');
      const text = document.createElement('textarea');
      const body = document.querySelector('body');
      text.classList.add('ace_text-input');
      elm.classList.add('foo');
      elm.appendChild(text);
      body.addEventListener('input', stub, true);
      body.appendChild(elm);
      mjs.dataIds.set('foo', {
        mutex: true
      });
      func(body, {
        dataId: 'foo',
        liveEditKey: 'aceEditor',
        value: 'bar baz'
      });
      assert.strictEqual(stub.called, false, 'not dispatched');
      assert.strictEqual(text.value, '', 'content');
    });

    it('should not replace content', () => {
      const stub = sinon.stub();
      const iframe = document.createElement('iframe');
      const body = document.querySelector('body');
      iframe.classList.add('tc-edit-texteditor-body');
      body.appendChild(iframe);
      const text = iframe.contentDocument.createElement('textarea');
      const innerBody = iframe.contentDocument.body;
      innerBody.appendChild(text);
      innerBody.addEventListener('input', stub, true);
      func(iframe, {
        liveEditKey: 'tiddlyWiki',
        value: 'bar baz'
      });
      assert.strictEqual(stub.called, false, 'not dispatched');
      assert.strictEqual(text.value, '', 'content');
    });

    it('should replace content', () => {
      const stub = sinon.stub();
      const iframe = document.createElement('iframe');
      const body = document.querySelector('body');
      iframe.classList.add('tc-edit-texteditor-body');
      body.appendChild(iframe);
      const text = iframe.contentDocument.createElement('textarea');
      const innerBody = iframe.contentDocument.body;
      innerBody.appendChild(text);
      innerBody.addEventListener('input', stub, true);
      mjs.dataIds.set('foo', {});
      func(iframe, {
        dataId: 'foo',
        liveEditKey: 'tiddlyWiki',
        value: 'bar baz'
      });
      assert.strictEqual(stub.called, true, 'dispatched');
      assert.strictEqual(text.value, 'bar baz', 'content');
    });

    it('should not replace content', () => {
      const stub = sinon.stub();
      const iframe = document.createElement('iframe');
      const body = document.querySelector('body');
      iframe.classList.add('tc-edit-texteditor-body');
      body.appendChild(iframe);
      const text = iframe.contentDocument.createElement('textarea');
      const innerBody = iframe.contentDocument.body;
      innerBody.appendChild(text);
      innerBody.addEventListener('input', stub, true);
      mjs.dataIds.set('foo', {
        mutex: true
      });
      func(iframe, {
        dataId: 'foo',
        liveEditKey: 'tiddlyWiki',
        value: 'bar baz'
      });
      assert.strictEqual(stub.called, false, 'not dispatched');
      assert.strictEqual(text.value, '', 'content');
    });

    it('should replace content', () => {
      const stub = sinon.stub();
      const iframe = document.createElement('iframe');
      const body = document.querySelector('body');
      body.appendChild(iframe);
      const div = iframe.contentDocument.createElement('div');
      div.id = 'tinymce';
      div.setAttribute('contenteditable', 'true');
      if (typeof div.isContentEditable !== 'boolean') {
        div.isContentEditable = isContentEditable(div);
      }
      const innerBody = iframe.contentDocument.body;
      innerBody.appendChild(div);
      innerBody.addEventListener('input', stub, true);
      mjs.dataIds.set('foo', {});
      func(iframe, {
        dataId: 'foo',
        liveEditKey: 'tinyMCE',
        value: 'bar baz'
      });
      assert.strictEqual(stub.called, true, 'dispatched');
      assert.strictEqual(div.textContent, 'bar baz', 'content');
    });

    it('should not replace content', () => {
      const stub = sinon.stub();
      const iframe = document.createElement('iframe');
      const body = document.querySelector('body');
      body.appendChild(iframe);
      const div = iframe.contentDocument.createElement('div');
      div.id = 'tinymce';
      div.setAttribute('contenteditable', 'true');
      if (typeof div.isContentEditable !== 'boolean') {
        div.isContentEditable = isContentEditable(div);
      }
      const innerBody = iframe.contentDocument.body;
      innerBody.appendChild(div);
      innerBody.addEventListener('input', stub, true);
      mjs.dataIds.set('foo', {
        mutex: true
      });
      func(iframe, {
        dataId: 'foo',
        liveEditKey: 'tinyMCE',
        value: 'bar baz'
      });
      assert.strictEqual(stub.called, false, 'not dispatched');
      assert.strictEqual(div.textContent, '', 'content');
    });

    it('should not replace content', () => {
      const stub = sinon.stub();
      const iframe = document.createElement('iframe');
      const body = document.querySelector('body');
      body.appendChild(iframe);
      const div = iframe.contentDocument.createElement('div');
      div.id = 'tinymce';
      const innerBody = iframe.contentDocument.body;
      innerBody.appendChild(div);
      innerBody.addEventListener('input', stub, true);
      mjs.dataIds.set('foo', {});
      func(iframe, {
        dataId: 'foo',
        liveEditKey: 'tinyMCE',
        value: 'bar baz'
      });
      assert.strictEqual(stub.called, false, 'not dispatched');
      assert.strictEqual(div.textContent, '', 'content');
    });
  });

  describe('get target element and synchronize text', () => {
    const func = mjs.syncText;
    beforeEach(() => {
      mjs.dataIds.clear();
      mjs.vars[ID_TAB] = null;
      mjs.vars.contextNode = null;
    });
    afterEach(() => {
      mjs.dataIds.clear();
      mjs.vars[ID_TAB] = null;
      mjs.vars.contextNode = null;
    });

    it('should get empty array', async () => {
      const res = await func();
      assert.deepEqual(res, [], 'result');
    });

    it('should get empty array', async () => {
      const res = await func({
        data: {},
        value: 'foo'
      });
      assert.deepEqual(res, [], 'result');
    });

    it('should get empty array', async () => {
      mjs.vars[ID_TAB] = '1';
      const res = await func({
        data: {
          dataId: 'bar'
        },
        value: 'foo'
      });
      assert.deepEqual(res, [], 'result');
    });

    it('should get empty array', async () => {
      mjs.vars[ID_TAB] = '1';
      const res = await func({
        data: {
          dataId: 'bar',
          tabId: '1'
        },
        value: 'foo'
      });
      assert.deepEqual(res, [], 'result');
    });

    it('should get empty array', async () => {
      const elm = document.createElement('textarea');
      const body = document.querySelector('body');
      elm.id = 'bar';
      body.appendChild(elm);
      mjs.vars[ID_TAB] = '1';
      const res = await func({
        data: {
          dataId: 'bar',
          tabId: '1',
          lastUpdate: 1
        },
        value: 'foo'
      });
      assert.deepEqual(res, [], 'result');
    });

    it('should delete data ID', async () => {
      const elm = document.createElement('textarea');
      const body = document.querySelector('body');
      elm.id = 'bar';
      body.appendChild(elm);
      mjs.vars[ID_TAB] = '1';
      mjs.dataIds.set('bar', {});
      const res = await func({
        data: {
          dataId: 'bar',
          tabId: '1',
          timestamp: -1
        },
        value: 'foo'
      });
      assert.strictEqual(mjs.dataIds.size, 0, 'size');
      assert.deepEqual(res, [], 'result');
    });

    it('should get empty array', async () => {
      const elm = document.createElement('p');
      const body = document.querySelector('body');
      elm.id = 'bar';
      body.appendChild(elm);
      mjs.vars[ID_TAB] = '1';
      const res = await func({
        data: {
          dataId: 'bar',
          tabId: '1'
        },
        value: 'foo'
      });
      assert.strictEqual(mjs.dataIds.size, 0, 'size');
      assert.deepEqual(res, [], 'result');
    });

    it('should replace content and set data ID', async () => {
      const elm = document.createElement('textarea');
      const body = document.querySelector('body');
      elm.id = 'bar';
      body.appendChild(elm);
      mjs.vars[ID_TAB] = '1';
      const res = await func({
        data: {
          dataId: 'bar',
          tabId: '1'
        },
        value: 'foo'
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('bar'), true);
      assert.strictEqual(elm.value, 'foo', 'content');
      assert.deepEqual(res, [undefined], 'length');
    });

    it('should replace content and set data ID', async () => {
      const elm = document.createElement('textarea');
      const body = document.querySelector('body');
      elm.id = 'bar';
      body.appendChild(elm);
      mjs.vars[ID_TAB] = '1';
      mjs.dataIds.set('bar', {});
      const res = await func({
        data: {
          dataId: 'bar',
          tabId: '1'
        },
        value: 'foo'
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('bar'), true);
      assert.strictEqual(elm.value, 'foo', 'content');
      assert.deepEqual(res, [undefined], 'length');
    });

    it('should get empty array', async () => {
      const elm = document.createElement('textarea');
      const body = document.querySelector('body');
      elm.id = 'bar';
      body.appendChild(elm);
      mjs.vars[ID_TAB] = '1';
      mjs.dataIds.set('bar', {
        mutex: true
      });
      const res = await func({
        data: {
          dataId: 'bar',
          tabId: '1'
        },
        value: 'foo'
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('bar'), true);
      assert.strictEqual(elm.value, '', 'content');
      assert.deepEqual(res, [], 'length');
    });

    it('should replace content and set data ID', async () => {
      const elm = document.createElement('textarea');
      const body = document.querySelector('body');
      elm.id = 'bar';
      body.appendChild(elm);
      mjs.vars[ID_TAB] = '1';
      const res = await func({
        data: {
          dataId: 'bar',
          tabId: '1',
          timestamp: 2,
          lastUpdate: 1
        },
        value: 'foo'
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('bar'), true);
      assert.strictEqual(elm.value, 'foo', 'content');
      assert.deepEqual(res, [undefined], 'length');
    });

    it('should replace content and set data ID', async () => {
      const elm = document.createElement('textarea');
      const body = document.querySelector('body');
      elm.id = 'bar';
      body.appendChild(elm);
      mjs.vars[ID_TAB] = '1';
      mjs.dataIds.set('bar', {});
      const res = await func({
        data: {
          dataId: 'bar',
          tabId: '1',
          timestamp: 2,
          lastUpdate: 1
        },
        value: 'foo'
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('bar'), true);
      assert.strictEqual(elm.value, 'foo', 'content');
      assert.deepEqual(res, [undefined], 'length');
    });

    it('should get empty array', async () => {
      const elm = document.createElement('textarea');
      const body = document.querySelector('body');
      elm.id = 'bar';
      body.appendChild(elm);
      mjs.vars[ID_TAB] = '1';
      mjs.dataIds.set('bar', {
        mutex: true
      });
      const res = await func({
        data: {
          dataId: 'bar',
          tabId: '1',
          timestamp: 2,
          lastUpdate: 1
        },
        value: 'foo'
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('bar'), true);
      assert.strictEqual(elm.value, '', 'content');
      assert.deepEqual(res, [], 'length');
    });

    it('should replace content and set data ID', async () => {
      const elm = document.createElement('p');
      const body = document.querySelector('body');
      elm.id = 'bar';
      elm.setAttribute('contenteditable', 'true');
      if (typeof elm.isContentEditable !== 'boolean') {
        elm.isContentEditable = isContentEditable(elm);
      }
      body.appendChild(elm);
      mjs.vars[ID_TAB] = '1';
      mjs.vars.contextNode = elm;
      const res = await func({
        data: {
          dataId: 'bar',
          tabId: '1'
        },
        value: 'foo'
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('bar'), true);
      assert.strictEqual(elm.textContent, 'foo', 'content');
      assert.deepEqual(res, [undefined], 'length');
    });

    it('should replace content and set data ID', async () => {
      const elm = document.createElement('p');
      const body = document.querySelector('body');
      elm.id = 'bar';
      elm.setAttribute('contenteditable', 'true');
      if (typeof elm.isContentEditable !== 'boolean') {
        elm.isContentEditable = isContentEditable(elm);
      }
      body.appendChild(elm);
      mjs.vars[ID_TAB] = '1';
      mjs.vars.contextNode = elm;
      mjs.dataIds.set('bar', {});
      const res = await func({
        data: {
          dataId: 'bar',
          tabId: '1'
        },
        value: 'foo'
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('bar'), true);
      assert.strictEqual(elm.textContent, 'foo', 'content');
      assert.deepEqual(res, [undefined], 'length');
    });

    it('should get empty array', async () => {
      const elm = document.createElement('p');
      const body = document.querySelector('body');
      elm.id = 'bar';
      elm.setAttribute('contenteditable', 'true');
      if (typeof elm.isContentEditable !== 'boolean') {
        elm.isContentEditable = isContentEditable(elm);
      }
      body.appendChild(elm);
      mjs.vars[ID_TAB] = '1';
      mjs.vars.contextNode = elm;
      mjs.dataIds.set('bar', {
        mutex: true
      });
      const res = await func({
        data: {
          dataId: 'bar',
          tabId: '1'
        },
        value: 'foo'
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('bar'), true);
      assert.strictEqual(elm.textContent, '', 'content');
      assert.deepEqual(res, [], 'length');
    });

    it('should replace content and set data ID', async () => {
      const div = document.createElement('div');
      const elm = document.createElement('p');
      const body = document.querySelector('body');
      elm.id = 'bar';
      elm.setAttribute('contenteditable', 'true');
      if (typeof elm.isContentEditable !== 'boolean') {
        elm.isContentEditable = isContentEditable(elm);
      }
      div.id = 'baz';
      div.appendChild(elm);
      body.appendChild(div);
      mjs.vars[ID_TAB] = '1';
      mjs.vars.contextNode = elm;
      const res = await func({
        data: {
          dataId: 'bar',
          controlledBy: 'baz',
          tabId: '1'
        },
        value: 'foo'
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('bar'), true);
      assert.strictEqual(elm.textContent, 'foo', 'content');
      assert.deepEqual(res, [undefined], 'length');
    });

    it('should replace content and set data ID', async () => {
      const div = document.createElement('div');
      const elm = document.createElement('p');
      const body = document.querySelector('body');
      elm.id = 'bar';
      elm.setAttribute('contenteditable', 'true');
      if (typeof elm.isContentEditable !== 'boolean') {
        elm.isContentEditable = isContentEditable(elm);
      }
      div.id = 'baz';
      div.appendChild(elm);
      body.appendChild(div);
      mjs.vars[ID_TAB] = '1';
      mjs.vars.contextNode = elm;
      mjs.dataIds.set('bar', {});
      const res = await func({
        data: {
          dataId: 'bar',
          controlledBy: 'baz',
          tabId: '1'
        },
        value: 'foo'
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('bar'), true);
      assert.strictEqual(elm.textContent, 'foo', 'content');
      assert.deepEqual(res, [undefined], 'length');
    });

    it('should get empty array', async () => {
      const div = document.createElement('div');
      const elm = document.createElement('p');
      const body = document.querySelector('body');
      elm.id = 'bar';
      elm.setAttribute('contenteditable', 'true');
      if (typeof elm.isContentEditable !== 'boolean') {
        elm.isContentEditable = isContentEditable(elm);
      }
      div.id = 'baz';
      div.appendChild(elm);
      body.appendChild(div);
      mjs.vars[ID_TAB] = '1';
      mjs.vars.contextNode = elm;
      mjs.dataIds.set('bar', {
        mutex: true
      });
      const res = await func({
        data: {
          dataId: 'bar',
          controlledBy: 'baz',
          tabId: '1'
        },
        value: 'foo'
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('bar'), true);
      assert.strictEqual(elm.textContent, '', 'content');
      assert.deepEqual(res, [], 'length');
    });

    it('should replace content and set data ID', async () => {
      const elm = document.createElement('div');
      const text = document.createElement('textarea');
      const body = document.querySelector('body');
      text.classList.add('ace_text-input');
      elm.id = 'bar';
      elm.classList.add('ace_editor');
      elm.appendChild(text);
      body.appendChild(elm);
      mjs.vars[ID_TAB] = '1';
      const res = await func({
        data: {
          dataId: 'bar',
          tabId: '1',
          liveEditKey: 'aceEditor'
        },
        value: 'foo'
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('bar'), true);
      assert.strictEqual(text.value, 'foo', 'content');
      assert.deepEqual(res, [undefined], 'length');
    });

    it('should replace content and set data ID', async () => {
      const elm = document.createElement('div');
      const text = document.createElement('textarea');
      const body = document.querySelector('body');
      text.classList.add('ace_text-input');
      elm.id = 'bar';
      elm.classList.add('ace_editor');
      elm.appendChild(text);
      body.appendChild(elm);
      mjs.vars[ID_TAB] = '1';
      mjs.dataIds.set('bar', {});
      const res = await func({
        data: {
          dataId: 'bar',
          tabId: '1',
          liveEditKey: 'aceEditor'
        },
        value: 'foo'
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('bar'), true);
      assert.strictEqual(text.value, 'foo', 'content');
      assert.deepEqual(res, [undefined], 'length');
    });

    it('should get empty array', async () => {
      const elm = document.createElement('div');
      const text = document.createElement('textarea');
      const body = document.querySelector('body');
      text.classList.add('ace_text-input');
      elm.id = 'bar';
      elm.classList.add('ace_editor');
      elm.appendChild(text);
      body.appendChild(elm);
      mjs.vars[ID_TAB] = '1';
      mjs.dataIds.set('bar', {
        mutex: true
      });
      const res = await func({
        data: {
          dataId: 'bar',
          tabId: '1',
          liveEditKey: 'aceEditor'
        },
        value: 'foo'
      });
      assert.strictEqual(mjs.dataIds.size, 1, 'size');
      assert.strictEqual(mjs.dataIds.has('bar'), true);
      assert.strictEqual(text.value, '', 'content');
      assert.deepEqual(res, [], 'length');
    });
  });

  describe('handle message', () => {
    const func = mjs.handleMsg;
    const globalDispatcher = getGlobalDispatcher();
    const mockAgent = new MockAgent();
    beforeEach(() => {
      setGlobalDispatcher(mockAgent);
      mockAgent.disableNetConnect();
      mjs.dataIds.clear();
      mjs.vars[ID_TAB] = '';
      mjs.vars[ID_WIN] = '';
      mjs.vars[INCOGNITO] = false;
      mjs.vars[IS_MAC] = false;
      mjs.vars[ONLY_EDITABLE] = false;
      mjs.vars[SYNC_AUTO] = false;
      mjs.vars[SYNC_AUTO_URL] = null;
      mjs.vars.contextMode = null;
      mjs.vars.contextNode = null;
      delete mjs.vars.keyCtrlA.ctrlKey;
      delete mjs.vars.keyCtrlA.metaKey;
    });
    afterEach(() => {
      mockAgent.enableNetConnect();
      setGlobalDispatcher(globalDispatcher);
      mjs.dataIds.clear();
      mjs.vars[ID_TAB] = '';
      mjs.vars[ID_WIN] = '';
      mjs.vars[INCOGNITO] = false;
      mjs.vars[IS_MAC] = false;
      mjs.vars[ONLY_EDITABLE] = false;
      mjs.vars[SYNC_AUTO] = false;
      mjs.vars[SYNC_AUTO_URL] = null;
      mjs.vars.contextMode = null;
      mjs.vars.contextNode = null;
      delete mjs.vars.keyCtrlA.ctrlKey;
      delete mjs.vars.keyCtrlA.metaKey;
    });

    it('should get empty array', async () => {
      const res = await func();
      assert.deepEqual(res, [], 'result');
    });

    it('should get empty array', async () => {
      const res = await func({
        foo: 'bar'
      });
      assert.deepEqual(res, [], 'result');
    });

    it('should set values', async () => {
      const res = await func({
        [ID_TAB]: '1',
        [ID_WIN]: '2',
        [SYNC_AUTO_URL]: 'https://example.com\nfoo:bar\nhttps://example.com/baz'
      });
      assert.strictEqual(mjs.vars[ID_TAB], '1', 'tab');
      assert.strictEqual(mjs.vars[ID_WIN], '2', 'window');
      assert.strictEqual(mjs.vars[SYNC_AUTO_URL],
        'https://example.com/\nhttps://example.com/baz', 'url');
      assert.deepEqual(res, [], 'result');
    });

    it('should set values', async () => {
      const res = await func({
        [ID_TAB]: '1',
        [ID_WIN]: '2',
        [SYNC_AUTO_URL]: 'foo:bar\n'
      });
      assert.strictEqual(mjs.vars[ID_TAB], '1', 'tab');
      assert.strictEqual(mjs.vars[ID_WIN], '2', 'window');
      assert.strictEqual(mjs.vars[SYNC_AUTO_URL], null, 'url');
      assert.deepEqual(res, [], 'result');
    });

    it('should set values', async () => {
      const res = await func({
        [ID_TAB]: '1',
        [ID_WIN]: '2',
        [SYNC_AUTO_URL]: ''
      });
      assert.strictEqual(mjs.vars[ID_TAB], '1', 'tab');
      assert.strictEqual(mjs.vars[ID_WIN], '2', 'window');
      assert.strictEqual(mjs.vars[SYNC_AUTO_URL], null, 'url');
      assert.deepEqual(res, [], 'result');
    });

    it('should set values', async () => {
      const res = await func({
        [ID_TAB]: '1',
        [ID_WIN]: '2',
        [SYNC_AUTO_URL]: null
      });
      assert.strictEqual(mjs.vars[ID_TAB], '1', 'tab');
      assert.strictEqual(mjs.vars[ID_WIN], '2', 'window');
      assert.strictEqual(mjs.vars[SYNC_AUTO_URL], null, 'url');
      assert.deepEqual(res, [], 'result');
    });

    it('should set values', async () => {
      const res = await func({
        [INCOGNITO]: true,
        [ONLY_EDITABLE]: true,
        [SYNC_AUTO]: true
      });
      assert.strictEqual(mjs.vars[INCOGNITO], true, 'incognito');
      assert.strictEqual(mjs.vars[ONLY_EDITABLE], true, 'editable');
      assert.strictEqual(mjs.vars[SYNC_AUTO], true, 'sync');
      assert.deepEqual(res, [], 'result');
    });

    it('should set values', async () => {
      const res = await func({
        [IS_MAC]: true
      });
      assert.strictEqual(mjs.vars[IS_MAC], true, 'vars');
      assert.strictEqual(mjs.vars.keyCtrlA.metaKey, true, 'metakey');
      assert.strictEqual(mjs.vars.keyCtrlA.ctlrKey, undefined, 'ctrlkey');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const url = new URL('https://localhost/');
      mockAgent.get(url.origin)
        .intercept({ path: url.pathname, method: 'GET' }).reply(200, 'foo', {
          headers: {
            'content-type': 'text/plain'
          }
        });
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const res = await func({
        [CONTENT_GET]: {}
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(res, [[{}, null]], 'result');
    });

    it('should get result', async () => {
      const res = await func({
        [TMP_FILE_RES]: {}
      });
      assert.deepEqual(res, [[]], 'result');
    });

    it('should get result', async () => {
      const res = await func({
        [TMP_FILE_DATA_PORT]: {}
      });
      assert.deepEqual(res, [null], 'result');
    });

    it('should get result', async () => {
      const res = await func({
        [TMP_FILE_DATA_REMOVE]: {}
      });
      assert.deepEqual(res, [false], 'result');
    });

    it('should get result', async () => {
      const res = await func({
        [TMP_FILE_REQ]: true
      });
      assert.deepEqual(res, [[]], 'result');
    });

    it('should get result', async () => {
      const res = await func({
        [VARS_SET]: {}
      });
      assert.deepEqual(res, [[]], 'result');
    });
  });

  describe('runtime on message', () => {
    const func = mjs.runtimeOnMsg;

    it('should throw', async () => {
      browser.runtime.sendMessage.rejects(new Error('error'));
      await func().catch(e => {
        assert.strictEqual(e instanceof Error, true, 'error');
        assert.strictEqual(e.message, 'error', 'message');
      });
    });

    it('should get empty array', async () => {
      const res = await func({
        foo: 'bar'
      });
      assert.deepEqual(res, [], 'result');
    });
  });

  describe('send tab status', () => {
    const func = mjs.sendTabStatus;

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const res = await func();
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(res, {}, 'result');
    });
  });

  describe('startup', () => {
    const func = mjs.startup;

    it('should throw', async () => {
      const stubError = sinon.stub(console, 'error');
      browser.runtime.sendMessage.rejects(new Error('error'));
      await func().catch(e => {
        assert.strictEqual(e instanceof Error, true, 'error');
        assert.strictEqual(e.message, 'error', 'message');
      });
      stubError.restore();
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const res = await func();
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(res, {}, 'result');
    });
  });

  describe('handle before contextmenu event', () => {
    const func = mjs.handleBeforeContextMenu;
    beforeEach(() => {
      mjs.vars[ONLY_EDITABLE] = false;
      mjs.vars.contextMode = null;
      mjs.vars.contextNode = null;
    });
    afterEach(() => {
      mjs.vars[ONLY_EDITABLE] = false;
      mjs.vars.contextMode = null;
      mjs.vars.contextNode = null;
    });

    it('should not call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const res = await func({});
      assert.strictEqual(browser.runtime.sendMessage.callCount, i,
        'not called');
      assert.strictEqual(res, null, 'result');
    });

    it('should not call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const target = document.querySelector('body');
      const res = await func({
        target,
        key: 'a',
        shiftKey: true
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i,
        'not called');
      assert.strictEqual(res, null, 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const target = document.querySelector('body');
      const res = await func({
        target,
        button: 2
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(mjs.vars.contextNode, target, 'node');
      assert.strictEqual(mjs.vars.contextMode, MODE_SOURCE, 'mode');
      assert.deepEqual(res, {}, 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const target = document.querySelector('body');
      mjs.vars[ONLY_EDITABLE] = true;
      const res = await func({
        target,
        button: 2
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.strictEqual(mjs.vars.contextNode, null, 'node');
      assert.strictEqual(mjs.vars.contextMode, MODE_SOURCE, 'mode');
      assert.deepEqual(res, {}, 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const target = document.querySelector('body');
      const res = await func({
        target,
        key: 'ContextMenu'
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(mjs.vars.contextNode, target, 'node');
      assert.strictEqual(mjs.vars.contextMode, MODE_SOURCE, 'mode');
      assert.deepEqual(res, {}, 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const target = document.querySelector('body');
      const res = await func({
        target,
        key: 'F10',
        shiftKey: true
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(mjs.vars.contextNode, target, 'node');
      assert.strictEqual(mjs.vars.contextMode, MODE_SOURCE, 'mode');
      assert.deepEqual(res, {}, 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const target =
        document.createElementNS('http://www.w3.org/1998/Math/MathML', 'math');
      const body = document.querySelector('body');
      body.appendChild(target);
      const res = await func({
        target,
        button: 2
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(mjs.vars.contextNode, target, 'node');
      assert.strictEqual(mjs.vars.contextMode, MODE_MATHML, 'mode');
      assert.deepEqual(res, {}, 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const target =
        document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const body = document.querySelector('body');
      body.appendChild(target);
      const res = await func({
        target,
        button: 2
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(mjs.vars.contextNode, target, 'node');
      assert.strictEqual(mjs.vars.contextMode, MODE_SVG, 'mode');
      assert.deepEqual(res, {}, 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const target = document.createElement('input');
      const body = document.querySelector('body');
      body.appendChild(target);
      const res = await func({
        target,
        button: 2
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(mjs.vars.contextNode, target, 'node');
      assert.strictEqual(mjs.vars.contextMode, MODE_SOURCE, 'mode');
      assert.deepEqual(res, {}, 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const range = document.createRange();
      const sel = window.getSelection();
      const target = document.createElement('textarea');
      const body = document.querySelector('body');
      target.textContent = 'foo';
      body.appendChild(target);
      range.selectNodeContents(target);
      sel.removeAllRanges();
      sel.addRange(range);
      const res = await func({
        target,
        button: 2
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(mjs.vars.contextNode, target, 'node');
      assert.strictEqual(mjs.vars.contextMode, MODE_SOURCE, 'mode');
      assert.deepEqual(res, {}, 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const target = document.createElement('div');
      const body = document.querySelector('body');
      target.id = 'foo';
      target.classList.add('ace_editor');
      body.appendChild(target);
      const res = await func({
        target,
        button: 2
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(mjs.vars.contextNode, target, 'node');
      assert.strictEqual(mjs.vars.contextMode, MODE_SOURCE, 'mode');
      assert.deepEqual(res, {}, 'result');
    });
  });

  describe('handle keydown event', () => {
    const func = mjs.handleKeyDown;
    beforeEach(() => {
      mjs.vars[ONLY_EDITABLE] = false;
      mjs.vars.contextMode = null;
      mjs.vars.contextNode = null;
    });
    afterEach(() => {
      mjs.vars[ONLY_EDITABLE] = false;
      mjs.vars.contextMode = null;
      mjs.vars.contextNode = null;
    });

    it('should not set values', async () => {
      const res = await func({});
      assert.strictEqual(mjs.vars.contextNode, null, 'node');
      assert.strictEqual(mjs.vars.contextMode, null, 'mode');
      assert.strictEqual(res, null, 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const target = document.querySelector('body');
      const res = await func({
        target,
        key: 'ContextMenu'
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(mjs.vars.contextNode, target, 'node');
      assert.strictEqual(mjs.vars.contextMode, MODE_SOURCE, 'mode');
      assert.deepEqual(res, {}, 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const target = document.querySelector('body');
      mjs.vars[ONLY_EDITABLE] = true;
      const res = await func({
        target,
        key: 'ContextMenu'
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.strictEqual(mjs.vars.contextNode, null, 'node');
      assert.strictEqual(mjs.vars.contextMode, MODE_SOURCE, 'mode');
      assert.deepEqual(res, {}, 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const target = document.querySelector('body');
      const res = await func({
        target,
        key: 'F10',
        shiftKey: true
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(mjs.vars.contextNode, target, 'node');
      assert.strictEqual(mjs.vars.contextMode, MODE_SOURCE, 'mode');
      assert.deepEqual(res, {}, 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const target = document.querySelector('body');
      mjs.vars[ONLY_EDITABLE] = true;
      const res = await func({
        target,
        key: 'F10',
        shiftKey: true
      });
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.strictEqual(mjs.vars.contextNode, null, 'node');
      assert.strictEqual(mjs.vars.contextMode, MODE_SOURCE, 'mode');
      assert.deepEqual(res, {}, 'result');
    });

    it('should set values', async () => {
      const target = document.querySelector('body');
      const res = await func({
        target
      });
      assert.deepEqual(mjs.vars.contextNode, target, 'node');
      assert.strictEqual(mjs.vars.contextMode, MODE_SOURCE, 'mode');
      assert.strictEqual(res, null, 'result');
    });

    it('should set values', async () => {
      const target = document.querySelector('body');
      mjs.vars[ONLY_EDITABLE] = true;
      const res = await func({
        target
      });
      assert.strictEqual(mjs.vars.contextNode, null, 'node');
      assert.strictEqual(mjs.vars.contextMode, MODE_SOURCE, 'mode');
      assert.strictEqual(res, null, 'result');
    });

    it('should set values', async () => {
      const target =
        document.createElementNS('http://www.w3.org/1998/Math/MathML', 'math');
      const body = document.querySelector('body');
      body.appendChild(target);
      const res = await func({
        target
      });
      assert.deepEqual(mjs.vars.contextNode, target, 'node');
      assert.strictEqual(mjs.vars.contextMode, MODE_MATHML, 'mode');
      assert.strictEqual(res, null, 'result');
    });

    it('should set values', async () => {
      const target =
        document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const body = document.querySelector('body');
      body.appendChild(target);
      const res = await func({
        target
      });
      assert.deepEqual(mjs.vars.contextNode, target, 'node');
      assert.strictEqual(mjs.vars.contextMode, MODE_SVG, 'mode');
      assert.strictEqual(res, null, 'result');
    });

    it('should call function', async () => {
      const target = document.createElement('textarea');
      const body = document.querySelector('body');
      body.appendChild(target);
      const res = await func({
        target
      });
      assert.deepEqual(mjs.vars.contextNode, target, 'node');
      assert.strictEqual(mjs.vars.contextMode, MODE_EDIT, 'mode');
      assert.strictEqual(res, null, 'result');
    });

    it('should call function', async () => {
      const target = document.createElement('div');
      const body = document.querySelector('body');
      target.id = 'foo';
      target.classList.add('ace_editor');
      body.appendChild(target);
      const res = await func({
        target
      });
      assert.deepEqual(mjs.vars.contextNode, target, 'node');
      assert.strictEqual(mjs.vars.contextMode, MODE_SOURCE, 'mode');
      assert.strictEqual(res, null, 'result');
    });
  });

  describe('handle ready state', () => {
    const func = mjs.handleReadyState;

    it('should throw', () => {
      assert.throws(() => func());
    });

    it('should throw', () => {
      assert.throws(() => func({}));
    });

    it('should not call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const stub = sinon.stub();
      const evt = {
        target: {
          readyState: 'loading',
          removeEventListener: stub
        }
      };
      const res = await func(evt);
      assert.strictEqual(stub.called, false, 'not called');
      assert.strictEqual(browser.runtime.sendMessage.callCount, i,
        'not called');
      assert.strictEqual(res, null, 'result');
    });

    it('should not call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const stub = sinon.stub();
      const evt = {
        target: {
          readyState: 'interactive',
          removeEventListener: stub
        }
      };
      const res = await func(evt);
      assert.strictEqual(stub.called, false, 'not called');
      assert.strictEqual(browser.runtime.sendMessage.callCount, i,
        'not called');
      assert.strictEqual(res, null, 'result');
    });

    it('should call function', async () => {
      browser.runtime.sendMessage.resolves({});
      const i = browser.runtime.sendMessage.callCount;
      const stub = sinon.stub();
      const evt = {
        target: {
          readyState: 'complete',
          removeEventListener: stub
        }
      };
      const res = await func(evt);
      assert.strictEqual(stub.called, true, 'called');
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(res, {}, 'result');
    });
  });
});
