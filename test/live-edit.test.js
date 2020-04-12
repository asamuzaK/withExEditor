/**
 * live-edit.test.js
 */

import {assert} from "chai";
import {describe, it} from "mocha";
import liveEdit from "../src/mjs/live-edit.js";

describe("live-edit", () => {
  it("should get key and value", () => {
    const itemKeys = ["aceEditor", "codeMirror", "draftEditor"];
    const items = Object.entries(liveEdit);
    for (const [key, value] of items) {
      assert.isTrue(itemKeys.includes(key));
      assert.isTrue(value.hasOwnProperty("className"));
      assert.isTrue(value.hasOwnProperty("getContent"));
      assert.isTrue(value.hasOwnProperty("setContent"));
    }
  });
});
