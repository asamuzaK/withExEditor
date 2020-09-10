/**
 * live-edit.test.js
 */
/*
  eslint-disable array-bracket-newline
*/

import {assert} from "chai";
import {describe, it} from "mocha";
import liveEdit from "../src/mjs/live-edit.js";

describe("live-edit", () => {
  it("should get key and value", () => {
    const itemKeys = [
      "aceEditor", "codeMirror", "gmail", "tiddlyWiki", "tinyMCE",
    ];
    const items = Object.entries(liveEdit);
    for (const [key, value] of items) {
      assert.isTrue(itemKeys.includes(key));
      assert.isTrue(value.hasOwnProperty("className"));
      assert.isTrue(typeof value.className === "string" ||
                    value.className === null);
      assert.isString(value.getContent);
      assert.isString(value.setContent);
      // optional keys
      if (value.hasOwnProperty("attributes")) {
        assert.isObject(value.attributes);
      }
      if (value.hasOwnProperty("isIframe")) {
        assert.isBoolean(value.isIframe);
      }
    }
  });
});
