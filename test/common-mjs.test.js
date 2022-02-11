/**
 * common.test.js
 */

/* api */
import { assert } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import { createJsdom } from './mocha/setup.js';
import sinon from 'sinon';

/* test */
import * as mjs from '../src/mjs/common.js';

describe('common', () => {
  let window, document;
  beforeEach(() => {
    const dom = createJsdom();
    window = dom && dom.window;
    document = window && window.document;
    global.window = window;
    global.document = document;
  });
  afterEach(() => {
    window = null;
    document = null;
    delete global.window;
    delete global.document;
  });

  describe('log error', () => {
    const func = mjs.logErr;

    it('should log error message', () => {
      let msg;
      const stub = sinon.stub(console, 'error').callsFake(m => {
        msg = (m && m.message) || m;
      });
      const e = new Error('error');
      const res = func(e);
      const { calledOnce } = stub;
      stub.restore();
      assert.strictEqual(msg, 'error');
      assert.isTrue(calledOnce);
      assert.isFalse(res);
    });

    it('should log error message', () => {
      let msg;
      const stub = sinon.stub(console, 'error').callsFake(m => {
        msg = (m && m.message) || m;
      });
      const e = 'error';
      const res = func(e);
      const { calledOnce } = stub;
      stub.restore();
      assert.strictEqual(msg, 'error');
      assert.isTrue(calledOnce);
      assert.isFalse(res);
    });
  });

  describe('throw error', () => {
    const func = mjs.throwErr;

    it('should throw', () => {
      const stub = sinon.stub(console, 'error');
      const i = stub.callCount;
      const e = new Error('error');
      assert.throws(() => func(e), 'error');
      assert.strictEqual(stub.callCount, i + 1, 'called');
      stub.restore();
    });
  });

  describe('log warn', () => {
    const func = mjs.logWarn;

    it('should not log warn message if argument is falsy', () => {
      let msg;
      const stub = sinon.stub(console, 'warn').callsFake(m => {
        msg = m;
      });
      const res = func();
      const { calledOnce } = stub;
      stub.restore();
      assert.isUndefined(msg);
      assert.isFalse(calledOnce);
      assert.isFalse(res);
    });

    it('should log warn message', () => {
      let msg;
      const stub = sinon.stub(console, 'warn').callsFake(m => {
        msg = m;
      });
      const res = func('foo');
      const { calledOnce } = stub;
      stub.restore();
      assert.strictEqual(msg, 'foo');
      assert.isTrue(calledOnce);
      assert.isFalse(res);
    });
  });

  describe('log message', () => {
    const func = mjs.logMsg;

    it('should not log message if argument is falsy', () => {
      let msg;
      const stub = sinon.stub(console, 'log').callsFake(m => {
        msg = m;
      });
      const res = func();
      const { calledOnce } = stub;
      stub.restore();
      assert.isUndefined(msg);
      assert.isFalse(calledOnce);
      assert.isUndefined(res);
    });

    it('should log message', () => {
      let msg;
      const stub = sinon.stub(console, 'log').callsFake(m => {
        msg = m;
      });
      const res = func('foo');
      const { calledOnce } = stub;
      stub.restore();
      assert.strictEqual(msg, 'foo');
      assert.isTrue(calledOnce);
      assert.strictEqual(res, msg);
    });
  });

  describe('get type', () => {
    const func = mjs.getType;

    it('should get Array', () => {
      const res = func([]);
      assert.deepEqual(res, 'Array');
    });

    it('should get Object', () => {
      const res = func({});
      assert.deepEqual(res, 'Object');
    });

    it('should get String', () => {
      const res = func('');
      assert.deepEqual(res, 'String');
    });

    it('should get Number', () => {
      const res = func(1);
      assert.deepEqual(res, 'Number');
    });

    it('should get Boolean', () => {
      const res = func(true);
      assert.deepEqual(res, 'Boolean');
    });

    it('should get Undefined', () => {
      const res = func();
      assert.deepEqual(res, 'Undefined');
    });

    it('should get Null', () => {
      const res = func(null);
      assert.deepEqual(res, 'Null');
    });
  });

  describe('is string', () => {
    const func = mjs.isString;

    it('should get false', () => {
      const items = [[], ['foo'], {}, { foo: 'bar' }, undefined, null, 1, true];
      for (const item of items) {
        assert.isFalse(func(item));
      }
    });

    it('should get true', () => {
      const items = ['', 'foo'];
      for (const item of items) {
        assert.isTrue(func(item));
      }
    });
  });

  describe('is object, and not an empty object', () => {
    const func = mjs.isObjectNotEmpty;

    it('should get false', () => {
      const items = [{}, [], ['foo'], '', 'foo', undefined, null, 1, true];
      for (const item of items) {
        assert.isFalse(func(item));
      }
    });

    it('should get true', () => {
      const item = {
        foo: 'bar'
      };
      assert.isTrue(func(item));
    });
  });

  describe('sleep', () => {
    const func = mjs.sleep;

    it('should resolve even if no argument given', async () => {
      const fake = sinon.fake();
      const fake2 = sinon.fake();
      await func().then(fake).catch(fake2);
      assert.strictEqual(fake.callCount, 1);
      assert.strictEqual(fake2.callCount, 0);
    });

    it('should get null if 1st argument is not integer', async () => {
      const res = await func('foo');
      assert.isNull(res);
    });

    it('should get null if 1st argument is not positive integer', async () => {
      const res = await func(-1);
      assert.isNull(res);
    });

    it('should resolve', async () => {
      const fake = sinon.fake();
      const fake2 = sinon.fake();
      await func(1).then(fake).catch(fake2);
      assert.strictEqual(fake.callCount, 1);
      assert.strictEqual(fake2.callCount, 0);
    });

    it('should reject', async () => {
      const fake = sinon.fake();
      const fake2 = sinon.fake();
      await func(1, true).then(fake).catch(fake2);
      assert.strictEqual(fake.callCount, 0);
      assert.strictEqual(fake2.callCount, 1);
    });
  });

  describe('stringify positive integer', () => {
    const func = mjs.stringifyPositiveInt;

    it('should get null if no argument given', () => {
      assert.isNull(func());
    });

    it('should get null if given argument exceeds max safe integer', () => {
      const i = Number.MAX_SAFE_INTEGER + 1;
      assert.isNull(func(i));
    });

    it('should get null if given argument is not positive integer', () => {
      assert.isNull(func(''));
    });

    it('should get null if given argument is not positive integer', () => {
      assert.isNull(func(-1));
    });

    it('should get null if 1st argument is 0 but 2nd argument is falsy', () => {
      assert.isNull(func(0));
    });

    it('should get string', () => {
      const i = 0;
      const res = func(i, true);
      assert.strictEqual(res, '0');
    });

    it('should get string', () => {
      const i = 1;
      const res = func(i);
      assert.strictEqual(res, '1');
    });
  });

  describe('remove query string from URI', () => {
    const func = mjs.removeQueryFromURI;

    it('should get same value', () => {
      const res = func();
      assert.isUndefined(res);
    });

    it('should get same value', () => {
      const arg = [];
      const res = func(arg);
      assert.deepEqual(res, arg);
    });

    it('should get same value', () => {
      const arg = '';
      const res = func(arg);
      assert.strictEqual(res, arg);
    });

    it('should get same value', () => {
      const arg = 'foo/bar';
      const res = func(arg);
      assert.strictEqual(res, arg);
    });

    it('should get same value', () => {
      const arg = 'https://example.com';
      const res = func(arg);
      assert.strictEqual(res, arg);
    });

    it('should get query stripped', () => {
      const arg = 'https://example.com#foo?bar=baz';
      const res = func(arg);
      assert.strictEqual(res, 'https://example.com#foo');
    });

    it('should get query stripped', () => {
      const arg = 'https://example.com#foo?bar=baz%20qux';
      const res = func(arg);
      assert.strictEqual(res, 'https://example.com#foo');
    });
  });
});
