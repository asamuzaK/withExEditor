/**
 * content.test.js
 */
/* eslint-disable no-magic-numbers, prefer-destructuring */

const {JSDOM} = require("jsdom");
const {assert} = require("chai");
const {afterEach, beforeEach, describe, it} = require("mocha");
const {browser} = require("./mocha/setup.js");
const sinon = require("sinon");
const cjs = require("../src/js/content.js");

/* constants */
const CONTENT_GET = "getContent";
const CONTEXT_MODE = "contextMode";
const CONTEXT_NODE = "contextNode";
const FILE_NOT_FOUND_TIMESTAMP = -1;
const ID_TAB = "tabId";
const ID_WIN = "windowId";
const INCOGNITO = "incognito";
const KEY_CODE_A = 65;
const LABEL = "withExEditor";
const LOCAL_FILE_VIEW = "viewLocalFile";
const MODE_EDIT = "modeEditText";
const MODE_MATHML = "modeViewMathML";
const MODE_SELECTION = "modeViewSelection";
const MODE_SOURCE = "modeViewSource";
const MODE_SVG = "modeViewSVG";
const ONLY_EDITABLE = "enableOnlyEditable";
const PORT_CONNECT = "connectPort";
const PORT_CONTENT = "portContent";
const SYNC_AUTO = "enableSyncAuto";
const SYNC_AUTO_URL = "syncAutoUrls";
const TMP_FILES_PB = "tmpFilesPb";
const TMP_FILE_CREATE = "createTmpFile";
const TMP_FILE_DATA_PORT = "portTmpFileData";
const TMP_FILE_DATA_REMOVE = "removeTmpFileData";
const TMP_FILE_REQ = "requestTmpFile";
const TMP_FILE_RES = "resTmpFile";
const VARS_SET = "setVars";

describe("content", () => {
  /**
   * create jsdom
   * @returns {Object} - jsdom instance
   */
  const createJsdom = () => {
    const domstr = "<!DOCTYPE html><html><head></head><body></body></html>";
    const opt = {
      runScripts: "dangerously",
      url: "https://localhost",
      beforeParse(window) {
        window.prompt = sinon.stub().callsFake((...args) => args.toString());
      },
    };
    return new JSDOM(domstr, opt);
  };
  let window, document;
  const globalKeys = [
    "DOMTokenList", "DOMParser", "FocusEvent", "Headers", "InputEvent",
    "KeyboardEvent", "Node", "NodeList", "XMLSerializer",
  ];
  // NOTE: not implemented in jsdom https://github.com/jsdom/jsdom/issues/1670
  const isContentEditable = elm => {
    let bool;
    if (elm.hasAttribute("contenteditable")) {
      const attr = elm.getAttribute("contenteditable");
      if (attr === "true" || attr === "") {
        bool = true;
      } else if (attr === "false") {
        bool = false;
      }
    }
    if (document && document.designMode === "on") {
      bool = true;
    }
    return !!bool;
  };
  const mockPort = ({name}) => {
    const port = Object.assign({}, browser.runtime.Port);
    port.name = name;
    return port;
  };

  beforeEach(() => {
    const dom = createJsdom();
    window = dom && dom.window;
    document = window && window.document;
    if (typeof document.queryCommandValue !== "function") {
      document.queryCommandValue =
        sinon.stub().withArgs("defaultParagraphSeparator").returns("div");
    }
    global.window = window;
    global.document = document;
    global.fetch = sinon.stub();
    for (const key of globalKeys) {
      global[key] = window[key];
    }
  });
  afterEach(() => {
    window = null;
    document = null;
    delete global.window;
    delete global.document;
    delete global.fetch;
    for (const key of globalKeys) {
      delete global[key];
    }
  });

  it("should get browser object", () => {
    assert.isObject(browser, "browser");
  });

  describe("throw error", () => {
    const func = cjs.throwErr;

    it("should throw", () => {
      const e = new Error("error");
      assert.throws(() => func(e), "error");
    });
  });

  describe("log error", () => {
    const func = cjs.logErr;

    it("should log error message", () => {
      let msg;
      const stub = sinon.stub(console, "error").callsFake(m => {
        msg = m && m.message || m;
      });
      const e = new Error("error");
      const res = func(e);
      const {calledOnce} = stub;
      stub.restore();
      assert.strictEqual(msg, "error");
      assert.isTrue(calledOnce);
      assert.isFalse(res);
    });

    it("should log error message", () => {
      let msg;
      const stub = sinon.stub(console, "error").callsFake(m => {
        msg = m && m.message || m;
      });
      const e = "error";
      const res = func(e);
      const {calledOnce} = stub;
      stub.restore();
      assert.strictEqual(msg, "error");
      assert.isTrue(calledOnce);
      assert.isFalse(res);
    });
  });

  describe("get type", () => {
    const func = cjs.getType;

    it("should get Array", () => {
      const res = func([]);
      assert.deepEqual(res, "Array");
    });

    it("should get Object", () => {
      const res = func({});
      assert.deepEqual(res, "Object");
    });

    it("should get String", () => {
      const res = func("");
      assert.deepEqual(res, "String");
    });

    it("should get Number", () => {
      const res = func(1);
      assert.deepEqual(res, "Number");
    });

    it("should get Boolean", () => {
      const res = func(true);
      assert.deepEqual(res, "Boolean");
    });

    it("should get Undefined", () => {
      const res = func();
      assert.deepEqual(res, "Undefined");
    });

    it("should get Null", () => {
      const res = func(null);
      assert.deepEqual(res, "Null");
    });
  });

  describe("is string", () => {
    const func = cjs.isString;

    it("should get false", () => {
      const items = [[], ["foo"], {}, {foo: "bar"}, undefined, null, 1, true];
      for (const item of items) {
        assert.isFalse(func(item), "result");
      }
    });

    it("should get true", () => {
      const items = ["", "foo"];
      for (const item of items) {
        assert.isTrue(func(item), "result");
      }
    });
  });

  describe("is object, and not an empty object", () => {
    const func = cjs.isObjectNotEmpty;

    it("should get false", () => {
      const items = [{}, [], ["foo"], "", "foo", undefined, null, 1, true];
      for (const item of items) {
        assert.isFalse(func(item), `result ${item}`);
      }
    });

    it("should get true", () => {
      const item = {
        foo: "bar",
      };
      assert.isTrue(func(item), "result");
    });
  });

  describe("strip HTML tags and decode HTML escaped characters", () => {
    const func = cjs.getDecodedContent;

    it("should throw", () => {
      assert.throws(() => func(), "Expected String but got Undefined.");
    });

    it("should get value", () => {
      const res = func("foo");
      assert.strictEqual(res, "foo", "result");
    });

    it("should get value", () => {
      const res = func("<p>foo <span>bar</span> &amp; &lt;baz&gt;</p>");
      assert.strictEqual(res, "foo bar & <baz>", "result");
    });

    it("should get value", () => {
      const res = func("<p>foo</p><p>bar</p>\n<p>baz</p>");
      assert.strictEqual(res, "foobar\nbaz", "result");
    });
  });

  describe("get file name from URI path", () => {
    const func = cjs.getFileNameFromURI;

    it("should throw", async () => {
      assert.throws(() => func(), "Expected String but got Undefined.");
    });

    it("should get value", () => {
      const res = func("https://example.com/foo");
      assert.strictEqual(res, "foo", "result");
    });

    it("should get value", () => {
      const res = func("https://example.com/foo", "bar");
      assert.strictEqual(res, "foo", "result");
    });

    it("should get value", () => {
      const res = func("https://example.com/", "bar");
      assert.strictEqual(res, "bar", "result");
    });

    it("should get value", () => {
      const res = func("https://example.com/");
      assert.strictEqual(res, "withExEditor", "result");
    });

    it("should get value", () => {
      const res = func("https://example.com/foo%20bar");
      assert.strictEqual(res, "foo bar", "result");
    });

    it("should get value", () => {
      const res = func("data:image/svg+xml;utf8,<svg></svg>");
      assert.strictEqual(res, "withExEditor", "result");
    });
  });

  describe("check whether given array of URLs matches document URL", () => {
    const func = cjs.matchDocUrl;

    it("should get false", () => {
      const res = func();
      assert.isFalse(res, "result");
    });

    it("should get true", () => {
      const res = func([
        "https://example.com",
        "foo",
        "",
        1,
        document.location.href,
      ]);
      assert.isTrue(res, "result");
    });
  });

  describe("dispatch focus event", () => {
    const func = cjs.dispatchFocusEvent;

    it("should not call function", () => {
      const p = document.createElement("p");
      const text = document.createTextNode("foo");
      const spy = sinon.spy(p, "dispatchEvent");
      const body = document.querySelector("body");
      p.appendChild(text);
      body.appendChild(p);
      func(text);
      assert.isFalse(spy.called, "called");
    });

    it("should call function", () => {
      const p = document.createElement("p");
      const spy = sinon.spy(p, "dispatchEvent");
      const body = document.querySelector("body");
      body.appendChild(p);
      func(p);
      assert.isTrue(spy.called, "called");
    });
  });

  describe("dispatch input event", () => {
    const func = cjs.dispatchInputEvent;

    it("should not call function", () => {
      const p = document.createElement("p");
      const text = document.createTextNode("foo");
      const spy = sinon.spy(p, "dispatchEvent");
      const body = document.querySelector("body");
      p.appendChild(text);
      body.appendChild(p);
      func(text);
      assert.isFalse(spy.called, "called");
    });

    it("should call function", () => {
      const p = document.createElement("p");
      const spy = sinon.spy(p, "dispatchEvent");
      const body = document.querySelector("body");
      body.appendChild(p);
      func(p);
      assert.isTrue(spy.called, "called");
    });
  });

  describe("dispatch keyboard event", () => {
    const func = cjs.dispatchKeyboardEvent;

    it("should not call function", () => {
      const p = document.createElement("p");
      const text = document.createTextNode("foo");
      const spy = sinon.spy(p, "dispatchEvent");
      const body = document.querySelector("body");
      p.appendChild(text);
      body.appendChild(p);
      func(text);
      assert.isFalse(spy.called, "called");
    });

    it("should call function", () => {
      const p = document.createElement("p");
      const spy = sinon.spy(p, "dispatchEvent");
      const body = document.querySelector("body");
      body.appendChild(p);
      func(p, "keydown", {
        key: "a",
        code: "KeyA",
        keyCode: KEY_CODE_A,
        ctrlKey: true,
      });
      assert.isTrue(spy.called, "called");
    });

    it("should not call function", () => {
      const p = document.createElement("p");
      const spy = sinon.spy(p, "dispatchEvent");
      const body = document.querySelector("body");
      body.appendChild(p);
      func(p, "keydown", {
        key: undefined,
        code: "KeyA",
        keyCode: KEY_CODE_A,
        ctrlKey: true,
      });
      assert.isFalse(spy.called, "called");
    });
  });

  describe("get file extension from media type", () => {
    const func = cjs.getFileExtension;

    it("should get value", () => {
      const res = func();
      assert.strictEqual(res, ".txt", "result");
    });

    it("should get value", () => {
      const res = func("foo");
      assert.strictEqual(res, ".txt", "result");
    });

    it("should get value", () => {
      const res = func("text/foo");
      assert.strictEqual(res, ".txt", "result");
    });

    it("should get value", () => {
      const res = func("application/foo+bar");
      assert.strictEqual(res, ".txt", "result");
    });

    it("should get value", () => {
      const res = func("application/foo+xml");
      assert.strictEqual(res, ".xml", "result");
    });

    it("should get result", async () => {
      const fileExt = {
        "application/javascript": ".js",
        "application/json": ".json",
        "application/mathml+xml": ".mml",
        "application/xhtml+xml": ".xhtml",
        "application/xml": ".xml",
        "application/xslt+xml": ".xsl",
        "image/svg+xml": ".svg",
        "text/css": ".css",
        "text/javascript": ".js",
        "text/html": ".html",
        "text/plain": ".txt",
        "text/xml": ".xml",
      };
      const items = Object.entries(fileExt);
      for (const [key, value] of items) {
        const res = func(key);
        assert.strictEqual(res, value, `result ${key}`);
      }
    });
  });

  describe("get namespace of node from ancestor", () => {
    const func = cjs.getNodeNS;

    it("should get result", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(p);
      const res = func(p);
      assert.deepEqual(res.node, p, "node");
      assert.strictEqual(res.localName, "p", "localName");
      assert.strictEqual(res.namespaceURI, "http://www.w3.org/1999/xhtml",
                         "namespace");
    });

    it("should get result", () => {
      const p = document.createElementNS("http://www.w3.org/1999/xhtml", "p");
      const body = document.querySelector("body");
      body.appendChild(p);
      const res = func(p);
      assert.deepEqual(res.node, p, "node");
      assert.strictEqual(res.localName, "p", "localName");
      assert.strictEqual(res.namespaceURI, "http://www.w3.org/1999/xhtml",
                         "namespace");
    });

    it("should get result", () => {
      const p = document.createElement("p");
      const text = document.createTextNode("foo");
      const body = document.querySelector("body");
      p.appendChild(text);
      body.appendChild(p);
      const res = func(text);
      assert.deepEqual(res.node, p, "node");
      assert.strictEqual(res.localName, "p", "localName");
      assert.strictEqual(res.namespaceURI, "http://www.w3.org/1999/xhtml",
                         "namespace");
    });

    it("should get result", async () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const body = document.querySelector("body");
      body.appendChild(svg);
      const res = await func(svg);
      assert.deepEqual(res.node, svg, "node");
      assert.strictEqual(res.localName, "svg", "localName");
      assert.strictEqual(res.namespaceURI, "http://www.w3.org/2000/svg",
                         "namespace");
    });

    it("should get result", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const text = document.createTextNode("foo");
      const body = document.querySelector("body");
      svg.appendChild(text);
      body.appendChild(svg);
      const res = func(text);
      assert.deepEqual(res.node, svg, "node");
      assert.strictEqual(res.localName, "svg", "localName");
      assert.strictEqual(res.namespaceURI, "http://www.w3.org/2000/svg",
                         "namespace");
    });

    it("should get result", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const fo =
        document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
      const p = document.createElement("p");
      const text = document.createTextNode("foo");
      const body = document.querySelector("body");
      fo.setAttributeNS("http://www.w3.org/2000/svg", "requiredExtensions",
                        "http://www.w3.org/1999/xhtml");
      p.appendChild(text);
      fo.appendChild(p);
      svg.appendChild(body);
      const res = func(text);
      assert.deepEqual(res.node, p, "node");
      assert.strictEqual(res.localName, "p", "localName");
      assert.strictEqual(res.namespaceURI, "http://www.w3.org/1999/xhtml",
                         "namespace");
    });

    it("should get result", () => {
      const page = document.createElementNS(
        "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
        "page",
      );
      const vbox = document.createElementNS(
        "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
        "vbox",
      );
      const div = document.createElementNS("http://www.w3.org/1999/xhtml",
                                           "html:div");
      const text = document.createTextNode("foo");
      page.setAttributeNS("http://www.w3.org/2000/xmlns",
                          "html", "http://www.w3.org/1999/xhtml");
      div.appendChild(text);
      vbox.appendChild(div);
      page.appendChild(vbox);
      const res = func(text);
      assert.deepEqual(res.node, div, "node");
      assert.strictEqual(res.localName, "div", "localName");
      assert.strictEqual(res.namespaceURI, "http://www.w3.org/1999/xhtml",
                         "namespace");
    });

    it("should get result", () => {
      const page = document.createElementNS(
        "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
        "page",
      );
      const vbox = document.createElementNS(
        "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
        "vbox",
      );
      const div = document.createElement("html:div");
      const text = document.createTextNode("foo");
      page.setAttributeNS("http://www.w3.org/2000/xmlns",
                          "html", "http://www.w3.org/1999/xhtml");
      div.appendChild(text);
      vbox.appendChild(div);
      page.appendChild(vbox);
      const res = func(text);
      assert.deepEqual(res.node, div, "node");
      assert.strictEqual(res.localName, "html:div", "localName");
      assert.strictEqual(res.namespaceURI, "http://www.w3.org/1999/xhtml",
                         "namespace");
    });

    it("should get result", () => {
      const html = document.querySelector("html");
      const text = document.createTextNode("foo");
      html.appendChild(text);
      const res = func(text);
      assert.deepEqual(res.node, html, "node");
      assert.strictEqual(res.localName, "html", "localName");
      assert.strictEqual(res.namespaceURI, "http://www.w3.org/1999/xhtml",
                         "namespace");
    });

    it("should get result", () => {
      const html = document.querySelector("html");
      html.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
      const res = func(html);
      assert.deepEqual(res.node, html, "node");
      assert.strictEqual(res.localName, "html", "localName");
      assert.strictEqual(res.namespaceURI, "http://www.w3.org/1999/xhtml",
                         "namespace");
    });
  });

  describe("get xmlns prefixed namespace", () => {
    const func = cjs.getXmlnsPrefixedNamespace;

    it("should get null", () => {
      const res = func();
      assert.isNull(res, "result");
    });

    it("should get null", () => {
      const body = document.querySelector("body");
      const res = func(body);
      assert.isNull(res, "result");
    });

    it("should get result", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const text =
        document.createElementNS("http://www.w3.org/2000/svg", "text");
      const html = document.querySelector("html");
      const body = document.querySelector("body");
      html.setAttribute("xmlns", "http://www.w3.org/2000/xmlns");
      svg.setAttribute("xmlns:html", "http://www.w3.org/1999/xhtml");
      text.setAttribute("html:data-foo", "bar");
      svg.appendChild(text);
      body.appendChild(svg);
      const res = func(text, "html");
      assert.strictEqual(res, "http://www.w3.org/1999/xhtml", "result");
    });

    it("should get result", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const text =
        document.createElementNS("http://www.w3.org/2000/svg", "text");
      const html = document.querySelector("html");
      const body = document.querySelector("body");
      html.setAttribute("xmlns", "http://www.w3.org/2000/xmlns");
      text.setAttribute("xmlns:html", "http://www.w3.org/1999/xhtml");
      text.setAttribute("html:data-foo", "bar");
      svg.appendChild(text);
      body.appendChild(svg);
      const res = func(text, "html");
      assert.strictEqual(res, "http://www.w3.org/1999/xhtml", "result");
    });
  });

  describe("set namespaced attribute", () => {
    const func = cjs.setAttributeNS;

    it("should not set attributes", async () => {
      const elm = document.createElement("p");
      const elm2 = document.createElement("p");
      elm2.setAttribute("data-foo", "bar");
      func(elm);
      assert.isFalse(elm.hasAttribute("data-foo", "attr"));
    });

    it("should not set attributes", async () => {
      const elm = document.createElement("p");
      const elm2 = document.createElement("p");
      elm2.setAttribute("data-foo", "bar");
      func(null, elm2);
      assert.isFalse(elm.hasAttribute("data-foo", "attr"));
    });

    it("should set attributes", async () => {
      const elm = document.createElement("p");
      const elm2 = document.createElement("p");
      const body = document.querySelector("body");
      elm2.setAttribute("data-foo", "bar");
      elm2.setAttribute("onclick", "return false");
      body.appendChild(elm2);
      func(elm, elm2);
      assert.isTrue(elm.hasAttribute("data-foo"), "attr");
      assert.isFalse(elm.hasAttribute("onclick"), "func");
      assert.strictEqual(elm.attributes.length, elm2.attributes.length - 1,
                         "length");
    });

    it("should set attributes", async () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const svg2 =
        document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const html = document.querySelector("html");
      const body = document.querySelector("body");
      html.setAttribute("xmlns", "http://www.w3.org/2000/xmlns/");
      svg2.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:html",
                          "http://www.w3.org/1999/xhtml");
      svg2.setAttributeNS("http://www.w3.org/1999/xhtml", "html:data-foo",
                          "bar");
      body.appendChild(svg2);
      func(svg, svg2);
      assert.isTrue(svg.hasAttribute("xmlns:html"), "attr");
      assert.isTrue(svg.hasAttribute("html:data-foo"), "attr");
      assert.strictEqual(svg.attributes.length, svg2.attributes.length,
                         "length");
    });
  });

  describe("create namespaced element", () => {
    const func = cjs.createElement;

    it("should get null", () => {
      const res = func();
      assert.isNull(res, "result");
    });

    it("should get result", () => {
      const elm = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(elm);
      const res = func(elm);
      assert.strictEqual(res.nodeType, Node.ELEMENT_NODE, "nodeType");
      assert.strictEqual(res.localName, "p", "localName");
    });

    it("should get result", () => {
      const elm =
        document.createElementNS("http://www.w3.org/1999/xhtml", "html:div");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const html = document.querySelector("html");
      const body = document.querySelector("body");
      html.setAttribute("xmlns", "http://www.w3.org/2000/xmlns");
      svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:html",
                         "http://www.w3.org/1999/xhtml");
      elm.setAttribute("data-foo", "bar");
      svg.appendChild(elm);
      body.appendChild(svg);
      const res = func(elm);
      assert.strictEqual(res.nodeType, Node.ELEMENT_NODE, "nodeType");
      assert.strictEqual(res.localName, "div", "localName");
      assert.isTrue(res.hasAttribute("data-foo"), "attr");
    });
  });

  describe("create document fragment from nodes array", () => {
    const func = cjs.createFragment;

    it("should get document fragment", () => {
      const res = func();
      assert.strictEqual(res.nodeType, Node.DOCUMENT_FRAGMENT_NODE, "nodeType");
      assert.isFalse(res.hasChildNodes(), "hasChildNodes");
    });

    it("should get document fragment", () => {
      const arr = [];
      arr.push(
        document.createTextNode("\n"),
        document.createComment("foo"),
        document.createElement("p"),
      );
      const res = func(arr);
      assert.strictEqual(res.nodeType, Node.DOCUMENT_FRAGMENT_NODE, "nodeType");
      assert.strictEqual(res.childNodes.length, 2, "childNodes");
      assert.strictEqual(res.childNodes[0].nodeType, Node.TEXT_NODE,
                         "nodeType");
      assert.strictEqual(res.childNodes[1].nodeType, Node.ELEMENT_NODE,
                         "nodeType");
    });
  });

  describe("append child nodes", () => {
    const func = cjs.appendChildNodes;

    it("should get element", () => {
      const elm = document.createElement("p");
      const elm2 = document.createElement("div");
      const res = func(elm, elm2);
      assert.strictEqual(res.localName, "p", "localName");
      assert.isFalse(res.hasChildNodes(), "child");
    });

    it("should get element", () => {
      const elm = document.createElement("p");
      const elm2 = document.createElement("div");
      elm2.textContent = "foo";
      const res = func(elm, elm2);
      assert.strictEqual(res.localName, "p", "localName");
      assert.isTrue(res.hasChildNodes(), "child");
      assert.strictEqual(res.childNodes.length, 1, "length");
    });

    it("should get element", () => {
      const elm = document.createElement("p");
      const elm2 = document.createElement("div");
      elm2.appendChild(document.createComment("foo"));
      const res = func(elm, elm2);
      assert.strictEqual(res.localName, "p", "localName");
      assert.isFalse(res.hasChildNodes(), "child");
    });

    it("should get element", () => {
      const elm = document.createElement("p");
      const elm2 = document.createElement("div");
      const elm3 = document.createElement("span");
      const elm4 = document.createElement("span");
      elm3.textContent = "foo";
      elm2.appendChild(elm3);
      elm2.appendChild(document.createTextNode("bar"));
      elm4.textContent = "baz";
      elm2.appendChild(elm4);
      const res = func(elm, elm2);
      assert.strictEqual(res.localName, "p", "localName");
      assert.isTrue(res.hasChildNodes(), "child");
      assert.strictEqual(res.childNodes.length, 5, "length");
    });
  });

  describe("create DOM of MathML / SVG", () => {
    const func = cjs.createXmlBasedDom;

    it("should get null", () => {
      const res = func();
      assert.isNull(res, "result");
    });

    it("should get null", () => {
      const elm = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(elm);
      const res = func(elm);
      assert.isNull(res, "result");
    });

    it("should get result", () => {
      const elm = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const body = document.querySelector("body");
      body.appendChild(elm);
      const res = func(elm);
      assert.strictEqual(res, "<svg xmlns=\"http://www.w3.org/2000/svg\"/>\n",
                         "result");
    });
  });

  describe("create range array", () => {
    const func = cjs.createRangeArr;

    it("should get empty array", () => {
      const res = func();
      assert.deepEqual(res, [], "result");
    });

    it("should get array", () => {
      const range = document.createRange();
      const elm = document.createElement("p");
      const body = document.querySelector("body");
      const text = document.createTextNode("foo");
      elm.appendChild(text);
      body.appendChild(elm);
      range.selectNode(elm);
      const res = func(range);
      assert.strictEqual(res.length, 2, "length");
      assert.strictEqual(res[0].localName, "body", "element");
      assert.strictEqual(res[1].nodeValue, "\n", "value");
    });

    it("should get array", () => {
      const range = document.createRange();
      const elm = document.createElement("p");
      const body = document.querySelector("body");
      const text = document.createTextNode("foo");
      elm.appendChild(text);
      body.appendChild(elm);
      range.selectNode(text);
      const res = func(range);
      assert.strictEqual(res.length, 2, "length");
      assert.strictEqual(res[0].localName, "p", "element");
      assert.strictEqual(res[1].nodeValue, "\n", "value");
    });

    it("should get array", () => {
      const range = document.createRange();
      const elm = document.createElement("p");
      const body = document.querySelector("body");
      const text = document.createTextNode("foo");
      elm.appendChild(text);
      body.appendChild(elm);
      range.selectNode(elm);
      const res = func(range);
      assert.strictEqual(res.length, 2, "length");
      assert.strictEqual(res[0].localName, "body", "element");
      assert.strictEqual(res[1].nodeValue, "\n", "value");
    });

    it("should get array", () => {
      const range = document.createRange();
      const elm = document.createElement("p");
      const body = document.querySelector("body");
      const text = document.createTextNode("foo");
      elm.appendChild(text);
      body.appendChild(elm);
      range.selectNode(text);
      const res = func(range);
      assert.strictEqual(res.length, 2, "length");
      assert.strictEqual(res[0].localName, "p", "element");
      assert.strictEqual(res[1].nodeValue, "\n", "value");
    });

    it("should get array", () => {
      const range = document.createRange();
      const elm = document.createElement("p");
      const elm2 = document.createElement("p");
      const body = document.querySelector("body");
      elm.textContent = "foo";
      elm2.textContent = "bar";
      body.appendChild(elm);
      body.appendChild(elm2);
      range.setStart(elm, 1);
      range.setEnd(elm2, 1);
      const res = func(range);
      assert.strictEqual(res.length, 2, "length");
      assert.strictEqual(res[0].localName, "body", "element");
      assert.strictEqual(res[1].nodeValue, "\n", "value");
    });

    it("should get array", () => {
      const range = document.createRange();
      const elm = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const body = document.querySelector("body");
      const text = document.createTextNode("foo");
      elm.appendChild(text);
      body.appendChild(elm);
      range.selectNode(elm);
      const res = func(range);
      assert.strictEqual(res.length, 2, "length");
      assert.strictEqual(res[0].localName, "body", "element");
      assert.strictEqual(res[1].nodeValue, "\n", "value");
    });

    it("should get array", () => {
      const range = document.createRange();
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const elm =
        document.createElementNS("http://www.w3.org/2000/svg", "text");
      const body = document.querySelector("body");
      const text = document.createTextNode("foo");
      elm.appendChild(text);
      svg.appendChild(elm);
      body.appendChild(svg);
      range.selectNode(elm);
      const res = func(range);
      assert.strictEqual(res.length, 2, "length");
      assert.strictEqual(res[0].localName, "svg", "element");
      assert.strictEqual(res[1].nodeValue, "\n", "value");
    });

    it("should get array", () => {
      const range = document.createRange();
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const elm =
        document.createElementNS("http://www.w3.org/2000/svg", "text");
      elm.textContent = "foo";
      svg.appendChild(elm);
      range.selectNode(elm);
      const res = func(range);
      assert.isNull(res, "result");
    });

    it("should get array", () => {
      const range = document.createRange();
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const elm = document.createElement("text");
      const text = document.createTextNode("foo");
      elm.appendChild(text);
      svg.appendChild(elm);
      range.selectNode(text);
      const res = func(range);
      assert.strictEqual(res.length, 2, "length");
      assert.strictEqual(res[0].localName, "text", "element");
      assert.strictEqual(res[1].nodeValue, "\n", "value");
    });
  });

  describe("create DOM from selection range", () => {
    const func = cjs.createDomFromSelectionRange;

    it("should get null", () => {
      const res = func();
      assert.isNull(res, "result");
    });

    it("should get value", () => {
      const sel = window.getSelection();
      const range = document.createRange();
      const elm = document.createElement("p");
      const text = document.createTextNode("foo");
      const body = document.querySelector("body");
      elm.appendChild(text);
      body.appendChild(elm);
      range.selectNode(text);
      sel.removeAllRanges();
      sel.addRange(range);
      const res = func(sel);
      assert.strictEqual(res,
                         "<p xmlns=\"http://www.w3.org/1999/xhtml\">foo</p>\n",
                         "result");
    });
  });

  describe("get text", () => {
    const func = cjs.getText;

    it("should get empty string", () => {
      const res = func();
      assert.strictEqual(res, "", "result");
    });

    it("should get empty string", () => {
      const p = document.createElement("p");
      const span = document.createElement("span");
      const br = document.createElement("br");
      const body = document.querySelector("body");
      p.textContent = "foo";
      span.textContent = "bar";
      p.appendChild(br);
      p.appendChild(span);
      p.appendChild(document.createTextNode("  baz  qux"));
      body.appendChild(p);
      const res = func(document.querySelectorAll("p"));
      assert.strictEqual(res, "foo\n\nbar\nbaz  qux\n", "result");
    });
  });

  describe("get ancestor element ID", () => {
    const func = cjs.getAncestorId;

    it("should get null", () => {
      const res = func();
      assert.isNull(res, "result");
    });

    it("should get null", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(p);
      const res = func(p);
      assert.isNull(res, "result");
    });

    it("should get value", () => {
      const p = document.createElement("p");
      const span = document.createElement("span");
      const body = document.querySelector("body");
      p.appendChild(span);
      p.id = "foo";
      body.appendChild(p);
      const res = func(span);
      assert.strictEqual(res, "foo", "result");
    });
  });

  describe("node or ancestor is editable", () => {
    const func = cjs.isEditable;

    it("should get false", () => {
      const res = func();
      assert.isFalse(res, "result");
    });

    it("should get false", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(p);
      if (typeof p.isContentEditable !== "boolean") {
        p.isContentEditable = isContentEditable(p);
      }
      const res = func(p);
      assert.isFalse(p.isContentEditable, "prop");
      assert.isFalse(res, "result");
    });

    it("should get true", () => {
      const p = document.createElement("p");
      const span = document.createElement("span");
      const body = document.querySelector("body");
      p.setAttribute("contenteditable", "true");
      p.appendChild(span);
      body.appendChild(p);
      if (typeof p.isContentEditable !== "boolean") {
        p.isContentEditable = isContentEditable(p);
      }
      const res = func(span);
      assert.isTrue(p.isContentEditable, "prop");
      assert.isTrue(res, "result");
    });

    it("should get true", () => {
      const p = document.createElement("p");
      const span = document.createElement("span");
      const body = document.querySelector("body");
      p.setAttribute("contenteditable", "");
      p.appendChild(span);
      body.appendChild(p);
      if (typeof p.isContentEditable !== "boolean") {
        p.isContentEditable = isContentEditable(p);
      }
      const res = func(span);
      assert.isTrue(p.isContentEditable, "prop");
      assert.isTrue(res, "result");
    });

    it("should get false", () => {
      const p = document.createElement("p");
      const span = document.createElement("span");
      const body = document.querySelector("body");
      p.setAttribute("contenteditable", "false");
      p.appendChild(span);
      body.appendChild(p);
      if (typeof p.isContentEditable !== "boolean") {
        p.isContentEditable = isContentEditable(p);
      }
      const res = func(span);
      assert.isFalse(p.isContentEditable, "prop");
      assert.isFalse(res, "result");
    });

    it("should get false", () => {
      const p = document.createElement("p");
      const span = document.createElement("span");
      const body = document.querySelector("body");
      p.setAttribute("contenteditable", "foo");
      p.appendChild(span);
      body.appendChild(p);
      if (typeof p.isContentEditable !== "boolean") {
        p.isContentEditable = isContentEditable(p);
      }
      const res = func(span);
      assert.isFalse(p.isContentEditable, "prop");
      assert.isFalse(res, "result");
    });

    it("should get false", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const text =
        document.createElementNS("http://www.w3.org/2000/svg", "text");
      const body = document.querySelector("body");
      svg.setAttribute("contenteditable", "true");
      svg.appendChild(text);
      body.appendChild(svg);
      const res = func(text);
      assert.isUndefined(svg.isContentEditable, "prop");
      assert.isFalse(res, "result");
    });
  });

  describe("content is text node", () => {
    const func = cjs.isContentTextNode;

    it("should get false", () => {
      const res = func();
      assert.isFalse(res, "result");
    });

    it("should get true", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      p.textContent = "foo";
      p.setAttribute("contenteditable", "true");
      body.appendChild(p);
      if (typeof p.isContentEditable !== "boolean") {
        p.isContentEditable = isContentEditable(p);
      }
      const res = func(p);
      assert.isTrue(res, "result");
    });

    it("should get true", () => {
      const div = document.createElement("div");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const text =
        document.createElementNS("http://www.w3.org/2000/svg", "text");
      const body = document.querySelector("body");
      text.textContent = "foo";
      svg.appendChild(text);
      div.setAttribute("contenteditable", "true");
      div.appendChild(svg);
      body.appendChild(div);
      if (typeof div.isContentEditable !== "boolean") {
        div.isContentEditable = isContentEditable(div);
      }
      const res = func(text);
      assert.isTrue(res, "result");
    });

    it("should get false", () => {
      const div = document.createElement("div");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const text =
        document.createElementNS("http://www.w3.org/2000/svg", "text");
      const body = document.querySelector("body");
      text.textContent = "foo";
      svg.appendChild(text);
      div.setAttribute("contenteditable", "true");
      div.appendChild(svg);
      body.appendChild(div);
      if (typeof div.isContentEditable !== "boolean") {
        div.isContentEditable = isContentEditable(div);
      }
      const res = func(svg);
      assert.isFalse(res, "result");
    });
  });

  describe("is text edit control element", () => {
    const func = cjs.isEditControl;

    it("should get false", () => {
      const res = func();
      assert.isFalse(res, "result");
    });

    it("should get false", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(p);
      const res = func(p);
      assert.isFalse(res, "result");
    });

    it("should get true", () => {
      const elm = document.createElement("textarea");
      const body = document.querySelector("body");
      body.appendChild(elm);
      const res = func(elm);
      assert.isTrue(res, "result");
    });

    it("should get true", () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      body.appendChild(elm);
      const res = func(elm);
      assert.isTrue(res, "result");
    });

    it("should get true", () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      body.appendChild(elm);
      const types = ["email", "tel", "url", "search", "text", "foo"];
      for (const type of types) {
        elm.type = type;
        const res = func(elm);
        assert.isTrue(res, "result");
      }
    });

    it("should get false", () => {
      const elm = document.createElement("input");
      const body = document.querySelector("body");
      body.appendChild(elm);
      const types = ["password", "color"];
      for (const type of types) {
        elm.type = type;
        const res = func(elm);
        assert.isFalse(res, `result ${type}`);
      }
    });
  });

  describe("get editable element from ancestor", () => {
    const func = cjs.getEditableElm;

    it("should get null", () => {
      const res = func();
      assert.isNull(res, "result");
    });

    it("should get null", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(p);
      const res = func(p);
      assert.isNull(res, "result");
    });

    it("should get element", () => {
      const elm = document.createElement("textarea");
      const body = document.querySelector("body");
      body.appendChild(elm);
      const res = func(elm);
      assert.deepEqual(res, elm, "result");
    });

    it("should get element", () => {
      const p = document.createElement("p");
      const span = document.createElement("span");
      const body = document.querySelector("body");
      p.appendChild(span);
      p.setAttribute("contenteditable", "true");
      if (typeof p.isContentEditable !== "boolean") {
        p.isContentEditable = isContentEditable(p);
      }
      body.appendChild(p);
      const res = func(span);
      assert.deepEqual(res, p, "result");
    });
  });

  describe("post message", () => {
    const func = cjs.postMsg;
    beforeEach(() => {
      cjs.vars.port = mockPort({name: PORT_CONTENT});
    });
    afterEach(() => {
      cjs.vars.port = null;
    });

    it("should not call function", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      await func();
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i, "not called");
    });

    it("should call function", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      await func("foo");
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
    });
  });

  describe("request port connection", () => {
    const func = cjs.requestPortConnection;

    it("should call function", async () => {
      const msg = {
        [PORT_CONNECT]: {
          name: PORT_CONTENT,
        },
      };
      const i = browser.runtime.sendMessage.withArgs(msg).callCount;
      browser.runtime.sendMessage.withArgs(msg).resolves({});
      const res = await func();
      assert.strictEqual(browser.runtime.sendMessage.withArgs(msg).callCount,
                         i + 1, "called");
      assert.deepEqual(res, {}, "result");
    });
  });

  describe("get live edit key from class list", () => {
    const func = cjs.getLiveEditKeyFromClassList;
    beforeEach(() => {
      const editors = {
        foo: {
          className: "bar",
        },
      };
      const items = Object.entries(editors);
      for (const [key, value] of items) {
        cjs.liveEdit.set(key, value);
      }
    });
    afterEach(() => {
      cjs.liveEdit.clear();
    });

    it("should get null", () => {
      const res = func();
      assert.isNull(res, "result");
    });

    it("should get null", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      p.classList.add("bar");
      body.appendChild(p);
      cjs.liveEdit.clear();
      const res = func(p.classList);
      assert.isNull(res, "result");
    });

    it("should get null", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(p);
      const res = func(p.classList);
      assert.isNull(res, "result");
    });

    it("should get null", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      p.classList.add("baz");
      body.appendChild(p);
      const res = func(p.classList);
      assert.isNull(res, "result");
    });

    it("should get value", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      p.classList.add("bar");
      body.appendChild(p);
      const res = func(p.classList);
      assert.strictEqual(res, "foo", "result");
    });

    it("should get null", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      p.classList.add("baz");
      body.appendChild(p);
      const res = func(p.classList);
      assert.isNull(res, "result");
    });
  });

  describe("get live edit element from ancestor", () => {
    const func = cjs.getLiveEditElm;
    beforeEach(() => {
      const editors = {
        foo: {
          className: "bar",
        },
      };
      const items = Object.entries(editors);
      for (const [key, value] of items) {
        cjs.liveEdit.set(key, value);
      }
    });
    afterEach(() => {
      cjs.liveEdit.clear();
    });

    it("should get null", () => {
      const res = func();
      assert.isNull(res, "result");
    });

    it("should get null", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(p);
      const res = func(p);
      assert.isNull(res, "result");
    });

    it("should get null", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const body = document.querySelector("body");
      body.appendChild(svg);
      const res = func(svg);
      assert.isNull(res, "result");
    });

    it("should get element", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      p.classList.add("bar");
      body.appendChild(p);
      const res = func(p);
      assert.deepEqual(res, p, "result");
    });
  });

  describe("get live edit content", () => {
    const func = cjs.getLiveEditContent;
    beforeEach(() => {
      const editors = {
        foo: {
          getContent: ".bar",
        },
      };
      const items = Object.entries(editors);
      for (const [key, value] of items) {
        cjs.liveEdit.set(key, value);
      }
    });
    afterEach(() => {
      cjs.liveEdit.clear();
    });

    it("should get null", () => {
      const res = func();
      assert.isNull(res, "result");
    });

    it("should get null", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(p);
      const res = func(p);
      assert.isNull(res, "result");
    });

    it("should get null", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(p);
      const res = func(p, "foo");
      assert.isNull(res, "result");
    });

    it("should get null", () => {
      const p = document.createElement("p");
      const span = document.createElement("span");
      const span2 = document.createElement("span");
      const body = document.querySelector("body");
      span.classList.add("bar");
      span.textContent = "baz";
      span2.classList.add("bar");
      span2.textContent = "qux";
      p.appendChild(span);
      p.appendChild(span2);
      body.appendChild(p);
      const res = func(p, "foo");
      assert.strictEqual(res, "baz\nqux", "result");
    });
  });

  describe("set data ID", () => {
    const func = cjs.setDataId;
    beforeEach(() => {
      cjs.dataIds.clear();
    });
    afterEach(() => {
      cjs.dataIds.clear();
    });

    it("should throw", async () => {
      assert.throws(() => func(), "Expected String but got Undefined.");
    });

    it("should not set map", () => {
      const res = func("foo");
      assert.isFalse(cjs.dataIds.has("foo"), "not set");
      assert.isNull(res, "result");
    });

    it("should set map", () => {
      const res = func("foo", {
        bar: "baz",
      });
      assert.isTrue(cjs.dataIds.has("foo"), "set");
      assert.deepEqual(cjs.dataIds.get("foo"), {
        bar: "baz",
      }, "map");
      assert.instanceOf(res, Map, "result");
    });

    it("should set map", () => {
      cjs.dataIds.set("foo", {
        bar: "qux",
      });
      const res = func("foo", {
        bar: "baz",
      });
      assert.isTrue(cjs.dataIds.has("foo"), "set");
      assert.deepEqual(cjs.dataIds.get("foo"), {
        bar: "baz",
      }, "map");
      assert.instanceOf(res, Map, "result");
    });
  });

  describe("remove data ID", () => {
    const func = cjs.removeDataId;
    beforeEach(() => {
      cjs.dataIds.clear();
    });
    afterEach(() => {
      cjs.dataIds.clear();
    });

    it("should get false", () => {
      const res = func("foo");
      assert.isFalse(res, "result");
    });

    it("should get true", () => {
      cjs.dataIds.set("foo", "bar");
      const res = func("foo");
      assert.isTrue(res, "result");
    });
  });

  describe("get target element from data ID", () => {
    const func = cjs.getTargetElementFromDataId;
    beforeEach(() => {
      cjs.dataIds.clear();
    });
    afterEach(() => {
      cjs.dataIds.clear();
    });

    it("should throw", async () => {
      assert.throws(() => func(), "Expected String but got Undefined.");
    });

    it("should get null", () => {
      const p = document.createElement("p");
      p.id = "foo";
      const res = func(p.id);
      assert.isNull(res, "result");
    });

    it("should get element", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      p.id = "foo";
      body.appendChild(p);
      const res = func(p.id);
      assert.deepEqual(res, p, "result");
    });

    it("should get null", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(p);
      const dataId = "html_p_0";
      cjs.dataIds.set(dataId, {
        dataId,
        ancestorId: null,
        localName: "p",
        prefix: null,
        queryIndex: null,
      });
      const res = func(dataId);
      assert.isNull(res, "result");
    });

    it("should get element", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(p);
      const dataId = "html_p_0";
      cjs.dataIds.set(dataId, {
        dataId,
        ancestorId: null,
        localName: "p",
        prefix: null,
        queryIndex: 0,
      });
      const res = func(dataId);
      assert.deepEqual(res, p, "result");
    });

    it("should get element", () => {
      const p = document.createElement("p");
      const p2 = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(p);
      body.appendChild(p2);
      const dataId = "html_p_1";
      cjs.dataIds.set(dataId, {
        dataId,
        ancestorId: null,
        localName: "p",
        prefix: null,
        queryIndex: 1,
      });
      const res = func(dataId);
      assert.deepEqual(res, p2, "result");
    });

    it("should get element", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      body.id = "foo";
      body.appendChild(p);
      const dataId = "foo_p_0";
      cjs.dataIds.set(dataId, {
        ancestorId: "foo",
        dataId: "foo_p_0",
        localName: "p",
        prefix: null,
        queryIndex: 0,
      });
      const res = func(dataId);
      assert.deepEqual(res, p, "result");
    });

    it("should get element", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const fo =
        document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
      const p =
        document.createElementNS("http://www.w3.org/1999/xhtml", "html:p");
      const body = document.querySelector("body");
      svg.id = "foo";
      svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:html",
                         "http://www.w3.org/1999/xhtml");
      fo.appendChild(p);
      svg.appendChild(fo);
      body.appendChild(svg);
      const dataId = "foo_html:p_0";
      cjs.dataIds.set(dataId, {
        dataId,
        ancestorId: "foo",
        localName: "p",
        prefix: "html",
        queryIndex: 0,
      });
      const res = func(dataId);
      assert.deepEqual(res, p, "result");
    });

    it("should get element", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const fo =
        document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
      const p =
        document.createElementNS("http://www.w3.org/1999/xhtml", "html:p");
      const body = document.querySelector("body");
      svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:html",
                         "http://www.w3.org/1999/xhtml");
      fo.appendChild(p);
      svg.appendChild(fo);
      body.appendChild(svg);
      const dataId = "html_html:p_0";
      cjs.dataIds.set(dataId, {
        dataId,
        ancestorId: null,
        localName: "p",
        prefix: "html",
        queryIndex: 0,
      });
      const res = func(dataId);
      assert.deepEqual(res, p, "result");
    });
  });

  describe("create ID data", () => {
    const func = cjs.createIdData;

    it("should get null", () => {
      const res = func();
      assert.isNull(res, "result");
    });

    it("should get null", () => {
      const p = document.createElement("p");
      const res = func(p);
      assert.isNull(res, "result");
    });

    it("should get result", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(p);
      const res = func(p);
      assert.deepEqual(res, {
        ancestorId: null,
        dataId: "html_p_0",
        localName: "p",
        prefix: null,
        queryIndex: 0,
      }, "result");
    });

    it("should get result", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      body.id = "foo";
      body.appendChild(p);
      const res = func(p);
      assert.deepEqual(res, {
        ancestorId: "foo",
        dataId: "foo_p_0",
        localName: "p",
        prefix: null,
        queryIndex: 0,
      }, "result");
    });

    it("should get result", () => {
      const p = document.createElement("p");
      const p2 = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(p);
      body.appendChild(p2);
      const res = func(p2);
      assert.deepEqual(res, {
        ancestorId: null,
        dataId: "html_p_1",
        localName: "p",
        prefix: null,
        queryIndex: 1,
      }, "result");
    });

    it("should get result", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      p.id = "foo";
      body.appendChild(p);
      const res = func(p);
      assert.deepEqual(res, {
        dataId: "foo",
      }, "result");
    });

    it("should get value", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const fo =
        document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
      const p =
        document.createElementNS("http://www.w3.org/1999/xhtml", "html:p");
      const body = document.querySelector("body");
      svg.id = "foo";
      svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:html",
                         "http://www.w3.org/1999/xhtml");
      fo.appendChild(p);
      svg.appendChild(fo);
      body.appendChild(svg);
      const res = func(p);
      assert.deepEqual(res, {
        ancestorId: "foo",
        dataId: "foo_html:p_0",
        localName: "p",
        prefix: "html",
        queryIndex: 0,
      }, "result");
    });

    it("should get value", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const fo =
        document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
      const p =
        document.createElementNS("http://www.w3.org/1999/xhtml", "html:p");
      const body = document.querySelector("body");
      svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:html",
                         "http://www.w3.org/1999/xhtml");
      fo.appendChild(p);
      svg.appendChild(fo);
      body.appendChild(svg);
      const res = func(p);
      assert.deepEqual(res, {
        ancestorId: null,
        dataId: "html_html:p_0",
        localName: "p",
        prefix: "html",
        queryIndex: 0,
      }, "result");
    });
  });

  describe("set temporary file data", () => {
    const func = cjs.setTmpFileData;
    beforeEach(() => {
      cjs.dataIds.clear();
    });
    afterEach(() => {
      cjs.dataIds.clear();
    });

    it("should not set data", () => {
      const res = func();
      assert.strictEqual(cjs.dataIds.size, 0, "size");
      assert.isNull(res, "result");
    });

    it("should set data", () => {
      const res = func({
        [TMP_FILE_CREATE]: {
          dataId: "foo",
          mode: MODE_EDIT,
        },
      });
      assert.strictEqual(cjs.dataIds.size, 1, "size");
      assert.isTrue(cjs.dataIds.has("foo"), "set");
      assert.instanceOf(res, Map, "result");
    });

    it("should not set data", () => {
      const res = func({
        [TMP_FILE_CREATE]: {
          dataId: "foo",
          mode: MODE_SOURCE,
        },
      });
      assert.strictEqual(cjs.dataIds.size, 0, "size");
      assert.isNull(res, "result");
    });
  });

  describe("update temporary file data", () => {
    const func = cjs.updateTmpFileData;
    beforeEach(() => {
      cjs.dataIds.clear();
    });
    afterEach(() => {
      cjs.dataIds.clear();
    });

    it("should not set data", () => {
      const res = func();
      assert.strictEqual(cjs.dataIds.size, 0, "size");
      assert.isNull(res, "result");
    });

    it("should set data", () => {
      const res = func({
        data: {
          dataId: "foo",
          mode: MODE_EDIT,
        },
      });
      assert.strictEqual(cjs.dataIds.size, 1, "size");
      assert.isTrue(cjs.dataIds.has("foo"), "set");
      assert.instanceOf(res, Map, "result");
    });

    it("should not set data", () => {
      const res = func({
        data: {
          dataId: "foo",
          mode: MODE_SOURCE,
        },
      });
      assert.strictEqual(cjs.dataIds.size, 0, "size");
      assert.isNull(res, "result");
    });
  });

  describe("remove temporary file data", () => {
    const func = cjs.removeTmpFileData;
    beforeEach(() => {
      cjs.dataIds.clear();
      cjs.vars[ID_TAB] = "1";
    });
    afterEach(() => {
      cjs.dataIds.clear();
      cjs.vars[ID_TAB] = "";
    });

    it("should not remove data", () => {
      cjs.dataIds.set("foo", "bar");
      const res = func();
      assert.strictEqual(cjs.dataIds.size, 1, "size");
      assert.isTrue(cjs.dataIds.has("foo"), "map");
      assert.isNull(res, "result");
    });

    it("should remove data", () => {
      cjs.dataIds.set("foo", "bar");
      const res = func({
        data: {
          dataId: "foo",
          tabId: "1",
          timestamp: FILE_NOT_FOUND_TIMESTAMP,
        },
      });
      assert.strictEqual(cjs.dataIds.size, 0, "size");
      assert.isTrue(res, "result");
    });

    it("should not remove data", () => {
      cjs.dataIds.set("foo", "bar");
      const res = func({
        data: {
          dataId: "foo",
          tabId: "1",
          timestamp: FILE_NOT_FOUND_TIMESTAMP + 1,
        },
      });
      assert.strictEqual(cjs.dataIds.size, 1, "size");
      assert.isTrue(cjs.dataIds.has("foo"), "map");
      assert.isNull(res, "result");
    });
  });

  describe("fetch file source and create temporary file data", () => {
    const func = cjs.fetchSource;

    it("should get null", async () => {
      const res = await func();
      assert.isNull(res, "result");
    });

    it("should get object", async () => {
      global.fetch.resolves({
        headers: {
          get: sinon.stub().returns(""),
        },
        text: sinon.stub().returns("foo"),
      });
      const res = await func({});
      assert.isTrue(res.hasOwnProperty("createTmpFile"), "prop");
      assert.isTrue(res.hasOwnProperty("value"), "prop");
      assert.strictEqual(res.value, "foo", "value");
    });

    it("should get object", async () => {
      const domstr = "<!DOCTYPE html><html><head></head><body></body></html>";
      const opt = {
        runScripts: "dangerously",
        url: "file:///foo/bar",
      };
      const dom = new JSDOM(domstr, opt);
      window = dom.window;
      document = window.document;
      global.window = window;
      global.document = document;
      const res = await func({});
      assert.deepEqual(res, {
        [LOCAL_FILE_VIEW]: {
          uri: "file:///foo/bar",
        },
      }, "result");
    });
  });

  describe("create temporary file data", () => {
    const func = cjs.createTmpFileData;

    it("should get null", async () => {
      global.fetch.resolves(undefined);
      const res = await func();
      assert.isNull(res, "result");
    });

    it("should get object", async () => {
      global.fetch.resolves({
        headers: {
          get: sinon.stub().returns(""),
        },
        text: sinon.stub().returns("foo"),
      });
      const res = await func({
        mode: MODE_SOURCE,
      });
      assert.isTrue(res.hasOwnProperty("createTmpFile"), "prop");
      assert.isTrue(res.hasOwnProperty("value"), "prop");
      assert.strictEqual(res.value, "foo", "value");
    });

    it("should get object", async () => {
      const res = await func({
        mode: MODE_EDIT,
        dataId: "foo",
        value: "bar",
      });
      assert.isTrue(res.hasOwnProperty("createTmpFile"), "prop");
      assert.strictEqual(res.createTmpFile.dataId, "foo", "value");
      assert.strictEqual(res.createTmpFile.extType, ".txt", "value");
      assert.isTrue(res.hasOwnProperty("value"), "prop");
      assert.strictEqual(res.value, "bar", "value");
    });

    it("should get object", async () => {
      global.fetch.resolves({
        headers: {
          get: sinon.stub().returns(""),
        },
        text: sinon.stub().returns("foo bar"),
      });
      const res = await func({
        mode: MODE_EDIT,
      });
      assert.isTrue(res.hasOwnProperty("createTmpFile"), "prop");
      assert.isTrue(res.hasOwnProperty("value"), "prop");
      assert.strictEqual(res.value, "foo bar", "value");
    });

    it("should get object", async () => {
      const res = await func({
        mode: MODE_MATHML,
        value: "bar",
      });
      assert.isTrue(res.hasOwnProperty("createTmpFile"), "prop");
      assert.strictEqual(res.createTmpFile.dataId, "index", "value");
      assert.strictEqual(res.createTmpFile.extType, ".mml", "value");
      assert.isTrue(res.hasOwnProperty("value"), "prop");
      assert.strictEqual(res.value, "bar", "value");
    });

    it("should get object", async () => {
      const res = await func({
        mode: MODE_SVG,
        value: "bar",
      });
      assert.isTrue(res.hasOwnProperty("createTmpFile"), "prop");
      assert.strictEqual(res.createTmpFile.dataId, "index", "value");
      assert.strictEqual(res.createTmpFile.extType, ".svg", "value");
      assert.isTrue(res.hasOwnProperty("value"), "prop");
      assert.strictEqual(res.value, "bar", "value");
    });

    it("should get object", async () => {
      global.fetch.resolves({
        headers: {
          get: sinon.stub().returns(""),
        },
        text: sinon.stub().returns("foo bar"),
      });
      const res = await func({
        mode: MODE_SVG,
      });
      assert.isTrue(res.hasOwnProperty("createTmpFile"), "prop");
      assert.isTrue(res.hasOwnProperty("value"), "prop");
      assert.strictEqual(res.value, "foo bar", "value");
    });

    it("should get object", async () => {
      const res = await func({
        mode: MODE_SELECTION,
        value: "bar",
      });
      assert.isTrue(res.hasOwnProperty("createTmpFile"), "prop");
      assert.strictEqual(res.createTmpFile.dataId, "index", "value");
      assert.strictEqual(res.createTmpFile.extType, ".xml", "value");
      assert.isTrue(res.hasOwnProperty("value"), "prop");
      assert.strictEqual(res.value, "bar", "value");
    });

    it("should get object", async () => {
      global.fetch.resolves({
        headers: {
          get: sinon.stub().returns(""),
        },
        text: sinon.stub().returns("foo bar"),
      });
      const res = await func({
        mode: MODE_SELECTION,
      });
      assert.isTrue(res.hasOwnProperty("createTmpFile"), "prop");
      assert.isTrue(res.hasOwnProperty("value"), "prop");
      assert.strictEqual(res.value, "foo bar", "value");
    });
  });

  describe("postEachDataId", () => {
    const func = cjs.postEachDataId;
    beforeEach(() => {
      cjs.vars.port = mockPort({name: PORT_CONTENT});
      cjs.dataIds.clear();
    });
    afterEach(() => {
      cjs.vars.port = null;
      cjs.dataIds.clear();
    });

    it("should not call function", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const res = await func();
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i, "not called");
      assert.deepEqual(res, [], "result");
    });

    it("should not call function", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const p = document.createElement("p");
      const p2 = document.createElement("p");
      const body = document.querySelector("body");
      p.id = "foo";
      p2.id = "bar";
      body.appendChild(p);
      body.appendChild(p2);
      cjs.dataIds.set("foo", {
        dataId: "foo",
      });
      cjs.dataIds.set("bar", {
        dataId: "bar",
      });
      const res = await func(true);
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 2, "called");
      assert.deepEqual(res, [undefined, undefined], "result");
    });
  });

  describe("post temporary file data", () => {
    const func = cjs.postTmpFileData;
    beforeEach(() => {
      cjs.vars.port = mockPort({name: PORT_CONTENT});
      cjs.dataIds.clear();
    });
    afterEach(() => {
      cjs.vars.port = null;
      cjs.dataIds.clear();
    });

    it("should not call function", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const res = await func();
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i, "not called");
      assert.isNull(res, "result");
    });

    it("should not call function", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      cjs.dataIds.set("foo", "bar");
      const res = await func("foo");
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.isUndefined(res, "result");
    });
  });

  describe("request temporary file", () => {
    const func = cjs.requestTmpFile;
    beforeEach(() => {
      cjs.vars.port = mockPort({name: PORT_CONTENT});
      cjs.dataIds.clear();
      cjs.liveEdit.clear();
    });
    afterEach(() => {
      cjs.vars.port = null;
      cjs.dataIds.clear();
      cjs.liveEdit.clear();
    });

    it("should not post message", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const p = document.createElement("p");
      const res = await func({
        currentTarget: p,
        target: p,
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i, "not called");
      assert.deepEqual(res, [], "result");
    });

    it("should not post message", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const p = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(p);
      const res = await func({
        currentTarget: p,
        target: p,
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i, "not called");
      assert.deepEqual(res, [], "result");
    });

    it("should post message", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const p = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(p);
      cjs.dataIds.set("html_p_0", {});
      const res = await func({
        currentTarget: p,
        target: p,
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.deepEqual(res, [undefined], "result");
    });

    it("should post message", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const p = document.createElement("p");
      const p2 = document.createElement("p");
      const p3 = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(p);
      body.appendChild(p2);
      body.appendChild(p3);
      cjs.dataIds.set("html_p_0", {
        controls: ["html_p_1", "html_p_2"],
      });
      cjs.dataIds.set("html_p_1", {});
      const res = await func({
        currentTarget: p,
        target: p,
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.deepEqual(res, [undefined], "result");
    });

    it("should not post message", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const p = document.createElement("p");
      const textarea = document.createElement("textarea");
      const body = document.querySelector("body");
      p.appendChild(textarea);
      body.appendChild(p);
      const res = await func({
        currentTarget: p,
        target: textarea,
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i, "not called");
      assert.deepEqual(res, [], "result");
    });

    it("should not post message", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const p = document.createElement("p");
      const textarea = document.createElement("textarea");
      const body = document.querySelector("body");
      p.classList.add("foo");
      p.appendChild(textarea);
      body.appendChild(p);
      cjs.dataIds.set("html_p_0", {});
      cjs.liveEdit.set("foo", {});
      const res = await func({
        currentTarget: p,
        target: textarea,
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i, "not called");
      assert.deepEqual(res, [], "result");
    });

    it("should post message", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const p = document.createElement("p");
      const textarea = document.createElement("textarea");
      const body = document.querySelector("body");
      p.classList.add("foo");
      p.appendChild(textarea);
      body.appendChild(p);
      cjs.dataIds.set("html_p_0", {});
      cjs.liveEdit.set("foo", {
        className: "foo",
        setContent: ".foo > textarea",
      });
      const res = await func({
        currentTarget: p,
        target: textarea,
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.deepEqual(res, [undefined], "result");
    });

    it("should post message", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const p = document.createElement("p");
      const textarea0 = document.createElement("textarea");
      const textarea = document.createElement("textarea");
      const body = document.querySelector("body");
      p.classList.add("foo");
      p.appendChild(textarea0);
      p.appendChild(textarea);
      body.appendChild(p);
      cjs.dataIds.set("html_p_0", {});
      cjs.liveEdit.set("foo", {
        className: "foo",
        setContent: ".foo > textarea",
      });
      const res = await func({
        currentTarget: p,
        target: textarea,
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.deepEqual(res, [undefined], "result");
    });
  });

  describe("set data ID controller", () => {
    const func = cjs.setDataIdController;
    beforeEach(() => {
      cjs.dataIds.clear();
    });
    afterEach(() => {
      cjs.dataIds.clear();
    });

    it("should not set data", () => {
      func();
      assert.strictEqual(cjs.dataIds.size, 0, "size");
    });

    it("should not set data", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(p);
      func(p, "foo");
      assert.strictEqual(cjs.dataIds.size, 0, "size");
    });

    it("should not set data", () => {
      const span = document.createElement("span");
      const p = document.createElement("p");
      const div = document.createElement("div");
      p.appendChild(span);
      p.setAttribute("contenteditable", "true");
      if (typeof p.isContentEditable !== "boolean") {
        p.isContentEditable = isContentEditable(p);
      }
      div.appendChild(p);
      func(span, "foo");
      assert.strictEqual(cjs.dataIds.size, 0, "size");
    });

    it("should set data", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      p.setAttribute("contenteditable", "true");
      if (typeof p.isContentEditable !== "boolean") {
        p.isContentEditable = isContentEditable(p);
      }
      body.appendChild(p);
      func(p, "foo");
      assert.strictEqual(cjs.dataIds.size, 2, "size");
      assert.isTrue(cjs.dataIds.has("html_p_0"), "map");
      assert.deepEqual(cjs.dataIds.get("html_p_0").controls, ["foo"],
                       "controls");
      assert.isTrue(cjs.dataIds.has("foo"), "map");
      assert.strictEqual(cjs.dataIds.get("foo").controlledBy, "html_p_0",
                         "controlled by");
    });

    it("should set data", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      p.setAttribute("contenteditable", "true");
      if (typeof p.isContentEditable !== "boolean") {
        p.isContentEditable = isContentEditable(p);
      }
      body.appendChild(p);
      cjs.dataIds.set("html_p_0", {
        controls: ["bar"],
      });
      func(p, "foo");
      assert.strictEqual(cjs.dataIds.size, 2, "size");
      assert.isTrue(cjs.dataIds.has("html_p_0"), "map");
      assert.deepEqual(cjs.dataIds.get("html_p_0").controls, ["bar", "foo"],
                       "controls");
      assert.isTrue(cjs.dataIds.has("foo"), "map");
      assert.strictEqual(cjs.dataIds.get("foo").controlledBy, "html_p_0",
                         "controlled by");
    });

    it("should set data", () => {
      const p = document.createElement("p");
      const body = document.querySelector("body");
      p.setAttribute("contenteditable", "true");
      if (typeof p.isContentEditable !== "boolean") {
        p.isContentEditable = isContentEditable(p);
      }
      body.appendChild(p);
      cjs.dataIds.set("html_p_0", {});
      func(p, "foo");
      assert.strictEqual(cjs.dataIds.size, 2, "size");
      assert.isTrue(cjs.dataIds.has("html_p_0"), "map");
      assert.deepEqual(cjs.dataIds.get("html_p_0").controls, ["foo"],
                       "controls");
      assert.isTrue(cjs.dataIds.has("foo"), "map");
      assert.strictEqual(cjs.dataIds.get("foo").controlledBy, "html_p_0",
                         "controlled by");
    });
  });

  describe("create content data", () => {
    const func = cjs.createContentData;
    beforeEach(() => {
      cjs.dataIds.clear();
      cjs.liveEdit.clear();
      cjs.vars.enableSyncAuto = false;
      cjs.vars.incognito = false;
      cjs.vars.syncAutoUrls = null;
    });
    afterEach(() => {
      cjs.dataIds.clear();
      cjs.liveEdit.clear();
      cjs.vars.enableSyncAuto = false;
      cjs.vars.incognito = false;
      cjs.vars.syncAutoUrls = null;
    });

    it("should get default object", async () => {
      const res = await func();
      assert.strictEqual(res.mode, MODE_SOURCE, "result");
    });

    it("should get default object", async () => {
      const body = document.querySelector("body");
      const res = await func(body, MODE_SOURCE);
      assert.strictEqual(res.mode, MODE_SOURCE, "result");
    });

    it("should get object", async () => {
      cjs.vars.incognito = true;
      const body = document.querySelector("body");
      const res = await func(body, MODE_SOURCE);
      assert.strictEqual(res.mode, MODE_SOURCE, "mode");
      assert.isTrue(res.incognito, "incognito");
      assert.strictEqual(res.dir, TMP_FILES_PB, "dir");
    });

    it("should get default object", async () => {
      const domstr = "<!DOCTYPE html><html><head></head><body></body></html>";
      const opt = {
        runScripts: "dangerously",
        url: "file:///foo/bar",
      };
      const dom = new JSDOM(domstr, opt);
      window = dom.window;
      document = window.document;
      global.window = window;
      global.document = document;
      const body = document.querySelector("body");
      const res = await func(body, MODE_SOURCE);
      assert.strictEqual(res.mode, MODE_SOURCE, "mode");
      assert.strictEqual(res.host, LABEL, "host");
    });

    it("should get default object", async () => {
      const textarea = document.createElement("textarea");
      const res = await func(textarea, MODE_EDIT);
      assert.strictEqual(res.mode, MODE_SOURCE, "result");
    });

    it("should get object", async () => {
      const textarea = document.createElement("textarea");
      const body = document.querySelector("body");
      body.appendChild(textarea);
      const res = await func(textarea, MODE_EDIT);
      assert.strictEqual(res.mode, MODE_EDIT, "mode");
      assert.strictEqual(res.dataId, "html_textarea_0", "data ID");
    });

    it("should get object", async () => {
      const textarea = document.createElement("textarea");
      const body = document.querySelector("body");
      body.appendChild(textarea);
      cjs.vars.enableSyncAuto = true;
      cjs.vars.syncAutoUrls = document.location.href;
      const res = await func(textarea, MODE_EDIT);
      assert.strictEqual(res.mode, MODE_EDIT, "mode");
      assert.strictEqual(res.dataId, "html_textarea_0", "data ID");
      assert.isTrue(res.syncAuto, "sync");
    });

    it("should get object", async () => {
      cjs.liveEdit.set("foo", {
        className: "foo",
        getContent: ".bar",
      });
      const p = document.createElement("p");
      const span = document.createElement("span");
      const span2 = document.createElement("span");
      const body = document.querySelector("body");
      span.textContent = "baz qux";
      span.classList.add("bar");
      span2.textContent = "quux";
      span2.classList.add("bar");
      p.id = "foobar";
      p.classList.add("foo");
      if (typeof p.isContentEditable !== "boolean") {
        p.isContentEditable = isContentEditable(p);
      }
      p.appendChild(span);
      p.appendChild(span2);
      body.appendChild(p);
      const res = await func(p, MODE_EDIT);
      assert.strictEqual(res.mode, MODE_EDIT, "mode");
      assert.strictEqual(res.dataId, "foobar", "dataId");
      assert.strictEqual(res.value, "baz qux\nquux", "value");
      assert.strictEqual(res.liveEditKey, "foo", "key");
    });

    it("should get object", async () => {
      cjs.liveEdit.set("foo", {
        className: "foo",
        getContent: ".bar",
      });
      const p = document.createElement("p");
      const span = document.createElement("span");
      const body = document.querySelector("body");
      span.classList.add("bar");
      p.id = "foobar";
      p.classList.add("foo");
      if (typeof p.isContentEditable !== "boolean") {
        p.isContentEditable = isContentEditable(p);
      }
      p.appendChild(span);
      body.appendChild(p);
      const res = await func(p, MODE_EDIT);
      assert.strictEqual(res.mode, MODE_EDIT, "mode");
      assert.strictEqual(res.dataId, "foobar", "dataId");
      assert.strictEqual(res.value, "", "value");
      assert.strictEqual(res.liveEditKey, "foo", "key");
    });

    it("should get object", async () => {
      const div = document.createElement("div");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const text =
        document.createElementNS("http://www.w3.org/2000/svg", "text");
      const body = document.querySelector("body");
      text.textContent = "foo";
      svg.appendChild(text);
      div.setAttribute("contenteditable", "true");
      if (typeof div.isContentEditable === "boolean") {
        div.isContentEditable = isContentEditable(div);
      }
      div.appendChild(svg);
      body.appendChild(div);
      const res = await func(text, MODE_EDIT);
      assert.strictEqual(res.mode, MODE_EDIT, "mode");
      assert.strictEqual(res.dataId, "html_text_0", "dataId");
      assert.strictEqual(res.value, "foo\n", "value");
      assert.strictEqual(res.namespaceURI, "http://www.w3.org/2000/svg", "ns");
      assert.strictEqual(cjs.dataIds.size, 1, "size");
      assert.isTrue(cjs.dataIds.has("html_text_0"), "dataId");
    });

    it("should get object", async () => {
      const div = document.createElement("div");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const text =
        document.createElementNS("http://www.w3.org/2000/svg", "text");
      const body = document.querySelector("body");
      svg.appendChild(text);
      div.setAttribute("contenteditable", "true");
      if (typeof div.isContentEditable === "boolean") {
        div.isContentEditable = isContentEditable(div);
      }
      div.appendChild(svg);
      body.appendChild(div);
      const res = await func(text, MODE_EDIT);
      assert.strictEqual(res.mode, MODE_EDIT, "mode");
      assert.strictEqual(res.dataId, "html_text_0", "dataId");
      assert.strictEqual(res.value, "", "value");
      assert.strictEqual(res.namespaceURI, "http://www.w3.org/2000/svg", "ns");
      assert.strictEqual(cjs.dataIds.size, 1, "size");
      assert.isTrue(cjs.dataIds.has("html_text_0"), "dataId");
    });

    it("should get object", async () => {
      const sel = window.getSelection();
      const range = document.createRange();
      const div = document.createElement("div");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const text =
        document.createElementNS("http://www.w3.org/2000/svg", "text");
      const body = document.querySelector("body");
      text.textContent = "foo";
      svg.appendChild(text);
      div.setAttribute("contenteditable", "true");
      if (typeof div.isContentEditable === "boolean") {
        div.isContentEditable = isContentEditable(div);
      }
      div.appendChild(svg);
      body.appendChild(div);
      range.selectNodeContents(text);
      sel.removeAllRanges();
      sel.addRange(range);
      const res = await func(text, MODE_EDIT);
      assert.strictEqual(res.mode, MODE_EDIT, "mode");
      assert.strictEqual(res.dataId, "html_text_0", "dataId");
      assert.strictEqual(res.value, "foo\n", "value");
      assert.strictEqual(res.namespaceURI, "http://www.w3.org/2000/svg", "ns");
      assert.strictEqual(cjs.dataIds.size, 1, "size");
      assert.isTrue(cjs.dataIds.has("html_text_0"), "dataId");
    });

    it("should get default object", async () => {
      const body = document.querySelector("body");
      const res = await func(body, MODE_SVG);
      assert.strictEqual(res.mode, MODE_SOURCE, "result");
    });

    it("should get object", async () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const body = document.querySelector("body");
      body.appendChild(svg);
      const res = await func(svg, MODE_SVG);
      assert.strictEqual(res.mode, MODE_SVG, "mode");
      assert.strictEqual(res.value,
                         "<svg xmlns=\"http://www.w3.org/2000/svg\"/>\n",
                         "value");
    });

    it("should get default object", async () => {
      const body = document.querySelector("body");
      const res = await func(body, MODE_SELECTION);
      assert.strictEqual(res.mode, MODE_SOURCE, "result");
    });

    it("should get object", async () => {
      const sel = window.getSelection();
      const range = document.createRange();
      const elm = document.createElement("p");
      const text = document.createTextNode("foo");
      const body = document.querySelector("body");
      elm.appendChild(text);
      body.appendChild(elm);
      range.selectNode(text);
      sel.removeAllRanges();
      sel.addRange(range);
      const res = await func(body, MODE_SELECTION);
      assert.strictEqual(res.mode, MODE_SELECTION, "mode");
      assert.strictEqual(res.value,
                         "<p xmlns=\"http://www.w3.org/1999/xhtml\">foo</p>\n",
                         "value");
    });
  });

  describe("create content data message", () => {
    const func = cjs.createContentDataMsg;

    it("should get null", async () => {
      const res = await func();
      assert.isNull(res, "result");
    });

    it("should get null", async () => {
      const res = await func({
        foo: "bar",
      });
      assert.isNull(res, "result");
    });

    it("should get object", async () => {
      const res = await func({
        [TMP_FILE_CREATE]: {},
        value: "foo",
      });
      assert.deepEqual(res, {
        [TMP_FILE_CREATE]: {
          data: {},
          value: "foo",
        },
      }, "result");
    });

    it("should get object", async () => {
      const res = await func({
        [LOCAL_FILE_VIEW]: {
          uri: "file:///foo/bar",
        },
      });
      assert.deepEqual(res, {
        [LOCAL_FILE_VIEW]: "file:///foo/bar",
      }, "result");
    });
  });

  describe("post content data", () => {
    const func = cjs.postContent;
    beforeEach(() => {
      cjs.dataIds.clear();
      cjs.vars.port = mockPort({name: PORT_CONTENT});
    });
    afterEach(() => {
      cjs.dataIds.clear();
      cjs.vars.port = null;
    });

    it("should not call function", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const res = await func();
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i, "not called");
      assert.strictEqual(cjs.dataIds.size, 0, "data");
      assert.deepEqual(res, [], "result");
    });

    it("should call function", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const text = document.createElement("textarea");
      const body = document.querySelector("body");
      body.appendChild(text);
      const res = await func(text, MODE_EDIT);
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.strictEqual(cjs.dataIds.size, 1, "data");
      assert.isUndefined(res[0], "result");
      assert.instanceOf(res[1], Map, "map");
    });
  });

  describe("get context mode", () => {
    const func = cjs.getContextMode;

    it("should get result", () => {
      const res = func();
      assert.strictEqual(res, MODE_SOURCE, "result");
    });

    it("should get result", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const body = document.querySelector("body");
      body.appendChild(svg);
      const res = func(svg);
      assert.strictEqual(res, MODE_SVG, "result");
    });

    it("should get result", () => {
      const math =
        document.createElementNS("http://www.w3.org/1998/Math/MathML", "math");
      const body = document.querySelector("body");
      body.appendChild(math);
      const res = func(math);
      assert.strictEqual(res, MODE_MATHML, "result");
    });

    it("should get result", () => {
      const sel = window.getSelection();
      const range = document.createRange();
      const elm = document.createElement("p");
      const text = document.createTextNode("foo");
      const body = document.querySelector("body");
      elm.appendChild(text);
      body.appendChild(elm);
      range.selectNode(text);
      sel.removeAllRanges();
      sel.addRange(range);
      const res = func(elm);
      assert.strictEqual(res, MODE_SELECTION, "result");
    });

    it("should get result", () => {
      const sel = window.getSelection();
      const range = document.createRange();
      const elm = document.createElement("p");
      const text = document.createTextNode("foo");
      const body = document.querySelector("body");
      elm.appendChild(text);
      body.appendChild(elm);
      range.setStart(elm, 0);
      range.setEnd(text, 1);
      sel.removeAllRanges();
      sel.addRange(range);
      const res = func(elm);
      assert.strictEqual(res, MODE_SELECTION, "result");
    });

    it("should get result", () => {
      const sel = window.getSelection();
      const range = document.createRange();
      const elm = document.createElement("p");
      const text = document.createTextNode("foo");
      const body = document.querySelector("body");
      elm.appendChild(text);
      body.appendChild(elm);
      range.setStart(text, 0);
      range.setEnd(text, 1);
      sel.removeAllRanges();
      sel.addRange(range);
      const res = func(elm);
      assert.strictEqual(res, MODE_SELECTION, "result");
    });

    it("should get result", () => {
      const sel = window.getSelection();
      const range = document.createRange();
      const elm = document.createElement("p");
      const text = document.createTextNode("foo");
      const body = document.querySelector("body");
      elm.setAttribute("contenteditable", "true");
      if (typeof elm.isContentEditable !== "boolean") {
        elm.isContentEditable = isContentEditable(elm);
      }
      elm.appendChild(text);
      body.appendChild(elm);
      range.selectNode(text);
      sel.removeAllRanges();
      sel.addRange(range);
      const res = func(elm);
      assert.strictEqual(res, MODE_EDIT, "result");
    });
  });

  describe("determine content process", () => {
    const func = cjs.determineContentProcess;
    beforeEach(() => {
      cjs.vars[CONTEXT_NODE] = null;
      cjs.vars.port = mockPort({name: PORT_CONTENT});
    });
    afterEach(() => {
      cjs.vars[CONTEXT_NODE] = null;
      cjs.vars.port = null;
    });

    it("should call function", async () => {
      global.fetch.resolves({
        headers: {
          get: sinon.stub().returns(""),
        },
        text: sinon.stub().returns("foo bar"),
      });
      const i = cjs.vars.port.postMessage.callCount;
      const res = await func();
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.deepEqual(res, [
        undefined,
        null,
      ], "result");
    });

    it("should call function", async () => {
      global.fetch.resolves({
        headers: {
          get: sinon.stub().returns(""),
        },
        text: sinon.stub().returns("foo bar"),
      });
      const i = cjs.vars.port.postMessage.callCount;
      const p = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(p);
      cjs.vars[CONTEXT_NODE] = p;
      const res = await func();
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.deepEqual(res, [
        undefined,
        null,
      ], "result");
    });

    it("should call function", async () => {
      global.fetch.resolves({
        headers: {
          get: sinon.stub().returns(""),
        },
        text: sinon.stub().returns("foo bar"),
      });
      const i = cjs.vars.port.postMessage.callCount;
      const p = document.createElement("p");
      const body = document.querySelector("body");
      body.appendChild(p);
      cjs.vars[CONTEXT_NODE] = p;
      const res = await func({
        info: {
          menuItemId: MODE_SOURCE,
        },
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.deepEqual(res, [
        undefined,
        null,
      ], "result");
    });

    it("should call function", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const text = document.createElement("textarea");
      const body = document.querySelector("body");
      body.appendChild(text);
      cjs.vars[CONTEXT_NODE] = text;
      const res = await func({
        info: {
          menuItemId: MODE_EDIT,
        },
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.isUndefined(res[0], "result");
      assert.instanceOf(res[1], Map, "map");
    });
  });

  describe("create paragraphed content", () => {
    const func = cjs.createParagraphedContent;

    it("should get content", () => {
      const res = func();
      assert.strictEqual(res.nodeType, 11, "nodeType");
      assert.strictEqual(res.childNodes.length, 1, "length");
      assert.strictEqual(res.childNodes[0].nodeType, 3, "contentType");
      assert.strictEqual(res.childNodes[0].nodeValue, "\n", "value");
    });

    it("should get content", () => {
      const res = func("foo");
      assert.strictEqual(res.nodeType, 11, "nodeType");
      assert.strictEqual(res.childNodes.length, 1, "length");
      assert.strictEqual(res.childNodes[0].nodeType, 3, "contentType");
      assert.strictEqual(res.childNodes[0].nodeValue, "foo", "value");
    });

    it("should get content", () => {
      const res = func("foo\n");
      assert.strictEqual(res.nodeType, 11, "nodeType");
      assert.strictEqual(res.childNodes.length, 2, "length");
      assert.strictEqual(res.childNodes[0].nodeType, 1, "contentType");
      assert.strictEqual(res.childNodes[0].textContent, "foo", "value");
      assert.strictEqual(res.childNodes[1].nodeType, 3, "contentType");
      assert.strictEqual(res.childNodes[1].nodeValue, "\n", "value");
    });

    it("should get content", () => {
      const res = func("foo\nbar baz\n\nqux");
      assert.strictEqual(res.nodeType, 11, "nodeType");
      assert.strictEqual(res.childNodes.length, 7, "length");
      assert.strictEqual(res.childNodes[0].nodeType, 1, "contentType");
      assert.strictEqual(res.childNodes[0].textContent, "foo", "value");
      assert.strictEqual(res.childNodes[1].nodeType, 3, "contentType");
      assert.strictEqual(res.childNodes[1].nodeValue, "\n", "value");
      assert.strictEqual(res.childNodes[2].nodeType, 1, "contentType");
      assert.strictEqual(res.childNodes[2].textContent, "bar baz", "value");
      assert.strictEqual(res.childNodes[3].nodeType, 3, "contentType");
      assert.strictEqual(res.childNodes[3].nodeValue, "\n", "value");
      assert.strictEqual(res.childNodes[4].nodeType, 1, "contentType");
      assert.strictEqual(res.childNodes[4].firstChild.localName, "br", "value");
      assert.strictEqual(res.childNodes[5].nodeType, 3, "contentType");
      assert.strictEqual(res.childNodes[5].nodeValue, "\n", "value");
      assert.strictEqual(res.childNodes[6].nodeType, 1, "contentType");
      assert.strictEqual(res.childNodes[6].textContent, "qux", "value");
    });

    it("should get content", () => {
      const domstr = "<!DOCTYPE html><html><head></head><body></body></html>";
      const opt = {
        runScripts: "dangerously",
        url: "file:///foo/bar",
      };
      const dom = new JSDOM(domstr, opt);
      window = dom.window;
      document = window.document;
      if (typeof document.queryCommandValue !== "function") {
        document.queryCommandValue =
          sinon.stub().withArgs("defaultParagraphSeparator").returns(undefined);
      }
      global.window = window;
      global.document = document;
      const res = func("foo\nbar baz\n\nqux");
      assert.strictEqual(res.nodeType, 11, "nodeType");
      assert.strictEqual(res.childNodes.length, 10, "length");
      assert.strictEqual(res.childNodes[0].nodeType, 3, "contentType");
      assert.strictEqual(res.childNodes[0].nodeValue, "foo", "value");
      assert.strictEqual(res.childNodes[1].nodeType, 1, "contentType");
      assert.strictEqual(res.childNodes[1].localName, "br", "value");
      assert.strictEqual(res.childNodes[2].nodeType, 3, "contentType");
      assert.strictEqual(res.childNodes[2].nodeValue, "\n", "value");
      assert.strictEqual(res.childNodes[3].nodeType, 3, "contentType");
      assert.strictEqual(res.childNodes[3].textContent, "bar baz", "value");
      assert.strictEqual(res.childNodes[4].nodeType, 1, "contentType");
      assert.strictEqual(res.childNodes[4].localName, "br", "value");
      assert.strictEqual(res.childNodes[5].nodeType, 3, "contentType");
      assert.strictEqual(res.childNodes[5].nodeValue, "\n", "value");
      assert.strictEqual(res.childNodes[6].nodeType, 1, "contentType");
      assert.strictEqual(res.childNodes[6].localName, "br", "value");
      assert.strictEqual(res.childNodes[7].nodeType, 1, "contentType");
      assert.strictEqual(res.childNodes[7].localName, "br", "value");
      assert.strictEqual(res.childNodes[8].nodeType, 3, "contentType");
      assert.strictEqual(res.childNodes[8].nodeValue, "\n", "value");
      assert.strictEqual(res.childNodes[9].nodeType, 3, "contentType");
      assert.strictEqual(res.childNodes[9].nodeValue, "qux", "value");
    });

    it("should get content", () => {
      const res = func("foo\nbar baz\n\nqux", "http://www.w3.org/2000/svg");
      assert.strictEqual(res.nodeType, 11, "nodeType");
      assert.strictEqual(res.childNodes.length, 7, "length");
      assert.strictEqual(res.childNodes[0].nodeType, 3, "contentType");
      assert.strictEqual(res.childNodes[0].nodeValue, "foo", "value");
      assert.strictEqual(res.childNodes[1].nodeType, 3, "contentType");
      assert.strictEqual(res.childNodes[1].nodeValue, "\n", "value");
      assert.strictEqual(res.childNodes[2].nodeType, 3, "contentType");
      assert.strictEqual(res.childNodes[2].nodeValue, "bar baz", "value");
      assert.strictEqual(res.childNodes[3].nodeType, 3, "contentType");
      assert.strictEqual(res.childNodes[3].nodeValue, "\n", "value");
      assert.strictEqual(res.childNodes[4].nodeType, 3, "contentType");
      assert.strictEqual(res.childNodes[4].nodeValue, "", "value");
      assert.strictEqual(res.childNodes[5].nodeType, 3, "contentType");
      assert.strictEqual(res.childNodes[5].nodeValue, "\n", "value");
      assert.strictEqual(res.childNodes[6].nodeType, 3, "contentType");
      assert.strictEqual(res.childNodes[6].nodeValue, "qux", "value");
    });
  });

  describe("replace content of editable element", () => {
    const func = cjs.replaceContent;

    it("should not call function", () => {
      const p = document.createElement("p");
      const spy = sinon.spy(p, "dispatchEvent");
      const span = document.createElement("span");
      const body = document.querySelector("body");
      p.appendChild(span);
      body.appendChild(p);
      func(p, p);
      assert.isFalse(spy.called, "not called");
      assert.strictEqual(p.childNodes.length, 1, "length");
      assert.deepEqual(p.firstChild, span, "child");
    });

    it("should call function", () => {
      const p = document.createElement("p");
      const spy = sinon.spy(p, "dispatchEvent");
      const span = document.createElement("span");
      const body = document.querySelector("body");
      p.appendChild(span);
      body.appendChild(p);
      func(p, p, "foo");
      assert.isTrue(spy.called, "called");
      assert.strictEqual(p.childNodes.length, 1, "length");
      assert.strictEqual(p.firstChild.nodeType, 3, "child");
      assert.strictEqual(p.firstChild.nodeValue, "foo", "value");
    });

    it("should not call function", () => {
      const p = document.createElement("p");
      const spy = sinon.spy(p, "dispatchEvent");
      const span = document.createElement("span");
      const body = document.querySelector("body");
      span.textContent = "foo";
      p.appendChild(span);
      body.appendChild(p);
      func(p, p, "foo\n");
      assert.isFalse(spy.called, "called");
      assert.strictEqual(p.childNodes.length, 1, "length");
      assert.deepEqual(p.firstChild, span, "child");
    });

    it("should call function", () => {
      const p = document.createElement("p");
      const spy = sinon.spy(p, "dispatchEvent");
      const span = document.createElement("span");
      const body = document.querySelector("body");
      p.appendChild(span);
      body.appendChild(p);
      func(p, span, "foo");
      assert.isTrue(spy.called, "called");
      assert.strictEqual(span.childNodes.length, 1, "length");
      assert.strictEqual(span.firstChild.nodeType, 3, "child");
      assert.strictEqual(span.firstChild.nodeValue, "foo", "value");
    });
  });

  describe("replace text edit control element value", () => {
    const func = cjs.replaceEditControlValue;

    it("should not call function", () => {
      const elm = document.createElement("p");
      const spy = sinon.spy(elm, "dispatchEvent");
      const body = document.querySelector("body");
      body.appendChild(elm);
      func(elm, "foo");
      assert.isFalse(spy.called, "not called");
      assert.isUndefined(elm.value, "value");
    });

    it("should not call function", () => {
      const elm = document.createElement("input");
      const spy = sinon.spy(elm, "dispatchEvent");
      const body = document.querySelector("body");
      elm.value = "foo";
      body.appendChild(elm);
      func(elm);
      assert.isFalse(spy.called, "not called");
      assert.strictEqual(elm.value, "foo", "value");
    });

    it("should call function", () => {
      const elm = document.createElement("input");
      const spy = sinon.spy(elm, "dispatchEvent");
      const body = document.querySelector("body");
      elm.value = "foo";
      body.appendChild(elm);
      func(elm, "bar\n");
      assert.isTrue(spy.called, "called");
      assert.strictEqual(elm.value, "bar", "value");
    });

    it("should not call function", () => {
      const elm = document.createElement("input");
      const spy = sinon.spy(elm, "dispatchEvent");
      const body = document.querySelector("body");
      elm.value = "foo";
      body.appendChild(elm);
      func(elm, "foo\n");
      assert.isFalse(spy.called, "note called");
      assert.strictEqual(elm.value, "foo", "value");
    });

    it("should call function", () => {
      const elm = document.createElement("textarea");
      const spy = sinon.spy(elm, "dispatchEvent");
      const body = document.querySelector("body");
      elm.value = "foo\nbar baz\nqux";
      body.appendChild(elm);
      func(elm, "foo\nbar baz\nqux\n");
      assert.isTrue(spy.called, "called");
      assert.strictEqual(elm.value, "foo\nbar baz\nqux\n", "value");
    });
  });

  describe("replaceLiveEditContent", () => {
    const func = cjs.replaceLiveEditContent;
    beforeEach(() => {
      cjs.liveEdit.clear();
    });
    afterEach(() => {
      cjs.liveEdit.clear();
    });

    it("should not dispatch event", () => {
      const stub = sinon.stub();
      const body = document.querySelector("body");
      body.addEventListener("input", stub, true);
      func();
      assert.isFalse(stub.called, "not dispatched");
    });

    it("should replace content", () => {
      const stub = sinon.stub();
      const elm = document.createElement("div");
      const text = document.createElement("p");
      const body = document.querySelector("body");
      elm.classList.add("foo");
      elm.appendChild(text);
      body.addEventListener("input", stub, true);
      body.appendChild(elm);
      cjs.liveEdit.set("foo", {
        setContent: ".foo > textarea",
      });
      func(body, "bar baz", "foo");
      assert.isFalse(stub.called, "dispatched");
    });

    it("should replace content", () => {
      const stub = sinon.stub();
      const elm = document.createElement("div");
      const text = document.createElement("textarea");
      const body = document.querySelector("body");
      elm.classList.add("foo");
      elm.appendChild(text);
      body.addEventListener("input", stub, true);
      body.appendChild(elm);
      cjs.liveEdit.set("foo", {
        setContent: ".foo > textarea",
      });
      func(body, "bar baz", "foo");
      assert.isTrue(stub.called, "dispatched");
      assert.strictEqual(text.value, "bar baz", "content");
    });
  });

  describe("get target element and synchronize text", () => {
    const func = cjs.syncText;
    beforeEach(() => {
      cjs.dataIds.clear();
      cjs.liveEdit.clear();
      cjs.vars[ID_TAB] = null;
    });
    afterEach(() => {
      cjs.dataIds.clear();
      cjs.liveEdit.clear();
      cjs.vars[ID_TAB] = null;
    });

    it("should get empty array", async () => {
      const res = await func();
      assert.deepEqual(res, [], "result");
    });

    it("should get empty array", async () => {
      const res = await func({
        data: {},
        value: "foo",
      });
      assert.deepEqual(res, [], "result");
    });

    it("should get empty array", async () => {
      cjs.vars[ID_TAB] = "1";
      const res = await func({
        data: {
          dataId: "bar",
        },
        value: "foo",
      });
      assert.deepEqual(res, [], "result");
    });

    it("should get empty array", async () => {
      cjs.vars[ID_TAB] = "1";
      const res = await func({
        data: {
          dataId: "bar",
          tabId: "1",
        },
        value: "foo",
      });
      assert.deepEqual(res, [], "result");
    });

    it("should get empty array", async () => {
      const elm = document.createElement("textarea");
      const body = document.querySelector("body");
      elm.id = "bar";
      body.appendChild(elm);
      cjs.vars[ID_TAB] = "1";
      const res = await func({
        data: {
          dataId: "bar",
          tabId: "1",
          lastUpdate: 1,
        },
        value: "foo",
      });
      assert.deepEqual(res, [], "result");
    });

    it("should delete data ID", async () => {
      const elm = document.createElement("textarea");
      const body = document.querySelector("body");
      elm.id = "bar";
      body.appendChild(elm);
      cjs.vars[ID_TAB] = "1";
      cjs.dataIds.set("bar", {});
      const res = await func({
        data: {
          dataId: "bar",
          tabId: "1",
          timestamp: FILE_NOT_FOUND_TIMESTAMP,
        },
        value: "foo",
      });
      assert.strictEqual(cjs.dataIds.size, 0, "size");
      assert.deepEqual(res, [true], "result");
    });

    it("should get empty array", async () => {
      const elm = document.createElement("p");
      const body = document.querySelector("body");
      elm.id = "bar";
      body.appendChild(elm);
      cjs.vars[ID_TAB] = "1";
      const res = await func({
        data: {
          dataId: "bar",
          tabId: "1",
        },
        value: "foo",
      });
      assert.strictEqual(cjs.dataIds.size, 0, "size");
      assert.deepEqual(res, [], "result");
    });

    it("should replace content and set data ID", async () => {
      const elm = document.createElement("textarea");
      const body = document.querySelector("body");
      elm.id = "bar";
      body.appendChild(elm);
      cjs.vars[ID_TAB] = "1";
      const res = await func({
        data: {
          dataId: "bar",
          tabId: "1",
        },
        value: "foo",
      });
      assert.strictEqual(cjs.dataIds.size, 1, "size");
      assert.isTrue(cjs.dataIds.has("bar"));
      assert.strictEqual(elm.value, "foo", "content");
      assert.strictEqual(res.length, 2, "length");
      assert.isUndefined(res[0], "result");
      assert.instanceOf(res[1], Map, "result");
    });

    it("should replace content and set data ID", async () => {
      const elm = document.createElement("textarea");
      const body = document.querySelector("body");
      elm.id = "bar";
      body.appendChild(elm);
      cjs.vars[ID_TAB] = "1";
      const res = await func({
        data: {
          dataId: "bar",
          tabId: "1",
          timestamp: 2,
          lastUpdate: 1,
        },
        value: "foo",
      });
      assert.strictEqual(cjs.dataIds.size, 1, "size");
      assert.isTrue(cjs.dataIds.has("bar"));
      assert.strictEqual(elm.value, "foo", "content");
      assert.strictEqual(res.length, 2, "length");
      assert.isUndefined(res[0], "result");
      assert.instanceOf(res[1], Map, "result");
    });

    it("should replace content and set data ID", async () => {
      const elm = document.createElement("p");
      const body = document.querySelector("body");
      elm.id = "bar";
      elm.setAttribute("contenteditable", "true");
      if (typeof elm.isContentEditable !== "boolean") {
        elm.isContentEditable = isContentEditable(elm);
      }
      body.appendChild(elm);
      cjs.vars[ID_TAB] = "1";
      const res = await func({
        data: {
          dataId: "bar",
          tabId: "1",
        },
        value: "foo",
      });
      assert.strictEqual(cjs.dataIds.size, 1, "size");
      assert.isTrue(cjs.dataIds.has("bar"));
      assert.strictEqual(elm.textContent, "foo", "content");
      assert.strictEqual(res.length, 2, "length");
      assert.isUndefined(res[0], "result");
      assert.instanceOf(res[1], Map, "result");
    });

    it("should replace content and set data ID", async () => {
      const div = document.createElement("div");
      const elm = document.createElement("p");
      const body = document.querySelector("body");
      elm.id = "bar";
      elm.setAttribute("contenteditable", "true");
      if (typeof elm.isContentEditable !== "boolean") {
        elm.isContentEditable = isContentEditable(elm);
      }
      div.id = "baz";
      div.appendChild(elm);
      body.appendChild(div);
      cjs.vars[ID_TAB] = "1";
      const res = await func({
        data: {
          dataId: "bar",
          controlledBy: "baz",
          tabId: "1",
        },
        value: "foo",
      });
      assert.strictEqual(cjs.dataIds.size, 1, "size");
      assert.isTrue(cjs.dataIds.has("bar"));
      assert.strictEqual(elm.textContent, "foo", "content");
      assert.strictEqual(res.length, 2, "length");
      assert.isUndefined(res[0], "result");
      assert.instanceOf(res[1], Map, "result");
    });

    it("should replace content and set data ID", async () => {
      const elm = document.createElement("div");
      const text = document.createElement("textarea");
      const body = document.querySelector("body");
      elm.id = "bar";
      elm.classList.add("baz");
      elm.appendChild(text);
      body.appendChild(elm);
      cjs.liveEdit.set("baz", {
        className: "baz",
        setContent: ".baz > textarea",
      });
      cjs.vars[ID_TAB] = "1";
      const res = await func({
        data: {
          dataId: "bar",
          tabId: "1",
          liveEditKey: "baz",
        },
        value: "foo",
      });
      assert.strictEqual(cjs.dataIds.size, 1, "size");
      assert.isTrue(cjs.dataIds.has("bar"));
      assert.strictEqual(text.value, "foo", "content");
      assert.strictEqual(res.length, 2, "length");
      assert.isUndefined(res[0], "result");
      assert.instanceOf(res[1], Map, "result");
    });
  });

  describe("extend object items from local storage", () => {
    const func = cjs.extendObjItems;

    it("should get undefined", async () => {
      const res = await func();
      assert.isUndefined(res, "result");
    });

    it("should not extend", async () => {
      browser.storage.local.get.resolves(undefined);
      const res = await func({});
      assert.deepEqual(res, {}, "result");
    });

    it("should not extend", async () => {
      browser.storage.local.get.withArgs("foo").resolves({});
      const res = await func({}, "foo");
      assert.deepEqual(res, {}, "result");
    });

    it("should extend", async () => {
      browser.storage.local.get.withArgs("foo").resolves({
        foo: {
          bar: "baz",
        },
      });
      const res = await func({}, "foo");
      assert.deepEqual(res, {
        bar: "baz",
      }, "result");
    });

    it("should extend", async () => {
      browser.storage.local.get.withArgs("foo").resolves({
        foo: {
          bar: "baz",
        },
      });
      const map = new Map();
      const res = await func(map, "foo");
      assert.strictEqual(res.get("bar"), "baz", "result");
    });
  });

  describe("handle port message", () => {
    const func = cjs.handlePortMsg;
    beforeEach(() => {
      cjs.dataIds.clear();
      cjs.vars[CONTEXT_MODE] = null;
      cjs.vars[CONTEXT_NODE] = null;
      cjs.vars[ID_TAB] = "";
      cjs.vars[ID_WIN] = "";
      cjs.vars[INCOGNITO] = false;
      cjs.vars[ONLY_EDITABLE] = false;
      cjs.vars[SYNC_AUTO] = false;
      cjs.vars[SYNC_AUTO_URL] = null;
      cjs.vars.port = mockPort({name: PORT_CONTENT});
    });
    afterEach(() => {
      cjs.dataIds.clear();
      cjs.vars[CONTEXT_MODE] = null;
      cjs.vars[CONTEXT_NODE] = null;
      cjs.vars[ID_TAB] = "";
      cjs.vars[ID_WIN] = "";
      cjs.vars[INCOGNITO] = false;
      cjs.vars[ONLY_EDITABLE] = false;
      cjs.vars[SYNC_AUTO] = false;
      cjs.vars[SYNC_AUTO_URL] = null;
      cjs.vars.port = null;
    });

    it("should get empty array", async () => {
      const res = await func();
      assert.deepEqual(res, [], "result");
    });

    it("should get empty array", async () => {
      const res = await func({
        foo: "bar",
      });
      assert.deepEqual(res, [], "result");
    });

    it("should set values", async () => {
      const res = await func({
        [ID_TAB]: "1",
        [ID_WIN]: "2",
        [SYNC_AUTO_URL]: ["https://example.com"],
      });
      assert.strictEqual(cjs.vars[ID_TAB], "1", "tab");
      assert.strictEqual(cjs.vars[ID_WIN], "2", "window");
      assert.deepEqual(cjs.vars[SYNC_AUTO_URL], ["https://example.com"], "url");
      assert.deepEqual(res, [], "result");
    });

    it("should set values", async () => {
      const res = await func({
        [INCOGNITO]: true,
        [ONLY_EDITABLE]: true,
        [SYNC_AUTO]: true,
      });
      assert.isTrue(cjs.vars[INCOGNITO], "incognito");
      assert.isTrue(cjs.vars[ONLY_EDITABLE], "editable");
      assert.isTrue(cjs.vars[SYNC_AUTO], "sync");
      assert.deepEqual(res, [], "result");
    });

    it("should call function", async () => {
      global.fetch.resolves({
        headers: {
          get: sinon.stub().returns(""),
        },
        text: sinon.stub().returns("<html></html>"),
      });
      const i = cjs.vars.port.postMessage.callCount;
      const res = await func({
        [CONTENT_GET]: {},
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.deepEqual(res, [[undefined, null]], "result");
    });

    it("should get result", async () => {
      const res = await func({
        [TMP_FILE_RES]: {},
      });
      assert.deepEqual(res, [[]], "result");
    });

    it("should get result", async () => {
      const res = await func({
        [TMP_FILE_DATA_PORT]: {},
      });
      assert.deepEqual(res, [null], "result");
    });

    it("should get result", async () => {
      const res = await func({
        [TMP_FILE_DATA_REMOVE]: {},
      });
      assert.deepEqual(res, [null], "result");
    });

    it("should get result", async () => {
      const res = await func({
        [TMP_FILE_REQ]: true,
      });
      assert.deepEqual(res, [[]], "result");
    });

    it("should get result", async () => {
      const res = await func({
        [VARS_SET]: {},
      });
      assert.deepEqual(res, [[]], "result");
    });
  });

  describe("handle disconnected port", () => {
    const func = cjs.portOnDisconnect;
    const lastErrorDefaultValue = browser.runtime.lastError;
    beforeEach(() => {
      cjs.vars.port = mockPort({name: PORT_CONTENT});
    });
    afterEach(() => {
      cjs.vars.port = null;
    });

    it("should not log error", async () => {
      const stubConsole = sinon.stub(console, "error");
      const i = browser.runtime.sendMessage.callCount;
      browser.runtime.lastError = null;
      cjs.vars.port.error = null;
      const res = await func(cjs.vars.port);
      const {called: calledConsole} = stubConsole;
      stubConsole.restore();
      browser.runtime.lastError = lastErrorDefaultValue;
      assert.isFalse(calledConsole, "not called console");
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
                         "called");
      assert.isNull(cjs.vars.port, "port");
      assert.deepEqual(res, {}, "result");
    });

    it("should log error", async () => {
      const stubConsole = sinon.stub(console, "error");
      const i = browser.runtime.sendMessage.callCount;
      browser.runtime.lastError = null;
      cjs.vars.port.error = new Error("error");
      const res = await func(cjs.vars.port);
      const {called: calledConsole} = stubConsole;
      stubConsole.restore();
      browser.runtime.lastError = lastErrorDefaultValue;
      assert.isTrue(calledConsole, "called console");
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
                         "called");
      assert.isNull(cjs.vars.port, "port");
      assert.deepEqual(res, {}, "result");
    });

    it("should log error", async () => {
      const stubConsole = sinon.stub(console, "error");
      const i = browser.runtime.sendMessage.callCount;
      browser.runtime.lastError = new Error("error");
      cjs.vars.port.error = null;
      const res = await func(cjs.vars.port);
      const {called: calledConsole} = stubConsole;
      stubConsole.restore();
      browser.runtime.lastError = lastErrorDefaultValue;
      assert.isTrue(calledConsole, "called console");
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
                         "called");
      assert.isNull(cjs.vars.port, "port");
      assert.deepEqual(res, {}, "result");
    });
  });

  describe("handle connected port", () => {
    const func = cjs.portOnConnect;
    beforeEach(() => {
      cjs.vars.port = null;
    });
    afterEach(() => {
      cjs.vars.port = null;
    });

    it("should not set port", async () => {
      await func();
      assert.isNull(cjs.vars.port, "port");
    });

    it("should set port", async () => {
      const port = mockPort({name: PORT_CONTENT});
      await func(port);
      assert.deepEqual(cjs.vars.port, port, "port");
    });

    it("should not set port", async () => {
      const port = mockPort({name: "foo"});
      await func(port);
      assert.isNull(cjs.vars.port, "port");
    });
  });

  describe("check port", () => {
    const func = cjs.checkPort;
    beforeEach(() => {
      cjs.vars.port = null;
    });
    afterEach(() => {
      cjs.vars.port = null;
    });

    it("should set port", async () => {
      browser.runtime.connect.callsFake(arg => mockPort(arg));
      const res = await func();
      assert.isObject(cjs.vars.port, "port");
      assert.strictEqual(cjs.vars.port.name, PORT_CONTENT, "name");
      assert.isUndefined(res, "result");
    });

    it("should call function", async () => {
      const i = browser.runtime.sendMessage.callCount;
      cjs.vars.port = mockPort({name: PORT_CONTENT});
      const res = await func();
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
                         "called");
      assert.deepEqual(res, {}, "result");
    });
  });

  describe("handle message", () => {
    const func = cjs.handleMsg;
    beforeEach(() => {
      cjs.vars.port = null;
    });
    afterEach(() => {
      cjs.vars.port = null;
    });

    it("should not set port", async () => {
      browser.runtime.connect.callsFake(arg => mockPort(arg));
      const res = await func();
      assert.isNull(cjs.vars.port, "port");
      assert.deepEqual(res, [], "result");
    });

    it("should not set port", async () => {
      browser.runtime.connect.callsFake(arg => mockPort(arg));
      const res = await func({
        foo: true,
      });
      assert.isNull(cjs.vars.port, "port");
      assert.deepEqual(res, [], "result");
    });

    it("should not set port", async () => {
      browser.runtime.connect.callsFake(arg => mockPort(arg));
      const res = await func({
        [PORT_CONNECT]: false,
      });
      assert.isNull(cjs.vars.port, "port");
      assert.deepEqual(res, [], "result");
    });

    it("should set port", async () => {
      browser.runtime.connect.callsFake(arg => mockPort(arg));
      const res = await func({
        [PORT_CONNECT]: true,
      });
      assert.isObject(cjs.vars.port, "port");
      assert.strictEqual(cjs.vars.port.name, PORT_CONTENT, "name");
      assert.deepEqual(res, [undefined], "result");
    });
  });

  describe("handle before contextmenu event", () => {
    const func = cjs.handleBeforeContextMenu;
    beforeEach(() => {
      cjs.liveEdit.clear();
      cjs.vars[CONTEXT_MODE] = null;
      cjs.vars[CONTEXT_NODE] = null;
      cjs.vars[ONLY_EDITABLE] = false;
      cjs.vars.port = mockPort({name: PORT_CONTENT});
    });
    afterEach(() => {
      cjs.liveEdit.clear();
      cjs.vars[CONTEXT_MODE] = null;
      cjs.vars[CONTEXT_NODE] = null;
      cjs.vars[ONLY_EDITABLE] = false;
      cjs.vars.port = null;
    });

    it("should not call function", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const res = await func({});
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i, "not called");
      assert.isNull(res, "result");
    });

    it("should call function", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const target = document.querySelector("body");
      const res = await func({
        target,
        button: 2,
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.deepEqual(cjs.vars[CONTEXT_NODE], target, "node");
      assert.strictEqual(cjs.vars[CONTEXT_MODE], MODE_SOURCE, "mode");
      assert.isUndefined(res, "result");
    });

    it("should call function", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const target = document.querySelector("body");
      cjs.vars[ONLY_EDITABLE] = true;
      const res = await func({
        target,
        button: 2,
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.isNull(cjs.vars[CONTEXT_NODE], "node");
      assert.strictEqual(cjs.vars[CONTEXT_MODE], MODE_SOURCE, "mode");
      assert.isUndefined(res, "result");
    });

    it("should call function", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const target = document.querySelector("body");
      const res = await func({
        target,
        key: "ContextMenu",
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.deepEqual(cjs.vars[CONTEXT_NODE], target, "node");
      assert.strictEqual(cjs.vars[CONTEXT_MODE], MODE_SOURCE, "mode");
      assert.isUndefined(res, "result");
    });

    it("should call function", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const target = document.querySelector("body");
      const res = await func({
        target,
        key: "F10",
        shiftKey: true,
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.deepEqual(cjs.vars[CONTEXT_NODE], target, "node");
      assert.strictEqual(cjs.vars[CONTEXT_MODE], MODE_SOURCE, "mode");
      assert.isUndefined(res, "result");
    });

    it("should call function", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const target =
        document.createElementNS("http://www.w3.org/1998/Math/MathML", "math");
      const body = document.querySelector("body");
      body.appendChild(target);
      const res = await func({
        target,
        button: 2,
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.deepEqual(cjs.vars[CONTEXT_NODE], target, "node");
      assert.strictEqual(cjs.vars[CONTEXT_MODE], MODE_MATHML, "mode");
      assert.isUndefined(res, "result");
    });

    it("should call function", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const target =
        document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const body = document.querySelector("body");
      body.appendChild(target);
      const res = await func({
        target,
        button: 2,
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.deepEqual(cjs.vars[CONTEXT_NODE], target, "node");
      assert.strictEqual(cjs.vars[CONTEXT_MODE], MODE_SVG, "mode");
      assert.isUndefined(res, "result");
    });

    it("should call function", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const target = document.createElement("input");
      const body = document.querySelector("body");
      body.appendChild(target);
      const res = await func({
        target,
        button: 2,
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.deepEqual(cjs.vars[CONTEXT_NODE], target, "node");
      assert.strictEqual(cjs.vars[CONTEXT_MODE], MODE_SOURCE, "mode");
      assert.isUndefined(res, "result");
    });

    it("should call function", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const range = document.createRange();
      const sel = window.getSelection();
      const target = document.createElement("textarea");
      const body = document.querySelector("body");
      target.textContent = "foo";
      body.appendChild(target);
      range.selectNodeContents(target);
      sel.removeAllRanges();
      sel.addRange(range);
      const res = await func({
        target,
        button: 2,
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.deepEqual(cjs.vars[CONTEXT_NODE], target, "node");
      assert.strictEqual(cjs.vars[CONTEXT_MODE], MODE_SOURCE, "mode");
      assert.isUndefined(res, "result");
    });

    it("should call function", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const target = document.createElement("div");
      const body = document.querySelector("body");
      target.id = "foo";
      target.classList.add("bar");
      body.appendChild(target);
      cjs.liveEdit.set("foo", {
        className: "bar",
      });
      const res = await func({
        target,
        button: 2,
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.deepEqual(cjs.vars[CONTEXT_NODE], target, "node");
      assert.strictEqual(cjs.vars[CONTEXT_MODE], MODE_SOURCE, "mode");
      assert.isUndefined(res, "result");
    });
  });

  describe("handle keydown event", () => {
    const func = cjs.handleKeyDown;
    beforeEach(() => {
      cjs.liveEdit.clear();
      cjs.vars[CONTEXT_MODE] = null;
      cjs.vars[CONTEXT_NODE] = null;
      cjs.vars[ONLY_EDITABLE] = false;
      cjs.vars.port = mockPort({name: PORT_CONTENT});
    });
    afterEach(() => {
      cjs.liveEdit.clear();
      cjs.vars[CONTEXT_MODE] = null;
      cjs.vars[CONTEXT_NODE] = null;
      cjs.vars[ONLY_EDITABLE] = false;
      cjs.vars.port = null;
    });

    it("should not set values", async () => {
      const res = await func({});
      assert.isNull(cjs.vars[CONTEXT_NODE], "node");
      assert.isNull(cjs.vars[CONTEXT_MODE], "mode");
      assert.isNull(res, "result");
    });

    it("should call function", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const target = document.querySelector("body");
      const res = await func({
        target,
        key: "ContextMenu",
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.deepEqual(cjs.vars[CONTEXT_NODE], target, "node");
      assert.strictEqual(cjs.vars[CONTEXT_MODE], MODE_SOURCE, "mode");
      assert.isUndefined(res, "result");
    });

    it("should call function", async () => {
      const i = cjs.vars.port.postMessage.callCount;
      const target = document.querySelector("body");
      const res = await func({
        target,
        key: "F10",
        shiftKey: true,
      });
      assert.strictEqual(cjs.vars.port.postMessage.callCount, i + 1, "called");
      assert.deepEqual(cjs.vars[CONTEXT_NODE], target, "node");
      assert.strictEqual(cjs.vars[CONTEXT_MODE], MODE_SOURCE, "mode");
      assert.isUndefined(res, "result");
    });

    it("should set values", async () => {
      const target = document.querySelector("body");
      const res = await func({
        target,
      });
      assert.deepEqual(cjs.vars[CONTEXT_NODE], target, "node");
      assert.strictEqual(cjs.vars[CONTEXT_MODE], MODE_SOURCE, "mode");
      assert.isNull(res, "result");
    });

    it("should set values", async () => {
      const target =
        document.createElementNS("http://www.w3.org/1998/Math/MathML", "math");
      const body = document.querySelector("body");
      body.appendChild(target);
      const res = await func({
        target,
      });
      assert.deepEqual(cjs.vars[CONTEXT_NODE], target, "node");
      assert.strictEqual(cjs.vars[CONTEXT_MODE], MODE_MATHML, "mode");
      assert.isNull(res, "result");
    });

    it("should set values", async () => {
      const target =
        document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const body = document.querySelector("body");
      body.appendChild(target);
      const res = await func({
        target,
      });
      assert.deepEqual(cjs.vars[CONTEXT_NODE], target, "node");
      assert.strictEqual(cjs.vars[CONTEXT_MODE], MODE_SVG, "mode");
      assert.isNull(res, "result");
    });

    it("should call function", async () => {
      const target = document.createElement("textarea");
      const body = document.querySelector("body");
      body.appendChild(target);
      const res = await func({
        target,
      });
      assert.deepEqual(cjs.vars[CONTEXT_NODE], target, "node");
      assert.strictEqual(cjs.vars[CONTEXT_MODE], MODE_EDIT, "mode");
      assert.isNull(res, "result");
    });

    it("should call function", async () => {
      const target = document.createElement("div");
      const body = document.querySelector("body");
      target.id = "foo";
      target.classList.add("bar");
      body.appendChild(target);
      cjs.liveEdit.set("foo", {
        className: "bar",
      });
      const res = await func({
        target,
      });
      assert.deepEqual(cjs.vars[CONTEXT_NODE], target, "node");
      assert.strictEqual(cjs.vars[CONTEXT_MODE], MODE_SOURCE, "mode");
      assert.isNull(res, "result");
    });
  });
});