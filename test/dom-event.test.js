/**
 * dom-event.test.js
 */

/* api */
import { strict as assert } from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'mocha';
import sinon from 'sinon';
import { createJsdom, DataTransfer } from './mocha/setup.js';

/* test */
// eslint-disable-next-line import-x/order
import * as mjs from '../src/mjs/dom-event.js';

/* constants */
const KEY_CODE_A = 65;

describe('dom event', () => {
  let window, document;
  const globalKeys = [
    'ClipboardEvent', 'DataTransfer', 'DOMTokenList', 'DOMParser', 'Event',
    'FocusEvent', 'Headers', 'HTMLUnknownElement', 'InputEvent',
    'KeyboardEvent', 'Node', 'NodeList', 'Selection', 'StaticRange',
    'XMLSerializer'
  ];

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

  describe('dispatch event', () => {
    const func = mjs.dispatchEvent;

    it('should not call function', () => {
      const spy = sinon.spy(document, 'dispatchEvent');
      const res = func(document);
      assert.strictEqual(spy.called, false, 'not called');
      assert.strictEqual(res, false, 'result');
    });

    it('should not call function', () => {
      const spy = sinon.spy(document, 'dispatchEvent');
      const res = func(document, 'foo');
      assert.strictEqual(spy.called, false, 'not called');
      assert.strictEqual(res, false, 'result');
    });

    it('should not call function', () => {
      const spy = sinon.spy(document, 'dispatchEvent');
      const res = func(document, 'foo', {});
      assert.strictEqual(spy.called, false, 'not called');
      assert.strictEqual(res, false, 'result');
    });

    it('should call function', () => {
      const spy = sinon.spy(document, 'dispatchEvent');
      const res = func(document, 'foo', {
        bubbles: false,
        cancelable: false
      });
      assert.strictEqual(spy.called, true, 'called');
      assert.strictEqual(res, true, 'result');
    });

    it('should call function', () => {
      const body = document.querySelector('body');
      const spy = sinon.spy(body, 'dispatchEvent');
      const res = func(body, 'foo', {
        bubbles: false,
        cancelable: false
      });
      assert.strictEqual(spy.called, true, 'called');
      assert.strictEqual(res, true, 'result');
    });
  });

  describe('dispatch change event', () => {
    const func = mjs.dispatchChangeEvent;

    it('should not call function', () => {
      const p = document.createElement('p');
      const text = document.createTextNode('foo');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      p.appendChild(text);
      body.appendChild(p);
      const res = func(text);
      assert.strictEqual(spy.called, false, 'called');
      assert.strictEqual(res, false, 'result');
    });

    it('should call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p);
      assert.strictEqual(spy.called, true, 'called');
      assert.strictEqual(res, true, 'result');
    });
  });

  describe('dispatch clipboard event', () => {
    const func = mjs.dispatchClipboardEvent;

    it('should not call function', () => {
      const p = document.createElement('p');
      const text = document.createTextNode('foo');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      p.appendChild(text);
      body.appendChild(p);
      const res = func(text);
      assert.strictEqual(spy.called, false, 'called');
      assert.strictEqual(res, false, 'result');
    });

    it('should not call function', () => {
      const p = document.createElement('p');
      const text = document.createTextNode('foo');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      p.appendChild(text);
      body.appendChild(p);
      const res = func(text, 'foo');
      assert.strictEqual(spy.called, false, 'called');
      assert.strictEqual(res, false, 'result');
    });

    it('should call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p, 'copy', {
        bubbles: true,
        cancelable: true
      });
      assert.strictEqual(spy.called, true, 'called');
      assert.strictEqual(res, true, 'result');
    });

    it('should call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p, 'cut', {
        bubbles: true,
        cancelable: true
      });
      assert.strictEqual(spy.called, true, 'called');
      assert.strictEqual(res, true, 'result');
    });

    it('should call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(p);
      const dataTrans = new DataTransfer();
      dataTrans.setData('text/plain', 'foo');
      const res = func(p, 'paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTrans
      });
      assert.strictEqual(spy.called, true, 'called');
      assert.strictEqual(res, true, 'result');
    });

    it('should call function', () => {
      const p = document.createElement('p');
      const stubSetData = sinon.stub();
      ClipboardEvent.prototype.wrappedJSObject = {
        clipboardData: {
          setData: stubSetData
        }
      };
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(p);
      const dataTrans = new DataTransfer();
      dataTrans.setData('text/plain', 'foo');
      const res = func(p, 'paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTrans
      });
      assert.strictEqual(stubSetData.called, true, 'called');
      assert.strictEqual(spy.called, true, 'called');
      assert.strictEqual(res, true, 'result');
      delete ClipboardEvent.prototype.wrappedJSObject;
    });
  });

  describe('dispatch focus event', () => {
    const func = mjs.dispatchFocusEvent;

    it('should not call function', () => {
      const p = document.createElement('p');
      const text = document.createTextNode('foo');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      p.appendChild(text);
      body.appendChild(p);
      const res = func(text);
      assert.strictEqual(spy.called, false, 'called');
      assert.strictEqual(res, false, 'result');
    });

    it('should call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p);
      assert.strictEqual(spy.called, true, 'called');
      assert.strictEqual(res, true, 'result');
    });
  });

  describe('dispatch input event', () => {
    const func = mjs.dispatchInputEvent;

    it('should not call function', () => {
      const p = document.createElement('p');
      const text = document.createTextNode('foo');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      p.appendChild(text);
      body.appendChild(p);
      const res = func(text);
      assert.strictEqual(spy.called, false, 'called');
      assert.strictEqual(res, false, 'result');
    });

    it('should not call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p);
      assert.strictEqual(spy.called, false, 'called');
      assert.strictEqual(res, false, 'result');
    });

    it('should not call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p, 'foo');
      assert.strictEqual(spy.called, false, 'called');
      assert.strictEqual(res, false, 'result');
    });

    it('should call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p, 'beforeinput');
      assert.strictEqual(spy.called, true, 'called');
      assert.strictEqual(res, true, 'result');
    });

    it('should call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p, 'beforeinput', {
        bubbles: true,
        cancelable: true
      });
      assert.strictEqual(spy.called, true, 'called');
      assert.strictEqual(res, true, 'result');
    });

    it('should call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p, 'input');
      assert.strictEqual(spy.called, true, 'called');
      assert.strictEqual(res, true, 'result');
    });

    it('should call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p, 'input', {
        bubbles: true,
        cancelable: false
      });
      assert.strictEqual(spy.called, true, 'called');
      assert.strictEqual(res, true, 'result');
    });

    it('should call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      const dataTrans = new DataTransfer();
      dataTrans.setData('text/plain', 'foo');
      body.appendChild(p);
      const res = func(p, 'input', {
        bubbles: true,
        cancelable: false,
        dataTransfer: dataTrans
      });
      assert.strictEqual(spy.called, true, 'called');
      assert.strictEqual(res, true, 'result');
    });
  });

  describe('dispatch keyboard event', () => {
    const func = mjs.dispatchKeyboardEvent;

    it('should not call function', () => {
      const p = document.createElement('p');
      const text = document.createTextNode('foo');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      p.appendChild(text);
      body.appendChild(p);
      const res = func(text);
      assert.strictEqual(spy.called, false, 'called');
      assert.strictEqual(res, false, 'result');
    });

    it('should call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p, 'keydown', {
        key: 'a',
        code: 'KeyA',
        keyCode: KEY_CODE_A,
        ctrlKey: true
      });
      assert.strictEqual(spy.called, true, 'called');
      assert.strictEqual(res, true, 'result');
    });

    it('should not call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p, 'keydown', {
        key: undefined,
        code: 'KeyA',
        keyCode: KEY_CODE_A,
        ctrlKey: true
      });
      assert.strictEqual(spy.called, false, 'called');
      assert.strictEqual(res, false, 'result');
    });
  });

  describe('focus element', () => {
    const func = mjs.focusElement;

    it('should throw if no argument given', () => {
      assert.throws(() => func());
    });

    it('should get null if given argument is not an object', () => {
      assert.strictEqual(func(''), null);
    });

    it('should get null if given argument is empty object', () => {
      assert.strictEqual(func({}), null);
    });

    it('should get target', () => {
      const fake = sinon.fake();
      const target = {
        focus: fake
      };
      const evt = { target };
      const res = func(evt);
      assert.deepEqual(res, target);
      assert.strictEqual(fake.callCount, 1);
    });
  });
});
