/**
 * common.test.js
 */

/* api */
import { strict as assert } from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'mocha';
import sinon from 'sinon';
import { createJsdom } from './mocha/setup.js';

/* test */
// eslint-disable-next-line import-x/order
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
      assert.strictEqual(calledOnce, true);
      assert.strictEqual(res, false);
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
      assert.strictEqual(calledOnce, true);
      assert.strictEqual(res, false);
    });
  });

  describe('throw error', () => {
    const func = mjs.throwErr;

    it('should throw', () => {
      const stub = sinon.stub(console, 'error');
      const i = stub.callCount;
      const e = new Error('error');
      assert.throws(() => func(e), Error, 'error');
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
      const { called } = stub;
      stub.restore();
      assert.strictEqual(msg, undefined);
      assert.strictEqual(called, false);
      assert.strictEqual(res, false);
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
      assert.strictEqual(calledOnce, true);
      assert.strictEqual(res, false);
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
      const { called } = stub;
      stub.restore();
      assert.strictEqual(msg, undefined);
      assert.strictEqual(called, false);
      assert.strictEqual(res, undefined);
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
      assert.strictEqual(calledOnce, true);
      assert.strictEqual(res, msg);
    });
  });

  describe('get type', () => {
    const func = mjs.getType;

    it('should get Array', () => {
      const res = func([]);
      assert.strictEqual(res, 'Array');
    });

    it('should get Object', () => {
      const res = func({});
      assert.strictEqual(res, 'Object');
    });

    it('should get String', () => {
      const res = func('');
      assert.strictEqual(res, 'String');
    });

    it('should get Number', () => {
      const res = func(1);
      assert.strictEqual(res, 'Number');
    });

    it('should get Boolean', () => {
      const res = func(true);
      assert.strictEqual(res, 'Boolean');
    });

    it('should get Undefined', () => {
      const res = func();
      assert.strictEqual(res, 'Undefined');
    });

    it('should get Null', () => {
      const res = func(null);
      assert.strictEqual(res, 'Null');
    });
  });

  describe('is string', () => {
    const func = mjs.isString;

    it('should get false', () => {
      const items = [[], ['foo'], {}, { foo: 'bar' }, undefined, null, 1, true];
      for (const item of items) {
        assert.strictEqual(func(item), false);
      }
    });

    it('should get true', () => {
      const items = ['', 'foo'];
      for (const item of items) {
        assert.strictEqual(func(item), true);
      }
    });
  });

  describe('is object, and not an empty object', () => {
    const func = mjs.isObjectNotEmpty;

    it('should get false', () => {
      const items = [{}, [], ['foo'], '', 'foo', undefined, null, 1, true];
      for (const item of items) {
        assert.strictEqual(func(item), false);
      }
    });

    it('should get true', () => {
      const item = {
        foo: 'bar'
      };
      assert.strictEqual(func(item), true);
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
      assert.strictEqual(res, null);
    });

    it('should get null if 1st argument is not positive integer', async () => {
      const res = await func(-1);
      assert.strictEqual(res, null);
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
      assert.strictEqual(func(), null);
    });

    it('should get null if given argument exceeds max safe integer', () => {
      const i = Number.MAX_SAFE_INTEGER + 1;
      assert.strictEqual(func(i), null);
    });

    it('should get null if given argument is not positive integer', () => {
      assert.strictEqual(func(''), null);
    });

    it('should get null if given argument is not positive integer', () => {
      assert.strictEqual(func(-1), null);
    });

    it('should get null if 1st argument is 0 but 2nd argument is falsy', () => {
      assert.strictEqual(func(0), null);
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
});
