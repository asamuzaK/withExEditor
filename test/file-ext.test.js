/**
 * file-ext.test.js
 */

/* api */
import { strict as assert } from 'node:assert';
import { describe, it } from 'mocha';

/* test */
import fileExt from '../src/mjs/file-ext.js';

describe('file-ext', () => {
  it('should get key', () => {
    const itemKeys = ['application', 'image', 'text'];
    const items = Object.keys(fileExt);
    for (const key of items) {
      assert.strictEqual(itemKeys.includes(key), true);
    }
  });

  describe('application', () => {
    it('should get string', () => {
      const subItemKeys = ['json', 'xml'];
      const items = Object.entries(fileExt.application);
      for (const [key, value] of items) {
        assert.strictEqual(typeof key, 'string');
        if (subItemKeys.includes(key)) {
          const subItems = Object.entries(value);
          for (const [subKey, subValue] of subItems) {
            assert.strictEqual(typeof subKey, 'string');
            assert.strictEqual(typeof subValue, 'string');
          }
        } else {
          assert.strictEqual(typeof value, 'string');
        }
      }
    });
  });

  describe('image', () => {
    it('should get string', () => {
      const subItemKeys = ['xml'];
      const items = Object.entries(fileExt.image);
      for (const [key, value] of items) {
        assert.strictEqual(typeof key, 'string');
        if (subItemKeys.includes(key)) {
          const subItems = Object.entries(value);
          for (const [subKey, subValue] of subItems) {
            assert.strictEqual(typeof subKey, 'string');
            assert.strictEqual(typeof subValue, 'string');
          }
        } else {
          assert.strictEqual(typeof value, 'string');
        }
      }
    });
  });

  describe('text', () => {
    it('should get string', () => {
      const items = Object.entries(fileExt.text);
      for (const [key, value] of items) {
        assert.strictEqual(typeof key, 'string');
        assert.strictEqual(typeof value, 'string');
      }
    });
  });
});
