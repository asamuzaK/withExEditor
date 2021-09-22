/**
 * live-edit.test.js
 */

/* api */
import { assert } from 'chai';
import { describe, it } from 'mocha';

/* test */
import liveEdit from '../src/mjs/live-edit.js';

describe('live-edit', () => {
  it('should get key and value', () => {
    const itemKeys = ['aceEditor', 'codeMirror', 'tiddlyWiki', 'tinyMCE'];
    const items = Object.entries(liveEdit);
    for (const [key, value] of items) {
      assert.isTrue(itemKeys.includes(key));
      assert.isTrue(Object.prototype.hasOwnProperty.call(value, 'className'));
      assert.isTrue(typeof value.className === 'string' ||
                    value.className === null);
      assert.isString(value.getContent);
      assert.isString(value.setContent);
      // optional keys
      if (Object.prototype.hasOwnProperty.call(value, 'isIframe')) {
        assert.isBoolean(value.isIframe);
      }
    }
  });
});
