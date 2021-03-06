/**
 * main.test.js
 */

import { assert } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import { browser, mockPort } from './mocha/setup.js';
import sinon from 'sinon';
import * as mjs from '../src/mjs/main.js';
import {
  CONTEXT_MENU, EDITOR_CONFIG_GET, EDITOR_CONFIG_RES, EDITOR_EXEC,
  EDITOR_FILE_NAME, EDITOR_LABEL, EXT_NAME, EXT_RELOAD,
  HOST, HOST_COMPAT, HOST_CONNECTION, HOST_ERR_NOTIFY,
  HOST_STATUS_GET, HOST_VERSION, HOST_VERSION_LATEST,
  ICON_AUTO, ICON_BLACK, ICON_COLOR, ICON_DARK, ICON_ID, ICON_LIGHT, ICON_WHITE,
  INFO_COLOR, INFO_TEXT, IS_EXECUTABLE, IS_MAC, IS_WEBEXT,
  LOCAL_FILE_VIEW, MENU_ENABLED,
  MODE_EDIT, MODE_MATHML, MODE_SELECTION, MODE_SOURCE, MODE_SVG,
  ONLY_EDITABLE, OPTIONS_OPEN, PORT_CONNECT, PORT_CONTENT, PROCESS_CHILD,
  STORAGE_SET, SYNC_AUTO, SYNC_AUTO_URL,
  TMP_FILE_CREATE, TMP_FILE_DATA_PORT, TMP_FILE_DATA_REMOVE, TMP_FILE_GET,
  TMP_FILE_RES, WARN_COLOR, WARN_TEXT
} from '../src/mjs/constant.js';

describe('main', () => {
  beforeEach(() => {
    browser._sandbox.reset();
    browser.i18n.getMessage.callsFake((...args) => args.toString());
    browser.menus.removeAll.resolves(undefined);
    browser.permissions.contains.resolves(true);
    browser.runtime.connect.callsFake(mockPort);
    browser.runtime.connectNative.callsFake(mockPort);
    global.browser = browser;
  });
  afterEach(() => {
    delete global.browser;
    browser._sandbox.reset();
  });

  it('should get browser object', () => {
    assert.isObject(browser, 'browser');
  });

  it('should get host object', () => {
    const { host } = mjs;
    assert.isObject(host, 'host');
  });

  describe('post message to host', () => {
    const func = mjs.hostPostMsg;

    it('should not call function', async () => {
      const { host } = mjs;
      const i = host.postMessage.callCount;
      await func();
      assert.strictEqual(host.postMessage.callCount, i, 'not called');
    });

    it('should call function', async () => {
      const { host } = mjs;
      const i = host.postMessage.callCount;
      await func('foo');
      assert.strictEqual(host.postMessage.callCount, i + 1, 'called');
    });
  });

  describe('create ports map', () => {
    const func = mjs.createPortsMap;
    beforeEach(() => {
      const { ports } = mjs;
      ports.clear();
    });
    afterEach(() => {
      const { ports } = mjs;
      ports.clear();
    });

    it('should throw', async () => {
      await func().catch(e => {
        assert.strictEqual(e.message, 'Expected String but got Undefined.',
          'throw');
      });
    });

    it('should throw', async () => {
      await func('foo').catch(e => {
        assert.strictEqual(e.message, 'Expected String but got Undefined.',
          'throw');
      });
    });

    it('should set map', async () => {
      const { ports } = mjs;
      const res = await func('1', '2');
      assert.isTrue(ports.has('1'), 'ports');
      assert.isTrue(ports.get('1').has('2'), 'ports');
      assert.isTrue(res instanceof Map, 'result');
    });

    it('should set map', async () => {
      const { ports } = mjs;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      const res = await func('1', '2');
      assert.isTrue(ports.has('1'), 'ports');
      assert.isTrue(ports.get('1').has('2'), 'ports');
      assert.isTrue(res instanceof Map, 'result');
    });
  });

  describe('restore ports collection', () => {
    const func = mjs.restorePorts;
    beforeEach(() => {
      const { ports } = mjs;
      ports.clear();
    });
    afterEach(() => {
      const { ports } = mjs;
      ports.clear();
    });

    it('should get null', async () => {
      const res = await func();
      assert.isNull(res, 'result');
    });

    it('should delete map', async () => {
      const { ports } = mjs;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      const res = await func({
        windowId: '1',
        tabId: '2'
      });
      assert.isFalse(ports.has('1'));
      assert.isNull(res, 'result');
    });

    it('should delete map', async () => {
      const { ports } = mjs;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').set('3', new Map());
      const res = await func({
        windowId: '1',
        tabId: '2'
      });
      assert.isTrue(ports.has('1'));
      assert.isFalse(ports.get('1').has('2'));
      assert.isNull(res, 'result');
    });

    it('should delete map', async () => {
      const { ports } = mjs;
      ports.set('1', new Map());
      const res = await func({
        windowId: '1'
      });
      assert.isFalse(ports.has('1'));
      assert.isNull(res, 'result');
    });
  });

  describe('remove port from ports collection', () => {
    const func = mjs.removePort;
    beforeEach(() => {
      const { ports } = mjs;
      ports.clear();
    });
    afterEach(() => {
      const { ports } = mjs;
      ports.clear();
    });

    it('should get null', async () => {
      const res = await func();
      assert.isNull(res, 'result');
    });

    it('should get null', async () => {
      const res = await func({
        sender: {}
      });
      assert.isNull(res, 'result');
    });

    it('should call function', async () => {
      const { host, ports } = mjs;
      const i = host.postMessage.callCount;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      const res = await func({
        sender: {
          tab: {
            incognito: false,
            windowId: 1,
            id: 2
          },
          url: 'https://example.com/?foo=bar'
        }
      });
      assert.strictEqual(host.postMessage.callCount, i + 1, 'called');
      assert.isUndefined(res, 'result');
    });

    it('should call function', async () => {
      const { host, ports } = mjs;
      const i = host.postMessage.callCount;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      const res = await func({
        sender: {
          tab: {
            incognito: true,
            windowId: 1,
            id: 2
          },
          url: 'https://example.com/?foo=bar'
        }
      });
      assert.strictEqual(host.postMessage.callCount, i + 1, 'called');
      assert.isUndefined(res, 'result');
    });

    it('should not call function', async () => {
      const { host, ports } = mjs;
      const i = host.postMessage.callCount;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      const res = await func({
        sender: {
          tab: {
            incognito: false,
            windowId: 3,
            id: 4
          },
          url: 'https://example.com/?foo=bar'
        }
      });
      assert.strictEqual(host.postMessage.callCount, i, 'not called');
      assert.isNull(res, 'result');
    });

    it('should not call function', async () => {
      const { host, ports } = mjs;
      const i = host.postMessage.callCount;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      const res = await func({
        sender: {
          tab: {
            incognito: false,
            windowId: 1,
            id: 4
          },
          url: 'https://example.com/?foo=bar'
        }
      });
      assert.strictEqual(host.postMessage.callCount, i, 'not called');
      assert.isNull(res, 'result');
    });
  });

  describe('post message to port', () => {
    const func = mjs.portPostMsg;
    beforeEach(() => {
      const { ports } = mjs;
      ports.clear();
    });
    afterEach(() => {
      const { ports } = mjs;
      ports.clear();
    });

    it('should get empty array', async () => {
      const res = await func();
      assert.deepEqual(res, [], 'result');
    });

    it('should log error', async () => {
      const { ports } = mjs;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com',
        browser.runtime.connect({ name: 'bar' }));
      const port = ports.get('1').get('2').get('https://example.com');
      const stub = sinon.stub(console, 'error');
      port.postMessage.throws();
      const res = await func('foo', {
        windowId: '1',
        tabId: '2',
        recurse: true
      });
      const { calledOnce } = stub;
      stub.restore();
      assert.isTrue(calledOnce, 'called');
      assert.isFalse(ports.get('1').get('2').has('https://example.com'),
        'port');
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      const { ports } = mjs;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com',
        browser.runtime.connect({ name: 'bar' }));
      const port = ports.get('1').get('2').get('https://example.com');
      const i = port.postMessage.callCount;
      const res = await func('foo', {
        windowId: '1',
        tabId: '2',
        portKey: 'https://example.com'
      });
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      const { ports } = mjs;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com',
        browser.runtime.connect({ name: 'bar' }));
      const port = ports.get('1').get('2').get('https://example.com');
      const i = port.postMessage.callCount;
      const res = await func('foo', {
        windowId: '1',
        tabId: '2'
      });
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const { ports } = mjs;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com',
        browser.runtime.connect({ name: 'bar' }));
      const port = ports.get('1').get('2').get('https://example.com');
      const i = port.postMessage.callCount;
      const res = await func('foo', {
        windowId: '1'
      });
      assert.strictEqual(port.postMessage.callCount, i, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      const { ports } = mjs;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com',
        browser.runtime.connect({ name: 'bar' }));
      const port = ports.get('1').get('2').get('https://example.com');
      const i = port.postMessage.callCount;
      const res = await func('foo', {
        windowId: '1',
        recurse: true
      });
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [[]], 'result');
    });

    it('should not call function', async () => {
      const { ports } = mjs;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com',
        browser.runtime.connect({ name: 'bar' }));
      const port = ports.get('1').get('2').get('https://example.com');
      const i = port.postMessage.callCount;
      const res = await func('foo');
      assert.strictEqual(port.postMessage.callCount, i, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      const { ports } = mjs;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com',
        browser.runtime.connect({ name: 'bar' }));
      const port = ports.get('1').get('2').get('https://example.com');
      const i = port.postMessage.callCount;
      const res = await func('foo', {
        recurse: true
      });
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [[[]]], 'result');
    });
  });

  describe('post context menu data', () => {
    const func = mjs.postContextMenuData;
    beforeEach(() => {
      const { ports } = mjs;
      ports.clear();
    });
    afterEach(() => {
      const { ports } = mjs;
      ports.clear();
    });

    it('should get null', async () => {
      const res = await func();
      assert.isNull(res, 'result');
    });

    it('should get null', async () => {
      const res = await func({}, {});
      assert.isNull(res, 'result');
    });

    it('should call function', async () => {
      const res = await func({
        frameUrl: 'https://www.example.com',
        pageUrl: 'https://example.com'
      }, {
        windowId: 1,
        id: 2
      });
      assert.deepEqual(res, [], 'result');
    });
  });

  describe('post tmp file data', () => {
    const func = mjs.postTmpFileData;

    it('should throw', async () => {
      await func().catch(e => {
        assert.strictEqual(e.message, 'Expected String but got Undefined.',
          'throw');
      });
    });

    it('should get null', async () => {
      const res = await func('foo');
      assert.isNull(res, 'result');
    });

    it('should get null', async () => {
      const res = await func('foo', {});
      assert.isNull(res, 'result');
    });

    it('should get null', async () => {
      const res = await func('foo', {
        data: {}
      });
      assert.isNull(res, 'result');
    });

    it('should get null', async () => {
      const res = await func('foo', {
        data: {
          tabId: 'bar',
          windowId: 'baz'
        }
      });
      assert.isNull(res, 'result');
    });

    it('should get null', async () => {
      const i = browser.tabs.query.callCount;
      browser.tabs.query.resolves([{
        id: 3
      }]);
      const res = await func('foo', {
        data: {
          tabId: '2',
          windowId: '1'
        }
      });
      assert.strictEqual(browser.tabs.query.callCount, i + 1, 'called');
      assert.isNull(res, 'result');
    });

    it('should call function', async () => {
      const i = browser.tabs.query.callCount;
      browser.tabs.query.resolves([{
        id: 2
      }]);
      const res = await func('foo', {
        data: {
          tabId: '2',
          windowId: '1'
        }
      });
      assert.strictEqual(browser.tabs.query.callCount, i + 1, 'called');
      assert.deepEqual(res, [], 'result');
    });
  });

  describe('post get content message to active tab', () => {
    const func = mjs.postGetContent;

    it('should get null', async () => {
      const i = browser.tabs.query.callCount;
      browser.tabs.query.resolves([]);
      const res = await func();
      assert.strictEqual(browser.tabs.query.callCount, i + 1, 'called');
      assert.isNull(res, 'result');
    });

    it('should call function', async () => {
      const i = browser.tabs.query.callCount;
      browser.tabs.query.resolves([{
        id: 2,
        windowId: 1
      }]);
      const res = await func();
      assert.strictEqual(browser.tabs.query.callCount, i + 1, 'called');
      assert.deepEqual(res, [], 'result');
    });
  });

  describe('set icon', () => {
    const func = mjs.setIcon;

    it('should call function', async () => {
      const i = browser.runtime.getURL.callCount;
      const j = browser.browserAction.setIcon.callCount;
      browser.runtime.getURL.callsFake(arg => arg);
      browser.browserAction.setIcon.callsFake(arg => arg);
      const res = await func();
      assert.strictEqual(browser.runtime.getURL.callCount, i + 1, 'called');
      assert.strictEqual(browser.browserAction.setIcon.callCount, j + 1,
        'called');
      assert.deepEqual(res, {
        path: 'img/icon.svg'
      }, 'result');
    });

    it('should call function', async () => {
      const i = browser.runtime.getURL.callCount;
      const j = browser.browserAction.setIcon.callCount;
      browser.runtime.getURL.callsFake(arg => arg);
      browser.browserAction.setIcon.callsFake(arg => arg);
      const res = await func('#foo');
      assert.strictEqual(browser.runtime.getURL.callCount, i + 1, 'called');
      assert.strictEqual(browser.browserAction.setIcon.callCount, j + 1,
        'called');
      assert.deepEqual(res, {
        path: 'img/icon.svg#foo'
      }, 'result');
    });
  });

  describe('set default icon', () => {
    const func = mjs.setDefaultIcon;
    beforeEach(() => {
      const { vars, varsLocal } = mjs;
      vars[IS_WEBEXT] = false;
      varsLocal[ICON_ID] = '';
    });
    afterEach(() => {
      const { vars, varsLocal } = mjs;
      vars[IS_WEBEXT] = false;
      varsLocal[ICON_ID] = '';
    });

    it('should get null', async () => {
      const i = browser.runtime.getURL.callCount;
      const j = browser.browserAction.setIcon.callCount;
      browser.runtime.getURL.callsFake(arg => arg);
      browser.browserAction.setIcon.callsFake(arg => arg);
      const res = await func();
      assert.strictEqual(browser.runtime.getURL.callCount, i, 'not called');
      assert.strictEqual(browser.browserAction.setIcon.callCount, j,
        'not called');
      assert.isNull(res, 'result');
    });

    it('should get null', async () => {
      const { vars, varsLocal } = mjs;
      const i = browser.runtime.getURL.callCount;
      const j = browser.browserAction.setIcon.callCount;
      browser.runtime.getURL.callsFake(arg => arg);
      browser.browserAction.setIcon.callsFake(arg => arg);
      vars[IS_WEBEXT] = true;
      varsLocal[ICON_ID] = '#foo';
      const res = await func();
      assert.strictEqual(browser.runtime.getURL.callCount, i, 'not called');
      assert.strictEqual(browser.browserAction.setIcon.callCount, j,
        'not called');
      assert.isNull(res, 'result');
    });

    it('should get null', async () => {
      const { vars, varsLocal } = mjs;
      const i = browser.runtime.getURL.callCount;
      const j = browser.browserAction.setIcon.callCount;
      browser.runtime.getURL.callsFake(arg => arg);
      browser.browserAction.setIcon.callsFake(arg => arg);
      vars[IS_WEBEXT] = false;
      varsLocal[ICON_ID] = '';
      const res = await func();
      assert.strictEqual(browser.runtime.getURL.callCount, i, 'not called');
      assert.strictEqual(browser.browserAction.setIcon.callCount, j,
        'not called');
      assert.isNull(res, 'result');
    });

    it('should call function', async () => {
      const { vars, varsLocal } = mjs;
      const i = browser.runtime.getURL.callCount;
      const j = browser.browserAction.setIcon.callCount;
      browser.runtime.getURL.callsFake(arg => arg);
      browser.browserAction.setIcon.callsFake(arg => arg);
      vars[IS_WEBEXT] = true;
      varsLocal[ICON_ID] = '';
      const res = await func();
      assert.strictEqual(browser.runtime.getURL.callCount, i + 1, 'called');
      assert.strictEqual(browser.browserAction.setIcon.callCount, j + 1,
        'called');
      assert.deepEqual(res, {
        path: 'img/icon.svg#context'
      }, 'result');
    });
  });

  describe('toggle badge', () => {
    const func = mjs.toggleBadge;
    beforeEach(() => {
      const { hostStatus, varsLocal } = mjs;
      hostStatus[HOST_COMPAT] = false;
      hostStatus[HOST_CONNECTION] = false;
      hostStatus[HOST_VERSION_LATEST] = null;
      varsLocal[IS_EXECUTABLE] = false;
    });
    afterEach(() => {
      const { hostStatus, varsLocal } = mjs;
      hostStatus[HOST_COMPAT] = false;
      hostStatus[HOST_CONNECTION] = false;
      hostStatus[HOST_VERSION_LATEST] = null;
      varsLocal[IS_EXECUTABLE] = false;
    });

    it('should call function', async () => {
      const i = browser.browserAction.setBadgeBackgroundColor.callCount;
      const j = browser.browserAction.setBadgeText.callCount;
      const k = browser.browserAction.setBadgeTextColor.callCount;
      browser.browserAction.setBadgeBackgroundColor.callsFake(arg => arg);
      browser.browserAction.setBadgeText.callsFake(arg => arg);
      browser.browserAction.setBadgeTextColor.callsFake(arg => arg);
      const res = await func();
      assert.strictEqual(
        browser.browserAction.setBadgeBackgroundColor.callCount, i + 1, 'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeText.callCount, j + 1, 'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeTextColor.callCount, k + 1,
        'called'
      );
      assert.deepEqual(res, [
        {
          color: WARN_COLOR
        },
        {
          text: WARN_TEXT
        },
        {
          color: 'white'
        }
      ], 'result');
    });

    it('should call function', async () => {
      const { hostStatus, varsLocal } = mjs;
      const i = browser.browserAction.setBadgeBackgroundColor.callCount;
      const j = browser.browserAction.setBadgeText.callCount;
      const k = browser.browserAction.setBadgeTextColor.callCount;
      browser.browserAction.setBadgeBackgroundColor.callsFake(arg => arg);
      browser.browserAction.setBadgeText.callsFake(arg => arg);
      browser.browserAction.setBadgeTextColor.callsFake(arg => arg);
      hostStatus[HOST_CONNECTION] = true;
      hostStatus[HOST_COMPAT] = true;
      varsLocal[IS_EXECUTABLE] = true;
      const res = await func();
      assert.strictEqual(
        browser.browserAction.setBadgeBackgroundColor.callCount, i + 1,
        'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeText.callCount, j + 1, 'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeTextColor.callCount, k, 'not called'
      );
      assert.deepEqual(res, [
        {
          color: [0, 0, 0, 0]
        },
        {
          text: ''
        }
      ], 'result');
    });

    it('should call function', async () => {
      const { hostStatus, varsLocal } = mjs;
      const i = browser.browserAction.setBadgeBackgroundColor.callCount;
      const j = browser.browserAction.setBadgeText.callCount;
      const k = browser.browserAction.setBadgeTextColor.callCount;
      browser.browserAction.setBadgeBackgroundColor.callsFake(arg => arg);
      browser.browserAction.setBadgeText.callsFake(arg => arg);
      browser.browserAction.setBadgeTextColor.callsFake(arg => arg);
      hostStatus[HOST_CONNECTION] = false;
      hostStatus[HOST_COMPAT] = true;
      varsLocal[IS_EXECUTABLE] = true;
      const res = await func();
      assert.strictEqual(
        browser.browserAction.setBadgeBackgroundColor.callCount, i + 1,
        'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeText.callCount, j + 1, 'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeTextColor.callCount, k + 1, 'called'
      );
      assert.deepEqual(res, [
        {
          color: WARN_COLOR
        },
        {
          text: WARN_TEXT
        },
        {
          color: 'white'
        }
      ], 'result');
    });

    it('should call function', async () => {
      const { hostStatus, varsLocal } = mjs;
      const i = browser.browserAction.setBadgeBackgroundColor.callCount;
      const j = browser.browserAction.setBadgeText.callCount;
      const k = browser.browserAction.setBadgeTextColor.callCount;
      browser.browserAction.setBadgeBackgroundColor.callsFake(arg => arg);
      browser.browserAction.setBadgeText.callsFake(arg => arg);
      browser.browserAction.setBadgeTextColor.callsFake(arg => arg);
      hostStatus[HOST_CONNECTION] = true;
      hostStatus[HOST_COMPAT] = false;
      varsLocal[IS_EXECUTABLE] = true;
      const res = await func();
      assert.strictEqual(
        browser.browserAction.setBadgeBackgroundColor.callCount, i + 1,
        'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeText.callCount, j + 1, 'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeTextColor.callCount, k + 1, 'called'
      );
      assert.deepEqual(res, [
        {
          color: WARN_COLOR
        },
        {
          text: WARN_TEXT
        },
        {
          color: 'white'
        }
      ], 'result');
    });

    it('should call function', async () => {
      const { hostStatus, varsLocal } = mjs;
      const i = browser.browserAction.setBadgeBackgroundColor.callCount;
      const j = browser.browserAction.setBadgeText.callCount;
      const k = browser.browserAction.setBadgeTextColor.callCount;
      browser.browserAction.setBadgeBackgroundColor.callsFake(arg => arg);
      browser.browserAction.setBadgeText.callsFake(arg => arg);
      browser.browserAction.setBadgeTextColor.callsFake(arg => arg);
      hostStatus[HOST_CONNECTION] = true;
      hostStatus[HOST_COMPAT] = true;
      varsLocal[IS_EXECUTABLE] = false;
      const res = await func();
      assert.strictEqual(
        browser.browserAction.setBadgeBackgroundColor.callCount, i + 1,
        'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeText.callCount, j + 1, 'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeTextColor.callCount, k + 1, 'called'
      );
      assert.deepEqual(res, [
        {
          color: WARN_COLOR
        },
        {
          text: WARN_TEXT
        },
        {
          color: 'white'
        }
      ], 'result');
    });

    it('should call function', async () => {
      const { hostStatus, varsLocal } = mjs;
      const i = browser.browserAction.setBadgeBackgroundColor.callCount;
      const j = browser.browserAction.setBadgeText.callCount;
      const k = browser.browserAction.setBadgeTextColor.callCount;
      browser.browserAction.setBadgeBackgroundColor.callsFake(arg => arg);
      browser.browserAction.setBadgeText.callsFake(arg => arg);
      browser.browserAction.setBadgeTextColor.callsFake(arg => arg);
      hostStatus[HOST_CONNECTION] = true;
      hostStatus[HOST_COMPAT] = true;
      hostStatus[HOST_VERSION_LATEST] = '1.2.3';
      varsLocal[IS_EXECUTABLE] = true;
      const res = await func();
      assert.strictEqual(
        browser.browserAction.setBadgeBackgroundColor.callCount, i + 1,
        'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeText.callCount, j + 1, 'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeTextColor.callCount, k + 1, 'called'
      );
      assert.deepEqual(res, [
        {
          color: INFO_COLOR
        },
        {
          text: INFO_TEXT
        },
        {
          color: 'white'
        }
      ], 'result');
    });
  });

  describe('set context menu items', () => {
    const func = mjs.setMenuItems;
    beforeEach(() => {
      const { menuItems } = mjs;
      menuItems[MODE_SOURCE] = null;
      menuItems[MODE_SELECTION] = null;
      menuItems[MODE_EDIT] = null;
    });
    afterEach(() => {
      const { menuItems } = mjs;
      menuItems[MODE_SOURCE] = null;
      menuItems[MODE_SELECTION] = null;
      menuItems[MODE_EDIT] = null;
    });

    it('should throw', async () => {
      await func().catch(e => {
        assert.instanceOf(e, TypeError, 'error');
        assert.strictEqual(e.message, 'Expected String but got Undefined.');
      });
    });

    it('should not set value', async () => {
      const { menuItems } = mjs;
      await func('foo', 'bar');
      assert.isUndefined(menuItems.foo, 'result');
    });

    it('should set value', async () => {
      const { menuItems } = mjs;
      await func(MODE_SOURCE, 'foo');
      assert.strictEqual(menuItems[MODE_SOURCE], 'foo', 'result');
    });

    it('should set null', async () => {
      const { menuItems } = mjs;
      menuItems[MODE_SOURCE] = 'foo';
      await func(MODE_SOURCE);
      assert.isNull(menuItems[MODE_SOURCE], 'result');
    });

    it('should set value', async () => {
      const { menuItems } = mjs;
      await func(MODE_SELECTION, 'foo');
      assert.strictEqual(menuItems[MODE_SELECTION], 'foo', 'result');
    });

    it('should set null', async () => {
      const { menuItems } = mjs;
      menuItems[MODE_SELECTION] = 'foo';
      await func(MODE_SELECTION);
      assert.isNull(menuItems[MODE_SELECTION], 'result');
    });

    it('should set value', async () => {
      const { menuItems } = mjs;
      await func(MODE_EDIT, 'foo');
      assert.strictEqual(menuItems[MODE_EDIT], 'foo', 'result');
    });

    it('should set null', async () => {
      const { menuItems } = mjs;
      menuItems[MODE_EDIT] = 'foo';
      await func(MODE_EDIT);
      assert.isNull(menuItems[MODE_EDIT], 'result');
    });
  });

  describe('init context menu items', () => {
    const func = mjs.initMenuItems;
    beforeEach(() => {
      const { menuItems } = mjs;
      menuItems[MODE_SOURCE] = 'foo';
      menuItems[MODE_SELECTION] = 'bar';
      menuItems[MODE_EDIT] = 'baz';
    });
    afterEach(() => {
      const { menuItems } = mjs;
      menuItems[MODE_SOURCE] = null;
      menuItems[MODE_SELECTION] = null;
      menuItems[MODE_EDIT] = null;
    });

    it('should init', async () => {
      const { menuItems } = mjs;
      await func();
      assert.isNull(menuItems[MODE_SOURCE], 'value');
      assert.isNull(menuItems[MODE_SELECTION], 'value');
      assert.isNull(menuItems[MODE_EDIT], 'value');
    });
  });

  describe('get access key', () => {
    const func = mjs.getAccesskey;
    beforeEach(() => {
      const { vars } = mjs;
      vars[IS_WEBEXT] = false;
    });
    afterEach(() => {
      const { vars } = mjs;
      vars[IS_WEBEXT] = false;
    });

    it('should throw', async () => {
      assert.throws(() => func(), 'Expected String but got Undefined.',
        'throw');
    });

    it('should get empty string', async () => {
      const res = await func('');
      assert.strictEqual(res, '', 'result');
    });

    it('should get empty string', async () => {
      const res = await func('foo');
      assert.strictEqual(res, '', 'result');
    });

    it('should get value', async () => {
      const res = await func(MODE_MATHML);
      assert.strictEqual(res, ' (&V)', 'result');
    });

    it('should get value', async () => {
      const { vars } = mjs;
      vars[IS_WEBEXT] = true;
      const res = await func(MODE_MATHML);
      assert.strictEqual(res, '(&V)', 'result');
    });

    it('should get value', async () => {
      const res = await func(MODE_SELECTION);
      assert.strictEqual(res, ' (&V)', 'result');
    });

    it('should get value', async () => {
      const { vars } = mjs;
      vars[IS_WEBEXT] = true;
      const res = await func(MODE_SELECTION);
      assert.strictEqual(res, '(&V)', 'result');
    });

    it('should get value', async () => {
      const res = await func(MODE_SOURCE);
      assert.strictEqual(res, ' (&V)', 'result');
    });

    it('should get value', async () => {
      const { vars } = mjs;
      vars[IS_WEBEXT] = true;
      const res = await func(MODE_SOURCE);
      assert.strictEqual(res, '(&V)', 'result');
    });

    it('should get value', async () => {
      const res = await func(MODE_SVG);
      assert.strictEqual(res, ' (&V)', 'result');
    });

    it('should get value', async () => {
      const { vars } = mjs;
      vars[IS_WEBEXT] = true;
      const res = await func(MODE_SVG);
      assert.strictEqual(res, '(&V)', 'result');
    });

    it('should get value', async () => {
      const res = await func(MODE_EDIT);
      assert.strictEqual(res, ' (&E)', 'result');
    });

    it('should get value', async () => {
      const { vars } = mjs;
      vars[IS_WEBEXT] = true;
      const res = await func(MODE_EDIT);
      assert.strictEqual(res, '(&E)', 'result');
    });
  });

  describe('create context menu item', () => {
    const func = mjs.createMenuItem;
    beforeEach(() => {
      const { menuItems, varsLocal } = mjs;
      menuItems[MODE_SOURCE] = null;
      menuItems[MODE_SELECTION] = null;
      menuItems[MODE_EDIT] = null;
      varsLocal[MENU_ENABLED] = false;
      varsLocal[IS_EXECUTABLE] = false;
    });
    afterEach(() => {
      const { menuItems, varsLocal } = mjs;
      menuItems[MODE_SOURCE] = null;
      menuItems[MODE_SELECTION] = null;
      menuItems[MODE_EDIT] = null;
      varsLocal[MENU_ENABLED] = false;
      varsLocal[IS_EXECUTABLE] = false;
    });

    it('should throw', async () => {
      await func().catch(e => {
        assert.strictEqual(e.message, 'Expected String but got Undefined.',
          'throw');
      });
    });

    it('should throw', async () => {
      await func('foo', 'bar').catch(e => {
        assert.strictEqual(e.message, 'Expected Array but got String.',
          'throw');
      });
    });

    it('should not call function', async () => {
      const { menuItems } = mjs;
      const i = browser.menus.update.callCount;
      const j = browser.menus.create.callCount;
      browser.i18n.getMessage.callsFake((...args) => args.toString());
      browser.menus.create.callsFake(opt => {
        const { id } = opt;
        return id;
      });
      await func('foo', []);
      assert.strictEqual(browser.menus.update.callCount, i, 'not called');
      assert.strictEqual(browser.menus.create.callCount, j, 'not called');
      assert.isNull(menuItems[MODE_SOURCE], 'menu');
      assert.isNull(menuItems[MODE_SELECTION], 'menu');
      assert.isNull(menuItems[MODE_EDIT], 'menu');
    });

    it('should call function', async () => {
      const { menuItems } = mjs;
      const i = browser.menus.update.callCount;
      const j = browser.menus.create.callCount;
      browser.i18n.getMessage.callsFake((...args) => args.toString());
      browser.menus.create.callsFake(opt => {
        const { id } = opt;
        return id;
      });
      await func(MODE_SOURCE, []);
      assert.strictEqual(browser.menus.update.callCount, i, 'not called');
      assert.strictEqual(browser.menus.create.callCount, j + 1, 'called');
      assert.strictEqual(menuItems[MODE_SOURCE], MODE_SOURCE, 'menu');
      assert.isNull(menuItems[MODE_SELECTION], 'menu');
      assert.isNull(menuItems[MODE_EDIT], 'menu');
    });

    it('should call function', async () => {
      const { menuItems, varsLocal } = mjs;
      const i = browser.menus.update.callCount;
      const j = browser.menus.create.callCount;
      browser.i18n.getMessage.callsFake((...args) => args.toString());
      browser.menus.create.callsFake(opt => {
        const { id } = opt;
        return id;
      });
      varsLocal[MENU_ENABLED] = true;
      varsLocal[IS_EXECUTABLE] = true;
      await func(MODE_SOURCE, []);
      assert.strictEqual(browser.menus.update.callCount, i, 'not called');
      assert.strictEqual(browser.menus.create.callCount, j + 1, 'called');
      assert.strictEqual(menuItems[MODE_SOURCE], MODE_SOURCE, 'menu');
      assert.isNull(menuItems[MODE_SELECTION], 'menu');
      assert.isNull(menuItems[MODE_EDIT], 'menu');
    });

    it('should call function', async () => {
      const { menuItems } = mjs;
      const i = browser.menus.update.callCount;
      const j = browser.menus.create.callCount;
      browser.i18n.getMessage.callsFake((...args) => args.toString());
      browser.menus.create.callsFake(opt => {
        const { id } = opt;
        return id;
      });
      menuItems[MODE_SOURCE] = MODE_SOURCE;
      await func(MODE_SOURCE, []);
      assert.strictEqual(browser.menus.update.callCount, i + 1, 'called');
      assert.strictEqual(browser.menus.create.callCount, j, 'not called');
      assert.strictEqual(menuItems[MODE_SOURCE], MODE_SOURCE, 'menu');
      assert.isNull(menuItems[MODE_SELECTION], 'menu');
      assert.isNull(menuItems[MODE_EDIT], 'menu');
    });

    it('should call function', async () => {
      const { menuItems } = mjs;
      const i = browser.menus.update.callCount;
      const j = browser.menus.create.callCount;
      browser.i18n.getMessage.callsFake((...args) => args.toString());
      browser.menus.create.callsFake(opt => {
        const { id } = opt;
        return id;
      });
      await func(MODE_SELECTION, []);
      assert.strictEqual(browser.menus.update.callCount, i, 'not called');
      assert.strictEqual(browser.menus.create.callCount, j + 1, 'called');
      assert.isNull(menuItems[MODE_SOURCE], 'menu');
      assert.strictEqual(menuItems[MODE_SELECTION], MODE_SELECTION, 'menu');
      assert.isNull(menuItems[MODE_EDIT], 'menu');
    });

    it('should call function', async () => {
      const { menuItems } = mjs;
      const i = browser.menus.update.callCount;
      const j = browser.menus.create.callCount;
      browser.i18n.getMessage.callsFake((...args) => args.toString());
      browser.menus.create.callsFake(opt => {
        const { id } = opt;
        return id;
      });
      await func(MODE_EDIT, []);
      assert.strictEqual(browser.menus.update.callCount, i, 'not called');
      assert.strictEqual(browser.menus.create.callCount, j + 1, 'called');
      assert.isNull(menuItems[MODE_SOURCE], 'menu');
      assert.isNull(menuItems[MODE_SELECTION], 'menu');
      assert.strictEqual(menuItems[MODE_EDIT], MODE_EDIT, 'menu');
    });
  });

  describe('create context menu items', () => {
    const func = mjs.createMenuItems;
    beforeEach(() => {
      const { menuItems, vars } = mjs;
      const items = Object.keys(menuItems);
      vars[ONLY_EDITABLE] = false;
      for (const item of items) {
        menuItems[item] = null;
      }
    });
    afterEach(() => {
      const { menuItems, vars } = mjs;
      const items = Object.keys(menuItems);
      vars[ONLY_EDITABLE] = false;
      for (const item of items) {
        menuItems[item] = null;
      }
    });

    it('should call function', async () => {
      const i = browser.menus.create.callCount;
      const res = await func();
      assert.strictEqual(browser.menus.create.callCount, i + 3, 'called');
      assert.deepEqual(res, [undefined, undefined, undefined], 'result');
    });

    it('should call function', async () => {
      const { vars } = mjs;
      const i = browser.menus.create.callCount;
      vars[ONLY_EDITABLE] = true;
      const res = await func();
      assert.strictEqual(browser.menus.create.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });
  });

  describe('restore context menu', () => {
    const func = mjs.restoreContextMenu;
    beforeEach(() => {
      const { menuItems, vars } = mjs;
      const items = Object.keys(menuItems);
      vars[ONLY_EDITABLE] = false;
      for (const item of items) {
        menuItems[item] = null;
      }
    });
    afterEach(() => {
      const { menuItems, vars } = mjs;
      const items = Object.keys(menuItems);
      vars[ONLY_EDITABLE] = false;
      for (const item of items) {
        menuItems[item] = null;
      }
    });

    it('should call function', async () => {
      const i = browser.menus.removeAll.callCount;
      const j = browser.menus.create.callCount;
      browser.menus.removeAll.resolves(undefined);
      const res = await func();
      assert.strictEqual(browser.menus.removeAll.callCount, i + 1, 'called');
      assert.strictEqual(browser.menus.create.callCount, j + 3, 'called');
      assert.deepEqual(res, [undefined, undefined, undefined], 'result');
    });
  });

  describe('update context menu', () => {
    const func = mjs.updateContextMenu;
    beforeEach(() => {
      const { menuItems, vars, varsLocal } = mjs;
      const items = Object.keys(menuItems);
      vars[ONLY_EDITABLE] = false;
      varsLocal[EDITOR_LABEL] = '';
      varsLocal[MENU_ENABLED] = false;
      varsLocal[IS_EXECUTABLE] = false;
      varsLocal[MODE_MATHML] = '';
      varsLocal[MODE_SOURCE] = '';
      varsLocal[MODE_SVG] = '';
      for (const item of items) {
        menuItems[item] = item;
      }
    });
    afterEach(() => {
      const { menuItems, vars, varsLocal } = mjs;
      const items = Object.keys(menuItems);
      vars[ONLY_EDITABLE] = false;
      varsLocal[EDITOR_LABEL] = '';
      varsLocal[MENU_ENABLED] = false;
      varsLocal[IS_EXECUTABLE] = false;
      varsLocal[MODE_MATHML] = '';
      varsLocal[MODE_SOURCE] = '';
      varsLocal[MODE_SVG] = '';
      for (const item of items) {
        menuItems[item] = null;
      }
    });

    it('should call function', async () => {
      const i = browser.menus.update.callCount;
      browser.i18n.getMessage.callsFake((...args) => args.toString());
      const res = await func();
      assert.strictEqual(browser.menus.update.callCount, i + 3, 'called');
      assert.deepEqual(res, [undefined, undefined, undefined], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.update.callCount;
      browser.i18n.getMessage.callsFake((...args) => args.toString());
      const res = await func();
      assert.strictEqual(browser.menus.update.callCount, i + 3, 'called');
      assert.deepEqual(res, [undefined, undefined, undefined], 'result');
    });

    it('should call function', async () => {
      const { menuItems, vars, varsLocal } = mjs;
      const items = Object.keys(menuItems);
      const i = browser.menus.create.callCount;
      browser.i18n.getMessage.callsFake((...args) => args.toString());
      varsLocal[MENU_ENABLED] = true;
      varsLocal[IS_EXECUTABLE] = true;
      vars[ONLY_EDITABLE] = false;
      for (const item of items) {
        menuItems[item] = null;
      }
      const res = await func();
      assert.strictEqual(browser.menus.create.callCount, i + 3, 'called');
      assert.deepEqual(res, [undefined, undefined, undefined], 'result');
    });

    it('should not call function', async () => {
      const { menuItems, vars, varsLocal } = mjs;
      const items = Object.keys(menuItems);
      const i = browser.menus.create.callCount;
      browser.i18n.getMessage.callsFake((...args) => args.toString());
      varsLocal[MENU_ENABLED] = false;
      vars[ONLY_EDITABLE] = false;
      for (const item of items) {
        menuItems[item] = null;
      }
      const res = await func();
      assert.strictEqual(browser.menus.create.callCount, i, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      const { menuItems, vars, varsLocal } = mjs;
      const items = Object.keys(menuItems);
      const i = browser.menus.create.callCount;
      browser.i18n.getMessage.callsFake((...args) => args.toString());
      varsLocal[MENU_ENABLED] = true;
      varsLocal[IS_EXECUTABLE] = true;
      vars[ONLY_EDITABLE] = true;
      for (const item of items) {
        menuItems[item] = null;
      }
      const res = await func();
      assert.strictEqual(browser.menus.create.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.update.callCount;
      const opt = {
        [MODE_EDIT]: {
          enabled: true,
          menuItemId: MODE_EDIT
        }
      };
      const res = await func(opt);
      assert.strictEqual(browser.menus.update.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const { varsLocal } = mjs;
      const i = browser.menus.update.callCount;
      const opt = {
        [MODE_SOURCE]: {
          enabled: true,
          menuItemId: MODE_SOURCE,
          mode: MODE_SOURCE
        }
      };
      varsLocal[MODE_SOURCE] = 'foo';
      const res = await func(opt);
      assert.strictEqual(browser.menus.update.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const { varsLocal } = mjs;
      const i = browser.menus.update.callCount;
      const opt = {
        [MODE_SOURCE]: {
          enabled: true,
          menuItemId: MODE_SOURCE,
          mode: MODE_SVG
        }
      };
      varsLocal[MODE_SOURCE] = 'foo';
      varsLocal[MODE_SVG] = 'bar';
      const res = await func(opt);
      assert.strictEqual(browser.menus.update.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const { varsLocal } = mjs;
      const i = browser.menus.update.callCount;
      const opt = {
        [MODE_SOURCE]: {
          enabled: true,
          menuItemId: MODE_SOURCE,
          mode: MODE_SVG
        }
      };
      varsLocal[MODE_SOURCE] = 'foo';
      const res = await func(opt);
      assert.strictEqual(browser.menus.update.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should not call function', async () => {
      const i = browser.menus.update.callCount;
      const opt = {
        [MODE_SOURCE]: {
          enabled: true,
          menuItemId: MODE_SOURCE,
          mode: MODE_SVG
        }
      };
      const res = await func(opt);
      assert.strictEqual(browser.menus.update.callCount, i, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const i = browser.menus.update.callCount;
      const opt = {
        [MODE_SOURCE]: {
          enabled: true,
          mode: MODE_SVG
        }
      };
      const res = await func(opt);
      assert.strictEqual(browser.menus.update.callCount, i, 'not called');
      assert.deepEqual(res, [], 'result');
    });
  });

  describe('', () => {
    const func = mjs.cacheMenuItemTitle;
    beforeEach(() => {
      const { varsLocal } = mjs;
      varsLocal[EDITOR_LABEL] = '';
      varsLocal[MODE_SOURCE] = '';
      varsLocal[MODE_MATHML] = '';
      varsLocal[MODE_SVG] = '';
    });
    afterEach(() => {
      const { varsLocal } = mjs;
      varsLocal[EDITOR_LABEL] = '';
      varsLocal[MODE_SOURCE] = '';
      varsLocal[MODE_MATHML] = '';
      varsLocal[MODE_SVG] = '';
    });

    it('should set value', async () => {
      const { varsLocal } = mjs;
      varsLocal[EDITOR_LABEL] = 'foo';
      browser.i18n.getMessage.callsFake((...args) => args.toString());
      await func();
      assert.strictEqual(varsLocal[MODE_SOURCE], `${MODE_SOURCE}_key,foo, (&V)`,
        'source');
      assert.strictEqual(varsLocal[MODE_MATHML], `${MODE_MATHML}_key,foo, (&V)`,
        'math');
      assert.strictEqual(varsLocal[MODE_SVG], `${MODE_SVG}_key,foo, (&V)`,
        'svg');
    });

    it('should set value', async () => {
      const { varsLocal } = mjs;
      browser.i18n.getMessage.callsFake((...args) => args.toString());
      await func();
      assert.strictEqual(varsLocal[MODE_SOURCE],
                         `${MODE_SOURCE}_key,${EXT_NAME}, (&V)`,
                         'source');
      assert.strictEqual(varsLocal[MODE_MATHML],
                         `${MODE_MATHML}_key,${EXT_NAME}, (&V)`,
                         'math');
      assert.strictEqual(varsLocal[MODE_SVG],
                         `${MODE_SVG}_key,${EXT_NAME}, (&V)`,
                         'svg');
    });
  });

  describe('extract editor config data', () => {
    const func = mjs.extractEditorConfig;

    it('should call function', async () => {
      const res = await func();
      assert.deepEqual(res, [
        undefined,
        [],
        [
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });

    it('should call function', async () => {
      const data = {
        editorConfigTimestamp: 1,
        editorName: 'foo',
        executable: true
      };
      browser.storage.local.get.withArgs([
        EDITOR_FILE_NAME,
        EDITOR_LABEL
      ]).resolves({
        [EDITOR_FILE_NAME]: {
          value: 'bar'
        },
        [EDITOR_LABEL]: {
          value: 'baz'
        }
      });
      const res = await func(data);
      assert.deepEqual(res, [undefined, [], [undefined, undefined, undefined]],
        'result');
    });

    it('should call function', async () => {
      const data = {
        editorConfigTimestamp: 1,
        editorName: 'foo',
        executable: true
      };
      browser.storage.local.get.withArgs([
        EDITOR_FILE_NAME,
        EDITOR_LABEL
      ]).resolves({});
      const res = await func(data);
      assert.deepEqual(res, [undefined, [], [undefined, undefined, undefined]],
        'result');
    });
  });

  describe('reload extension', () => {
    const func = mjs.reloadExt;

    it('should not call function', async () => {
      const { host } = mjs;
      const i = host.disconnect.callCount;
      const j = browser.runtime.reload.callCount;
      await func();
      assert.strictEqual(host.disconnect.callCount, i, 'not called');
      assert.strictEqual(browser.runtime.reload.callCount, j, 'not called');
    });

    it('should call function', async () => {
      const { host } = mjs;
      const i = host.disconnect.callCount;
      const j = browser.runtime.reload.callCount;
      await func(true);
      assert.strictEqual(host.disconnect.callCount, i + 1, 'called');
      assert.strictEqual(browser.runtime.reload.callCount, j + 1, 'called');
    });
  });

  describe('open options page', () => {
    const func = mjs.openOptionsPage;

    it('should call function', async () => {
      const i = browser.runtime.openOptionsPage.callCount;
      browser.runtime.openOptionsPage.resolves(undefined);
      const res = await func();
      assert.strictEqual(browser.runtime.openOptionsPage.callCount, i + 1,
        'called');
      assert.isUndefined(res, 'result');
    });
  });

  describe('handle host message', () => {
    const func = mjs.handleHostMsg;
    beforeEach(() => {
      const { hostStatus } = mjs;
      hostStatus[HOST_COMPAT] = false;
      hostStatus[HOST_CONNECTION] = false;
      hostStatus[HOST_VERSION_LATEST] = null;
    });
    afterEach(() => {
      const { hostStatus } = mjs;
      hostStatus[HOST_COMPAT] = false;
      hostStatus[HOST_CONNECTION] = false;
      hostStatus[HOST_VERSION_LATEST] = null;
    });

    it('should get empty array', async () => {
      const res = await func();
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const stub = sinon.stub(console, 'log');
      const msg = {
        status: 'foo'
      };
      const res = await func(msg);
      const { calledOnce } = stub;
      stub.restore();
      assert.isFalse(calledOnce, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      const stub = sinon.stub(console, 'log').callsFake(arg => arg);
      const msg = {
        status: 'foo',
        message: 'bar'
      };
      const res = await func(msg);
      const { calledOnce } = stub;
      stub.restore();
      assert.isTrue(calledOnce, 'called');
      assert.deepEqual(res, [
        `${HOST}: bar`
      ], 'result');
    });

    it('should call function', async () => {
      const stub = sinon.stub(console, 'warn');
      const i = browser.notifications.create.callCount;
      const msg = {
        status: 'warn',
        message: 'foo'
      };
      browser.notifications.create.callsFake(id => id);
      const res = await func(msg);
      const { calledOnce } = stub;
      stub.restore();
      assert.isTrue(calledOnce, 'called');
      assert.strictEqual(browser.notifications.create.callCount, i + 1,
        'called');
      assert.deepEqual(res, [
        false,
        'warn'
      ], 'result');
    });

    it('should call function', async () => {
      const stub = sinon.stub(console, 'warn');
      const i = browser.notifications.create.callCount;
      const msg = {
        status: 'warn',
        message: null
      };
      browser.notifications.create.callsFake(id => id);
      const res = await func(msg);
      const { calledOnce } = stub;
      stub.restore();
      assert.isFalse(calledOnce, 'called');
      assert.strictEqual(browser.notifications.create.callCount, i + 1,
        'called');
      assert.deepEqual(res, ['warn'], 'result');
    });

    it('should call function', async () => {
      const stub = sinon.stub(console, 'error');
      const i = browser.notifications.create.callCount;
      const msg = {
        status: 'error',
        message: 'foo'
      };
      browser.notifications.create.callsFake(id => id);
      const res = await func(msg);
      const { calledOnce } = stub;
      stub.restore();
      assert.isTrue(calledOnce, 'called');
      assert.strictEqual(browser.notifications.create.callCount, i + 1,
        'called');
      assert.deepEqual(res, [
        false,
        'error'
      ], 'result');
    });

    it('should call function', async () => {
      const stub = sinon.stub(console, 'error');
      const i = browser.notifications.create.callCount;
      const msg = {
        status: 'error',
        message: null
      };
      browser.notifications.create.callsFake(id => id);
      const res = await func(msg);
      const { calledOnce } = stub;
      stub.restore();
      assert.isFalse(calledOnce, 'called');
      assert.strictEqual(browser.notifications.create.callCount, i + 1,
        'called');
      assert.deepEqual(res, ['error'], 'result');
    });

    it('should call function', async () => {
      const stub = sinon.stub(console, 'error');
      const i = browser.notifications.create.callCount;
      const msg = {
        status: `${PROCESS_CHILD}_stderr`,
        message: 'foo'
      };
      browser.notifications.create.callsFake(id => id);
      const res = await func(msg);
      const { calledOnce } = stub;
      stub.restore();
      assert.isTrue(calledOnce, 'called');
      assert.strictEqual(browser.notifications.create.callCount, i + 1,
        'called');
      assert.deepEqual(res, [
        false,
        `${PROCESS_CHILD}_stderr`
      ], 'result');
    });

    it('should call function', async () => {
      const { host, hostStatus } = mjs;
      const i = host.postMessage.callCount;
      const msg = {
        status: 'ready'
      };
      const res = await func(msg);
      assert.isTrue(hostStatus[HOST_CONNECTION], 'value');
      assert.strictEqual(host.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });
  });

  describe('handle message', () => {
    const func = mjs.handleMsg;
    beforeEach(() => {
      const { hostStatus, menuItems, ports } = mjs;
      hostStatus[HOST_COMPAT] = false;
      hostStatus[HOST_CONNECTION] = false;
      hostStatus[HOST_VERSION_LATEST] = null;
      menuItems[MODE_SOURCE] = null;
      menuItems[MODE_SELECTION] = null;
      menuItems[MODE_EDIT] = null;
      ports.clear();
    });
    afterEach(() => {
      const { hostStatus, menuItems, ports } = mjs;
      hostStatus[HOST_COMPAT] = false;
      hostStatus[HOST_CONNECTION] = false;
      hostStatus[HOST_VERSION_LATEST] = null;
      menuItems[MODE_SOURCE] = null;
      menuItems[MODE_SELECTION] = null;
      menuItems[MODE_EDIT] = null;
      ports.clear();
    });

    it('should get empty array', async () => {
      const res = await func();
      assert.deepEqual(res, [], 'result');
    });

    it('should get empty array', async () => {
      const msg = {
        foo: 'bar'
      };
      const res = await func(msg);
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      const { ports } = mjs;
      const i = browser.tabs.query.callCount;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com',
        browser.runtime.connect({ name: 'foo' }));
      const port = ports.get('1').get('2').get('https://example.com');
      const j = port.postMessage.callCount;
      browser.tabs.query.resolves([{
        id: 2
      }]);
      const msg = {
        [TMP_FILE_DATA_REMOVE]: {
          data: {
            tabId: '2',
            windowId: '1'
          }
        }
      };
      const res = await func(msg);
      assert.strictEqual(browser.tabs.query.callCount, i + 1, 'called');
      assert.strictEqual(port.postMessage.callCount, j + 1, 'called');
      assert.deepEqual(res, [[]], 'result');
    });

    it('should call function', async () => {
      const { ports } = mjs;
      const i = browser.tabs.query.callCount;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com',
        browser.runtime.connect({ name: 'foo' }));
      const port = ports.get('1').get('2').get('https://example.com');
      const j = port.postMessage.callCount;
      browser.tabs.query.resolves([{
        id: 2
      }]);
      const msg = {
        [TMP_FILE_RES]: {
          data: {
            tabId: '2',
            windowId: '1'
          }
        }
      };
      const res = await func(msg);
      assert.strictEqual(browser.tabs.query.callCount, i + 1, 'called');
      assert.strictEqual(port.postMessage.callCount, j + 1, 'called');
      assert.deepEqual(res, [[]], 'result');
    });

    it('should call function', async () => {
      const { ports } = mjs;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com',
        browser.runtime.connect({ name: 'foo' }));
      const port = ports.get('1').get('2').get('https://example.com');
      const i = port.postMessage.callCount;
      const msg = {
        [TMP_FILE_DATA_PORT]: {
          foo: 'bar'
        }
      };
      const res = await func(msg);
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [[[[]]]], 'result');
    });

    it('should call function', async () => {
      const { ports } = mjs;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com',
        browser.runtime.connect({ name: 'foo' }));
      const port = ports.get('1').get('2').get('https://example.com');
      const i = port.postMessage.callCount;
      const msg = {
        [HOST_STATUS_GET]: true
      };
      const res = await func(msg);
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [[[[]]]], 'result');
    });

    it('should call function', async () => {
      const i = browser.storage.local.set.callCount;
      const msg = {
        [STORAGE_SET]: {
          foo: 'bar'
        }
      };
      const res = await func(msg);
      assert.strictEqual(browser.storage.local.set.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const i = browser.runtime.openOptionsPage.callCount;
      const msg = {
        [OPTIONS_OPEN]: true
      };
      const res = await func(msg);
      assert.strictEqual(browser.runtime.openOptionsPage.callCount, i + 1,
        'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should not call function', async () => {
      const i = browser.tabs.sendMessage.callCount;
      const msg = {
        [PORT_CONNECT]: true
      };
      const res = await func(msg);
      assert.strictEqual(browser.tabs.sendMessage.callCount, i, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const i = browser.tabs.sendMessage.callCount;
      const msg = {
        [PORT_CONNECT]: true
      };
      const sender = {};
      const res = await func(msg, sender);
      assert.strictEqual(browser.tabs.sendMessage.callCount, i, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const i = browser.tabs.sendMessage.callCount;
      const msg = {
        [PORT_CONNECT]: true
      };
      const sender = {
        tab: {}
      };
      const res = await func(msg, sender);
      assert.strictEqual(browser.tabs.sendMessage.callCount, i, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const i = browser.tabs.sendMessage.callCount;
      const msg = {
        [PORT_CONNECT]: true
      };
      const sender = {
        tab: {
          id: -1,
          windowId: 1
        }
      };
      const res = await func(msg, sender);
      assert.strictEqual(browser.tabs.sendMessage.callCount, i, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const i = browser.tabs.sendMessage.callCount;
      const msg = {
        [PORT_CONNECT]: true
      };
      const sender = {
        tab: {
          id: 1,
          windowId: -1
        }
      };
      const res = await func(msg, sender);
      assert.strictEqual(browser.tabs.sendMessage.callCount, i, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const i = browser.tabs.sendMessage.callCount;
      const msg = {
        [PORT_CONNECT]: true
      };
      const sender = {
        tab: {
          id: 1,
          windowId: 2
        }
      };
      const res = await func(msg, sender);
      assert.strictEqual(browser.tabs.sendMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [null], 'result');
    });

    it('should call function', async () => {
      const { hostStatus } = mjs;
      const i = browser.browserAction.setBadgeBackgroundColor.callCount;
      const j = browser.browserAction.setBadgeText.callCount;
      const k = browser.browserAction.setBadgeTextColor.callCount;
      const msg = {
        [HOST_VERSION]: {
          isLatest: true,
          latest: '1.2.3'
        }
      };
      const res = await func(msg);
      assert.strictEqual(
        browser.browserAction.setBadgeBackgroundColor.callCount, i + 1,
        'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeText.callCount, j + 1, 'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeTextColor.callCount, k + 1, 'called'
      );
      assert.isTrue(hostStatus[HOST_COMPAT], 'compat');
      assert.isNull(hostStatus[HOST_VERSION_LATEST], 'latest');
      assert.deepEqual(res, [[undefined, undefined, undefined]], 'result');
    });

    it('should call function', async () => {
      const { hostStatus } = mjs;
      const i = browser.browserAction.setBadgeBackgroundColor.callCount;
      const j = browser.browserAction.setBadgeText.callCount;
      const k = browser.browserAction.setBadgeTextColor.callCount;
      const msg = {
        [HOST_VERSION]: {
          isLatest: true,
          result: 1,
          latest: '1.2.3'
        }
      };
      const res = await func(msg);
      assert.strictEqual(
        browser.browserAction.setBadgeBackgroundColor.callCount, i + 1,
        'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeText.callCount, j + 1, 'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeTextColor.callCount, k + 1, 'called'
      );
      assert.isTrue(hostStatus[HOST_COMPAT], 'compat');
      assert.isNull(hostStatus[HOST_VERSION_LATEST], 'latest');
      assert.deepEqual(res, [[undefined, undefined, undefined]], 'result');
    });

    it('should call function', async () => {
      const { hostStatus } = mjs;
      const i = browser.browserAction.setBadgeBackgroundColor.callCount;
      const j = browser.browserAction.setBadgeText.callCount;
      const k = browser.browserAction.setBadgeTextColor.callCount;
      const msg = {
        [HOST_VERSION]: {
          isLatest: false,
          result: 1,
          latest: '1.2.3'
        }
      };
      const res = await func(msg);
      assert.strictEqual(
        browser.browserAction.setBadgeBackgroundColor.callCount, i + 1,
        'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeText.callCount, j + 1, 'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeTextColor.callCount, k + 1, 'called'
      );
      assert.isTrue(hostStatus[HOST_COMPAT], 'compat');
      assert.strictEqual(hostStatus[HOST_VERSION_LATEST], '1.2.3', 'latest');
      assert.deepEqual(res, [[undefined, undefined, undefined]], 'result');
    });

    it('should not call function', async () => {
      const i = browser.browserAction.setBadgeBackgroundColor.callCount;
      const j = browser.browserAction.setBadgeText.callCount;
      const k = browser.browserAction.setBadgeTextColor.callCount;
      const msg = {
        [HOST_VERSION]: {
          result: true
        }
      };
      const res = await func(msg);
      assert.strictEqual(
        browser.browserAction.setBadgeBackgroundColor.callCount, i,
        'not called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeText.callCount, j, 'not called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeTextColor.callCount, k, 'not called'
      );
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const i = browser.browserAction.setBadgeBackgroundColor.callCount;
      const j = browser.browserAction.setBadgeText.callCount;
      const k = browser.browserAction.setBadgeTextColor.callCount;
      const msg = {
        [HOST_VERSION]: {}
      };
      const res = await func(msg);
      assert.strictEqual(
        browser.browserAction.setBadgeBackgroundColor.callCount, i,
        'not called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeText.callCount, j, 'not called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeTextColor.callCount, k, 'not called'
      );
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      const msg = {
        [HOST]: {}
      };
      const res = await func(msg);
      assert.deepEqual(res, [[]], 'result');
    });

    it('should call function', async () => {
      const i = browser.runtime.reload.callCount;
      const msg = {
        [EXT_RELOAD]: true
      };
      const res = await func(msg);
      assert.strictEqual(browser.runtime.reload.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const { ports } = mjs;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com',
        browser.runtime.connect({ name: 'foo' }));
      const port = ports.get('1').get('2').get('https://example.com');
      const i = port.postMessage.callCount;
      const j = browser.storage.local.set.callCount;
      const k = browser.menus.removeAll.callCount;
      const msg = {
        [EDITOR_CONFIG_RES]: {}
      };
      browser.storage.local.get.resolves({});
      const res = await func(msg);
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.strictEqual(browser.storage.local.set.callCount, j + 1, 'called');
      assert.strictEqual(browser.menus.removeAll.callCount, k + 1, 'called');
      assert.deepEqual(res, [
        [
          undefined,
          [[[]]],
          [undefined, undefined, undefined]
        ]
      ], 'result');
    });

    it('should call function', async () => {
      const { host } = mjs;
      const i = host.postMessage.callCount;
      const msg = {
        [EDITOR_CONFIG_GET]: true
      };
      const res = await func(msg);
      assert.strictEqual(host.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const { host } = mjs;
      const i = host.postMessage.callCount;
      const msg = {
        [LOCAL_FILE_VIEW]: true
      };
      const res = await func(msg);
      assert.strictEqual(host.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const { host } = mjs;
      const i = host.postMessage.callCount;
      const msg = {
        [TMP_FILE_CREATE]: true
      };
      const res = await func(msg);
      assert.strictEqual(host.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const { host } = mjs;
      const i = host.postMessage.callCount;
      const msg = {
        [TMP_FILE_GET]: true
      };
      const res = await func(msg);
      assert.strictEqual(host.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const { menuItems } = mjs;
      menuItems[MODE_EDIT] = MODE_EDIT;
      const i = browser.menus.update.callCount;
      const msg = {
        [CONTEXT_MENU]: {
          [MODE_EDIT]: {
            enabled: true,
            menuItemId: [MODE_EDIT]
          }
        }
      };
      const res = await func(msg);
      assert.strictEqual(browser.menus.update.callCount, i + 1, 'called');
      assert.deepEqual(res, [[undefined]], 'result');
    });
  });

  describe('handle port on disconnect', () => {
    const func = mjs.handlePortOnDisconnect;
    beforeEach(() => {
      const { ports } = mjs;
      ports.clear();
    });
    afterEach(() => {
      const { ports } = mjs;
      ports.clear();
    });

    it('should call function', async () => {
      const { host, ports } = mjs;
      const i = host.postMessage.callCount;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      const res = await func({
        sender: {
          tab: {
            incognito: false,
            windowId: 1,
            id: 2
          },
          url: 'https://example.com/?foo=bar'
        }
      });
      assert.strictEqual(host.postMessage.callCount, i + 1, 'called');
      assert.isUndefined(res, 'result');
    });
  });

  describe('handle port on message', () => {
    const func = mjs.handlePortOnMsg;
    it('should get empty array', async () => {
      const msg = {
        foo: 'bar'
      };
      const res = await func(msg);
      assert.deepEqual(res, [], 'result');
    });
  });

  describe('handle connected port', () => {
    const func = mjs.handlePort;
    beforeEach(() => {
      const { menuItems, ports, varsLocal } = mjs;
      menuItems[MODE_SOURCE] = null;
      menuItems[MODE_SELECTION] = null;
      menuItems[MODE_EDIT] = null;
      ports.clear();
      varsLocal[MENU_ENABLED] = false;
      varsLocal[IS_EXECUTABLE] = true;
    });
    afterEach(() => {
      const { menuItems, ports, varsLocal } = mjs;
      menuItems[MODE_SOURCE] = null;
      menuItems[MODE_SELECTION] = null;
      menuItems[MODE_EDIT] = null;
      ports.clear();
      varsLocal[MENU_ENABLED] = false;
      varsLocal[IS_EXECUTABLE] = false;
    });

    it('should get null', async () => {
      const res = await func();
      assert.isNull(res, 'result');
    });

    it('should get null', async () => {
      const port = {
        name: PORT_CONTENT,
        sender: {}
      };
      const res = await func(port);
      assert.isNull(res, 'result');
    });

    it('should call function', async () => {
      const { ports, varsLocal } = mjs;
      const port = browser.runtime.connect({
        name: PORT_CONTENT,
        sender: {
          frameId: 0,
          tab: {
            active: true,
            id: 2,
            incognito: false,
            status: 'complete',
            windowId: 1
          },
          url: 'https://example.com'
        }
      });
      const i = port.postMessage.callCount;
      const k = browser.menus.create.callCount;
      const l = browser.menus.update.callCount;
      const res = await func(port);
      assert.strictEqual(
        ports.get('1').get('2').get('https://example.com').name,
        PORT_CONTENT, 'port'
      );
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called port msg');
      assert.strictEqual(browser.menus.create.callCount, k + 3,
        'called menus create');
      assert.strictEqual(browser.menus.update.callCount, l,
        'not called menus update');
      assert.isTrue(varsLocal[MENU_ENABLED], 'menu enabled');
      assert.deepEqual(res, [undefined, undefined, undefined], 'result');
    });

    it('should call function', async () => {
      const { ports, varsLocal } = mjs;
      const port = browser.runtime.connect({
        name: PORT_CONTENT,
        sender: {
          frameId: 0,
          tab: {
            active: false,
            id: 2,
            incognito: false,
            status: 'complete',
            windowId: 1
          },
          url: 'https://example.com'
        }
      });
      const i = port.postMessage.callCount;
      const k = browser.menus.create.callCount;
      const l = browser.menus.update.callCount;
      const res = await func(port);
      assert.strictEqual(
        ports.get('1').get('2').get('https://example.com').name,
        PORT_CONTENT, 'port'
      );
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called port msg');
      assert.isFalse(varsLocal[MENU_ENABLED], 'menu enabled');
      assert.strictEqual(browser.menus.create.callCount, k,
        'not called menus create');
      assert.strictEqual(browser.menus.update.callCount, l,
        'not called menus update');
      assert.isNull(res, 'result');
    });

    it('should not call function', async () => {
      const { ports, varsLocal } = mjs;
      const port = browser.runtime.connect({
        name: PORT_CONTENT,
        sender: {
          frameId: 0,
          tab: {
            active: false,
            id: browser.tabs.TAB_ID_NONE,
            incognito: false,
            status: 'complete',
            windowId: 1
          },
          url: 'https://example.com'
        }
      });
      const i = port.postMessage.callCount;
      const k = browser.menus.create.callCount;
      const l = browser.menus.update.callCount;
      const res = await func(port);
      assert.isFalse(ports.has('1'), 'port');
      assert.strictEqual(port.postMessage.callCount, i, 'not called port msg');
      assert.isFalse(varsLocal[MENU_ENABLED], 'menu enabled');
      assert.strictEqual(browser.menus.create.callCount, k,
        'not called menus create');
      assert.strictEqual(browser.menus.update.callCount, l,
        'not called menus update');
      assert.isNull(res, 'result');
    });
  });

  describe('handle disconnected host', () => {
    const func = mjs.handleDisconnectedHost;
    beforeEach(() => {
      const { hostStatus } = mjs;
      hostStatus[HOST_COMPAT] = false;
      hostStatus[HOST_CONNECTION] = true;
      hostStatus[HOST_VERSION_LATEST] = null;
    });
    afterEach(() => {
      const { hostStatus } = mjs;
      hostStatus[HOST_COMPAT] = false;
      hostStatus[HOST_CONNECTION] = false;
      hostStatus[HOST_VERSION_LATEST] = null;
    });

    it('should call function', async () => {
      const { hostStatus } = mjs;
      const i = browser.browserAction.setBadgeBackgroundColor.callCount;
      const j = browser.browserAction.setBadgeText.callCount;
      const k = browser.browserAction.setBadgeTextColor.callCount;
      const res = await func();
      assert.isFalse(hostStatus[HOST_CONNECTION], 'value');
      assert.strictEqual(
        browser.browserAction.setBadgeBackgroundColor.callCount, i + 1,
        'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeText.callCount, j + 1, 'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeTextColor.callCount, k + 1, 'called'
      );
      assert.deepEqual(res, [undefined, undefined, undefined], 'result');
    });
  });

  describe('handle tab activated', () => {
    const func = mjs.onTabActivated;
    beforeEach(() => {
      const { menuItems, ports, varsLocal } = mjs;
      menuItems[MODE_SOURCE] = null;
      menuItems[MODE_SELECTION] = null;
      menuItems[MODE_EDIT] = null;
      ports.clear();
      varsLocal[MENU_ENABLED] = false;
      varsLocal[IS_EXECUTABLE] = true;
    });
    afterEach(() => {
      const { menuItems, ports, varsLocal } = mjs;
      menuItems[MODE_SOURCE] = null;
      menuItems[MODE_SELECTION] = null;
      menuItems[MODE_EDIT] = null;
      ports.clear();
      varsLocal[MENU_ENABLED] = false;
      varsLocal[IS_EXECUTABLE] = false;
    });

    it('should throw', async () => {
      await func().catch(e => {
        assert.instanceOf(e, Error, 'throws');
      });
    });

    it('should call function', async () => {
      const { varsLocal } = mjs;
      const i = browser.menus.create.callCount;
      const info = {
        tabId: -1,
        windowId: -1
      };
      const res = await func(info);
      assert.strictEqual(browser.menus.create.callCount, i, 'not called');
      assert.isFalse(varsLocal[MENU_ENABLED], 'value');
      assert.deepEqual(res, [
        []
      ], 'result');
    });

    it('should call function', async () => {
      const { ports, varsLocal } = mjs;
      const stubPort = browser.runtime.connect({ name: PORT_CONTENT });
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com', stubPort);
      const port = ports.get('1').get('2').get('https://example.com');
      const i = browser.menus.create.callCount;
      const j = port.postMessage.callCount;
      const info = {
        tabId: 2,
        windowId: 1
      };
      const res = await func(info);
      assert.strictEqual(browser.menus.create.callCount, i + 3, 'called');
      assert.strictEqual(port.postMessage.callCount, j + 1, 'called');
      assert.isTrue(varsLocal[MENU_ENABLED], 'value');
      assert.deepEqual(res, [
        [],
        [
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });

    it('should call function', async () => {
      const { ports, varsLocal } = mjs;
      const stubPort = browser.runtime.connect({ name: PORT_CONTENT });
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com', stubPort);
      const port = ports.get('1').get('2').get('https://example.com');
      const i = browser.menus.create.callCount;
      const j = port.postMessage.callCount;
      const info = {
        tabId: 3,
        windowId: 1
      };
      const res = await func(info);
      assert.strictEqual(browser.menus.create.callCount, i, 'not called');
      assert.strictEqual(port.postMessage.callCount, j, 'not called');
      assert.isFalse(varsLocal[MENU_ENABLED], 'value');
      assert.deepEqual(res, [
        []
      ], 'result');
    });

    it('should call function', async () => {
      const { ports, varsLocal } = mjs;
      const stubPort = browser.runtime.connect({ name: 'foo' });
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com', stubPort);
      const port = ports.get('1').get('2').get('https://example.com');
      const i = browser.menus.create.callCount;
      const j = port.postMessage.callCount;
      const info = {
        tabId: 2,
        windowId: 1
      };
      const res = await func(info);
      assert.strictEqual(browser.menus.create.callCount, i, 'not called');
      assert.strictEqual(port.postMessage.callCount, j, 'not called');
      assert.isFalse(varsLocal[MENU_ENABLED], 'value');
      assert.deepEqual(res, [
        []
      ], 'result');
    });
  });

  describe('handle tab updated', () => {
    const func = mjs.onTabUpdated;
    beforeEach(() => {
      const { menuItems, ports, varsLocal } = mjs;
      menuItems[MODE_SOURCE] = null;
      menuItems[MODE_SELECTION] = null;
      menuItems[MODE_EDIT] = null;
      ports.clear();
      varsLocal[MENU_ENABLED] = false;
      varsLocal[IS_EXECUTABLE] = true;
    });
    afterEach(() => {
      const { menuItems, ports, varsLocal } = mjs;
      menuItems[MODE_SOURCE] = null;
      menuItems[MODE_SELECTION] = null;
      menuItems[MODE_EDIT] = null;
      ports.clear();
      varsLocal[MENU_ENABLED] = false;
      varsLocal[IS_EXECUTABLE] = false;
    });

    it('should throw', async () => {
      await func().catch(e => {
        assert.instanceOf(e, TypeError, 'error');
        assert.strictEqual(e.message, 'Expected Number but got Undefined.',
          'message');
      });
    });

    it('should throw', async () => {
      await func(1).catch(e => {
        assert.instanceOf(e, Error, 'error');
      });
    });

    it('should throw', async () => {
      await func(1, undefined, { active: true }).catch(e => {
        assert.instanceOf(e, Error, 'error');
      });
    });

    it('should get empty array', async () => {
      const res = await func(2, {}, {});
      assert.deepEqual(res, [], 'result');
    });

    it('should get empty array', async () => {
      const res = await func(2, { status: 'foo' }, { active: true });
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.create.callCount;
      const j = browser.menus.update.callCount;
      const res = await func(2, { status: 'complete' }, { active: true });
      assert.strictEqual(browser.menus.create.callCount, i, 'not called');
      assert.strictEqual(browser.menus.update.callCount, j, 'not called');
      assert.deepEqual(res, [
        []
      ], 'result');
    });

    it('should call function', async () => {
      const { ports, varsLocal } = mjs;
      const stubPort = browser.runtime.connect({ name: PORT_CONTENT });
      const i = browser.menus.create.callCount;
      const j = browser.menus.update.callCount;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com', stubPort);
      const res = await func(2, {
        status: 'complete'
      }, {
        active: true,
        url: 'https://example.com',
        windowId: 1
      });
      assert.isTrue(varsLocal[MENU_ENABLED], 'value');
      assert.strictEqual(browser.menus.create.callCount, i + 3, 'called');
      assert.strictEqual(browser.menus.update.callCount, j, 'not called');
      assert.deepEqual(res, [
        [
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });
  });

  describe('handle tab removed', () => {
    const func = mjs.onTabRemoved;
    beforeEach(() => {
      const { ports } = mjs;
      ports.clear();
    });
    afterEach(() => {
      const { ports } = mjs;
      ports.clear();
    });

    it('should throw', async () => {
      await func().catch(e => {
        assert.instanceOf(e, TypeError, 'error');
        assert.strictEqual(e.message, 'Expected Number but got Undefined.',
          'message');
      });
    });

    it('should throw', async () => {
      await func(1).catch(e => {
        assert.instanceOf(e, Error, 'error');
      });
    });

    it('should get empty array', async () => {
      const { host, ports } = mjs;
      const stubPort = browser.runtime.connect({ name: PORT_CONTENT });
      const i = host.postMessage.callCount;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com', stubPort);
      browser.windows.get.withArgs(1).rejects(new Error('error'));
      const res = await func(3, { windowId: 1 });
      assert.strictEqual(ports.get('1').size, 1, 'size');
      assert.isTrue(ports.get('1').has('2'), 'has');
      assert.strictEqual(host.postMessage.callCount, i, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should get empty array', async () => {
      const { host, ports } = mjs;
      const stubPort = browser.runtime.connect({ name: PORT_CONTENT });
      const i = host.postMessage.callCount;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com', stubPort);
      browser.windows.get.withArgs(1).resolves({
        incognito: false
      });
      const res = await func(3, { windowId: 1 });
      assert.strictEqual(ports.get('1').size, 1, 'size');
      assert.isTrue(ports.get('1').has('2'), 'has');
      assert.strictEqual(host.postMessage.callCount, i, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      const { host, ports } = mjs;
      const stubPort = browser.runtime.connect({ name: PORT_CONTENT });
      const stubPort2 = browser.runtime.connect({ name: PORT_CONTENT });
      const i = host.postMessage.callCount;
      const j = browser.windows.get.withArgs(1, null).callCount;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com', stubPort);
      ports.get('1').set('3', new Map());
      ports.get('1').get('3').set('https://www.example.com', stubPort2);
      browser.windows.get.withArgs(1, null).resolves({
        incognito: false
      });
      const res = await func(2, { windowId: 1 });
      assert.strictEqual(ports.get('1').size, 1, 'size');
      assert.isFalse(ports.get('1').has('2'), 'has');
      assert.strictEqual(host.postMessage.callCount, i + 1, 'called');
      assert.strictEqual(browser.windows.get.withArgs(1, null).callCount, j + 1,
        'called');
      assert.deepEqual(res, [null, undefined], 'result');
    });

    it('should call function', async () => {
      const { host, ports } = mjs;
      const stubPort = browser.runtime.connect({ name: PORT_CONTENT });
      const i = host.postMessage.callCount;
      const j = browser.windows.get.withArgs(1, null).callCount;
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com', stubPort);
      ports.get('1').set('3', new Map());
      ports.get('1').get('3').set('https://www.example.com', stubPort);
      browser.windows.get.withArgs(1, null).resolves({
        incognito: true
      });
      const res = await func(2, { windowId: 1 });
      assert.strictEqual(ports.get('1').size, 1, 'size');
      assert.isFalse(ports.get('1').has('2'), 'has');
      assert.strictEqual(host.postMessage.callCount, i + 1, 'called');
      assert.strictEqual(browser.windows.get.withArgs(1, null).callCount, j + 1,
        'called');
      assert.deepEqual(res, [null, undefined], 'result');
    });

    it('should call function', async () => {
      const { host, ports } = mjs;
      const stubPort = browser.runtime.connect({ name: PORT_CONTENT });
      const i = host.postMessage.callCount;
      const j = browser.windows.get.withArgs(1, null).callCount;
      ports.set('2', new Map());
      ports.get('2').set('2', new Map());
      ports.get('2').get('2').set('https://example.com', stubPort);
      ports.get('2').set('3', new Map());
      ports.get('2').get('3').set('https://www.example.com', stubPort);
      browser.windows.get.withArgs(1, null).resolves({
        incognito: true
      });
      const res = await func(2, { windowId: 1 });
      assert.strictEqual(ports.get('2').size, 2, 'size');
      assert.strictEqual(host.postMessage.callCount, i, 'not called');
      assert.strictEqual(browser.windows.get.withArgs(1, null).callCount, j + 1,
        'called');
      assert.deepEqual(res, [], 'result');
    });
  });

  describe('handle window focus changed', () => {
    const func = mjs.onWindowFocusChanged;
    beforeEach(() => {
      const { menuItems, ports, varsLocal } = mjs;
      menuItems[MODE_SOURCE] = null;
      menuItems[MODE_SELECTION] = null;
      menuItems[MODE_EDIT] = null;
      ports.clear();
      varsLocal[MENU_ENABLED] = true;
      varsLocal[IS_EXECUTABLE] = true;
    });
    afterEach(() => {
      const { menuItems, ports, varsLocal } = mjs;
      menuItems[MODE_SOURCE] = null;
      menuItems[MODE_SELECTION] = null;
      menuItems[MODE_EDIT] = null;
      ports.clear();
      varsLocal[MENU_ENABLED] = false;
      varsLocal[IS_EXECUTABLE] = false;
    });

    it('should call function', async () => {
      const i = browser.menus.create.callCount;
      const j = browser.menus.update.callCount;
      browser.windows.getCurrent.resolves({
        focused: false,
        id: 1,
        type: 'normal'
      });
      const res = await func();
      assert.strictEqual(browser.menus.create.callCount, i, 'not called');
      assert.strictEqual(browser.menus.update.callCount, j, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.create.callCount;
      const j = browser.menus.update.callCount;
      browser.windows.getCurrent.resolves({
        focused: true,
        id: browser.windows.WINDOW_ID_NONE,
        type: 'normal'
      });
      const res = await func();
      assert.strictEqual(browser.menus.create.callCount, i, 'not called');
      assert.strictEqual(browser.menus.update.callCount, j, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.create.callCount;
      const j = browser.menus.update.callCount;
      browser.windows.getCurrent.resolves({
        focused: true,
        id: 1,
        type: 'popup'
      });
      const res = await func();
      assert.strictEqual(browser.menus.create.callCount, i, 'not called');
      assert.strictEqual(browser.menus.update.callCount, j, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      const { ports } = mjs;
      const stubPort = browser.runtime.connect({ name: PORT_CONTENT });
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com', stubPort);
      const port = ports.get('1').get('2').get('https://example.com');
      const i = browser.menus.create.callCount;
      const j = browser.menus.update.callCount;
      const k = port.postMessage.callCount;
      browser.windows.getCurrent.resolves({
        focused: true,
        id: 1,
        type: 'normal'
      });
      browser.tabs.query.withArgs({
        windowId: 1,
        active: true,
        windowType: 'normal'
      }).resolves([{
        id: 2
      }]);
      const res = await func(1);
      assert.strictEqual(browser.menus.create.callCount, i + 3, 'called');
      assert.strictEqual(browser.menus.update.callCount, j, 'not called');
      assert.strictEqual(port.postMessage.callCount, k + 1, 'called');
      assert.deepEqual(res, [
        [],
        [
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });

    it('should call function', async () => {
      const { ports } = mjs;
      const stubPort = browser.runtime.connect({ name: PORT_CONTENT });
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com', stubPort);
      const port = ports.get('1').get('2').get('https://example.com');
      const i = browser.menus.create.callCount;
      const j = browser.menus.update.callCount;
      const k = port.postMessage.callCount;
      browser.windows.getCurrent.resolves({
        focused: true,
        id: 1,
        type: 'normal'
      });
      browser.tabs.query.withArgs({
        windowId: 1,
        active: true,
        windowType: 'normal'
      }).resolves([{
        id: 2
      }]);
      const res = await func(1);
      assert.strictEqual(browser.menus.create.callCount, i + 3, 'called');
      assert.strictEqual(browser.menus.update.callCount, j, 'not called');
      assert.strictEqual(port.postMessage.callCount, k + 1, 'called');
      assert.deepEqual(res, [
        [],
        [
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });
  });

  describe('handle window removed', () => {
    const func = mjs.onWindowRemoved;
    beforeEach(() => {
      const { ports } = mjs;
      ports.clear();
    });
    afterEach(() => {
      const { ports } = mjs;
      ports.clear();
    });

    it('should throw', async () => {
      await func().catch(e => {
        assert.instanceOf(e, TypeError, 'error');
        assert.strictEqual(e.message, 'Expected Number but got Undefined.',
          'message');
      });
    });

    it('should restore ports', async () => {
      const { host, ports } = mjs;
      ports.set('1', new Map());
      const i = host.postMessage.callCount;
      browser.windows.getAll.withArgs({
        windowTypes: ['normal']
      }).resolves([{
        incognito: false
      }]);
      const res = await func(1);
      assert.isFalse(ports.has('1'), 'restored');
      assert.strictEqual(host.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [null, undefined], 'result');
    });

    it('should not restore ports', async () => {
      const { host, ports } = mjs;
      ports.set('1', new Map());
      const i = host.postMessage.callCount;
      browser.windows.getAll.withArgs({
        windowTypes: ['normal']
      }).resolves([{
        incognito: false
      }]);
      const res = await func(-1);
      assert.isTrue(ports.has('1'), 'not restored');
      assert.strictEqual(host.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should not call function', async () => {
      const { host, ports } = mjs;
      ports.set('1', new Map());
      const i = host.postMessage.callCount;
      browser.windows.getAll.withArgs({
        populate: false,
        windowTypes: ['normal']
      }).resolves([{
        incognito: true
      }]);
      const res = await func(1);
      assert.isFalse(ports.has('1'), 'restored');
      assert.strictEqual(host.postMessage.callCount, i, 'not called');
      assert.deepEqual(res, [null], 'result');
    });
  });

  describe('handle command', () => {
    const func = mjs.handleCmd;

    it('should throw', async () => {
      await func().catch(e => {
        assert.instanceOf(e, TypeError, 'error');
        assert.strictEqual(e.message, 'Expected String but got Undefined.',
          'message');
      });
    });

    it('should get null', async () => {
      const res = await func('foo');
      assert.isNull(res, 'result');
    });

    it('should call function', async () => {
      const i = browser.runtime.openOptionsPage.callCount;
      browser.runtime.openOptionsPage.resolves(undefined);
      const res = await func(OPTIONS_OPEN);
      assert.strictEqual(browser.runtime.openOptionsPage.callCount, i + 1,
        'called');
      assert.isUndefined(res, 'result');
    });

    it('should call function', async () => {
      const { ports } = mjs;
      const stubPort = browser.runtime.connect({ name: PORT_CONTENT });
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com', stubPort);
      const port = ports.get('1').get('2').get('https://example.com');
      const i = port.postMessage.callCount;
      const j = browser.tabs.query.callCount;
      browser.tabs.query.withArgs({
        windowId: browser.windows.WINDOW_ID_CURRENT,
        active: true,
        windowType: 'normal'
      }).resolves([{
        id: 2,
        windowId: 1
      }]);
      const res = await func(EDITOR_EXEC);
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.strictEqual(browser.tabs.query.callCount, j + 1, 'called');
      assert.deepEqual(res, [], 'result');
    });
  });

  describe('post variable', () => {
    const func = mjs.portPostVar;
    beforeEach(() => {
      const { ports } = mjs;
      const port = browser.runtime.connect({
        name: PORT_CONTENT
      });
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com', port);
    });
    afterEach(() => {
      const { ports } = mjs;
      ports.clear();
    });

    it('should get null', async () => {
      const res = await func();
      assert.isNull(res, 'result');
    });

    it('should call function', async () => {
      const { ports } = mjs;
      const port = ports.get('1').get('2').get('https://example.com');
      const i = port.postMessage.callCount;
      const res = await func({
        foo: 'bar'
      });
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [[[]]], 'result');
    });
  });

  describe('set variable', () => {
    const func = mjs.setVar;
    beforeEach(() => {
      const { menuItems, ports, vars, varsLocal } = mjs;
      menuItems[MODE_SOURCE] = null;
      menuItems[MODE_SELECTION] = null;
      menuItems[MODE_EDIT] = null;
      ports.clear();
      vars[ONLY_EDITABLE] = false;
      vars[SYNC_AUTO] = false;
      vars[SYNC_AUTO_URL] = null;
      varsLocal[EDITOR_LABEL] = '';
      varsLocal[IS_EXECUTABLE] = false;
      varsLocal[ICON_ID] = '';
      varsLocal[MENU_ENABLED] = true;
    });
    afterEach(() => {
      const { menuItems, ports, vars, varsLocal } = mjs;
      menuItems[MODE_SOURCE] = null;
      menuItems[MODE_SELECTION] = null;
      menuItems[MODE_EDIT] = null;
      ports.clear();
      vars[ONLY_EDITABLE] = false;
      vars[SYNC_AUTO] = false;
      vars[SYNC_AUTO_URL] = null;
      varsLocal[EDITOR_LABEL] = '';
      varsLocal[IS_EXECUTABLE] = false;
      varsLocal[ICON_ID] = '';
      varsLocal[MENU_ENABLED] = false;
    });

    it('should throw', async () => {
      await func().catch(e => {
        assert.strictEqual(e.message, 'Expected String but got Undefined.',
          'throw');
      });
    });

    it('should get empty array', async () => {
      const res = await func('foo');
      assert.deepEqual(res, [], 'result');
    });

    it('should get empty array', async () => {
      const res = await func('foo', {
        bar: 'baz'
      });
      assert.deepEqual(res, [], 'result');
    });

    it('should set value', async () => {
      const { ports, vars } = mjs;
      const port = browser.runtime.connect({
        name: PORT_CONTENT
      });
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com', port);
      const i = port.postMessage.callCount;
      const res = await func(SYNC_AUTO_URL, {
        value: 'https://example.com'
      });
      assert.strictEqual(vars[SYNC_AUTO_URL], 'https://example.com', 'value');
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [[[[]]]], 'result');
    });

    it('should set value', async () => {
      const { vars } = mjs;
      const res = await func(SYNC_AUTO_URL, {
        value: 'https://example.com'
      });
      assert.strictEqual(vars[SYNC_AUTO_URL], 'https://example.com', 'value');
      assert.deepEqual(res, [], 'result');
    });

    it('should set value', async () => {
      const { ports, vars } = mjs;
      const port = browser.runtime.connect({
        name: PORT_CONTENT
      });
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com', port);
      const i = port.postMessage.callCount;
      const res = await func(SYNC_AUTO, {
        checked: true
      });
      assert.isTrue(vars[SYNC_AUTO], 'value');
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [[[[]]]], 'result');
    });

    it('should set value', async () => {
      const { vars } = mjs;
      const res = await func(SYNC_AUTO, {
        checked: true
      });
      assert.isTrue(vars[SYNC_AUTO], 'value');
      assert.deepEqual(res, [], 'result');
    });

    it('should set value', async () => {
      const { ports, vars } = mjs;
      const port = browser.runtime.connect({
        name: PORT_CONTENT
      });
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com', port);
      const i = port.postMessage.callCount;
      const res = await func(ONLY_EDITABLE, {
        checked: true
      });
      assert.isTrue(vars[ONLY_EDITABLE], 'value');
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [[[[]]]], 'result');
    });

    it('should set value', async () => {
      const { vars } = mjs;
      const res = await func(ONLY_EDITABLE, {
        checked: true
      });
      assert.isTrue(vars[ONLY_EDITABLE], 'value');
      assert.deepEqual(res, [], 'result');
    });

    it('should set value', async () => {
      const { ports, vars } = mjs;
      const port = browser.runtime.connect({
        name: PORT_CONTENT
      });
      ports.set('1', new Map());
      ports.get('1').set('2', new Map());
      ports.get('1').get('2').set('https://example.com', port);
      const i = port.postMessage.callCount;
      const j = browser.menus.removeAll.callCount;
      const res = await func(ONLY_EDITABLE, {
        checked: true
      }, true);
      assert.isTrue(vars[ONLY_EDITABLE], 'value');
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.strictEqual(browser.menus.removeAll.callCount, j + 1, 'called');
      assert.deepEqual(res, [
        [[[]]],
        [undefined]
      ], 'result');
    });

    it('should set value', async () => {
      const { varsLocal } = mjs;
      const i = browser.browserAction.setIcon.callCount;
      browser.runtime.getURL.callsFake(arg => arg);
      const res = await func(ICON_AUTO, {
        checked: true,
        value: '#auto'
      }, true);
      assert.strictEqual(varsLocal[ICON_ID], '#auto', 'value');
      assert.strictEqual(browser.browserAction.setIcon.callCount, i + 1,
        'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should set value', async () => {
      const { varsLocal } = mjs;
      const i = browser.browserAction.setIcon.callCount;
      browser.runtime.getURL.callsFake(arg => arg);
      const res = await func(ICON_BLACK, {
        checked: true,
        value: '#black'
      }, true);
      assert.strictEqual(varsLocal[ICON_ID], '#black', 'value');
      assert.strictEqual(browser.browserAction.setIcon.callCount, i + 1,
        'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should set value', async () => {
      const { varsLocal } = mjs;
      const i = browser.browserAction.setIcon.callCount;
      browser.runtime.getURL.callsFake(arg => arg);
      const res = await func(ICON_COLOR, {
        checked: true,
        value: '#color'
      }, true);
      assert.strictEqual(varsLocal[ICON_ID], '#color', 'value');
      assert.strictEqual(browser.browserAction.setIcon.callCount, i + 1,
        'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should set value', async () => {
      const { varsLocal } = mjs;
      const i = browser.browserAction.setIcon.callCount;
      browser.runtime.getURL.callsFake(arg => arg);
      const res = await func(ICON_DARK, {
        checked: true,
        value: '#dark'
      }, true);
      assert.strictEqual(varsLocal[ICON_ID], '#dark', 'value');
      assert.strictEqual(browser.browserAction.setIcon.callCount, i + 1,
        'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should set value', async () => {
      const { varsLocal } = mjs;
      const i = browser.browserAction.setIcon.callCount;
      browser.runtime.getURL.callsFake(arg => arg);
      const res = await func(ICON_LIGHT, {
        checked: true,
        value: '#light'
      }, true);
      assert.strictEqual(varsLocal[ICON_ID], '#light', 'value');
      assert.strictEqual(browser.browserAction.setIcon.callCount, i + 1,
        'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should set value', async () => {
      const { varsLocal } = mjs;
      const i = browser.browserAction.setIcon.callCount;
      browser.runtime.getURL.callsFake(arg => arg);
      const res = await func(ICON_WHITE, {
        checked: true,
        value: '#white'
      }, true);
      assert.strictEqual(varsLocal[ICON_ID], '#white', 'value');
      assert.strictEqual(browser.browserAction.setIcon.callCount, i + 1,
        'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should set value but not call function', async () => {
      const { varsLocal } = mjs;
      const i = browser.browserAction.setIcon.callCount;
      browser.runtime.getURL.callsFake(arg => arg);
      const res = await func(ICON_AUTO, {
        checked: true,
        value: '#auto'
      });
      assert.strictEqual(varsLocal[ICON_ID], '#auto', 'value');
      assert.strictEqual(browser.browserAction.setIcon.callCount, i + 1,
        'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should not set value', async () => {
      const { varsLocal } = mjs;
      const i = browser.browserAction.setIcon.callCount;
      browser.runtime.getURL.callsFake(arg => arg);
      const res = await func(ICON_AUTO, {
        checked: false,
        value: '#auto'
      });
      assert.strictEqual(varsLocal[ICON_ID], '', 'value');
      assert.strictEqual(browser.browserAction.setIcon.callCount, i,
        'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      const i = browser.notifications.onClosed.addListener.callCount;
      const res = await func(HOST_ERR_NOTIFY, {
        checked: true
      });
      assert.strictEqual(browser.notifications.onClosed.addListener.callCount,
        i + 1, 'called');
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const i = browser.notifications.onClosed.addListener.callCount;
      const res = await func(HOST_ERR_NOTIFY, {
        checked: false
      });
      assert.strictEqual(browser.notifications.onClosed.addListener.callCount,
        i, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should set value', async () => {
      const { varsLocal } = mjs;
      const i = browser.menus.create.callCount;
      varsLocal[IS_EXECUTABLE] = true;
      const res = await func(EDITOR_LABEL, {
        value: 'foo'
      }, true);
      assert.strictEqual(varsLocal[EDITOR_LABEL], 'foo', 'value');
      assert.strictEqual(browser.menus.create.callCount, i + 3, 'called');
      assert.deepEqual(res, [
        undefined,
        [undefined, undefined, undefined]
      ], 'result');
    });

    it('should set value', async () => {
      const { varsLocal } = mjs;
      const i = browser.menus.create.callCount;
      varsLocal[IS_EXECUTABLE] = true;
      const res = await func(EDITOR_LABEL, {
        value: 'foo'
      });
      assert.strictEqual(varsLocal[EDITOR_LABEL], 'foo', 'value');
      assert.strictEqual(browser.menus.create.callCount, i, 'not called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should set value', async () => {
      const { varsLocal } = mjs;
      const i = browser.browserAction.setBadgeBackgroundColor.callCount;
      const j = browser.browserAction.setBadgeText.callCount;
      const k = browser.browserAction.setBadgeTextColor.callCount;
      const res = await func(EDITOR_FILE_NAME, {
        app: {
          executable: true
        }
      }, true);
      assert.isTrue(varsLocal[IS_EXECUTABLE], 'value');
      assert.strictEqual(
        browser.browserAction.setBadgeBackgroundColor.callCount, i + 1,
        'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeText.callCount, j + 1, 'called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeTextColor.callCount, k + 1, 'called'
      );
      assert.deepEqual(res, [[undefined, undefined, undefined]], 'result');
    });

    it('should set value', async () => {
      const { varsLocal } = mjs;
      const i = browser.browserAction.setBadgeBackgroundColor.callCount;
      const j = browser.browserAction.setBadgeText.callCount;
      const k = browser.browserAction.setBadgeTextColor.callCount;
      const res = await func(EDITOR_FILE_NAME, {
        app: {
          executable: true
        }
      });
      assert.isTrue(varsLocal[IS_EXECUTABLE], 'value');
      assert.strictEqual(
        browser.browserAction.setBadgeBackgroundColor.callCount, i,
        'not called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeText.callCount, j, 'not called'
      );
      assert.strictEqual(
        browser.browserAction.setBadgeTextColor.callCount, k, 'not called'
      );
      assert.deepEqual(res, [], 'result');
    });
  });

  describe('set variables', () => {
    const func = mjs.setVars;

    it('should not set variables', async () => {
      const res = await func();
      assert.deepEqual(res, [], 'result');
    });

    it('should set variables', async () => {
      const res = await func({
        foo: {
          checked: true
        }
      });
      assert.deepEqual(res, [[]], 'result');
    });
  });

  describe('set OS', () => {
    const func = mjs.setOs;
    beforeEach(() => {
      mjs.vars[IS_MAC] = false;
    });
    afterEach(() => {
      mjs.vars[IS_MAC] = false;
    });

    it('should set variables', async () => {
      browser.runtime.getPlatformInfo.resolves({
        os: 'mac'
      });
      await func();
      assert.isTrue(mjs.vars[IS_MAC], 'result');
    });

    it('should set variables', async () => {
      browser.runtime.getPlatformInfo.resolves({
        os: 'foo'
      });
      await func();
      assert.isFalse(mjs.vars[IS_MAC], 'result');
    });
  });
});
