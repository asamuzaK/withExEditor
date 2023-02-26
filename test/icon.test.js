/**
 * icon.test.js
 */
/* eslint-disable import/order */

/* api */
import { assert } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import { browser } from './mocha/setup.js';

/* test */
import { ICON } from '../src/mjs/constant.js';
import * as mjs from '../src/mjs/icon.js';

describe('icon', () => {
  beforeEach(() => {
    browser._sandbox.reset();
    browser.permissions.contains.resolves(true);
    global.browser = browser;
  });
  afterEach(() => {
    delete global.browser;
    browser._sandbox.reset();
  });

  describe('set icon', () => {
    const func = mjs.setIcon;
    beforeEach(() => {
      mjs.icon.clear();
    });
    afterEach(() => {
      mjs.icon.clear();
    });

    it('should get result', async () => {
      const i = browser.action.setIcon.callCount;
      browser.runtime.getURL.withArgs(ICON).returns('foo/bar');
      browser.action.setIcon.callsFake((...args) => args);
      const res = await func();
      assert.strictEqual(browser.action.setIcon.callCount, i + 1, 'called');
      assert.strictEqual(mjs.icon.size, 1, 'size');
      assert.strictEqual(mjs.icon.get('id'), '', 'value');
      assert.deepEqual(res, [
        {
          path: 'foo/bar'
        }
      ], 'result');
    });

    it('should get result', async () => {
      const i = browser.action.setIcon.callCount;
      browser.runtime.getURL.withArgs(ICON).returns('foo/bar');
      browser.action.setIcon.callsFake((...args) => args);
      const res = await func('#baz');
      assert.strictEqual(browser.action.setIcon.callCount, i + 1, 'called');
      assert.strictEqual(mjs.icon.size, 1, 'size');
      assert.strictEqual(mjs.icon.get('id'), '#baz', 'value');
      assert.deepEqual(res, [
        {
          path: 'foo/bar#baz'
        }
      ], 'result');
    });
  });

  describe('set icon badge', () => {
    const func = mjs.setIconBadge;

    it('should not call function', async () => {
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      const res = await func();
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount,
        i, 'not called');
      assert.strictEqual(browser.action.setBadgeText.callCount, j,
        'not called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k,
        'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      const res = await func({
        color: [0, 0, 0, 0]
      });
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount,
        i, 'not called');
      assert.strictEqual(browser.action.setBadgeText.callCount, j,
        'not called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k,
        'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      const res = await func({
        color: [0, 0, 0, -1],
        text: ''
      });
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount,
        i, 'not called');
      assert.strictEqual(browser.action.setBadgeText.callCount, j,
        'not called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k,
        'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      const res = await func({
        color: [0, 0, 0, 256],
        text: ''
      });
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount,
        i, 'not called');
      assert.strictEqual(browser.action.setBadgeText.callCount, j,
        'not called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k,
        'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      const res = await func({
        color: [0, 0, 0, 0],
        text: ''
      });
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount,
        i + 1, 'called');
      assert.strictEqual(browser.action.setBadgeText.callCount, j + 1,
        'called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k,
        'not called');
      assert.deepEqual(res, [undefined, undefined], 'result');
    });

    it('should call function', async () => {
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      const res = await func({
        color: 'red',
        text: 'foo'
      });
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount,
        i + 1, 'called');
      assert.strictEqual(browser.action.setBadgeText.callCount, j + 1,
        'called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k + 1,
        'called');
      assert.deepEqual(res, [undefined, undefined, undefined], 'result');
    });
  });
});
