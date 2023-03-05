/**
 * dom-event.test.js
 */

/* api */
import sinon from 'sinon';
import { assert } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import { browser, createJsdom, DataTransfer } from './mocha/setup.js';

/* test */
// eslint-disable-next-line import/order
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

  it('should get browser object', () => {
    assert.isObject(browser, 'browser');
  });

  describe('dispatch event', () => {
    const func = mjs.dispatchEvent;

    it('should not call function', () => {
      const spy = sinon.spy(document, 'dispatchEvent');
      const res = func(document);
      assert.isFalse(spy.called, 'not called');
      assert.isFalse(res, 'result');
    });

    it('should not call function', () => {
      const spy = sinon.spy(document, 'dispatchEvent');
      const res = func(document, 'foo');
      assert.isFalse(spy.called, 'not called');
      assert.isFalse(res, 'result');
    });

    it('should not call function', () => {
      const spy = sinon.spy(document, 'dispatchEvent');
      const res = func(document, 'foo', {});
      assert.isFalse(spy.called, 'not called');
      assert.isFalse(res, 'result');
    });

    it('should call function', () => {
      const spy = sinon.spy(document, 'dispatchEvent');
      const res = func(document, 'foo', {
        bubbles: false,
        cancelable: false
      });
      assert.isTrue(spy.called, 'called');
      assert.isTrue(res, 'result');
    });

    it('should call function', () => {
      const body = document.querySelector('body');
      const spy = sinon.spy(body, 'dispatchEvent');
      const res = func(body, 'foo', {
        bubbles: false,
        cancelable: false
      });
      assert.isTrue(spy.called, 'called');
      assert.isTrue(res, 'result');
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
      assert.isFalse(spy.called, 'called');
      assert.isFalse(res, 'result');
    });

    it('should call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p);
      assert.isTrue(spy.called, 'called');
      assert.isTrue(res, 'result');
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
      assert.isFalse(spy.called, 'called');
      assert.isFalse(res, 'result');
    });

    it('should not call function', () => {
      const p = document.createElement('p');
      const text = document.createTextNode('foo');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      p.appendChild(text);
      body.appendChild(p);
      const res = func(text, 'foo');
      assert.isFalse(spy.called, 'called');
      assert.isFalse(res, 'result');
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
      assert.isTrue(spy.called, 'called');
      assert.isTrue(res, 'result');
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
      assert.isTrue(spy.called, 'called');
      assert.isTrue(res, 'result');
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
      assert.isTrue(spy.called, 'called');
      assert.isTrue(res, 'result');
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
      assert.isTrue(stubSetData.called, 'called');
      assert.isTrue(spy.called, 'called');
      assert.isTrue(res, 'result');
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
      assert.isFalse(spy.called, 'called');
      assert.isFalse(res, 'result');
    });

    it('should call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p);
      assert.isTrue(spy.called, 'called');
      assert.isTrue(res, 'result');
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
      assert.isFalse(spy.called, 'called');
      assert.isFalse(res, 'result');
    });

    it('should not call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p);
      assert.isFalse(spy.called, 'called');
      assert.isFalse(res, 'result');
    });

    it('should not call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p, 'foo');
      assert.isFalse(spy.called, 'called');
      assert.isFalse(res, 'result');
    });

    it('should call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p, 'beforeinput');
      assert.isTrue(spy.called, 'called');
      assert.isTrue(res, 'result');
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
      assert.isTrue(spy.called, 'called');
      assert.isTrue(res, 'result');
    });

    it('should call function', () => {
      const p = document.createElement('p');
      const spy = sinon.spy(p, 'dispatchEvent');
      const body = document.querySelector('body');
      body.appendChild(p);
      const res = func(p, 'input');
      assert.isTrue(spy.called, 'called');
      assert.isTrue(res, 'result');
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
      assert.isTrue(spy.called, 'called');
      assert.isTrue(res, 'result');
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
      assert.isTrue(spy.called, 'called');
      assert.isTrue(res, 'result');
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
      assert.isFalse(spy.called, 'called');
      assert.isFalse(res, 'result');
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
      assert.isTrue(spy.called, 'called');
      assert.isTrue(res, 'result');
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
      assert.isFalse(spy.called, 'called');
      assert.isFalse(res, 'result');
    });
  });

  describe('focus element', () => {
    const func = mjs.focusElement;

    it('should throw if no argument given', () => {
      assert.throws(() => func());
    });

    it('should get null if given argument is not an object', () => {
      assert.isNull(func(''));
    });

    it('should get null if given argument is empty object', () => {
      assert.isNull(func({}));
    });

    it('should get target', () => {
      const fake = sinon.fake();
      const target = {
        focus: fake
      };
      const evt = { target };
      const res = func(evt);
      assert.isObject(res);
      assert.deepEqual(res, target);
      assert.strictEqual(fake.callCount, 1);
    });
  });
});
