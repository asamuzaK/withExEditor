/**
 * file-ext.test.js
 */

/* api */
import { assert } from 'chai';
import { describe, it } from 'mocha';

/* test */
import fileExt from '../src/mjs/file-ext.js';

describe('file-ext', () => {
  it('should get key', () => {
    const itemKeys = ['application', 'image', 'text'];
    const items = Object.keys(fileExt);
    for (const key of items) {
      assert.isTrue(itemKeys.includes(key));
    }
  });

  describe('application', () => {
    it('should get string', () => {
      const subItemKeys = ['json', 'xml'];
      const items = Object.entries(fileExt.application);
      for (const [key, value] of items) {
        assert.isString(key);
        if (subItemKeys.includes(key)) {
          const subItems = Object.entries(value);
          for (const [subKey, subValue] of subItems) {
            assert.isString(subKey);
            assert.isString(subValue);
          }
        } else {
          assert.isString(value);
        }
      }
    });
  });

  describe('image', () => {
    it('should get string', () => {
      const subItemKeys = ['xml'];
      const items = Object.entries(fileExt.image);
      for (const [key, value] of items) {
        assert.isString(key);
        if (subItemKeys.includes(key)) {
          const subItems = Object.entries(value);
          for (const [subKey, subValue] of subItems) {
            assert.isString(subKey);
            assert.isString(subValue);
          }
        } else {
          assert.isString(value);
        }
      }
    });
  });

  describe('text', () => {
    it('should get string', () => {
      const items = Object.entries(fileExt.text);
      for (const [key, value] of items) {
        assert.isString(key);
        assert.isString(value);
      }
    });
  });
});
