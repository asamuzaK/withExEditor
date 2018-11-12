/**
 * options.test.js
 */
/* eslint-disable  max-nested-callbacks, no-await-in-loop, no-magic-numbers */

import {JSDOM} from "jsdom";
import {assert} from "chai";
import {afterEach, beforeEach, describe, it} from "mocha";
import sinon from "sinon";
import {browser} from "./mocha/setup.js";
import * as mjs from "../src/mjs/compat.js";
import {EDITOR_EXEC, OPTIONS_OPEN} from "../src/mjs/constant.js";

describe("compat", () => {
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

  describe("update command key", () => {
    const func = mjs.updateCommandKey;
    const globalKeys = ["Event", "Node"];
    beforeEach(() => {
      for (const key of globalKeys) {
        global[key] = window[key];
      }
    });
    afterEach(() => {
      for (const key of globalKeys) {
        delete global[key];
      }
    });

    it("should not call function", async () => {
      const fake = sinon.fake.resolves(undefined);
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      elm.id = "foo";
      elm.value = "Ctrl+1";
      body.appendChild(elm);
      const evt = {
        target: elm,
      };
      window.addEventListener("change", fake, true);
      window.func = func;
      await window.func(evt);
      assert.isTrue(fake.notCalled, "change listener not called");
    });

    it("should not call function", async () => {
      const fake = sinon.fake.resolves(undefined);
      const fake2 = sinon.fake.resolves(undefined);
      browser.commands.update = fake;
      browser.commands.reset = fake2;
      await func({
        target: {},
      });
      assert.isTrue(fake.notCalled, "update not called");
      assert.isTrue(fake2.notCalled, "reset not called");
      delete browser.commands.update;
      delete browser.commands.reset;
    });

    it("should not call function", async () => {
      const fake = sinon.fake.resolves(undefined);
      const fake2 = sinon.fake.rejects();
      const fake3 = sinon.fake.resolves(undefined);
      browser.commands.update = fake;
      browser.commands.reset = fake2;
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      elm.id = "foo";
      elm.value = "Ctrl+@";
      body.appendChild(elm);
      const evt = {
        target: elm,
      };
      window.addEventListener("change", fake3, true);
      window.func = func;
      await window.func(evt);
      assert.isTrue(fake.notCalled, "update called");
      assert.isTrue(fake2.notCalled, "reset not called");
      assert.isTrue(fake3.notCalled, "change listener called");
      delete browser.commands.update;
      delete browser.commands.reset;
    });

    it("should not call function", async () => {
      const items = [
        "MediaNextTrack", "MediaPrevTrack",
        "MediaPlayPause", "MediaStop",
      ];
      for (const value of items) {
        const fake = sinon.fake.resolves(undefined);
        const fake2 = sinon.fake.rejects();
        const fake3 = sinon.fake.resolves(undefined);
        browser.commands.update = fake;
        browser.commands.reset = fake2;
        const elm = document.createElement("input");
        const body = document.querySelector("body");
        elm.id = "foo";
        elm.value = value;
        body.appendChild(elm);
        const evt = {
          target: elm,
        };
        window.addEventListener("change", fake3, true);
        window.func = func;
        await window.func(evt);
        assert.isTrue(fake.notCalled, `update not called ${value}`);
        assert.isTrue(fake2.notCalled, "reset not called");
        assert.isTrue(fake3.notCalled, `change listener not called ${value}`);
        delete browser.commands.update;
        delete browser.commands.reset;
      }
    });

    it("should call function", async () => {
      const items = [
        "Alt+1", "Command+1", "Ctrl+1", "MacCtrl+1",
        "Alt+Shift+1", "Command+Shift+1", "Ctrl+Shift+1", "MacCtrl+Shift+1",
        "Alt+Command+1", "Alt+Ctrl+1", "Alt+MacCtrl+1",
        "Command+Alt+1", "Command+MacCtrl+1",
        "Ctrl+Alt+1", "Ctrl+MacCtrl+1",
        "MacCtrl+Alt+1", "MacCtrl+Command+1", "MacCtrl+Ctrl+1",
        "Alt+a", "Command+a", "Ctrl+a", "MacCtrl+a",
        "Alt+Shift+a", "Command+Shift+a", "Ctrl+Shift+a", "MacCtrl+Shift+a",
        "Alt+Command+a", "Alt+Ctrl+a", "Alt+MacCtrl+a",
        "Command+Alt+a", "Command+MacCtrl+a",
        "Ctrl+Alt+a", "Ctrl+MacCtrl+a",
        "MacCtrl+Alt+a", "MacCtrl+Command+a", "MacCtrl+Ctrl+a",
        "Alt+F1", "Command+F1", "Ctrl+F1", "MacCtrl+F1",
        "Alt+Shift+F1", "Command+Shift+F1", "Ctrl+Shift+F1", "MacCtrl+Shift+F1",
        "Alt+Command+F1", "Alt+Ctrl+F1", "Alt+MacCtrl+F1",
        "Command+Alt+F1", "Command+MacCtrl+F1",
        "Ctrl+Alt+F1", "Ctrl+MacCtrl+F1",
        "MacCtrl+Alt+F1", "MacCtrl+Command+F1", "MacCtrl+Ctrl+F1",
        "Alt+PageDown", "Command+PageDown", "Ctrl+PageDown", "MacCtrl+PageDown",
        "Alt+Shift+PageDown", "Command+Shift+PageDown", "Ctrl+Shift+PageDown",
        "MacCtrl+Shift+PageDown",
        "Alt+Command+PageDown", "Alt+Ctrl+PageDown", "Alt+MacCtrl+PageDown",
        "Command+Alt+PageDown", "Command+MacCtrl+PageDown",
        "Ctrl+Alt+PageDown", "Ctrl+MacCtrl+PageDown",
        "MacCtrl+Alt+PageDown", "MacCtrl+Command+PageDown",
        "MacCtrl+Ctrl+PageDown",
        "Alt+Up", "Command+Up", "Ctrl+Up", "MacCtrl+Up",
        "Alt+Shift+Up", "Command+Shift+Up", "Ctrl+Shift+Up", "MacCtrl+Shift+Up",
        "Alt+Command+Up", "Alt+Ctrl+Up", "Alt+MacCtrl+Up",
        "Command+Alt+Up", "Command+MacCtrl+Up",
        "Ctrl+Alt+Up", "Ctrl+MacCtrl+Up",
        "MacCtrl+Alt+Up", "MacCtrl+Command+Up", "MacCtrl+Ctrl+Up",
        "Alt+Left", "Command+Left", "Ctrl+Left", "MacCtrl+Left",
        "Alt+Shift+Left", "Command+Shift+Left", "Ctrl+Shift+Left",
        "MacCtrl+Shift+Left",
        "Alt+Command+Left", "Alt+Ctrl+Left", "Alt+MacCtrl+Left",
        "Command+Alt+Left", "Command+MacCtrl+Left",
        "Ctrl+Alt+Left", "Ctrl+MacCtrl+Left",
        "MacCtrl+Alt+Left", "MacCtrl+Command+Left", "MacCtrl+Ctrl+Left",
        "F1", "F12",
      ];
      for (const value of items) {
        const fake = sinon.fake.resolves(undefined);
        const fake2 = sinon.fake.rejects();
        const fake3 = sinon.fake.resolves(undefined);
        browser.commands.update = fake;
        browser.commands.reset = fake2;
        const elm = document.createElement("input");
        const body = document.querySelector("body");
        elm.id = "foo";
        elm.value = value;
        body.appendChild(elm);
        const evt = {
          target: elm,
        };
        window.addEventListener("change", fake3, true);
        window.func = func;
        await window.func(evt);
        assert.isTrue(fake.calledOnce, `update called ${value}`);
        assert.isTrue(fake2.notCalled, "reset not called");
        assert.isTrue(fake3.calledOnce, `change listener called ${value}`);
        delete browser.commands.update;
        delete browser.commands.reset;
      }
    });
  });

  describe("detect key combination", () => {
    const func = mjs.detectKeyCombo;
    const globalKeys = ["InputEvent", "Node"];
    beforeEach(() => {
      for (const key of globalKeys) {
        global[key] = window[key];
      }
    });
    afterEach(() => {
      for (const key of globalKeys) {
        delete global[key];
      }
    });

    it("should not call function if target is disabled", async () => {
      const i = browser.runtime.getBrowserInfo.callCount;
      const evt = {
        target: {
          disabled: true,
        },
      };
      await func(evt);
      assert.strictEqual(browser.runtime.getBrowserInfo.callCount, i,
                         "not called");
    });

    it("should call function", async () => {
      browser.runtime.getBrowserInfo.returns({
        version: "1.2.3",
      });
      browser.runtime.getPlatformInfo.returns({
        os: "foo",
      });
      const i = browser.runtime.getBrowserInfo.callCount;
      const j = browser.runtime.getPlatformInfo.callCount;
      const evt = {
        key: "a",
        target: {
          disabled: false,
        },
      };
      await func(evt);
      assert.strictEqual(browser.runtime.getBrowserInfo.callCount, i + 1,
                         "called getBrowserInfo");
      assert.strictEqual(browser.runtime.getPlatformInfo.callCount, j + 1,
                         "called getPlatformInfo");
      browser.runtime.getBrowserInfo.flush();
      browser.runtime.getPlatformInfo.flush();
    });

    it("should call dispatch event even without modifiers", async () => {
      const items = [
        "MediaNextTrack", "MediaPrevTrack", "MediaPlayPause", "MediaStop",
        "F1", "F12",
      ];
      for (const key of items) {
        browser.runtime.getBrowserInfo.returns({
          version: "63.0",
        });
        browser.runtime.getPlatformInfo.returns({
          os: "foo",
        });
        const fake = sinon.fake();
        const elm = document.createElement("input");
        const body = document.querySelector("body");
        elm.disabled = false;
        body.appendChild(elm);
        assert.strictEqual(elm.value, "", "default value");
        const evt = {
          target: elm,
        };
        evt.key = key;
        window.addEventListener("input", fake, true);
        window.func = func;
        await window.func(evt);
        assert.strictEqual(elm.value, key, `key ${key}`);
        assert.strictEqual(fake.callCount, 1, "called");
        browser.runtime.getBrowserInfo.flush();
        browser.runtime.getPlatformInfo.flush();
      }
    });

    it("should call dispatch event when alt+key", async () => {
      const items = [
        {
          key: "1",
        },
        {
          key: "a",
          value: "A",
        },
        {
          key: "A",
        },
        {
          key: ",",
          value: "Comma",
        },
        {
          key: ".",
          value: "Period",
        },
        {
          key: " ",
          value: "Space",
        },
        {
          key: "ArrowDown",
          value: "Down",
        },
        {
          key: "ArrowUp",
          value: "Up",
        },
        {
          key: "ArrowLeft",
          value: "Left",
        },
        {
          key: "ArrowRight",
          value: "Right",
        },
        {
          key: "PageDown",
        },
        {
          key: "PageUp",
        },
        {
          key: "Home",
        },
        {
          key: "End",
        },
        {
          key: "Insert",
        },
        {
          key: "Delete",
        },
        {
          key: "F1",
        },
        {
          key: "F12",
        },
      ];
      for (const item of items) {
        browser.runtime.getBrowserInfo.returns({
          version: "63.0",
        });
        browser.runtime.getPlatformInfo.returns({
          os: "foo",
        });
        const {key, value} = item;
        const fake = sinon.fake();
        const elm = document.createElement("input");
        const body = document.querySelector("body");
        elm.disabled = false;
        body.appendChild(elm);
        assert.strictEqual(elm.value, "", "default value");
        const evt = {
          altKey: true,
          target: elm,
        };
        evt.key = key;
        window.addEventListener("input", fake, true);
        window.func = func;
        await window.func(evt);
        assert.strictEqual(elm.value, `Alt+${value || key}`, `key ${key}`);
        assert.strictEqual(fake.callCount, 1, "called");
        browser.runtime.getBrowserInfo.flush();
        browser.runtime.getPlatformInfo.flush();
      }
    });

    it("should call dispatch event when alt+shift+key", async () => {
      const items = [
        {
          key: "1",
        },
        {
          key: "a",
          value: "A",
        },
        {
          key: "A",
        },
        {
          key: ",",
          value: "Comma",
        },
        {
          key: ".",
          value: "Period",
        },
        {
          key: " ",
          value: "Space",
        },
        {
          key: "ArrowDown",
          value: "Down",
        },
        {
          key: "ArrowUp",
          value: "Up",
        },
        {
          key: "ArrowLeft",
          value: "Left",
        },
        {
          key: "ArrowRight",
          value: "Right",
        },
        {
          key: "PageDown",
        },
        {
          key: "PageUp",
        },
        {
          key: "Home",
        },
        {
          key: "End",
        },
        {
          key: "Insert",
        },
        {
          key: "Delete",
        },
        {
          key: "F1",
        },
        {
          key: "F12",
        },
      ];
      for (const item of items) {
        browser.runtime.getBrowserInfo.returns({
          version: "63.0",
        });
        browser.runtime.getPlatformInfo.returns({
          os: "foo",
        });
        const {key, value} = item;
        const fake = sinon.fake();
        const elm = document.createElement("input");
        const body = document.querySelector("body");
        elm.disabled = false;
        body.appendChild(elm);
        assert.strictEqual(elm.value, "", "default value");
        const evt = {
          altKey: true,
          shiftKey: true,
          target: elm,
        };
        evt.key = key;
        window.addEventListener("input", fake, true);
        window.func = func;
        await window.func(evt);
        assert.strictEqual(elm.value, `Alt+Shift+${value || key}`,
                           `key ${key}`);
        assert.strictEqual(fake.callCount, 1, "called");
        browser.runtime.getBrowserInfo.flush();
        browser.runtime.getPlatformInfo.flush();
      }
    });

    it("should call dispatch event when ctrl+key", async () => {
      const items = [
        {
          key: "1",
        },
        {
          key: "a",
          value: "A",
        },
        {
          key: "A",
        },
        {
          key: ",",
          value: "Comma",
        },
        {
          key: ".",
          value: "Period",
        },
        {
          key: " ",
          value: "Space",
        },
        {
          key: "ArrowDown",
          value: "Down",
        },
        {
          key: "ArrowUp",
          value: "Up",
        },
        {
          key: "ArrowLeft",
          value: "Left",
        },
        {
          key: "ArrowRight",
          value: "Right",
        },
        {
          key: "PageDown",
        },
        {
          key: "PageUp",
        },
        {
          key: "Home",
        },
        {
          key: "End",
        },
        {
          key: "Insert",
        },
        {
          key: "Delete",
        },
        {
          key: "F1",
        },
        {
          key: "F12",
        },
      ];
      for (const item of items) {
        browser.runtime.getBrowserInfo.returns({
          version: "63.0",
        });
        browser.runtime.getPlatformInfo.returns({
          os: "foo",
        });
        const {key, value} = item;
        const fake = sinon.fake();
        const elm = document.createElement("input");
        const body = document.querySelector("body");
        elm.disabled = false;
        body.appendChild(elm);
        assert.strictEqual(elm.value, "", "default value");
        const evt = {
          ctrlKey: true,
          target: elm,
        };
        evt.key = key;
        window.addEventListener("input", fake, true);
        window.func = func;
        await window.func(evt);
        assert.strictEqual(elm.value, `Ctrl+${value || key}`, `key ${key}`);
        assert.strictEqual(fake.callCount, 1, "called");
        browser.runtime.getBrowserInfo.flush();
        browser.runtime.getPlatformInfo.flush();
      }
    });

    it("should call dispatch event when ctrl+shift+key", async () => {
      const items = [
        {
          key: "1",
        },
        {
          key: "a",
          value: "A",
        },
        {
          key: "A",
        },
        {
          key: ",",
          value: "Comma",
        },
        {
          key: ".",
          value: "Period",
        },
        {
          key: " ",
          value: "Space",
        },
        {
          key: "ArrowDown",
          value: "Down",
        },
        {
          key: "ArrowUp",
          value: "Up",
        },
        {
          key: "ArrowLeft",
          value: "Left",
        },
        {
          key: "ArrowRight",
          value: "Right",
        },
        {
          key: "PageDown",
        },
        {
          key: "PageUp",
        },
        {
          key: "Home",
        },
        {
          key: "End",
        },
        {
          key: "Insert",
        },
        {
          key: "Delete",
        },
        {
          key: "F1",
        },
        {
          key: "F12",
        },
      ];
      for (const item of items) {
        browser.runtime.getBrowserInfo.returns({
          version: "63.0",
        });
        browser.runtime.getPlatformInfo.returns({
          os: "foo",
        });
        const {key, value} = item;
        const fake = sinon.fake();
        const elm = document.createElement("input");
        const body = document.querySelector("body");
        elm.disabled = false;
        body.appendChild(elm);
        assert.strictEqual(elm.value, "", "default value");
        const evt = {
          ctrlKey: true,
          shiftKey: true,
          target: elm,
        };
        evt.key = key;
        window.addEventListener("input", fake, true);
        window.func = func;
        await window.func(evt);
        assert.strictEqual(elm.value, `Ctrl+Shift+${value || key}`,
                           `key ${key}`);
        assert.strictEqual(fake.callCount, 1, "called");
        browser.runtime.getBrowserInfo.flush();
        browser.runtime.getPlatformInfo.flush();
      }
    });

    it("should call dispatch event when ctrl+key on mac", async () => {
      const items = [
        {
          key: "1",
        },
        {
          key: "a",
          value: "A",
        },
        {
          key: "A",
        },
        {
          key: ",",
          value: "Comma",
        },
        {
          key: ".",
          value: "Period",
        },
        {
          key: " ",
          value: "Space",
        },
        {
          key: "ArrowDown",
          value: "Down",
        },
        {
          key: "ArrowUp",
          value: "Up",
        },
        {
          key: "ArrowLeft",
          value: "Left",
        },
        {
          key: "ArrowRight",
          value: "Right",
        },
        {
          key: "PageDown",
        },
        {
          key: "PageUp",
        },
        {
          key: "Home",
        },
        {
          key: "End",
        },
        {
          key: "Insert",
        },
        {
          key: "Delete",
        },
        {
          key: "F1",
        },
        {
          key: "F12",
        },
      ];
      for (const item of items) {
        browser.runtime.getBrowserInfo.returns({
          version: "63.0",
        });
        browser.runtime.getPlatformInfo.returns({
          os: "mac",
        });
        const {key, value} = item;
        const fake = sinon.fake();
        const elm = document.createElement("input");
        const body = document.querySelector("body");
        elm.disabled = false;
        body.appendChild(elm);
        assert.strictEqual(elm.value, "", "default value");
        const evt = {
          ctrlKey: true,
          target: elm,
        };
        evt.key = key;
        window.addEventListener("input", fake, true);
        window.func = func;
        await window.func(evt);
        assert.strictEqual(elm.value, `MacCtrl+${value || key}`, `key ${key}`);
        assert.strictEqual(fake.callCount, 1, "called");
        browser.runtime.getBrowserInfo.flush();
        browser.runtime.getPlatformInfo.flush();
      }
    });

    it("should call dispatch event when ctrl+shift+key on mac", async () => {
      const items = [
        {
          key: "1",
        },
        {
          key: "a",
          value: "A",
        },
        {
          key: "A",
        },
        {
          key: ",",
          value: "Comma",
        },
        {
          key: ".",
          value: "Period",
        },
        {
          key: " ",
          value: "Space",
        },
        {
          key: "ArrowDown",
          value: "Down",
        },
        {
          key: "ArrowUp",
          value: "Up",
        },
        {
          key: "ArrowLeft",
          value: "Left",
        },
        {
          key: "ArrowRight",
          value: "Right",
        },
        {
          key: "PageDown",
        },
        {
          key: "PageUp",
        },
        {
          key: "Home",
        },
        {
          key: "End",
        },
        {
          key: "Insert",
        },
        {
          key: "Delete",
        },
        {
          key: "F1",
        },
        {
          key: "F12",
        },
      ];
      for (const item of items) {
        browser.runtime.getBrowserInfo.returns({
          version: "63.0",
        });
        browser.runtime.getPlatformInfo.returns({
          os: "mac",
        });
        const {key, value} = item;
        const fake = sinon.fake();
        const elm = document.createElement("input");
        const body = document.querySelector("body");
        elm.disabled = false;
        body.appendChild(elm);
        assert.strictEqual(elm.value, "", "default value");
        const evt = {
          ctrlKey: true,
          shiftKey: true,
          target: elm,
        };
        evt.key = key;
        window.addEventListener("input", fake, true);
        window.func = func;
        await window.func(evt);
        assert.strictEqual(elm.value, `MacCtrl+Shift+${value || key}`,
                           `key ${key}`);
        assert.strictEqual(fake.callCount, 1, "called");
        browser.runtime.getBrowserInfo.flush();
        browser.runtime.getPlatformInfo.flush();
      }
    });

    it("should call dispatch event when meta+key on mac", async () => {
      const items = [
        {
          key: "1",
        },
        {
          key: "a",
          value: "A",
        },
        {
          key: "A",
        },
        {
          key: ",",
          value: "Comma",
        },
        {
          key: ".",
          value: "Period",
        },
        {
          key: " ",
          value: "Space",
        },
        {
          key: "ArrowDown",
          value: "Down",
        },
        {
          key: "ArrowUp",
          value: "Up",
        },
        {
          key: "ArrowLeft",
          value: "Left",
        },
        {
          key: "ArrowRight",
          value: "Right",
        },
        {
          key: "PageDown",
        },
        {
          key: "PageUp",
        },
        {
          key: "Home",
        },
        {
          key: "End",
        },
        {
          key: "Insert",
        },
        {
          key: "Delete",
        },
        {
          key: "F1",
        },
        {
          key: "F12",
        },
      ];
      for (const item of items) {
        browser.runtime.getBrowserInfo.returns({
          version: "63.0",
        });
        browser.runtime.getPlatformInfo.returns({
          os: "mac",
        });
        const {key, value} = item;
        const fake = sinon.fake();
        const elm = document.createElement("input");
        const body = document.querySelector("body");
        elm.disabled = false;
        body.appendChild(elm);
        assert.strictEqual(elm.value, "", "default value");
        const evt = {
          metaKey: true,
          target: elm,
        };
        evt.key = key;
        window.addEventListener("input", fake, true);
        window.func = func;
        await window.func(evt);
        assert.strictEqual(elm.value, `Command+${value || key}`, `key ${key}`);
        assert.strictEqual(fake.callCount, 1, "called");
        browser.runtime.getBrowserInfo.flush();
        browser.runtime.getPlatformInfo.flush();
      }
    });

    it("should call dispatch event when meta+shift+key on mac", async () => {
      const items = [
        {
          key: "1",
        },
        {
          key: "a",
          value: "A",
        },
        {
          key: "A",
        },
        {
          key: ",",
          value: "Comma",
        },
        {
          key: ".",
          value: "Period",
        },
        {
          key: " ",
          value: "Space",
        },
        {
          key: "ArrowDown",
          value: "Down",
        },
        {
          key: "ArrowUp",
          value: "Up",
        },
        {
          key: "ArrowLeft",
          value: "Left",
        },
        {
          key: "ArrowRight",
          value: "Right",
        },
        {
          key: "PageDown",
        },
        {
          key: "PageUp",
        },
        {
          key: "Home",
        },
        {
          key: "End",
        },
        {
          key: "Insert",
        },
        {
          key: "Delete",
        },
        {
          key: "F1",
        },
        {
          key: "F12",
        },
      ];
      for (const item of items) {
        browser.runtime.getBrowserInfo.returns({
          version: "63.0",
        });
        browser.runtime.getPlatformInfo.returns({
          os: "mac",
        });
        const {key, value} = item;
        const fake = sinon.fake();
        const elm = document.createElement("input");
        const body = document.querySelector("body");
        elm.disabled = false;
        body.appendChild(elm);
        assert.strictEqual(elm.value, "", "default value");
        const evt = {
          metaKey: true,
          shiftKey: true,
          target: elm,
        };
        evt.key = key;
        window.addEventListener("input", fake, true);
        window.func = func;
        await window.func(evt);
        assert.strictEqual(elm.value, `Command+Shift+${value || key}`,
                           `key ${key}`);
        assert.strictEqual(fake.callCount, 1, "called");
        browser.runtime.getBrowserInfo.flush();
        browser.runtime.getPlatformInfo.flush();
      }
    });

    it("should not call function", async () => {
      browser.runtime.getBrowserInfo.returns({version: "62.0"});
      browser.runtime.getPlatformInfo.returns({os: "foo"});
      const fake = sinon.fake();
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      elm.disabled = false;
      body.appendChild(elm);
      assert.strictEqual(elm.value, "", "default value");
      const evt = {
        altKey: true,
        ctrlKey: true,
        key: "F1",
        target: elm,
      };
      window.addEventListener("input", fake, true);
      window.func = func;
      await window.func(evt);
      assert.strictEqual(elm.value, "", "value");
      assert.isTrue(fake.notCalled, "not called");
      browser.runtime.getBrowserInfo.flush();
      browser.runtime.getPlatformInfo.flush();
    });

    it("should not call function", async () => {
      browser.runtime.getBrowserInfo.returns({version: "63.0"});
      browser.runtime.getPlatformInfo.returns({os: "mac"});
      const fake = sinon.fake();
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      elm.disabled = false;
      body.appendChild(elm);
      assert.strictEqual(elm.value, "", "default value");
      const evt = {
        altKey: true,
        ctrlKey: true,
        metaKey: true,
        shiftKey: true,
        key: "F1",
        target: elm,
      };
      window.addEventListener("input", fake, true);
      window.func = func;
      await window.func(evt);
      assert.strictEqual(elm.value, "", "value");
      assert.isTrue(fake.notCalled, "not called");
      browser.runtime.getBrowserInfo.flush();
      browser.runtime.getPlatformInfo.flush();
    });

    it("should not call function", async () => {
      browser.runtime.getBrowserInfo.returns({version: "63.0"});
      browser.runtime.getPlatformInfo.returns({os: "foo"});
      const fake = sinon.fake();
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      elm.disabled = false;
      body.appendChild(elm);
      assert.strictEqual(elm.value, "", "default value");
      const evt = {
        ctrlKey: true,
        key: "@",
        target: elm,
      };
      window.addEventListener("input", fake, true);
      window.func = func;
      await window.func(evt);
      assert.strictEqual(elm.value, "", "value");
      assert.isTrue(fake.notCalled, "not called");
      browser.runtime.getBrowserInfo.flush();
      browser.runtime.getPlatformInfo.flush();
    });

    it("should not call function", async () => {
      browser.runtime.getBrowserInfo.returns({version: "63.0"});
      browser.runtime.getPlatformInfo.returns({os: "foo"});
      const fake = sinon.fake();
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      elm.disabled = false;
      body.appendChild(elm);
      assert.strictEqual(elm.value, "", "default value");
      const evt = {
        altKey: true,
        ctrlKey: true,
        shiftKey: true,
        key: "1",
        target: elm,
      };
      window.addEventListener("input", fake, true);
      window.func = func;
      await window.func(evt);
      assert.strictEqual(elm.value, "", "value");
      assert.isTrue(fake.notCalled, "not called");
      browser.runtime.getBrowserInfo.flush();
      browser.runtime.getPlatformInfo.flush();
    });
  });

  describe("handle keyup event", () => {
    const func = mjs.handleKeyupEvt;
    const globalKeys = ["InputEvent", "Node"];
    beforeEach(() => {
      for (const key of globalKeys) {
        global[key] = window[key];
      }
    });
    afterEach(() => {
      for (const key of globalKeys) {
        delete global[key];
      }
    });

    it("should call function", async () => {
      browser.runtime.getBrowserInfo.returns({
        version: "1.2.3",
      });
      browser.runtime.getPlatformInfo.returns({
        os: "foo",
      });
      const i = browser.runtime.getBrowserInfo.callCount;
      const j = browser.runtime.getPlatformInfo.callCount;
      const evt = {
        key: "a",
        target: {
          disabled: false,
        },
      };
      await func(evt);
      assert.strictEqual(browser.runtime.getBrowserInfo.callCount, i + 1,
                         "called getBrowserInfo");
      assert.strictEqual(browser.runtime.getPlatformInfo.callCount, j + 1,
                         "called getPlatformInfo");
      browser.runtime.getBrowserInfo.flush();
      browser.runtime.getPlatformInfo.flush();
    });
  });

  describe("handle input event", () => {
    const func = mjs.handleInputEvt;
    const globalKeys = ["Event", "Node"];
    beforeEach(() => {
      for (const key of globalKeys) {
        global[key] = window[key];
      }
    });
    afterEach(() => {
      for (const key of globalKeys) {
        delete global[key];
      }
    });

    it("should call function", async () => {
      const fake = sinon.fake.resolves(undefined);
      const fake2 = sinon.fake.rejects();
      const fake3 = sinon.fake.resolves(undefined);
      browser.commands.update = fake;
      browser.commands.reset = fake2;
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      elm.id = "foo";
      elm.value = "Ctrl+1";
      body.appendChild(elm);
      const evt = {
        target: elm,
      };
      window.addEventListener("change", fake3, true);
      window.func = func;
      await window.func(evt);
      assert.isTrue(fake.calledOnce, "update called");
      assert.isTrue(fake2.notCalled, "reset not called");
      assert.isTrue(fake3.calledOnce, "change listener called");
      delete browser.commands.update;
      delete browser.commands.reset;
    });
  });

  describe("add listener to command inputs", () => {
    const func = mjs.addListenerToCmdInputs;

    it("should not call function", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      const spy = sinon.spy(elm, "addEventListener");
      body.appendChild(elm);
      window.func = func;
      await window.func();
      assert.isTrue(spy.notCalled, "result");
      elm.addEventListener.restore();
    });

    it("should not call function", async () => {
      const elm = document.createElement("input");
      const elm2 = document.createElement("input");
      const body = document.querySelector("body");
      const spy = sinon.spy(elm, "addEventListener");
      const spy2 = sinon.spy(elm2, "addEventListener");
      elm.id = EDITOR_EXEC;
      elm2.id = OPTIONS_OPEN;
      body.appendChild(elm);
      body.appendChild(elm2);
      window.func = func;
      await window.func();
      assert.isTrue(spy.calledTwice, "result");
      assert.isTrue(spy2.calledTwice, "result");
      elm.addEventListener.restore();
      elm2.addEventListener.restore();
    });
  });

  describe("disable input", () => {
    const func = mjs.disableInput;

    it("should not set attr if no argument given", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      elm.disabled = false;
      elm.id = "foo";
      body.appendChild(elm);
      window.func = func;
      await window.func();
      assert.isFalse(elm.disabled, "result");
    });

    it("should not set attr if given argument is not string", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      elm.disabled = false;
      elm.id = "foo";
      body.appendChild(elm);
      window.func = func;
      await window.func(1);
      assert.isFalse(elm.disabled, "result");
    });

    it("should set attr", async () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      elm.disabled = false;
      elm.id = "foo";
      body.appendChild(elm);
      window.func = func;
      await window.func("foo");
      assert.isTrue(elm.disabled, "result");
    });
  });

  describe("disable incompatible inputs", () => {
    const func = mjs.disableIncompatibleInputs;

    it("should get empty array", async () => {
      const fake = sinon.fake.resolves(undefined);
      const fake2 = sinon.fake.resolves(undefined);
      browser.commands.update = fake;
      browser.commands.reset = fake2;
      const res = await func();
      assert.isFunction(browser.runtime.getBrowserInfo, "browser info");
      assert.isObject(browser.commands, "object");
      assert.isFunction(browser.commands.update, "update");
      assert.isFunction(browser.commands.reset, "update");
      assert.deepEqual(res, [], "result");
      delete browser.commands.update;
      delete browser.commands.reset;
    });

    it("should get array", async () => {
      const res = await func();
      assert.strictEqual(res.length, 3, "length");
      assert.deepEqual(res, [undefined, undefined, undefined], "result");
    });

  });
});
