/**
 * options-main.test.js
 */
/* eslint-disable  max-nested-callbacks, no-await-in-loop, no-magic-numbers */

import {JSDOM} from "jsdom";
import {assert} from "chai";
import {afterEach, beforeEach, describe, it} from "mocha";
import sinon from "sinon";
import {browser} from "./mocha/setup.js";
import * as mjs from "../src/mjs/options-main.js";
import {
  EDITOR_CONFIG_RES, EDITOR_FILE_NAME, EDITOR_LABEL, EXT_RELOAD,
  HOST_CONNECTION, HOST_ERR_NOTIFY, HOST_STATUS, HOST_VERSION,
  STORAGE_SET, SYNC_AUTO_URL, WARN,
} from "../src/mjs/constant.js";

describe("options-main", () => {
  /**
   * create jsdom
   * @returns {Object} - jsdom instance
   */
  const createJsdom = () => {
    const domstr = "<!DOCTYPE html><html><head></head><body></body></html>";
    const opt = {
      runScripts: "dangerously",
    };
    return new JSDOM(domstr, opt);
  };
  let window, document;
  beforeEach(() => {
    const dom = createJsdom();
    window = dom && dom.window;
    document = window && window.document;
    global.browser = browser;
    global.window = window;
    global.document = document;
  });
  afterEach(() => {
    window = null;
    document = null;
    delete global.browser;
    delete global.window;
    delete global.document;
  });

  it("should get browser object", () => {
    assert.isObject(browser, "browser");
  });

  describe("port message", () => {
    const func = mjs.portMsg;

    it("should call function", async () => {
      const i = mjs.port.postMessage.callCount;
      await func();
      assert.isNumber(i, "call count");
      assert.strictEqual(mjs.port.postMessage.callCount, i, "not called");
    });

    it("should call function", async () => {
      const i = mjs.port.postMessage.callCount;
      await func({});
      assert.isNumber(i, "call count");
      assert.strictEqual(mjs.port.postMessage.callCount, i + 1, "called");
    });
  });

  describe("get host status", () => {
    const func = mjs.getHostStatus;

    it("should call function", async () => {
      const i = mjs.port.postMessage.callCount;
      await func();
      assert.strictEqual(mjs.port.postMessage.callCount, i + 1, "called");
    });
  });

  describe("create pref", () => {
    const func = mjs.createPref;

    it("should get null if argument not given", async () => {
      const res = await func();
      assert.isNull(res, "result");
    });

    it("should get object", async () => {
      const res = await func({
        id: "foo",
      });
      assert.deepEqual(res, {
        [STORAGE_SET]: {
          foo: {
            app: {
              executable: false,
            },
            id: "foo",
            checked: false,
            value: "",
          },
        },
      }, "result");
    });
  });

  describe("extract editor config", () => {
    const func = mjs.extractEditorConfig;

    it("should set attr even if no argument given", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      elm.id = EDITOR_FILE_NAME;
      elm.value = "foo";
      body.appendChild(elm);
      await func();
      assert.strictEqual(elm.value, "", "value");
    });

    it("should set attr", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      const arg = {};
      elm.id = EDITOR_FILE_NAME;
      elm.value = "foo";
      body.appendChild(elm);
      await func(arg);
      assert.strictEqual(elm.value, "", "value");
    });

    it("should set attr", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      const arg = {
        editorName: "foo",
      };
      elm.id = EDITOR_FILE_NAME;
      elm.value = "bar";
      body.appendChild(elm);
      await func(arg);
      assert.strictEqual(elm.value, "foo", "value");
    });

    it("should set attr", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      const arg = {
        editorName: "foo",
        executable: true,
      };
      elm.id = EDITOR_LABEL;
      elm.value = "bar";
      elm.disabled = true;
      body.appendChild(elm);
      await func(arg);
      assert.strictEqual(elm.value, "foo", "value");
      assert.isFalse(elm.disabled, "disabled");
    });

    it("should set attr", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      const arg = {
        editorLabel: "foo",
        executable: true,
      };
      elm.id = EDITOR_LABEL;
      elm.value = "bar";
      elm.disabled = true;
      body.appendChild(elm);
      await func(arg);
      assert.strictEqual(elm.value, "foo", "value");
      assert.isFalse(elm.disabled, "disabled");
    });

    it("should set attr", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      const arg = {
        editorLabel: "foo",
        editorName: "bar",
        executable: true,
      };
      elm.id = EDITOR_LABEL;
      elm.value = "baz";
      elm.disabled = true;
      body.appendChild(elm);
      await func(arg);
      assert.strictEqual(elm.value, "foo", "value");
      assert.isFalse(elm.disabled, "disabled");
    });

    it("should set attr", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      const arg = {
        executable: false,
      };
      elm.id = EDITOR_LABEL;
      elm.value = "foo";
      elm.disabled = false;
      body.appendChild(elm);
      await func(arg);
      assert.strictEqual(elm.value, "", "value");
      assert.isTrue(elm.disabled, "disabled");
    });

    it("should set attr", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      const arg = {
        executable: true,
      };
      elm.id = EDITOR_LABEL;
      elm.value = "foo";
      elm.disabled = false;
      body.appendChild(elm);
      await func(arg);
      assert.strictEqual(elm.value, "", "value");
      assert.isTrue(elm.disabled, "disabled");
    });
  });

  describe("extract host status", () => {
    const func = mjs.extractHostStatus;

    it("should add warning", async () => {
      browser.i18n.getMessage.withArgs("hostConnection_false").returns("foo");
      const elm = document.createElement("p");
      const body = document.querySelector("body");
      const arg = {hostConnection: false};
      elm.id = HOST_CONNECTION;
      body.appendChild(elm);
      await func(arg);
      assert.strictEqual(elm.textContent, "foo", "text");
      assert.isTrue(elm.classList.contains(WARN), "class");
      browser.i18n.getMessage.flush();
    });

    it("should remove warning", async () => {
      browser.i18n.getMessage.withArgs("hostConnection_true").returns("foo");
      const elm = document.createElement("p");
      const body = document.querySelector("body");
      const arg = {hostConnection: true};
      elm.id = HOST_CONNECTION;
      elm.classList.add(WARN);
      body.appendChild(elm);
      await func(arg);
      assert.strictEqual(elm.textContent, "foo", "text");
      assert.isFalse(elm.classList.contains(WARN), "class");
      browser.i18n.getMessage.flush();
    });

    it("should add warning", async () => {
      browser.i18n.getMessage.withArgs("hostVersion_false").returns("foo");
      const elm = document.createElement("p");
      const body = document.querySelector("body");
      const arg = {hostVersion: false};
      elm.id = HOST_VERSION;
      body.appendChild(elm);
      await func(arg);
      assert.strictEqual(elm.textContent, "foo", "text");
      assert.isTrue(elm.classList.contains(WARN), "class");
      browser.i18n.getMessage.flush();
    });

    it("should remove warning", async () => {
      browser.i18n.getMessage.withArgs("hostVersion_true").returns("foo");
      const elm = document.createElement("p");
      const body = document.querySelector("body");
      const arg = {hostVersion: true};
      elm.id = HOST_VERSION;
      elm.classList.add(WARN);
      body.appendChild(elm);
      await func(arg);
      assert.strictEqual(elm.textContent, "foo", "text");
      assert.isFalse(elm.classList.contains(WARN), "class");
      browser.i18n.getMessage.flush();
    });
  });

  describe("extract sync urls input", () => {
    const func = mjs.extractSyncUrls;

    it("should get null", async () => {
      const evt = {
        target: {},
      };
      const res = await func(evt);
      assert.isNull(res, "result");
    });

    it("should get null", async () => {
      const evt = {
        target: {
          value: "",
        },
      };
      const res = await func(evt);
      assert.isNull(res, "result");
    });

    it("should get null", async () => {
      const evt = {
        target: {
          value: "\n",
        },
      };
      const res = await func(evt);
      assert.isNull(res, "result");
    });

    it("should log error", async () => {
      const stub = sinon.stub(console, "error");
      const evt = {
        target: {
          value: "foo/bar",
        },
      };
      const res = await func(evt);
      stub.restore();
      assert.isTrue(stub.calledOnce, "error logged");
      assert.isNull(res, "result");
    });

    it("should call function", async () => {
      const evt = {
        target: {
          id: "foo",
          value: "https://example.com",
        },
      };
      const res = await func(evt);
      assert.isUndefined(res, "result");
    });
  });

  describe("port pref", () => {
    const func = mjs.portPref;

    it("should get empty array", async () => {
      const evt = {
        target: {},
      };
      const res = await func(evt);
      assert.deepEqual(res, [], "result");
    });

    it("should get array", async () => {
      const evt = {
        target: {
          id: "foo",
        },
      };
      const res = await func(evt);
      assert.strictEqual(res.length, 1, "length");
      assert.deepEqual(res, [undefined], "result");
    });

    it("should get array", async () => {
      const elm = document.createElement("input");
      const elm2 = document.createElement("input");
      const body = document.querySelector("body");
      elm.id = "foo";
      elm.name = "baz";
      elm.type = "radio";
      elm.checked = false;
      elm2.id = "bar";
      elm2.name = "baz";
      elm2.type = "radio";
      elm2.checked = false;
      body.appendChild(elm);
      body.appendChild(elm2);
      const evt = {
        target: {
          id: "foo",
          name: "baz",
          type: "radio",
          checked: true,
        },
      };
      const res = await func(evt);
      assert.strictEqual(res.length, 2, "length");
      assert.deepEqual(res, [undefined, undefined], "result");
    });

    it("should get array", async () => {
      const i = browser.permissions.request.callCount;
      const evt = {
        target: {
          id: HOST_ERR_NOTIFY,
          checked: true,
        },
      };
      const res = await func(evt);
      assert.strictEqual(browser.permissions.request.callCount, i + 1,
                         "called");
      assert.strictEqual(res.length, 1, "length");
      assert.deepEqual(res, [undefined], "result");
    });

    it("should get array", async () => {
      const i = browser.permissions.remove.callCount;
      const evt = {
        target: {
          id: HOST_ERR_NOTIFY,
          checked: false,
        },
      };
      const res = await func(evt);
      assert.strictEqual(browser.permissions.remove.callCount, i + 1, "called");
      assert.strictEqual(res.length, 1, "length");
      assert.deepEqual(res, [undefined], "result");
    });
  });

  describe("handle reloadExtension click", () => {
    const func = mjs.handleReloadExtensionClick;

    it("should call function", async () => {
      const elm = document.createElement("button");
      const body = document.querySelector("body");
      body.appendChild(elm);
      const evt = {
        currentTarget: elm,
        target: elm,
        stopPropagation: () => sinon.fake(),
        preventDefault: () => sinon.fake(),
      };
      const res = await func(evt);
      assert.isUndefined(res, "result");
    });

    it("should get null", async () => {
      const elm = document.createElement("button");
      const body = document.querySelector("body");
      body.appendChild(elm);
      const evt = {
        currentTarget: body,
        target: elm,
        stopPropagation: () => sinon.fake(),
        preventDefault: () => sinon.fake(),
      };
      const res = await func(evt);
      assert.isNull(res, "result");
    });
  });

  describe("handle sync urls input", () => {
    const func = mjs.handleSyncUrlsInputInput;

    it("should call function", async () => {
      const evt = {
        target: {
          id: "foo",
          value: "https://example.com",
        },
      };
      const res = await func(evt);
      assert.isUndefined(res, "result");
    });
  });

  describe("handle input change", () => {
    const func = mjs.handleInputChange;

    it("should get array", async () => {
      const evt = {
        target: {
          id: "foo",
        },
      };
      const res = await func(evt);
      assert.deepEqual(res, [undefined], "result");
    });
  });

  describe("prevent event", () => {
    const func = mjs.preventEvent;

    it("should call functions", async () => {
      const fake = sinon.fake();
      const fake2 = sinon.fake();
      const evt = {
        stopPropagation: fake,
        preventDefault: fake2,
      };
      await func(evt);
      assert.isTrue(fake.calledOnce, "called stopPropagation");
      assert.isTrue(fake2.calledOnce, "called preventDefault");
    });
  });

  describe("add event listener to reload extension button", () => {
    const func = mjs.addReloadExtensionListener;

    it("should set listener", async () => {
      const elm = document.createElement("button");
      const body = document.querySelector("body");
      const spy = sinon.spy(elm, "addEventListener");
      elm.id = EXT_RELOAD;
      body.appendChild(elm);
      await func();
      assert.isTrue(spy.calledOnce, "called");
      elm.addEventListener.restore();
    });
  });

  describe("add event listener to sync urls textarea", () => {
    const func = mjs.addSyncUrlsInputListener;

    it("should set listener", async () => {
      const elm = document.createElement("textarea");
      const body = document.querySelector("body");
      const spy = sinon.spy(elm, "addEventListener");
      elm.id = SYNC_AUTO_URL;
      body.appendChild(elm);
      await func();
      assert.isTrue(spy.calledOnce, "called");
      elm.addEventListener.restore();
    });
  });

  describe("add event listener to input elements", () => {
    const func = mjs.addInputChangeListener;

    it("should set listener", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      const spy = sinon.spy(elm, "addEventListener");
      body.appendChild(elm);
      await func();
      assert.isTrue(spy.calledOnce, "called");
      elm.addEventListener.restore();
    });
  });

  describe("add event listener to form elements", () => {
    const func = mjs.addFormSubmitListener;

    it("should not call function", async () => {
      const elm = document.createElement("p");
      const body = document.querySelector("body");
      const spy = sinon.spy(elm, "addEventListener");
      body.appendChild(elm);
      await func();
      assert.isTrue(spy.notCalled, "not called");
      elm.addEventListener.restore();
    });

    it("should call function", async () => {
      const elm = document.createElement("form");
      const body = document.querySelector("body");
      const spy = sinon.spy(elm, "addEventListener");
      body.appendChild(elm);
      await func();
      assert.isTrue(spy.calledOnce, "called");
      elm.addEventListener.restore();
    });
  });

  describe("set html input value", () => {
    const func = mjs.setHtmlInputValue;

    it("should not set value if argument not given", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      elm.id = "foo";
      elm.type = "checkbox";
      body.appendChild(elm);
      await func();
      assert.strictEqual(elm.checked, false, "checked");
    });

    it("should not set value if element not found", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      elm.id = "foo";
      elm.type = "checkbox";
      body.appendChild(elm);
      await func({
        id: "bar",
        checked: true,
      });
      assert.strictEqual(elm.checked, false, "checked");
    });

    it("should not set value if type does not match", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      elm.id = "foo";
      elm.type = "bar";
      elm.checked = false;
      elm.value = "baz";
      body.appendChild(elm);
      await func({
        id: "foo",
        checked: true,
        value: "qux",
      });
      assert.strictEqual(elm.checked, false, "checked");
      assert.strictEqual(elm.value, "baz", "checked");
    });

    it("should set checkbox value", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      elm.id = "foo";
      elm.type = "checkbox";
      body.appendChild(elm);
      await func({
        id: "foo",
        checked: true,
      });
      assert.strictEqual(elm.checked, true, "checked");
    });

    it("should set checkbox value", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      elm.id = "foo";
      elm.type = "checkbox";
      body.appendChild(elm);
      await func({
        id: "foo",
      });
      assert.strictEqual(elm.checked, false, "checked");
    });

    it("should set radio value", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      elm.id = "foo";
      elm.type = "radio";
      body.appendChild(elm);
      await func({
        id: "foo",
        checked: true,
      });
      assert.strictEqual(elm.checked, true, "checked");
    });

    it("should set text value", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      elm.id = "foo";
      elm.type = "text";
      body.appendChild(elm);
      await func({
        id: "foo",
        value: "bar",
      });
      assert.strictEqual(elm.value, "bar", "value");
    });

    it("should set text value", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      elm.id = "foo";
      elm.type = "text";
      body.appendChild(elm);
      await func({
        id: "foo",
      });
      assert.strictEqual(elm.value, "", "value");
    });

    it("should set text value", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      elm.id = EDITOR_LABEL;
      elm.type = "text";
      elm.disabled = true;
      body.appendChild(elm);
      await func({
        id: EDITOR_LABEL,
        value: "foo",
      });
      assert.strictEqual(elm.value, "foo", "result");
      assert.isFalse(elm.disabled, "enabled");
    });

    it("should set text value", async () => {
      const elm = document.createElement("textarea");
      const body = document.querySelector("body");
      elm.id = SYNC_AUTO_URL;
      elm.value = "";
      body.appendChild(elm);
      await func({
        id: SYNC_AUTO_URL,
        value: "https://example.com",
      });
      assert.strictEqual(elm.value, "https://example.com", "value");
    });

    it("should set text value", async () => {
      const elm = document.createElement("textarea");
      const body = document.querySelector("body");
      elm.id = SYNC_AUTO_URL;
      elm.value = "foo";
      body.appendChild(elm);
      await func({
        id: SYNC_AUTO_URL,
      });
      assert.strictEqual(elm.value, "", "value");
    });

    it("should set text value", async () => {
      const elm = document.createElement("textarea");
      const body = document.querySelector("body");
      elm.id = SYNC_AUTO_URL;
      elm.value = "foo";
      body.appendChild(elm);
      await func({
        id: SYNC_AUTO_URL,
        value: null,
      });
      assert.strictEqual(elm.value, "", "value");
    });
  });

  describe("set html input values from storage", () => {
    const func = mjs.setValuesFromStorage;

    it("should get empty array", async () => {
      const i = browser.storage.local.get.callCount;
      browser.storage.local.get.resolves({});
      const res = await func();
      assert.strictEqual(browser.storage.local.get.callCount, i + 1, "called");
      assert.strictEqual(res.length, 0, "array length");
      assert.deepEqual(res, [], "result");
    });

    it("should get empty array", async () => {
      const i = browser.storage.local.get.callCount;
      browser.storage.local.get.resolves({
        foo: {},
        bar: {},
      });
      const res = await func();
      assert.strictEqual(browser.storage.local.get.callCount, i + 1, "called");
      assert.strictEqual(res.length, 0, "array length");
      assert.deepEqual(res, [], "result");
    });

    it("should get array", async () => {
      const i = browser.storage.local.get.callCount;
      browser.storage.local.get.resolves({
        foo: {
          bar: {},
        },
        baz: {
          qux: {},
        },
      });
      const res = await func();
      assert.strictEqual(browser.storage.local.get.callCount, i + 1, "called");
      assert.strictEqual(res.length, 2, "array length");
      assert.deepEqual(res, [undefined, undefined], "result");
    });
  });

  describe("handle message", () => {
    const func = mjs.handleMsg;

    it("should get empty array", async () => {
      const res = await func();
      assert.deepEqual(res, [], "result");
    });

    it("should get empty array if key does not match", async () => {
      const res = await func({foo: "bar"});
      assert.deepEqual(res, [], "result");
    });

    it("should get array", async () => {
      const res = await func({
        [EDITOR_CONFIG_RES]: {},
      });
      assert.strictEqual(res.length, 1, "length");
      assert.deepEqual(res, [undefined], "result");
    });

    it("should get array", async () => {
      const res = await func({
        [HOST_STATUS]: {},
      });
      assert.strictEqual(res.length, 1, "length");
      assert.deepEqual(res, [undefined], "result");
    });
  });
});
