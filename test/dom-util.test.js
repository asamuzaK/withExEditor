/**
 * dom-util.test.js
 */

/* api */
import { strict as assert } from 'node:assert';
import { DOMSelector } from '@asamuzakjp/dom-selector';
import { afterEach, beforeEach, describe, it } from 'mocha';
import sinon from 'sinon';
import { createJsdom, DataTransfer } from './mocha/setup.js';

/* test */
// eslint-disable-next-line import-x/order
import * as mjs from '../src/mjs/dom-util.js';

describe('dom util', () => {
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
    const domSelector = new DOMSelector(window);
    // Overwrite Element.matches(), Element.closest()
    const matches = domSelector.matches.bind(domSelector);
    window.Element.prototype.matches = function (sel) {
      return matches(sel, this);
    };
    const closest = domSelector.closest.bind(domSelector);
    window.Element.prototype.closest = function (sel) {
      return closest(sel, this);
    };
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

  describe('strip HTML tags and decode HTML escaped characters', () => {
    const func = mjs.getDecodedContent;

    it('should throw', () => {
      assert.throws(() => func(), TypeError,
        'Expected String but got Undefined.');
    });

    it('should get value', () => {
      const res = func('foo');
      assert.strictEqual(res, 'foo', 'result');
    });

    it('should get value', () => {
      const res = func('<p>foo <span>bar</span> &amp; &lt;baz&gt;</p>');
      assert.strictEqual(res, 'foo bar & <baz>', 'result');
    });

    it('should get value', () => {
      const res = func('<p>foo</p><p>bar</p>\n<p>baz</p>');
      assert.strictEqual(res, 'foobar\nbaz', 'result');
    });
  });

  describe('check whether given array of URLs matches document URL', () => {
    const func = mjs.matchDocUrl;

    it('should get false', () => {
      const res = func();
      assert.strictEqual(res, false, 'result');
    });

    it('should get true', () => {
      const res = func([
        'https://example.com',
        'foo',
        '',
        1,
        document.location.href
      ]);
      assert.strictEqual(res, true, 'result');
    });
  });

  describe('get file extension from media type', () => {
    const func = mjs.getFileExtension;

    it('should get value', () => {
      const res = func();
      assert.strictEqual(res, '.txt', 'result');
    });

    it('should get value', () => {
      const res = func('foo');
      assert.strictEqual(res, '.txt', 'result');
    });

    it('should get value', () => {
      const res = func('text/foo');
      assert.strictEqual(res, '.txt', 'result');
    });

    it('should get value', () => {
      const res = func('application/foo+bar');
      assert.strictEqual(res, '.txt', 'result');
    });

    it('should get value', () => {
      const res = func('application/foo+xml');
      assert.strictEqual(res, '.xml', 'result');
    });

    it('should get result', async () => {
      const fileExt = {
        'application/javascript': '.js',
        'application/json': '.json',
        'application/mathml+xml': '.mml',
        'application/xhtml+xml': '.xhtml',
        'application/xml': '.xml',
        'application/xslt+xml': '.xsl',
        'image/svg+xml': '.svg',
        'text/css': '.css',
        'text/javascript': '.js',
        'text/html': '.html',
        'text/plain': '.txt',
        'text/xml': '.xml'
      };
      const items = Object.entries(fileExt);
      for (const [key, value] of items) {
        const res = func(key);
        assert.strictEqual(res, value, `result ${key}`);
      }
    });
  });

  describe('get namespace of node from ancestor', () => {
    const func = mjs.getNodeNS;

    it('should get result', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p);
      assert.deepEqual(res.node, p, 'node');
      assert.strictEqual(res.localName, 'p', 'localName');
      assert.strictEqual(res.namespaceURI, 'http://www.w3.org/1999/xhtml',
        'namespace');
    });

    it('should get result', () => {
      const p = document.createElementNS('http://www.w3.org/1999/xhtml', 'p');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p);
      assert.deepEqual(res.node, p, 'node');
      assert.strictEqual(res.localName, 'p', 'localName');
      assert.strictEqual(res.namespaceURI, 'http://www.w3.org/1999/xhtml',
        'namespace');
    });

    it('should get result', () => {
      const p = document.createElement('p');
      const text = document.createTextNode('foo');
      const body = document.querySelector('body');
      p.appendChild(text);
      body.appendChild(p);
      const res = func(text);
      assert.deepEqual(res.node, p, 'node');
      assert.strictEqual(res.localName, 'p', 'localName');
      assert.strictEqual(res.namespaceURI, 'http://www.w3.org/1999/xhtml',
        'namespace');
    });

    it('should get result', async () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const body = document.querySelector('body');
      body.appendChild(svg);
      const res = await func(svg);
      assert.deepEqual(res.node, svg, 'node');
      assert.strictEqual(res.localName, 'svg', 'localName');
      assert.strictEqual(res.namespaceURI, 'http://www.w3.org/2000/svg',
        'namespace');
    });

    it('should get result', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const text = document.createTextNode('foo');
      const body = document.querySelector('body');
      svg.appendChild(text);
      body.appendChild(svg);
      const res = func(text);
      assert.deepEqual(res.node, svg, 'node');
      assert.strictEqual(res.localName, 'svg', 'localName');
      assert.strictEqual(res.namespaceURI, 'http://www.w3.org/2000/svg',
        'namespace');
    });

    it('should get result', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const fo =
        document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      const p = document.createElement('p');
      const text = document.createTextNode('foo');
      const body = document.querySelector('body');
      fo.setAttributeNS('http://www.w3.org/2000/svg', 'requiredExtensions',
        'http://www.w3.org/1999/xhtml');
      p.appendChild(text);
      fo.appendChild(p);
      svg.appendChild(body);
      const res = func(text);
      assert.deepEqual(res.node, p, 'node');
      assert.strictEqual(res.localName, 'p', 'localName');
      assert.strictEqual(res.namespaceURI, 'http://www.w3.org/1999/xhtml',
        'namespace');
    });

    it('should get result', () => {
      const page = document.createElementNS(
        'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul',
        'page'
      );
      const vbox = document.createElementNS(
        'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul',
        'vbox'
      );
      const div = document.createElementNS('http://www.w3.org/1999/xhtml',
        'html:div');
      const text = document.createTextNode('foo');
      page.setAttributeNS('http://www.w3.org/2000/xmlns',
        'html', 'http://www.w3.org/1999/xhtml');
      div.appendChild(text);
      vbox.appendChild(div);
      page.appendChild(vbox);
      const res = func(text);
      assert.deepEqual(res.node, div, 'node');
      assert.strictEqual(res.localName, 'div', 'localName');
      assert.strictEqual(res.namespaceURI, 'http://www.w3.org/1999/xhtml',
        'namespace');
    });

    it('should get result', () => {
      const page = document.createElementNS(
        'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul',
        'page'
      );
      const vbox = document.createElementNS(
        'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul',
        'vbox'
      );
      const div = document.createElement('html:div');
      const text = document.createTextNode('foo');
      page.setAttributeNS('http://www.w3.org/2000/xmlns',
        'html', 'http://www.w3.org/1999/xhtml');
      div.appendChild(text);
      vbox.appendChild(div);
      page.appendChild(vbox);
      const res = func(text);
      assert.deepEqual(res.node, div, 'node');
      assert.strictEqual(res.localName, 'html:div', 'localName');
      assert.strictEqual(res.namespaceURI, 'http://www.w3.org/1999/xhtml',
        'namespace');
    });

    it('should get result', () => {
      const html = document.querySelector('html');
      const text = document.createTextNode('foo');
      html.appendChild(text);
      const res = func(text);
      assert.deepEqual(res.node, html, 'node');
      assert.strictEqual(res.localName, 'html', 'localName');
      assert.strictEqual(res.namespaceURI, 'http://www.w3.org/1999/xhtml',
        'namespace');
    });

    it('should get result', () => {
      const html = document.querySelector('html');
      html.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      const res = func(html);
      assert.deepEqual(res.node, html, 'node');
      assert.strictEqual(res.localName, 'html', 'localName');
      assert.strictEqual(res.namespaceURI, 'http://www.w3.org/1999/xhtml',
        'namespace');
    });
  });

  describe('get xmlns prefixed namespace', () => {
    const func = mjs.getXmlnsPrefixedNamespace;

    it('should get null', () => {
      const res = func();
      assert.strictEqual(res, null, 'result');
    });

    it('should get null', () => {
      const body = document.querySelector('body');
      const res = func(body);
      assert.strictEqual(res, null, 'result');
    });

    it('should get result', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const text =
        document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const html = document.querySelector('html');
      const body = document.querySelector('body');
      html.setAttribute('xmlns', 'http://www.w3.org/2000/xmlns');
      svg.setAttribute('xmlns:html', 'http://www.w3.org/1999/xhtml');
      text.setAttribute('html:data-foo', 'bar');
      svg.appendChild(text);
      body.appendChild(svg);
      const res = func(text, 'html');
      assert.strictEqual(res, 'http://www.w3.org/1999/xhtml', 'result');
    });

    it('should get result', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const text =
        document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const html = document.querySelector('html');
      const body = document.querySelector('body');
      html.setAttribute('xmlns', 'http://www.w3.org/2000/xmlns');
      text.setAttribute('xmlns:html', 'http://www.w3.org/1999/xhtml');
      text.setAttribute('html:data-foo', 'bar');
      svg.appendChild(text);
      body.appendChild(svg);
      const res = func(text, 'html');
      assert.strictEqual(res, 'http://www.w3.org/1999/xhtml', 'result');
    });
  });

  describe('set namespaced attribute', () => {
    const func = mjs.setAttributeNS;

    it('should not set attributes', async () => {
      const elm = document.createElement('p');
      const elm2 = document.createElement('p');
      elm2.setAttribute('data-foo', 'bar');
      func(elm);
      assert.strictEqual(elm.hasAttribute('data-foo'), false, 'attr');
    });

    it('should not set attributes', async () => {
      const elm = document.createElement('p');
      const elm2 = document.createElement('p');
      elm2.setAttribute('data-foo', 'bar');
      func(null, elm2);
      assert.strictEqual(elm.hasAttribute('data-foo'), false, 'attr');
    });

    it('should set attributes', async () => {
      const elm = document.createElement('p');
      const elm2 = document.createElement('p');
      const body = document.querySelector('body');
      elm2.setAttribute('data-foo', 'bar');
      elm2.setAttribute('onclick', 'return false');
      body.appendChild(elm2);
      func(elm, elm2);
      assert.strictEqual(elm.hasAttribute('data-foo'), true, 'attr');
      assert.strictEqual(elm.hasAttribute('onclick'), false, 'func');
      assert.strictEqual(elm.attributes.length, elm2.attributes.length - 1,
        'length');
    });

    it('should set attributes', async () => {
      const elm = document.createElement('p');
      const elm2 = document.createElement('p');
      const body = document.querySelector('body');
      elm2.setAttribute('data-foo', 'bar');
      elm2.setAttribute('onclick', 'alert(1)');
      body.appendChild(elm2);
      func(elm, elm2);
      assert.strictEqual(elm.hasAttribute('data-foo'), true, 'attr');
      assert.strictEqual(elm.hasAttribute('onclick'), false, 'func');
      assert.strictEqual(elm.attributes.length, elm2.attributes.length - 1,
        'length');
    });

    it('should set attributes', async () => {
      const elm = document.createElement('object');
      const elm2 = document.createElement('object');
      const body = document.querySelector('body');
      elm2.setAttribute('data-foo', 'bar');
      elm2.setAttribute('data', 'https://example.com');
      body.appendChild(elm2);
      func(elm, elm2);
      assert.strictEqual(elm.hasAttribute('data-foo'), true, 'attr');
      assert.strictEqual(elm.hasAttribute('data'), true, 'url');
      assert.strictEqual(elm.attributes.length, elm2.attributes.length,
        'length');
    });

    it('should set attributes', async () => {
      const elm = document.createElement('object');
      const elm2 = document.createElement('object');
      const body = document.querySelector('body');
      elm2.setAttribute('data-foo', 'bar');
      elm2.setAttribute('data', '../baz');
      body.appendChild(elm2);
      func(elm, elm2);
      assert.strictEqual(elm.hasAttribute('data-foo'), true, 'attr');
      assert.strictEqual(elm.hasAttribute('data'), true, 'url');
      assert.strictEqual(elm.attributes.length, elm2.attributes.length,
        'length');
    });

    it('should set attributes', async () => {
      const elm = document.createElement('object');
      const elm2 = document.createElement('object');
      const body = document.querySelector('body');
      elm2.setAttribute('data-foo', 'bar');
      elm2.setAttribute('data', 'javascript:void(0)');
      body.appendChild(elm2);
      func(elm, elm2);
      assert.strictEqual(elm.hasAttribute('data-foo'), true, 'attr');
      assert.strictEqual(elm.hasAttribute('data'), false, 'url');
      assert.strictEqual(elm.attributes.length, elm2.attributes.length - 1,
        'length');
    });

    it('should set attributes', async () => {
      const elm = document.createElement('a');
      const elm2 = document.createElement('a');
      const body = document.querySelector('body');
      elm2.setAttribute('data-foo', 'bar');
      elm2.setAttribute('href', 'https://example.com');
      elm2.setAttribute('ping', 'https://example.com https://example.net');
      body.appendChild(elm2);
      func(elm, elm2);
      assert.strictEqual(elm.hasAttribute('data-foo'), true, 'attr');
      assert.strictEqual(elm.hasAttribute('href'), true, 'url');
      assert.strictEqual(elm.hasAttribute('ping'), true, 'ping url');
      assert.strictEqual(elm.attributes.length, elm2.attributes.length,
        'length');
    });

    it('should set attributes', async () => {
      const elm = document.createElement('a');
      const elm2 = document.createElement('a');
      const body = document.querySelector('body');
      elm2.setAttribute('data-foo', 'bar');
      elm2.setAttribute('href', '../');
      body.appendChild(elm2);
      func(elm, elm2);
      assert.strictEqual(elm.hasAttribute('data-foo'), true, 'attr');
      assert.strictEqual(elm.hasAttribute('href'), true, 'url');
      assert.strictEqual(elm.attributes.length, elm2.attributes.length,
        'length');
    });

    it('should set attributes', async () => {
      const elm = document.createElement('a');
      const elm2 = document.createElement('a');
      const body = document.querySelector('body');
      elm2.setAttribute('data-foo', 'bar');
      elm2.setAttribute('href', 'javascript:void(0)');
      elm2.setAttribute(
        'ping',
        'https://example.com javascript:void(0)   https://example.net'
      );
      body.appendChild(elm2);
      func(elm, elm2);
      assert.strictEqual(elm.hasAttribute('data-foo'), true, 'attr');
      assert.strictEqual(elm.hasAttribute('href'), false, 'url');
      assert.strictEqual(elm.hasAttribute('ping'), false, 'ping url');
      assert.strictEqual(elm.attributes.length, elm2.attributes.length - 2,
        'length');
    });

    it('should set attributes', async () => {
      const elm = document.createElement('video');
      const elm2 = document.createElement('video');
      const body = document.querySelector('body');
      elm2.setAttribute('data-foo', 'bar');
      elm2.setAttribute('poster', 'https://example.com');
      body.appendChild(elm2);
      func(elm, elm2);
      assert.strictEqual(elm.hasAttribute('data-foo'), true, 'attr');
      assert.strictEqual(elm.hasAttribute('poster'), true, 'url');
      assert.strictEqual(elm.attributes.length, elm2.attributes.length,
        'length');
    });

    it('should set attributes', async () => {
      const elm = document.createElement('video');
      const elm2 = document.createElement('video');
      const body = document.querySelector('body');
      elm2.setAttribute('data-foo', 'bar');
      elm2.setAttribute('poster', '../baz');
      body.appendChild(elm2);
      func(elm, elm2);
      assert.strictEqual(elm.hasAttribute('data-foo'), true, 'attr');
      assert.strictEqual(elm.hasAttribute('poster'), true, 'url');
      assert.strictEqual(elm.attributes.length, elm2.attributes.length,
        'length');
    });

    it('should set attributes', async () => {
      const elm = document.createElement('video');
      const elm2 = document.createElement('video');
      const body = document.querySelector('body');
      elm2.setAttribute('data-foo', 'bar');
      elm2.setAttribute('poster', 'javascript:void(0)');
      body.appendChild(elm2);
      func(elm, elm2);
      assert.strictEqual(elm.hasAttribute('data-foo'), true, 'attr');
      assert.strictEqual(elm.hasAttribute('poster'), false, 'url');
      assert.strictEqual(elm.attributes.length, elm2.attributes.length - 1,
        'length');
    });

    it('should set attributes', async () => {
      const elm = document.createElement('img');
      const elm2 = document.createElement('img');
      const body = document.querySelector('body');
      elm2.setAttribute('data-foo', 'bar');
      elm2.setAttribute('src', 'https://example.com');
      body.appendChild(elm2);
      func(elm, elm2);
      assert.strictEqual(elm.hasAttribute('data-foo'), true, 'attr');
      assert.strictEqual(elm.hasAttribute('src'), true, 'url');
      assert.strictEqual(elm.attributes.length, elm2.attributes.length,
        'length');
    });

    it('should set attributes', async () => {
      const elm = document.createElement('img');
      const elm2 = document.createElement('img');
      const body = document.querySelector('body');
      elm2.setAttribute('data-foo', 'bar');
      elm2.setAttribute('src', '../baz');
      body.appendChild(elm2);
      func(elm, elm2);
      assert.strictEqual(elm.hasAttribute('data-foo'), true, 'attr');
      assert.strictEqual(elm.hasAttribute('src'), true, 'url');
      assert.strictEqual(elm.attributes.length, elm2.attributes.length,
        'length');
    });

    it('should set attributes', async () => {
      const elm = document.createElement('img');
      const elm2 = document.createElement('img');
      const body = document.querySelector('body');
      elm2.setAttribute('data-foo', 'bar');
      elm2.setAttribute('src', 'javascript:void(0)');
      body.appendChild(elm2);
      func(elm, elm2);
      assert.strictEqual(elm.hasAttribute('data-foo'), true, 'attr');
      assert.strictEqual(elm.hasAttribute('src'), false, 'url');
      assert.strictEqual(elm.attributes.length, elm2.attributes.length - 1,
        'length');
    });

    it('should set attributes', async () => {
      const elm = document.createElement('input');
      const elm2 = document.createElement('input');
      const body = document.querySelector('body');
      elm2.setAttribute('data-foo', 'bar');
      elm2.setAttribute('value', 'foo bar');
      body.appendChild(elm2);
      func(elm, elm2);
      assert.strictEqual(elm.hasAttribute('data-foo'), true, 'attr');
      assert.strictEqual(elm.hasAttribute('value'), true, 'attr');
      assert.strictEqual(elm2.getAttribute('value'), 'foo bar',
        'original attr value');
      assert.strictEqual(elm.getAttribute('value'), '', 'cloned attr value');
      assert.strictEqual(elm2.value, 'foo bar', 'original value');
      assert.strictEqual(elm.value, '', 'cloned value');
      assert.strictEqual(elm.attributes.length, elm2.attributes.length,
        'length');
    });

    it('should set attributes', async () => {
      const elm = document.createElement('input');
      const elm2 = document.createElement('input');
      const body = document.querySelector('body');
      elm2.setAttribute('data-foo', 'bar');
      elm2.setAttribute('value', '');
      elm2.value = 'foo bar';
      body.appendChild(elm2);
      func(elm, elm2);
      assert.strictEqual(elm.hasAttribute('data-foo'), true, 'attr');
      assert.strictEqual(elm.hasAttribute('value'), true, 'attr');
      assert.strictEqual(elm2.getAttribute('value'), '', 'original attr value');
      assert.strictEqual(elm.getAttribute('value'), '', 'cloned attr value');
      assert.strictEqual(elm2.value, 'foo bar', 'original value');
      assert.strictEqual(elm.value, '', 'cloned value');
      assert.strictEqual(elm.attributes.length, elm2.attributes.length,
        'length');
    });

    it('should set attributes', async () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const svg2 =
        document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const html = document.querySelector('html');
      const body = document.querySelector('body');
      html.setAttribute('xmlns', 'http://www.w3.org/2000/xmlns/');
      svg2.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:html',
        'http://www.w3.org/1999/xhtml');
      svg2.setAttributeNS('http://www.w3.org/1999/xhtml', 'html:data-foo',
        'bar');
      body.appendChild(svg2);
      func(svg, svg2);
      assert.strictEqual(svg.hasAttribute('xmlns:html'), true, 'attr');
      assert.strictEqual(svg.hasAttribute('html:data-foo'), true, 'attr');
      assert.strictEqual(svg.attributes.length, svg2.attributes.length,
        'length');
    });
  });

  describe('create namespaced element', () => {
    const func = mjs.createElement;

    it('should get null', () => {
      const res = func();
      assert.strictEqual(res, null, 'result');
    });

    it('should get null', () => {
      const elm = document.createElement('script');
      const body = document.querySelector('body');
      body.appendChild(elm);
      const res = func(elm);
      assert.strictEqual(res, null, 'result');
    });

    it('should get result', () => {
      const elm = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(elm);
      const res = func(elm);
      assert.strictEqual(res.nodeType, Node.ELEMENT_NODE, 'nodeType');
      assert.strictEqual(res.localName, 'p', 'localName');
    });

    it('should get result', () => {
      const elm =
        document.createElementNS('http://www.w3.org/1999/xhtml', 'html:div');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const html = document.querySelector('html');
      const body = document.querySelector('body');
      html.setAttribute('xmlns', 'http://www.w3.org/2000/xmlns');
      svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:html',
        'http://www.w3.org/1999/xhtml');
      elm.setAttribute('data-foo', 'bar');
      svg.appendChild(elm);
      body.appendChild(svg);
      const res = func(elm);
      assert.strictEqual(res.nodeType, Node.ELEMENT_NODE, 'nodeType');
      assert.strictEqual(res.localName, 'div', 'localName');
      assert.strictEqual(res.hasAttribute('data-foo'), true, 'attr');
    });

    it('should get result', () => {
      const elm = document.createElement('foo');
      const body = document.querySelector('body');
      elm.setAttribute('bar', 'baz');
      body.appendChild(elm);
      const res = func(elm);
      assert.strictEqual(res instanceof HTMLUnknownElement, true, 'instance');
      assert.strictEqual(res.localName, 'foo', 'localName');
      assert.strictEqual(res.hasAttribute('bar'), false, 'attr');
    });

    it('should throw', async () => {
      const dom =
        new DOMParser().parseFromString('<foo@example.com>', 'text/html');
      const { body: domBody } = dom;
      const { firstElementChild: elm } = domBody;
      const body = document.querySelector('body');
      body.appendChild(elm);
      assert.throws(() => func(elm));
    });
  });

  describe('create document fragment from nodes array', () => {
    const func = mjs.createFragment;

    it('should get document fragment', () => {
      const res = func();
      assert.strictEqual(res.nodeType, Node.DOCUMENT_FRAGMENT_NODE, 'nodeType');
      assert.strictEqual(res.hasChildNodes(), false, 'hasChildNodes');
    });

    it('should get document fragment', () => {
      const arr = [];
      arr.push(
        document.createTextNode('\n'),
        document.createComment('foo'),
        null,
        document.createElement('p')
      );
      const res = func(arr);
      assert.strictEqual(res.nodeType, Node.DOCUMENT_FRAGMENT_NODE, 'nodeType');
      assert.strictEqual(res.childNodes.length, 2, 'childNodes');
      assert.strictEqual(res.childNodes[0].nodeType, Node.TEXT_NODE,
        'nodeType');
      assert.strictEqual(res.childNodes[1].nodeType, Node.ELEMENT_NODE,
        'nodeType');
    });
  });

  describe('append child nodes', () => {
    const func = mjs.appendChildNodes;

    it('should get element', () => {
      const elm = document.createElement('p');
      const elm2 = document.createElement('div');
      const res = func(elm, elm2);
      assert.strictEqual(res.localName, 'p', 'localName');
      assert.strictEqual(res.hasChildNodes(), false, 'child');
    });

    it('should get element', () => {
      const elm = document.createElement('p');
      const elm2 = document.createElement('div');
      elm2.textContent = 'foo';
      const res = func(elm, elm2);
      assert.strictEqual(res.localName, 'p', 'localName');
      assert.strictEqual(res.hasChildNodes(), true, 'child');
      assert.strictEqual(res.childNodes.length, 1, 'length');
    });

    it('should get element', () => {
      const elm = document.createElement('p');
      const elm2 = document.createElement('div');
      elm2.appendChild(document.createComment('foo'));
      const res = func(elm, elm2);
      assert.strictEqual(res.localName, 'p', 'localName');
      assert.strictEqual(res.hasChildNodes(), false, 'child');
    });

    it('should get element', () => {
      const elm = document.createElement('p');
      const elm2 = document.createElement('div');
      const elm3 = document.createElement('span');
      const elm4 = document.createElement('span');
      elm3.textContent = 'foo';
      elm2.appendChild(elm3);
      elm2.appendChild(document.createTextNode('bar'));
      elm4.textContent = 'baz';
      elm2.appendChild(elm4);
      const res = func(elm, elm2);
      assert.strictEqual(res.localName, 'p', 'localName');
      assert.strictEqual(res.hasChildNodes(), true, 'child');
      assert.strictEqual(res.childNodes.length, 5, 'length');
    });
  });

  describe('create DOM of MathML / SVG', () => {
    const func = mjs.createXmlBasedDomString;

    it('should get null', () => {
      const res = func();
      assert.strictEqual(res, null, 'result');
    });

    it('should get null', () => {
      const elm = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(elm);
      const res = func(elm);
      assert.strictEqual(res, null, 'result');
    });

    it('should get result', () => {
      const elm = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const body = document.querySelector('body');
      body.appendChild(elm);
      const res = func(elm);
      assert.strictEqual(res, '<svg xmlns="http://www.w3.org/2000/svg"/>\n',
        'result');
    });
  });

  describe('create range array', () => {
    const func = mjs.createRangeArr;

    it('should get empty array', () => {
      const res = func();
      assert.deepEqual(res, [], 'result');
    });

    it('should get array', () => {
      const range = document.createRange();
      const elm = document.createElement('p');
      const body = document.querySelector('body');
      const text = document.createTextNode('foo');
      elm.appendChild(text);
      body.appendChild(elm);
      range.selectNode(elm);
      const res = func(range);
      assert.strictEqual(res.length, 2, 'length');
      assert.strictEqual(res[0].localName, 'body', 'element');
      assert.strictEqual(res[1].nodeValue, '\n', 'value');
    });

    it('should get array', () => {
      const range = document.createRange();
      const elm = document.createElement('p');
      const body = document.querySelector('body');
      const text = document.createTextNode('foo');
      elm.appendChild(text);
      body.appendChild(elm);
      range.selectNode(text);
      const res = func(range);
      assert.strictEqual(res.length, 2, 'length');
      assert.strictEqual(res[0].localName, 'p', 'element');
      assert.strictEqual(res[1].nodeValue, '\n', 'value');
    });

    it('should get array', () => {
      const range = document.createRange();
      const elm = document.createElement('p');
      const body = document.querySelector('body');
      const text = document.createTextNode('foo');
      elm.appendChild(text);
      body.appendChild(elm);
      range.selectNode(elm);
      const res = func(range);
      assert.strictEqual(res.length, 2, 'length');
      assert.strictEqual(res[0].localName, 'body', 'element');
      assert.strictEqual(res[1].nodeValue, '\n', 'value');
    });

    it('should get array', () => {
      const range = document.createRange();
      const elm = document.createElement('p');
      const body = document.querySelector('body');
      const text = document.createTextNode('foo');
      elm.appendChild(text);
      body.appendChild(elm);
      range.selectNode(text);
      const res = func(range);
      assert.strictEqual(res.length, 2, 'length');
      assert.strictEqual(res[0].localName, 'p', 'element');
      assert.strictEqual(res[1].nodeValue, '\n', 'value');
    });

    it('should get array', () => {
      const range = document.createRange();
      const elm = document.createElement('p');
      const elm2 = document.createElement('p');
      const body = document.querySelector('body');
      elm.textContent = 'foo';
      elm2.textContent = 'bar';
      body.appendChild(elm);
      body.appendChild(elm2);
      range.setStart(elm, 1);
      range.setEnd(elm2, 1);
      const res = func(range);
      assert.strictEqual(res.length, 2, 'length');
      assert.strictEqual(res[0].localName, 'body', 'element');
      assert.strictEqual(res[1].nodeValue, '\n', 'value');
    });

    it('should get array', () => {
      const range = document.createRange();
      const elm = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const body = document.querySelector('body');
      const text = document.createTextNode('foo');
      elm.appendChild(text);
      body.appendChild(elm);
      range.selectNode(elm);
      const res = func(range);
      assert.strictEqual(res.length, 2, 'length');
      assert.strictEqual(res[0].localName, 'body', 'element');
      assert.strictEqual(res[1].nodeValue, '\n', 'value');
    });

    it('should get array', () => {
      const range = document.createRange();
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const elm =
        document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const body = document.querySelector('body');
      const text = document.createTextNode('foo');
      elm.appendChild(text);
      svg.appendChild(elm);
      body.appendChild(svg);
      range.selectNode(elm);
      const res = func(range);
      assert.strictEqual(res.length, 2, 'length');
      assert.strictEqual(res[0].localName, 'svg', 'element');
      assert.strictEqual(res[1].nodeValue, '\n', 'value');
    });

    it('should get array', () => {
      const range = document.createRange();
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const elm =
        document.createElementNS('http://www.w3.org/2000/svg', 'text');
      elm.textContent = 'foo';
      svg.appendChild(elm);
      range.selectNode(elm);
      const res = func(range);
      assert.strictEqual(res, null, 'result');
    });

    it('should get array', () => {
      const range = document.createRange();
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const elm = document.createElement('text');
      const text = document.createTextNode('foo');
      elm.appendChild(text);
      svg.appendChild(elm);
      range.selectNode(text);
      const res = func(range);
      assert.strictEqual(res.length, 2, 'length');
      assert.strictEqual(res[0].localName, 'text', 'element');
      assert.strictEqual(res[1].nodeValue, '\n', 'value');
    });
  });

  describe('create DOM from selection range', () => {
    const func = mjs.createDomStringFromSelectionRange;

    it('should get null', () => {
      const res = func();
      assert.strictEqual(res, null, 'result');
    });

    it('should get value', () => {
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
      const res = func(sel);
      assert.strictEqual(res,
        '<p xmlns="http://www.w3.org/1999/xhtml">foo</p>\n',
        'result');
    });
  });

  describe('serialize DOM string', () => {
    const func = mjs.serializeDomString;

    it('should throw', () => {
      assert.throws(() => func(), TypeError,
        'Expected String but got Undefined.');
    });

    it('should throw', () => {
      assert.throws(() => func('foo'), TypeError,
        'Expected String but got Undefined.');
    });

    it('should throw', () => {
      assert.throws(() => func('foo', 'image/png'), Error,
        'Unsupported MIME type image/png.');
    });

    it('should get null', () => {
      const res = func('<html></html>', 'text/html');
      assert.strictEqual(res, null, 'result');
    });

    it('should get result', () => {
      const res = func('<xml></xml>', 'text/xml');
      assert.strictEqual(res,
        '<xml xmlns="http://www.w3.org/1999/xhtml"></xml>', 'result');
    });

    it('should get result', () => {
      const res = func('<xml></xml>', 'application/xml');
      assert.strictEqual(res,
        '<xml xmlns="http://www.w3.org/1999/xhtml"></xml>', 'result');
    });

    it('should get result', () => {
      const res = func('<html></html>', 'application/xhtml+xml');
      assert.strictEqual(res,
        '<html xmlns="http://www.w3.org/1999/xhtml"></html>', 'result');
    });

    it('should get result', () => {
      const res = func('<html xmlns="http://www.w3.org/1999/xhtml"></html>',
        'application/xhtml+xml');
      assert.strictEqual(res,
        '<html xmlns="http://www.w3.org/1999/xhtml"></html>', 'result');
    });

    it('should get result', () => {
      const res = func('<svg></svg>', 'image/svg+xml');
      assert.strictEqual(res,
        '<svg xmlns="http://www.w3.org/1999/xhtml"></svg>', 'result');
    });

    it('should get result', () => {
      const res = func('<svg xmlns="http://www.w3.org/2000/svg"></svg>',
        'image/svg+xml');
      assert.strictEqual(res,
        '<svg xmlns="http://www.w3.org/2000/svg"/>', 'result');
    });

    it('should throw', () => {
      assert.throws(() => func('<', 'text/xml'), Error,
        'Error while parsing DOM string.');
    });

    it('should throw', () => {
      assert.throws(() => func('</>', 'text/xml'), Error,
        'Error while parsing DOM string.');
    });

    it('should throw', () => {
      assert.throws(() => func('', 'text/xml'), Error,
        'Error while parsing DOM string.');
    });

    it('should throw', () => {
      assert.throws(() => func('<xml></xml><xml></xml>', 'text/xml'), Error,
        'Error while parsing DOM string.');
    });

    it('should throw', () => {
      assert.throws(() => func('foo <em>bar</em>', 'application/xhtml+xml'),
        Error, 'Error while parsing DOM string.');
    });

    it('should get null', () => {
      const res = func('', 'text/html');
      assert.strictEqual(res, null, 'result');
    });

    it('should get null', () => {
      const res = func('', 'text/html', true);
      assert.strictEqual(res, null, 'result');
    });

    it('should get null', () => {
      const stubErr = sinon.stub(console, 'error');
      const res = func('Example <foo@example.dom> wrote:\nfoo', 'text/html');
      const { calledOnce } = stubErr;
      stubErr.restore();
      assert.strictEqual(calledOnce, true, 'error');
      assert.strictEqual(res, null, 'result');
    });

    it('should get null', () => {
      const stubErr = sinon.stub(console, 'error');
      const res =
        func('Example <foo@example.dom> wrote:\nfoo', 'text/html', true);
      const { calledOnce } = stubErr;
      stubErr.restore();
      assert.strictEqual(calledOnce, true, 'error');
      assert.strictEqual(res, null, 'result');
    });

    it('should get result', () => {
      const res = func('foo bar\nbaz', 'text/html');
      assert.strictEqual(res, 'foo bar\nbaz', 'result');
    });

    it('should get null', () => {
      const res = func('foo bar\nbaz', 'text/html', true);
      assert.strictEqual(res, null, 'result');
    });

    it('should get result', () => {
      const res = func('<<foo>>', 'text/html');
      assert.strictEqual(res,
        '&lt;<foo xmlns="http://www.w3.org/1999/xhtml">&gt;</foo>', 'result');
    });

    it('should get result', () => {
      const res = func('<<foo>>', 'text/html', true);
      assert.strictEqual(res,
        '&lt;<foo xmlns="http://www.w3.org/1999/xhtml">&gt;</foo>', 'result');
    });

    it('should get result', () => {
      const res = func('<<script>>', 'text/html');
      assert.strictEqual(res, '&lt;', 'result');
    });

    it('should get result', () => {
      const res =
        func('<div>foo <bar foobar="foobar">baz</bar>\nqux</div>', 'text/html');
      assert.strictEqual(res,
        '<div xmlns="http://www.w3.org/1999/xhtml">foo <bar>baz</bar>\nqux</div>',
        'result');
    });

    it('should get result', () => {
      const res = func('foo <em>bar</em>\nbaz', 'text/html');
      assert.strictEqual(res,
        'foo <em xmlns="http://www.w3.org/1999/xhtml">bar</em>\nbaz', 'result');
    });

    it('should get result', () => {
      const res = func('foo <em onclick="alert(1)">bar</em>\nbaz', 'text/html');
      assert.strictEqual(res,
        'foo <em xmlns="http://www.w3.org/1999/xhtml">bar</em>\nbaz', 'result');
    });

    it('should get result', () => {
      const res = func('foo <script>alert(1)</script>\nbar', 'text/html');
      assert.strictEqual(res, 'foo \nbar', 'result');
    });

    it('should get result', () => {
      const res =
        func('foo <div><script>alert(1)</script></div>\nbar', 'text/html');
      assert.strictEqual(res,
        'foo <div xmlns="http://www.w3.org/1999/xhtml">\n\n</div>\nbar',
        'result');
    });

    it('should get result', () => {
      const res = func('<div>foo</div>\n<div>bar</div>\n', 'text/html');
      assert.strictEqual(res,
        '<div xmlns="http://www.w3.org/1999/xhtml">foo</div>\n<div xmlns="http://www.w3.org/1999/xhtml">bar</div>\n',
        'result');
    });

    it('should get result', () => {
      const res = func('<foo/>', 'text/xml');
      assert.strictEqual(res,
        '<foo xmlns="http://www.w3.org/1999/xhtml"></foo>', 'result');
    });

    it('should get result', () => {
      const res = func('<em>foo</em>\n', 'application/xhtml+xml');
      assert.strictEqual(res,
        '<em xmlns="http://www.w3.org/1999/xhtml">foo</em>', 'result');
    });

    it('should get result', () => {
      const res =
        func('<div><em>foo</em> bar</div>\n', 'application/xhtml+xml');
      assert.strictEqual(res,
        '<div xmlns="http://www.w3.org/1999/xhtml">\n<em>foo</em> bar</div>',
        'result');
    });

    it('should get result', () => {
      const res = func('<div><em onclick="alert(1)">foo</em> bar</div>\n',
        'application/xhtml+xml');
      assert.strictEqual(res,
        '<div xmlns="http://www.w3.org/1999/xhtml">\n<em>foo</em> bar</div>',
        'result');
    });

    it('should get result', () => {
      const res = func('<div><script>alert(1)</script> foo</div>\n',
        'application/xhtml+xml');
      assert.strictEqual(res,
        '<div xmlns="http://www.w3.org/1999/xhtml">\n foo</div>', 'result');
    });
  });

  describe('get text', () => {
    const func = mjs.getText;

    it('should get empty string', () => {
      const res = func();
      assert.strictEqual(res, '', 'result');
    });

    it('should get empty string', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(document.querySelectorAll('p'));
      assert.strictEqual(res, '', 'result');
    });

    it('should get empty string', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      p.textContent = '\n';
      body.appendChild(p);
      const res = func(document.querySelectorAll('p'));
      assert.strictEqual(res, '', 'result');
    });

    it('should get empty string', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      p.textContent = ' ';
      body.appendChild(p);
      const res = func(document.querySelectorAll('p'));
      assert.strictEqual(res, '', 'result');
    });

    it('should get string', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      p.textContent = 'foo';
      body.appendChild(p);
      const res = func(document.querySelectorAll('p'));
      assert.strictEqual(res, 'foo\n', 'result');
    });

    it('should get string', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      p.textContent = ' foo ';
      body.appendChild(p);
      const res = func(document.querySelectorAll('p'));
      assert.strictEqual(res, 'foo\n', 'result');
    });

    it('should get string', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      p.textContent = ' foo \n';
      body.appendChild(p);
      const res = func(document.querySelectorAll('p'));
      assert.strictEqual(res, 'foo\n', 'result');
    });

    it('should get empty string', () => {
      const p = document.createElement('p');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      span.textContent = '';
      p.appendChild(span);
      body.appendChild(p);
      const res = func(document.querySelectorAll('p'));
      assert.strictEqual(res, '', 'result');
    });

    it('should get string', () => {
      const p = document.createElement('p');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      span.textContent = 'foo';
      p.appendChild(span);
      body.appendChild(p);
      const res = func(document.querySelectorAll('p'));
      assert.strictEqual(res, 'foo\n', 'result');
    });

    it('should get string', () => {
      const p = document.createElement('p');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      span.textContent = ' foo ';
      p.appendChild(span);
      body.appendChild(p);
      const res = func(document.querySelectorAll('p'));
      assert.strictEqual(res, 'foo\n', 'result');
    });

    it('should get string', () => {
      const p = document.createElement('p');
      const em = document.createElement('em');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      span.textContent = 'foo';
      em.appendChild(span);
      p.appendChild(em);
      body.appendChild(p);
      const res = func(document.querySelectorAll('p'));
      assert.strictEqual(res, 'foo\n', 'result');
    });

    it('should get string', () => {
      const p = document.createElement('p');
      const em = document.createElement('em');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      span.textContent = 'foo';
      em.textContent = 'bar';
      p.appendChild(span);
      p.appendChild(document.createTextNode(' '));
      p.appendChild(em);
      body.appendChild(p);
      const res = func(document.querySelectorAll('p'));
      assert.strictEqual(res, 'foo bar\n', 'result');
    });

    it('should get string', () => {
      const p = document.createElement('p');
      const em = document.createElement('em');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      span.textContent = 'foo';
      em.textContent = 'bar';
      p.appendChild(span);
      p.appendChild(document.createTextNode('\n'));
      p.appendChild(em);
      body.appendChild(p);
      const res = func(document.querySelectorAll('p'), true);
      assert.strictEqual(res, 'foo\nbar\n', 'result');
    });

    it('should get string', () => {
      const p = document.createElement('p');
      const br = document.createElement('br');
      const body = document.querySelector('body');
      p.appendChild(br);
      body.appendChild(p);
      const res = func(document.querySelectorAll('p'));
      assert.strictEqual(res, '\n', 'result');
    });

    it('should get string', () => {
      const pre = document.createElement('pre');
      const span = document.createElement('span');
      const span2 = document.createElement('span');
      const body = document.querySelector('body');
      pre.appendChild(document.createTextNode('  foo bar\n  '));
      span.textContent = 'baz';
      pre.appendChild(span);
      pre.appendChild(document.createTextNode(' qux '));
      span2.textContent = 'quux';
      pre.appendChild(span2);
      pre.appendChild(document.createTextNode('\n'));
      body.appendChild(pre);
      const res = func(document.querySelectorAll('pre'));
      assert.strictEqual(res, '  foo bar\n  baz qux quux\n', 'result');
    });

    it('should get string', () => {
      const sec = document.createElement('section');
      const h1 = document.createElement('h1');
      const p = document.createElement('p');
      const p2 = document.createElement('p');
      const p3 = document.createElement('p');
      const img = document.createElement('img');
      const cmt = document.createComment('comment');
      const body = document.querySelector('body');
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
      body.appendChild(sec);
      const res = func(document.querySelectorAll('section'));
      assert.strictEqual(res, 'foo bar\n\nbaz qux\n\nquux\n\ncorge\n\n', 'result');
    });

    it('should get string', () => {
      const sec = document.createElement('section');
      const h1 = document.createElement('h1');
      const p = document.createElement('div');
      const p2 = document.createElement('div');
      const p3 = document.createElement('div');
      const img = document.createElement('img');
      const cmt = document.createComment('comment');
      const body = document.querySelector('body');
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
      body.appendChild(sec);
      const res = func(document.querySelectorAll('section'));
      assert.strictEqual(res, 'foo bar\n\nbaz qux\nquux\ncorge\n\n', 'result');
    });

    it('should get string', () => {
      const pre = document.createElement('pre');
      const span = document.createElement('span');
      const span2 = document.createElement('span');
      const body = document.querySelector('body');
      pre.appendChild(document.createTextNode('  foo bar\n  '));
      span.textContent = 'baz';
      pre.appendChild(span);
      pre.appendChild(document.createTextNode(' qux '));
      span2.textContent = 'quux';
      pre.appendChild(span2);
      pre.appendChild(document.createTextNode('\n'));
      body.appendChild(pre);
      const res = func(document.querySelectorAll('pre'));
      assert.strictEqual(res, '  foo bar\n  baz qux quux\n', 'result');
    });

    it('should get string', () => {
      const table = document.createElement('table');
      const tr = document.createElement('tr');
      const tr2 = document.createElement('tr');
      const th = document.createElement('th');
      const th2 = document.createElement('th');
      const th3 = document.createElement('th');
      const td = document.createElement('td');
      const td2 = document.createElement('td');
      const td3 = document.createElement('td');
      const body = document.querySelector('body');
      th.textContent = 'foo';
      th2.textContent = 'bar';
      th3.textContent = 'baz';
      td.textContent = 'qux';
      td2.textContent = 'quux';
      td3.textContent = 'corge';
      tr.appendChild(th);
      tr.appendChild(th2);
      tr.appendChild(th3);
      tr2.appendChild(td);
      tr2.appendChild(td2);
      tr2.appendChild(td3);
      table.appendChild(tr);
      table.appendChild(tr2);
      body.appendChild(table);
      const res = func(document.querySelectorAll('table'));
      assert.strictEqual(res, 'foo\tbar\tbaz\nqux\tquux\tcorge\n', 'result');
    });

    it('should get empty string', () => {
      const p = document.createElement('p');
      const img = document.createElement('img');
      const body = document.querySelector('body');
      p.appendChild(img);
      body.appendChild(p);
      const res = func(document.querySelectorAll('p'));
      assert.strictEqual(res, '', 'result');
    });

    it('should get string', () => {
      const p = document.createElement('p');
      const img = document.createElement('img');
      const body = document.querySelector('body');
      img.alt = 'foo';
      p.appendChild(img);
      body.appendChild(p);
      const res = func(document.querySelectorAll('p'));
      assert.strictEqual(res, 'foo\n', 'result');
    });

    it('should get string', () => {
      const p = document.createElement('p');
      const img = document.createElement('img');
      const body = document.querySelector('body');
      img.alt = 'foo';
      p.appendChild(img);
      p.appendChild(document.createTextNode(' '));
      body.appendChild(p);
      const res = func(document.querySelectorAll('p'));
      assert.strictEqual(res, 'foo\n', 'result');
    });

    it('should get string', () => {
      const p = document.createElement('p');
      const img = document.createElement('img');
      const body = document.querySelector('body');
      img.alt = 'foo';
      p.appendChild(img);
      p.appendChild(document.createTextNode('  bar  '));
      body.appendChild(p);
      const res = func(document.querySelectorAll('p'));
      assert.strictEqual(res, 'foo bar\n', 'result');
    });

    it('should get empty string', () => {
      const p = document.createElement('p');
      const input = document.createElement('input');
      const body = document.querySelector('body');
      input.alt = 'foo';
      p.appendChild(input);
      body.appendChild(p);
      const res = func(document.querySelectorAll('p'));
      assert.strictEqual(res, '', 'result');
    });

    it('should get string', () => {
      const p = document.createElement('p');
      const input = document.createElement('input');
      const body = document.querySelector('body');
      input.alt = 'foo';
      input.type = 'image';
      p.appendChild(input);
      body.appendChild(p);
      const res = func(document.querySelectorAll('p'));
      assert.strictEqual(res, 'foo\n', 'result');
    });
  });

  describe('get ancestor element ID', () => {
    const func = mjs.getAncestorId;

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

    it('should get value', () => {
      const p = document.createElement('p');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      p.appendChild(span);
      p.id = 'foo';
      body.appendChild(p);
      const res = func(span);
      assert.strictEqual(res, 'foo', 'result');
    });
  });

  describe('node or ancestor is editable', () => {
    const func = mjs.isEditable;

    it('should get false', () => {
      const res = func();
      assert.strictEqual(res, false, 'result');
    });

    it('should get false', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(p);
      if (typeof p.isContentEditable !== 'boolean') {
        p.isContentEditable = isContentEditable(p);
      }
      const res = func(p);
      assert.strictEqual(p.isContentEditable, false, 'prop');
      assert.strictEqual(res, false, 'result');
    });

    it('should get true', () => {
      const p = document.createElement('p');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      p.setAttribute('contenteditable', 'true');
      if (typeof p.isContentEditable !== 'boolean') {
        p.isContentEditable = isContentEditable(p);
      }
      p.appendChild(span);
      body.appendChild(p);
      const res = func(span);
      assert.strictEqual(p.isContentEditable, true, 'prop');
      assert.strictEqual(res, true, 'result');
    });

    it('should get true', () => {
      const p = document.createElement('p');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      p.setAttribute('contenteditable', '');
      if (typeof p.isContentEditable !== 'boolean') {
        p.isContentEditable = isContentEditable(p);
      }
      p.appendChild(span);
      body.appendChild(p);
      const res = func(span);
      assert.strictEqual(p.isContentEditable, true, 'prop');
      assert.strictEqual(res, true, 'result');
    });

    it('should get false', () => {
      const p = document.createElement('p');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      p.setAttribute('contenteditable', 'false');
      if (typeof p.isContentEditable !== 'boolean') {
        p.isContentEditable = isContentEditable(p);
      }
      p.appendChild(span);
      body.appendChild(p);
      const res = func(span);
      assert.strictEqual(p.isContentEditable, false, 'prop');
      assert.strictEqual(res, false, 'result');
    });

    it('should get false', () => {
      const p = document.createElement('p');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      p.setAttribute('contenteditable', 'foo');
      if (typeof p.isContentEditable !== 'boolean') {
        p.isContentEditable = isContentEditable(p);
      }
      p.appendChild(span);
      body.appendChild(p);
      const res = func(span);
      assert.strictEqual(p.isContentEditable, false, 'prop');
      assert.strictEqual(res, false, 'result');
    });

    it('should get false', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const text =
        document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const body = document.querySelector('body');
      svg.setAttribute('contenteditable', 'true');
      svg.appendChild(text);
      body.appendChild(svg);
      const res = func(text);
      assert.strictEqual(svg.isContentEditable, undefined, 'prop');
      assert.strictEqual(res, false, 'result');
    });
  });

  describe('content is text node', () => {
    const func = mjs.isContentTextNode;

    it('should get false', () => {
      const res = func();
      assert.strictEqual(res, false, 'result');
    });

    it('should get true', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      p.textContent = 'foo';
      p.setAttribute('contenteditable', 'true');
      if (typeof p.isContentEditable !== 'boolean') {
        p.isContentEditable = isContentEditable(p);
      }
      body.appendChild(p);
      const res = func(p);
      assert.strictEqual(res, true, 'result');
    });

    it('should get true', () => {
      const div = document.createElement('div');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const text =
        document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const body = document.querySelector('body');
      text.textContent = 'foo';
      svg.appendChild(text);
      div.setAttribute('contenteditable', 'true');
      if (typeof div.isContentEditable !== 'boolean') {
        div.isContentEditable = isContentEditable(div);
      }
      div.appendChild(svg);
      body.appendChild(div);
      const res = func(text);
      assert.strictEqual(res, true, 'result');
    });

    it('should get false', () => {
      const div = document.createElement('div');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const text =
        document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const body = document.querySelector('body');
      text.textContent = 'foo';
      svg.appendChild(text);
      div.setAttribute('contenteditable', 'true');
      if (typeof div.isContentEditable !== 'boolean') {
        div.isContentEditable = isContentEditable(div);
      }
      div.appendChild(svg);
      body.appendChild(div);
      const res = func(svg);
      assert.strictEqual(res, false, 'result');
    });
  });

  describe('is text edit control element', () => {
    const func = mjs.isEditControl;

    it('should get false', () => {
      const res = func();
      assert.strictEqual(res, false, 'result');
    });

    it('should get false', () => {
      const p = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p);
      assert.strictEqual(res, false, 'result');
    });

    it('should get true', () => {
      const elm = document.createElement('textarea');
      const body = document.querySelector('body');
      body.appendChild(elm);
      const res = func(elm);
      assert.strictEqual(res, true, 'result');
    });

    it('should get true', () => {
      const elm = document.createElement('input');
      const body = document.querySelector('body');
      body.appendChild(elm);
      const res = func(elm);
      assert.strictEqual(res, true, 'result');
    });

    it('should get true', () => {
      const elm = document.createElement('input');
      const body = document.querySelector('body');
      body.appendChild(elm);
      const types = ['email', 'tel', 'url', 'search', 'text', 'foo'];
      for (const type of types) {
        elm.type = type;
        const res = func(elm);
        assert.strictEqual(res, true, 'result');
      }
    });

    it('should get false', () => {
      const elm = document.createElement('input');
      const body = document.querySelector('body');
      body.appendChild(elm);
      const types = ['password', 'color'];
      for (const type of types) {
        elm.type = type;
        const res = func(elm);
        assert.strictEqual(res, false, `result ${type}`);
      }
    });
  });

  describe('get editable element from ancestor', () => {
    const func = mjs.getEditableElm;

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

    it('should get element', () => {
      const elm = document.createElement('textarea');
      const body = document.querySelector('body');
      body.appendChild(elm);
      const res = func(elm);
      assert.deepEqual(res, elm, 'result');
    });

    it('should get element', () => {
      const p = document.createElement('p');
      const span = document.createElement('span');
      const body = document.querySelector('body');
      p.appendChild(span);
      p.setAttribute('contenteditable', 'true');
      if (typeof p.isContentEditable !== 'boolean') {
        p.isContentEditable = isContentEditable(p);
      }
      body.appendChild(p);
      const res = func(span);
      assert.deepEqual(res, p, 'result');
    });
  });

  describe('filter editable elements', () => {
    const func = mjs.filterEditableElements;

    it('should throw', async () => {
      assert.throws(() => func(), TypeError,
        'Expected String but got Undefined.');
    });

    it('should throw', async () => {
      assert.throws(() => func('p'), TypeError,
        'Expected String but got Undefined.');
    });

    it('should get array', () => {
      const elm = document.createElement('textarea');
      const body = document.querySelector('body');
      body.appendChild(elm);
      const res = func('textarea', 'html textarea');
      assert.deepEqual(res, [elm], 'result');
    });

    it('should get array', () => {
      const elm = document.createElement('input');
      const body = document.querySelector('body');
      body.appendChild(elm);
      const res = func('input', 'html input');
      assert.deepEqual(res, [elm], 'result');
    });

    it('should get array', () => {
      const elm = document.createElement('input');
      const body = document.querySelector('body');
      elm.type = 'email';
      body.appendChild(elm);
      const res = func('input', 'html input');
      assert.deepEqual(res, [elm], 'result');
    });

    it('should get array', () => {
      const elm = document.createElement('input');
      const body = document.querySelector('body');
      elm.type = 'tel';
      body.appendChild(elm);
      const res = func('input', 'html input');
      assert.deepEqual(res, [elm], 'result');
    });

    it('should get array', () => {
      const elm = document.createElement('input');
      const body = document.querySelector('body');
      elm.type = 'url';
      body.appendChild(elm);
      const res = func('input', 'html input');
      assert.deepEqual(res, [elm], 'result');
    });

    it('should get array', () => {
      const elm = document.createElement('input');
      const body = document.querySelector('body');
      elm.type = 'search';
      body.appendChild(elm);
      const res = func('input', 'html input');
      assert.deepEqual(res, [elm], 'result');
    });

    it('should get array', () => {
      const elm = document.createElement('input');
      const body = document.querySelector('body');
      elm.type = 'text';
      body.appendChild(elm);
      const res = func('input', 'html input');
      assert.deepEqual(res, [elm], 'result');
    });

    it('should get empty array', () => {
      const elm = document.createElement('input');
      const body = document.querySelector('body');
      elm.type = 'password';
      body.appendChild(elm);
      const res = func('input', 'html input');
      assert.deepEqual(res, [], 'result');
    });

    it('should get empty array', () => {
      const elm = document.createElement('p');
      const body = document.querySelector('body');
      body.appendChild(elm);
      const res = func('p', 'html p');
      assert.deepEqual(res, [], 'result');
    });

    it('should get array', () => {
      const elm = document.createElement('p');
      const elm2 = document.createElement('p');
      const body = document.querySelector('body');
      elm.setAttribute('contenteditable', 'true');
      if (typeof elm.isContentEditable !== 'boolean') {
        elm.isContentEditable = isContentEditable(elm);
      }
      body.appendChild(elm);
      body.appendChild(elm2);
      const res = func('p', 'html p', true);
      assert.deepEqual(res, [elm, elm2], 'result');
    });

    it('should get array', () => {
      const elm = document.createElement('p');
      const elm2 = document.createElement('p');
      const body = document.querySelector('body');
      elm.setAttribute('contenteditable', 'true');
      if (typeof elm.isContentEditable !== 'boolean') {
        elm.isContentEditable = isContentEditable(elm);
      }
      body.appendChild(elm);
      body.appendChild(elm2);
      const res = func('p', 'html p');
      assert.deepEqual(res, [elm], 'result');
    });

    it('should get array', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const fo =
        document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      const elm =
        document.createElementNS('http://www.w3.org/1999/xhtml', 'html:p');
      const elm2 =
        document.createElementNS('http://www.w3.org/1999/xhtml', 'html:p');
      const body = document.querySelector('body');
      svg.id = 'foo';
      svg.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:html',
        'http://www.w3.org/1999/xhtml');
      elm.setAttribute('contenteditable', 'true');
      if (typeof elm.isContentEditable !== 'boolean') {
        elm.isContentEditable = isContentEditable(elm);
      }
      fo.appendChild(elm);
      fo.appendChild(elm2);
      svg.appendChild(fo);
      body.appendChild(svg);
      const res = func('p', '#foo *|*');
      assert.deepEqual(res, [elm], 'result');
    });
  });

  describe('create paragraphed content', () => {
    const func = mjs.createParagraphedContent;

    it('should get content', () => {
      const res = func();
      assert.strictEqual(res.nodeType, 11, 'nodeType');
      assert.strictEqual(res.childNodes.length, 1, 'length');
      assert.strictEqual(res.childNodes[0].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[0].nodeValue, '\n', 'value');
    });

    it('should get content', () => {
      const res = func('foo');
      assert.strictEqual(res.nodeType, 11, 'nodeType');
      assert.strictEqual(res.childNodes.length, 1, 'length');
      assert.strictEqual(res.childNodes[0].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[0].nodeValue, 'foo', 'value');
    });

    it('should get content', () => {
      const res = func('foo\n');
      assert.strictEqual(res.nodeType, 11, 'nodeType');
      assert.strictEqual(res.childNodes.length, 2, 'length');
      assert.strictEqual(res.childNodes[0].nodeType, 1, 'contentType');
      assert.strictEqual(res.childNodes[0].textContent, 'foo', 'value');
      assert.strictEqual(res.childNodes[1].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[1].nodeValue, '\n', 'value');
    });

    it('should get content', () => {
      const res = func('foo\nbar baz\n\nqux');
      assert.strictEqual(res.nodeType, 11, 'nodeType');
      assert.strictEqual(res.childNodes.length, 7, 'length');
      assert.strictEqual(res.childNodes[0].nodeType, 1, 'contentType');
      assert.strictEqual(res.childNodes[0].textContent, 'foo', 'value');
      assert.strictEqual(res.childNodes[1].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[1].nodeValue, '\n', 'value');
      assert.strictEqual(res.childNodes[2].nodeType, 1, 'contentType');
      assert.strictEqual(res.childNodes[2].textContent, 'bar baz', 'value');
      assert.strictEqual(res.childNodes[3].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[3].nodeValue, '\n', 'value');
      assert.strictEqual(res.childNodes[4].nodeType, 1, 'contentType');
      assert.strictEqual(res.childNodes[4].firstChild.localName, 'br', 'value');
      assert.strictEqual(res.childNodes[5].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[5].nodeValue, '\n', 'value');
      assert.strictEqual(res.childNodes[6].nodeType, 1, 'contentType');
      assert.strictEqual(res.childNodes[6].textContent, 'qux', 'value');
    });

    it('should get content', () => {
      const res = func('foo\r\nbar baz\r\n\r\nqux');
      assert.strictEqual(res.nodeType, 11, 'nodeType');
      assert.strictEqual(res.childNodes.length, 7, 'length');
      assert.strictEqual(res.childNodes[0].nodeType, 1, 'contentType');
      assert.strictEqual(res.childNodes[0].textContent, 'foo', 'value');
      assert.strictEqual(res.childNodes[1].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[1].nodeValue, '\n', 'value');
      assert.strictEqual(res.childNodes[2].nodeType, 1, 'contentType');
      assert.strictEqual(res.childNodes[2].textContent, 'bar baz', 'value');
      assert.strictEqual(res.childNodes[3].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[3].nodeValue, '\n', 'value');
      assert.strictEqual(res.childNodes[4].nodeType, 1, 'contentType');
      assert.strictEqual(res.childNodes[4].firstChild.localName, 'br', 'value');
      assert.strictEqual(res.childNodes[5].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[5].nodeValue, '\n', 'value');
      assert.strictEqual(res.childNodes[6].nodeType, 1, 'contentType');
      assert.strictEqual(res.childNodes[6].textContent, 'qux', 'value');
    });

    it('should get content', () => {
      const dom = createJsdom('file:///foo/bar');
      window = dom.window;
      document = window.document;
      if (typeof document.queryCommandValue !== 'function') {
        document.queryCommandValue =
          sinon.stub().withArgs('defaultParagraphSeparator').returns(undefined);
      }
      global.window = window;
      global.document = document;
      const res = func('foo\nbar baz\n\nqux');
      assert.strictEqual(res.nodeType, 11, 'nodeType');
      assert.strictEqual(res.childNodes.length, 10, 'length');
      assert.strictEqual(res.childNodes[0].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[0].nodeValue, 'foo', 'value');
      assert.strictEqual(res.childNodes[1].nodeType, 1, 'contentType');
      assert.strictEqual(res.childNodes[1].localName, 'br', 'value');
      assert.strictEqual(res.childNodes[2].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[2].nodeValue, '\n', 'value');
      assert.strictEqual(res.childNodes[3].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[3].textContent, 'bar baz', 'value');
      assert.strictEqual(res.childNodes[4].nodeType, 1, 'contentType');
      assert.strictEqual(res.childNodes[4].localName, 'br', 'value');
      assert.strictEqual(res.childNodes[5].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[5].nodeValue, '\n', 'value');
      assert.strictEqual(res.childNodes[6].nodeType, 1, 'contentType');
      assert.strictEqual(res.childNodes[6].localName, 'br', 'value');
      assert.strictEqual(res.childNodes[7].nodeType, 1, 'contentType');
      assert.strictEqual(res.childNodes[7].localName, 'br', 'value');
      assert.strictEqual(res.childNodes[8].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[8].nodeValue, '\n', 'value');
      assert.strictEqual(res.childNodes[9].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[9].nodeValue, 'qux', 'value');
    });

    it('should get content', () => {
      const res = func('foo\nbar baz\n\nqux', 'http://www.w3.org/2000/svg');
      assert.strictEqual(res.nodeType, 11, 'nodeType');
      assert.strictEqual(res.childNodes.length, 7, 'length');
      assert.strictEqual(res.childNodes[0].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[0].nodeValue, 'foo', 'value');
      assert.strictEqual(res.childNodes[1].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[1].nodeValue, '\n', 'value');
      assert.strictEqual(res.childNodes[2].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[2].nodeValue, 'bar baz', 'value');
      assert.strictEqual(res.childNodes[3].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[3].nodeValue, '\n', 'value');
      assert.strictEqual(res.childNodes[4].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[4].nodeValue, '', 'value');
      assert.strictEqual(res.childNodes[5].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[5].nodeValue, '\n', 'value');
      assert.strictEqual(res.childNodes[6].nodeType, 3, 'contentType');
      assert.strictEqual(res.childNodes[6].nodeValue, 'qux', 'value');
    });
  });
});
