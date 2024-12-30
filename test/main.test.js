/**
 * main.test.js
 */
/* eslint-disable import-x/order */

/* api */
import { strict as assert } from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'mocha';
import sinon from 'sinon';
import { browser, mockPort } from './mocha/setup.js';

/* test */
import {
  CONTEXT_MENU, EDITOR_CONFIG_GET, EDITOR_CONFIG_RES, EDITOR_EXEC,
  EDITOR_FILE_NAME, EDITOR_LABEL, FILE_EXT_SELECT, FILE_EXT_SELECT_HTML,
  FILE_EXT_SELECT_MD, FILE_EXT_SELECT_TXT, HOST, HOST_COMPAT, HOST_CONNECTION,
  HOST_ERR_NOTIFY, HOST_STATUS_GET, HOST_VERSION, HOST_VERSION_LATEST,
  INFO_COLOR, INFO_TEXT, IS_CONNECTABLE, IS_EXECUTABLE, IS_MAC,
  LOCAL_FILE_VIEW, MENU_ENABLED, MODE_EDIT, MODE_EDIT_HTML, MODE_EDIT_MD,
  MODE_EDIT_TXT, MODE_MATHML, MODE_SELECTION, MODE_SOURCE, MODE_SVG,
  ONLY_EDITABLE, OPTIONS_OPEN, PROCESS_CHILD, SYNC_AUTO, SYNC_AUTO_URL,
  TMP_FILE_CREATE, TMP_FILE_DATA_PORT, TMP_FILE_DATA_REMOVE, TMP_FILE_GET,
  TMP_FILE_RES, WARN_COLOR, WARN_TEXT
} from '../src/mjs/constant.js';
import * as mjs from '../src/mjs/main.js';

describe('main', () => {
  beforeEach(() => {
    browser._sandbox.reset();
    browser.i18n.getMessage.callsFake((...args) => args.toString());
    browser.menus.removeAll.resolves(undefined);
    browser.permissions.contains.resolves(true);
    browser.runtime.connect.callsFake(mockPort);
    browser.runtime.connectNative.callsFake(name => mockPort({ name }));
    global.browser = browser;
  });
  afterEach(() => {
    delete global.browser;
    browser._sandbox.reset();
  });

  describe('set options', () => {
    const func = mjs.setOpts;
    beforeEach(() => {
      mjs.localOpts.clear();
      mjs.globalOpts.clear();
    });
    afterEach(() => {
      mjs.localOpts.clear();
      mjs.globalOpts.clear();
    });

    it('should not set option', async () => {
      await func({
        foo: {
          checked: true
        }
      });
      assert.strictEqual(mjs.localOpts.size, 0, 'local');
      assert.strictEqual(mjs.globalOpts.size, 0, 'global');
    });

    it('should set option', async () => {
      await func({
        [SYNC_AUTO_URL]: {}
      });
      assert.strictEqual(mjs.localOpts.size, 0, 'local');
      assert.strictEqual(mjs.globalOpts.size, 1, 'global');
      assert.strictEqual(mjs.globalOpts.has(SYNC_AUTO_URL), true, 'key');
      assert.strictEqual(mjs.globalOpts.get(SYNC_AUTO_URL), null, 'value');
    });

    it('should set option', async () => {
      await func({
        [SYNC_AUTO_URL]: {
          value: ''
        }
      });
      assert.strictEqual(mjs.localOpts.size, 0, 'local');
      assert.strictEqual(mjs.globalOpts.size, 1, 'global');
      assert.strictEqual(mjs.globalOpts.has(SYNC_AUTO_URL), true, 'key');
      assert.strictEqual(mjs.globalOpts.get(SYNC_AUTO_URL), '', 'value');
    });

    it('should set option', async () => {
      await func({
        [SYNC_AUTO_URL]: {
          value: 'https://example.com'
        }
      });
      assert.strictEqual(mjs.localOpts.size, 0, 'local');
      assert.strictEqual(mjs.globalOpts.size, 1, 'global');
      assert.strictEqual(mjs.globalOpts.has(SYNC_AUTO_URL), true, 'key');
      assert.strictEqual(mjs.globalOpts.get(SYNC_AUTO_URL),
        'https://example.com', 'value');
    });

    it('should set option', async () => {
      await func({
        [ONLY_EDITABLE]: {
          checked: true
        }
      });
      assert.strictEqual(mjs.localOpts.size, 0, 'local');
      assert.strictEqual(mjs.globalOpts.size, 1, 'global');
      assert.strictEqual(mjs.globalOpts.has(ONLY_EDITABLE), true, 'key');
      assert.strictEqual(mjs.globalOpts.get(ONLY_EDITABLE), true, 'value');
    });

    it('should set option', async () => {
      await func({
        [SYNC_AUTO]: {
          checked: true
        }
      });
      assert.strictEqual(mjs.localOpts.size, 0, 'local');
      assert.strictEqual(mjs.globalOpts.size, 1, 'global');
      assert.strictEqual(mjs.globalOpts.has(SYNC_AUTO), true, 'key');
      assert.strictEqual(mjs.globalOpts.get(SYNC_AUTO), true, 'value');
    });

    it('should set option', async () => {
      await func({
        [EDITOR_FILE_NAME]: {
          app: {}
        }
      });
      assert.strictEqual(mjs.localOpts.size, 1, 'local');
      assert.strictEqual(mjs.globalOpts.size, 0, 'global');
      assert.strictEqual(mjs.localOpts.has(IS_EXECUTABLE), true, 'key');
      assert.strictEqual(mjs.localOpts.get(IS_EXECUTABLE), false, 'value');
    });

    it('should set option', async () => {
      await func({
        [EDITOR_FILE_NAME]: {
          app: {
            executable: false
          }
        }
      });
      assert.strictEqual(mjs.localOpts.size, 1, 'local');
      assert.strictEqual(mjs.globalOpts.size, 0, 'global');
      assert.strictEqual(mjs.localOpts.has(IS_EXECUTABLE), true, 'key');
      assert.strictEqual(mjs.localOpts.get(IS_EXECUTABLE), false, 'value');
    });

    it('should set option', async () => {
      await func({
        [EDITOR_FILE_NAME]: {
          app: {
            executable: true
          }
        }
      });
      assert.strictEqual(mjs.localOpts.size, 1, 'local');
      assert.strictEqual(mjs.globalOpts.size, 0, 'global');
      assert.strictEqual(mjs.localOpts.has(IS_EXECUTABLE), true, 'key');
      assert.strictEqual(mjs.localOpts.get(IS_EXECUTABLE), true, 'value');
    });

    it('should set option', async () => {
      await func({
        [EDITOR_LABEL]: {}
      });
      assert.strictEqual(mjs.localOpts.size, 1, 'local');
      assert.strictEqual(mjs.globalOpts.size, 0, 'global');
      assert.strictEqual(mjs.localOpts.has(EDITOR_LABEL), true, 'key');
      assert.strictEqual(mjs.localOpts.get(EDITOR_LABEL), '', 'value');
    });

    it('should set option', async () => {
      await func({
        [EDITOR_LABEL]: {
          value: ''
        }
      });
      assert.strictEqual(mjs.localOpts.size, 1, 'local');
      assert.strictEqual(mjs.globalOpts.size, 0, 'global');
      assert.strictEqual(mjs.localOpts.has(EDITOR_LABEL), true, 'key');
      assert.strictEqual(mjs.localOpts.get(EDITOR_LABEL), '', 'value');
    });

    it('should set option', async () => {
      await func({
        [EDITOR_LABEL]: {
          value: 'foo'
        }
      });
      assert.strictEqual(mjs.localOpts.size, 1, 'local');
      assert.strictEqual(mjs.globalOpts.size, 0, 'global');
      assert.strictEqual(mjs.localOpts.has(EDITOR_LABEL), true, 'key');
      assert.strictEqual(mjs.localOpts.get(EDITOR_LABEL), 'foo', 'value');
    });

    it('should set option', async () => {
      await func({
        [FILE_EXT_SELECT]: {
          checked: true
        }
      });
      assert.strictEqual(mjs.localOpts.size, 1, 'local');
      assert.strictEqual(mjs.globalOpts.size, 0, 'global');
      assert.strictEqual(mjs.localOpts.has(FILE_EXT_SELECT), true, 'key');
      assert.strictEqual(mjs.localOpts.get(FILE_EXT_SELECT), true, 'value');
    });

    it('should set option', async () => {
      await func({
        [FILE_EXT_SELECT_HTML]: {
          checked: true
        }
      });
      assert.strictEqual(mjs.localOpts.size, 1, 'local');
      assert.strictEqual(mjs.globalOpts.size, 0, 'global');
      assert.strictEqual(mjs.localOpts.has(FILE_EXT_SELECT_HTML), true, 'key');
      assert.strictEqual(mjs.localOpts.get(FILE_EXT_SELECT_HTML), true,
        'value');
    });

    it('should set option', async () => {
      await func({
        [FILE_EXT_SELECT_MD]: {
          checked: true
        }
      });
      assert.strictEqual(mjs.localOpts.size, 1, 'local');
      assert.strictEqual(mjs.globalOpts.size, 0, 'global');
      assert.strictEqual(mjs.localOpts.has(FILE_EXT_SELECT_MD), true, 'key');
      assert.strictEqual(mjs.localOpts.get(FILE_EXT_SELECT_MD), true, 'value');
    });

    it('should set option', async () => {
      await func({
        [FILE_EXT_SELECT_TXT]: {
          checked: true
        }
      });
      assert.strictEqual(mjs.localOpts.size, 1, 'local');
      assert.strictEqual(mjs.globalOpts.size, 0, 'global');
      assert.strictEqual(mjs.localOpts.has(FILE_EXT_SELECT_TXT), true, 'key');
      assert.strictEqual(mjs.localOpts.get(FILE_EXT_SELECT_TXT), true, 'value');
    });

    it('should set default options', async () => {
      browser.runtime.getPlatformInfo.resolves({
        os: 'win'
      });
      const i = browser.storage.local.get.callCount;
      await func();
      assert.strictEqual(browser.storage.local.get.callCount, i, 'not called');
      assert.strictEqual(mjs.localOpts.size, 1, 'local');
      assert.strictEqual(mjs.localOpts.has(MENU_ENABLED), true, 'key');
      assert.strictEqual(mjs.localOpts.get(MENU_ENABLED), false, 'value');
      assert.strictEqual(mjs.globalOpts.size, 1, 'global');
      assert.strictEqual(mjs.globalOpts.has(IS_MAC), true, 'key');
      assert.strictEqual(mjs.globalOpts.get(IS_MAC), false, 'value');
    });

    it('should set default options', async () => {
      browser.runtime.getPlatformInfo.resolves({
        os: 'mac'
      });
      const i = browser.storage.local.get.callCount;
      await func();
      assert.strictEqual(browser.storage.local.get.callCount, i, 'not called');
      assert.strictEqual(mjs.localOpts.size, 1, 'local');
      assert.strictEqual(mjs.localOpts.has(MENU_ENABLED), true, 'key');
      assert.strictEqual(mjs.localOpts.get(MENU_ENABLED), false, 'value');
      assert.strictEqual(mjs.globalOpts.size, 1, 'global');
      assert.strictEqual(mjs.globalOpts.has(IS_MAC), true, 'key');
      assert.strictEqual(mjs.globalOpts.get(IS_MAC), true, 'value');
    });

    it('should call function', async () => {
      browser.runtime.getPlatformInfo.resolves({
        os: 'win'
      });
      browser.storage.local.get.resolves({});
      const i = browser.storage.local.get.callCount;
      await func(null, true);
      assert.strictEqual(browser.storage.local.get.callCount, i + 1, 'called');
      assert.strictEqual(mjs.localOpts.size, 1, 'local');
      assert.strictEqual(mjs.localOpts.has(MENU_ENABLED), true, 'key');
      assert.strictEqual(mjs.localOpts.get(MENU_ENABLED), false, 'value');
      assert.strictEqual(mjs.globalOpts.size, 1, 'global');
      assert.strictEqual(mjs.globalOpts.has(IS_MAC), true, 'key');
      assert.strictEqual(mjs.globalOpts.get(IS_MAC), false, 'value');
    });
  });

  describe('toggle badge', () => {
    const func = mjs.toggleBadge;
    beforeEach(() => {
      mjs.appHost.clear();
      mjs.localOpts.clear();
    });
    afterEach(() => {
      mjs.appHost.clear();
      mjs.localOpts.clear();
    });

    it('should call function', async () => {
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      browser.action.setBadgeBackgroundColor.callsFake(arg => arg);
      browser.action.setBadgeText.callsFake(arg => arg);
      browser.action.setBadgeTextColor.callsFake(arg => arg);
      const res = await func();
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount,
        i + 1, 'called');
      assert.strictEqual(browser.action.setBadgeText.callCount, j + 1,
        'called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k + 1,
        'called');
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
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      browser.action.setBadgeBackgroundColor.callsFake(arg => arg);
      browser.action.setBadgeText.callsFake(arg => arg);
      browser.action.setBadgeTextColor.callsFake(arg => arg);
      mjs.appHost.set('status', {
        [HOST_CONNECTION]: true,
        [HOST_COMPAT]: true
      });
      mjs.localOpts.set(IS_EXECUTABLE, true);
      const res = await func();
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount,
        i + 1, 'called');
      assert.strictEqual(browser.action.setBadgeText.callCount, j + 1,
        'called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k,
        'not called');
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
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      browser.action.setBadgeBackgroundColor.callsFake(arg => arg);
      browser.action.setBadgeText.callsFake(arg => arg);
      browser.action.setBadgeTextColor.callsFake(arg => arg);
      mjs.appHost.set('status', {
        [HOST_CONNECTION]: false,
        [HOST_COMPAT]: true
      });
      mjs.localOpts.set(IS_EXECUTABLE, true);
      const res = await func();
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount,
        i + 1, 'called');
      assert.strictEqual(browser.action.setBadgeText.callCount, j + 1,
        'called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k + 1,
        'called');
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
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      browser.action.setBadgeBackgroundColor.callsFake(arg => arg);
      browser.action.setBadgeText.callsFake(arg => arg);
      browser.action.setBadgeTextColor.callsFake(arg => arg);
      mjs.appHost.set('status', {
        [HOST_CONNECTION]: true,
        [HOST_COMPAT]: false
      });
      mjs.localOpts.set(IS_EXECUTABLE, true);
      const res = await func();
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount,
        i + 1, 'called');
      assert.strictEqual(browser.action.setBadgeText.callCount, j + 1,
        'called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k + 1,
        'called');
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
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      browser.action.setBadgeBackgroundColor.callsFake(arg => arg);
      browser.action.setBadgeText.callsFake(arg => arg);
      browser.action.setBadgeTextColor.callsFake(arg => arg);
      mjs.appHost.set('status', {
        [HOST_CONNECTION]: true,
        [HOST_COMPAT]: true
      });
      mjs.localOpts.set(IS_EXECUTABLE, false);
      const res = await func();
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount,
        i + 1, 'called');
      assert.strictEqual(browser.action.setBadgeText.callCount, j + 1,
        'called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k + 1,
        'called');
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
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      browser.action.setBadgeBackgroundColor.callsFake(arg => arg);
      browser.action.setBadgeText.callsFake(arg => arg);
      browser.action.setBadgeTextColor.callsFake(arg => arg);
      mjs.appHost.set('status', {
        [HOST_CONNECTION]: true,
        [HOST_COMPAT]: true,
        [HOST_VERSION_LATEST]: '1.2.3'
      });
      mjs.localOpts.set(IS_EXECUTABLE, true);
      const res = await func();
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount,
        i + 1, 'called');
      assert.strictEqual(browser.action.setBadgeText.callCount, j + 1,
        'called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k + 1,
        'called');
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

  describe('context menu items', () => {
    it('should have keys', () => {
      const keys = [
        MODE_EDIT,
        MODE_EDIT_HTML,
        MODE_EDIT_MD,
        MODE_EDIT_TXT,
        MODE_MATHML,
        MODE_SELECTION,
        MODE_SOURCE,
        MODE_SVG,
        OPTIONS_OPEN
      ];
      const { menuItems } = mjs;
      const items = Object.entries(menuItems);
      for (const [key, value] of items) {
        assert.strictEqual(keys.includes(key), true, `${key} key`);
        assert.strictEqual(value.id, key, `${key} id`);
        assert.strictEqual(Array.isArray(value.contexts), true,
          `${key} contexts`);
        assert.strictEqual(value.placeholder.includes('&'), true,
          `${key} placeholder`);
      }
    });
  });

  describe('create menu item data', () => {
    const func = mjs.createMenuItemData;
    beforeEach(() => {
      browser.i18n.getMessage.callsFake((...args) => args.toString());
      browser.runtime.id = null;
      mjs.appHost.clear();
      mjs.localOpts.clear();
      mjs.globalOpts.clear();
    });
    afterEach(() => {
      browser.runtime.id = null;
      mjs.appHost.clear();
      mjs.localOpts.clear();
      mjs.globalOpts.clear();
    });

    it('should get empty object', () => {
      const res = func();
      assert.deepEqual(res, {}, 'result');
    });

    it('should get empty object', () => {
      const res = func('foo');
      assert.deepEqual(res, {}, 'result');
    });

    it('should get object', () => {
      const res = func(OPTIONS_OPEN);
      assert.deepEqual(res, {
        contexts: [
          'browser_action'
        ],
        enabled: true,
        title: 'openOptionsPage_key,(&T)',
        visible: true
      }, 'result');
    });

    it('should get object', () => {
      mjs.localOpts.set(EDITOR_LABEL, 'foo');
      mjs.localOpts.set(MENU_ENABLED, true);
      const res = func(MODE_EDIT);
      assert.deepEqual(res, {
        contexts: [
          'editable'
        ],
        enabled: false,
        title: 'modeEditText_key,foo,(&E)',
        visible: true
      }, 'result');
    });

    it('should get object', () => {
      mjs.localOpts.set(EDITOR_LABEL, 'foo');
      mjs.localOpts.set(IS_EXECUTABLE, true);
      mjs.localOpts.set(MENU_ENABLED, true);
      const res = func(MODE_EDIT);
      assert.deepEqual(res, {
        contexts: [
          'editable'
        ],
        enabled: false,
        title: 'modeEditText_key,foo,(&E)',
        visible: true
      }, 'result');
    });

    it('should get object', () => {
      mjs.appHost.set('status', {
        [HOST_COMPAT]: true
      });
      mjs.localOpts.set(EDITOR_LABEL, 'foo');
      mjs.localOpts.set(IS_EXECUTABLE, true);
      mjs.localOpts.set(MENU_ENABLED, true);
      const res = func(MODE_EDIT);
      assert.deepEqual(res, {
        contexts: [
          'editable'
        ],
        enabled: true,
        title: 'modeEditText_key,foo,(&E)',
        visible: true
      }, 'result');
    });

    it('should get object', () => {
      mjs.localOpts.set(EDITOR_LABEL, 'foo');
      mjs.localOpts.set(MENU_ENABLED, true);
      const res = func(MODE_SELECTION);
      assert.deepEqual(res, {
        contexts: [
          'selection'
        ],
        enabled: false,
        title: 'modeViewSelection_key,foo,(&V)',
        visible: true
      }, 'result');
    });

    it('should get object', () => {
      mjs.localOpts.set(EDITOR_LABEL, 'foo');
      mjs.localOpts.set(IS_EXECUTABLE, true);
      mjs.localOpts.set(MENU_ENABLED, true);
      mjs.globalOpts.set(ONLY_EDITABLE, true);
      const res = func(MODE_SELECTION);
      assert.deepEqual(res, {
        contexts: [
          'selection'
        ],
        enabled: false,
        title: 'modeViewSelection_key,foo,(&V)',
        visible: false
      }, 'result');
    });

    it('should get object', () => {
      mjs.appHost.set('status', {
        [HOST_COMPAT]: true
      });
      mjs.localOpts.set(EDITOR_LABEL, 'foo');
      mjs.localOpts.set(IS_EXECUTABLE, true);
      mjs.localOpts.set(MENU_ENABLED, true);
      mjs.globalOpts.set(ONLY_EDITABLE, true);
      const res = func(MODE_SELECTION);
      assert.deepEqual(res, {
        contexts: [
          'selection'
        ],
        enabled: true,
        title: 'modeViewSelection_key,foo,(&V)',
        visible: false
      }, 'result');
    });

    it('should get object', () => {
      mjs.localOpts.set(EDITOR_LABEL, 'foo');
      mjs.localOpts.set(MENU_ENABLED, true);
      const res = func(MODE_SOURCE);
      assert.deepEqual(res, {
        contexts: [
          'frame',
          'page'
        ],
        enabled: false,
        title: 'modeViewSource_key,foo,(&V)',
        visible: true
      }, 'result');
    });

    it('should get object', () => {
      mjs.localOpts.set(EDITOR_LABEL, 'foo');
      mjs.localOpts.set(IS_EXECUTABLE, true);
      mjs.localOpts.set(MENU_ENABLED, true);
      mjs.globalOpts.set(ONLY_EDITABLE, true);
      const res = func(MODE_SOURCE);
      assert.deepEqual(res, {
        contexts: [
          'frame',
          'page'
        ],
        enabled: false,
        title: 'modeViewSource_key,foo,(&V)',
        visible: false
      }, 'result');
    });

    it('should get object', () => {
      mjs.appHost.set('status', {
        [HOST_COMPAT]: true
      });
      mjs.localOpts.set(EDITOR_LABEL, 'foo');
      mjs.localOpts.set(IS_EXECUTABLE, true);
      mjs.localOpts.set(MENU_ENABLED, true);
      mjs.globalOpts.set(ONLY_EDITABLE, true);
      const res = func(MODE_SOURCE);
      assert.deepEqual(res, {
        contexts: [
          'frame',
          'page'
        ],
        enabled: true,
        title: 'modeViewSource_key,foo,(&V)',
        visible: false
      }, 'result');
    });

    it('should get empty object', () => {
      const res = func(MODE_EDIT_HTML);
      assert.deepEqual(res, {}, 'result');
    });

    it('should get empty object', () => {
      mjs.localOpts.set(FILE_EXT_SELECT, true);
      const res = func(MODE_EDIT_HTML);
      assert.deepEqual(res, {}, 'result');
    });

    it('should get object', () => {
      mjs.localOpts.set(FILE_EXT_SELECT, true);
      mjs.localOpts.set(FILE_EXT_SELECT_HTML, true);
      const res = func(MODE_EDIT_HTML);
      assert.deepEqual(res, {
        contexts: [
          'editable'
        ],
        enabled: false,
        parentId: 'modeEditText',
        title: 'modeEditTextFileExtension_key,.&html',
        visible: true
      }, 'result');
    });

    it('should get object', () => {
      mjs.localOpts.set(FILE_EXT_SELECT, true);
      mjs.localOpts.set(FILE_EXT_SELECT_HTML, true);
      mjs.localOpts.set(IS_EXECUTABLE, true);
      mjs.localOpts.set(MENU_ENABLED, true);
      const res = func(MODE_EDIT_HTML);
      assert.deepEqual(res, {
        contexts: [
          'editable'
        ],
        enabled: false,
        parentId: 'modeEditText',
        title: 'modeEditTextFileExtension_key,.&html',
        visible: true
      }, 'result');
    });

    it('should get object', () => {
      mjs.appHost.set('status', {
        [HOST_COMPAT]: true
      });
      mjs.localOpts.set(FILE_EXT_SELECT, true);
      mjs.localOpts.set(FILE_EXT_SELECT_HTML, true);
      mjs.localOpts.set(IS_EXECUTABLE, true);
      mjs.localOpts.set(MENU_ENABLED, true);
      const res = func(MODE_EDIT_HTML);
      assert.deepEqual(res, {
        contexts: [
          'editable'
        ],
        enabled: true,
        parentId: 'modeEditText',
        title: 'modeEditTextFileExtension_key,.&html',
        visible: true
      }, 'result');
    });

    it('should get empty object', () => {
      const res = func(MODE_EDIT_MD);
      assert.deepEqual(res, {}, 'result');
    });

    it('should get empty object', () => {
      mjs.localOpts.set(FILE_EXT_SELECT, true);
      const res = func(MODE_EDIT_MD);
      assert.deepEqual(res, {}, 'result');
    });

    it('should get object', () => {
      mjs.localOpts.set(FILE_EXT_SELECT, true);
      mjs.localOpts.set(FILE_EXT_SELECT_MD, true);
      const res = func(MODE_EDIT_MD);
      assert.deepEqual(res, {
        contexts: [
          'editable'
        ],
        enabled: false,
        parentId: 'modeEditText',
        title: 'modeEditTextFileExtension_key,.&md',
        visible: true
      }, 'result');
    });

    it('should get object', () => {
      mjs.localOpts.set(FILE_EXT_SELECT, true);
      mjs.localOpts.set(FILE_EXT_SELECT_MD, true);
      mjs.localOpts.set(IS_EXECUTABLE, true);
      mjs.localOpts.set(MENU_ENABLED, true);
      const res = func(MODE_EDIT_MD);
      assert.deepEqual(res, {
        contexts: [
          'editable'
        ],
        enabled: false,
        parentId: 'modeEditText',
        title: 'modeEditTextFileExtension_key,.&md',
        visible: true
      }, 'result');
    });

    it('should get object', () => {
      mjs.appHost.set('status', {
        [HOST_COMPAT]: true
      });
      mjs.localOpts.set(FILE_EXT_SELECT, true);
      mjs.localOpts.set(FILE_EXT_SELECT_MD, true);
      mjs.localOpts.set(IS_EXECUTABLE, true);
      mjs.localOpts.set(MENU_ENABLED, true);
      const res = func(MODE_EDIT_MD);
      assert.deepEqual(res, {
        contexts: [
          'editable'
        ],
        enabled: true,
        parentId: 'modeEditText',
        title: 'modeEditTextFileExtension_key,.&md',
        visible: true
      }, 'result');
    });

    it('should get empty object', () => {
      const res = func(MODE_EDIT_TXT);
      assert.deepEqual(res, {}, 'result');
    });

    it('should get empty object', () => {
      mjs.localOpts.set(FILE_EXT_SELECT, true);
      const res = func(MODE_EDIT_TXT);
      assert.deepEqual(res, {}, 'result');
    });

    it('should get object', () => {
      mjs.localOpts.set(FILE_EXT_SELECT, true);
      mjs.localOpts.set(FILE_EXT_SELECT_TXT, true);
      const res = func(MODE_EDIT_TXT);
      assert.deepEqual(res, {
        contexts: [
          'editable'
        ],
        enabled: false,
        parentId: 'modeEditText',
        title: 'modeEditTextFileExtension_key,.&txt',
        visible: true
      }, 'result');
    });

    it('should get object', () => {
      mjs.localOpts.set(FILE_EXT_SELECT, true);
      mjs.localOpts.set(FILE_EXT_SELECT_TXT, true);
      mjs.localOpts.set(IS_EXECUTABLE, true);
      mjs.localOpts.set(MENU_ENABLED, true);
      const res = func(MODE_EDIT_TXT);
      assert.deepEqual(res, {
        contexts: [
          'editable'
        ],
        enabled: false,
        parentId: 'modeEditText',
        title: 'modeEditTextFileExtension_key,.&txt',
        visible: true
      }, 'result');
    });

    it('should get object', () => {
      mjs.appHost.set('status', {
        [HOST_COMPAT]: true
      });
      mjs.localOpts.set(FILE_EXT_SELECT, true);
      mjs.localOpts.set(FILE_EXT_SELECT_TXT, true);
      mjs.localOpts.set(IS_EXECUTABLE, true);
      mjs.localOpts.set(MENU_ENABLED, true);
      const res = func(MODE_EDIT_TXT);
      assert.deepEqual(res, {
        contexts: [
          'editable'
        ],
        enabled: true,
        parentId: 'modeEditText',
        title: 'modeEditTextFileExtension_key,.&txt',
        visible: true
      }, 'result');
    });
  });

  describe('create context menu', () => {
    const func = mjs.createContextMenu;
    beforeEach(() => {
      browser.i18n.getMessage.callsFake((...args) => args.toString());
      browser.runtime.id = null;
      mjs.localOpts.clear();
      mjs.globalOpts.clear();
    });
    afterEach(() => {
      browser.runtime.id = null;
      mjs.localOpts.clear();
      mjs.globalOpts.clear();
    });

    it('should call function', async () => {
      const i = browser.menus.create.callCount;
      const res = await func();
      assert.strictEqual(browser.menus.create.callCount, i + 6, 'called');
      assert.deepEqual(res, [
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      ], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.create.callCount;
      const res = await func();
      assert.strictEqual(browser.menus.create.callCount, i + 6, 'called');
      assert.deepEqual(res, [
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      ], 'result');
    });

    it('should get result', async () => {
      const i = browser.menus.create.callCount;
      mjs.localOpts.set(FILE_EXT_SELECT, true);
      mjs.localOpts.set(FILE_EXT_SELECT_HTML, false);
      mjs.localOpts.set(FILE_EXT_SELECT_MD, false);
      mjs.localOpts.set(FILE_EXT_SELECT_TXT, false);
      const res = await func();
      assert.strictEqual(browser.menus.create.callCount, i + 6, 'called');
      assert.deepEqual(res, [
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      ], 'result');
    });

    it('should get result', async () => {
      const i = browser.menus.create.callCount;
      mjs.localOpts.set(FILE_EXT_SELECT, true);
      mjs.localOpts.set(FILE_EXT_SELECT_HTML, true);
      mjs.localOpts.set(FILE_EXT_SELECT_MD, false);
      mjs.localOpts.set(FILE_EXT_SELECT_TXT, false);
      const res = await func();
      assert.strictEqual(browser.menus.create.callCount, i + 7, 'called');
      assert.deepEqual(res, [
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      ], 'result');
    });

    it('should get result', async () => {
      const i = browser.menus.create.callCount;
      mjs.localOpts.set(FILE_EXT_SELECT, true);
      mjs.localOpts.set(FILE_EXT_SELECT_HTML, true);
      mjs.localOpts.set(FILE_EXT_SELECT_MD, true);
      mjs.localOpts.set(FILE_EXT_SELECT_TXT, false);
      const res = await func();
      assert.strictEqual(browser.menus.create.callCount, i + 8, 'called');
      assert.deepEqual(res, [
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      ], 'result');
    });

    it('should get result', async () => {
      const i = browser.menus.create.callCount;
      mjs.localOpts.set(FILE_EXT_SELECT, true);
      mjs.localOpts.set(FILE_EXT_SELECT_HTML, true);
      mjs.localOpts.set(FILE_EXT_SELECT_MD, true);
      mjs.localOpts.set(FILE_EXT_SELECT_TXT, true);
      const res = await func();
      assert.strictEqual(browser.menus.create.callCount, i + 9, 'called');
      assert.deepEqual(res, [
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      ], 'result');
    });
  });

  describe('update context menu', () => {
    const func = mjs.updateContextMenu;
    beforeEach(() => {
      browser.i18n.getMessage.callsFake((...args) => args.toString());
      mjs.appHost.clear();
      mjs.localOpts.clear();
      mjs.globalOpts.clear();
    });
    afterEach(() => {
      mjs.appHost.clear();
      mjs.localOpts.clear();
      mjs.globalOpts.clear();
    });

    it('should not call function', async () => {
      const i = browser.menus.update.callCount;
      const res = await func();
      assert.strictEqual(browser.menus.update.callCount, i, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const i = browser.menus.update.callCount;
      const res = await func({
        foo: 'bar'
      });
      assert.strictEqual(browser.menus.update.callCount, i, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const i = browser.menus.update.callCount;
      const res = await func({
        foo: {
          bar: 'baz'
        }
      });
      assert.strictEqual(browser.menus.update.callCount, i, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.update.withArgs(MODE_EDIT, {
        enabled: false
      }).callCount;
      mjs.appHost.set('status', {
        [HOST_COMPAT]: false
      });
      mjs.localOpts.set(IS_EXECUTABLE, false);
      mjs.localOpts.set(MENU_ENABLED, false);
      const res = await func({
        [MODE_EDIT]: {
          enabled: true
        }
      });
      assert.strictEqual(browser.menus.update.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.update.withArgs(MODE_EDIT, {
        enabled: false
      }).callCount;
      mjs.appHost.set('status', {
        [HOST_COMPAT]: false
      });
      mjs.localOpts.set(IS_EXECUTABLE, false);
      mjs.localOpts.set(MENU_ENABLED, true);
      const res = await func({
        [MODE_EDIT]: {
          enabled: true
        }
      });
      assert.strictEqual(browser.menus.update.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.update.withArgs(MODE_EDIT, {
        enabled: false
      }).callCount;
      mjs.appHost.set('status', {
        [HOST_COMPAT]: false
      });
      mjs.localOpts.set(IS_EXECUTABLE, true);
      mjs.localOpts.set(MENU_ENABLED, true);
      const res = await func({
        [MODE_EDIT]: {
          enabled: true
        }
      });
      assert.strictEqual(browser.menus.update.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.update.withArgs(MODE_EDIT, {
        enabled: true
      }).callCount;
      mjs.appHost.set('status', {
        [HOST_COMPAT]: true
      });
      mjs.localOpts.set(IS_EXECUTABLE, true);
      mjs.localOpts.set(MENU_ENABLED, true);
      const res = await func({
        [MODE_EDIT]: {
          enabled: true
        }
      });
      assert.strictEqual(browser.menus.update.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.update.withArgs(MODE_EDIT, {
        enabled: false
      }).callCount;
      mjs.appHost.set('status', {
        [HOST_COMPAT]: true
      });
      mjs.localOpts.set(IS_EXECUTABLE, true);
      mjs.localOpts.set(MENU_ENABLED, true);
      const res = await func({
        [MODE_EDIT]: {
          enabled: false
        }
      });
      assert.strictEqual(browser.menus.update.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.update.callCount;
      const res = await func({
        [MODE_SOURCE]: {
          mode: MODE_SOURCE
        }
      });
      assert.strictEqual(browser.menus.update.callCount, i + 3, 'called');
      assert.deepEqual(res, [
        undefined,
        undefined,
        undefined
      ], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.update.callCount;
      const res = await func({
        [MODE_SOURCE]: {
          mode: MODE_MATHML
        }
      });
      assert.strictEqual(browser.menus.update.callCount, i + 3, 'called');
      assert.deepEqual(res, [
        undefined,
        undefined,
        undefined
      ], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.update.callCount;
      const res = await func({
        [MODE_SOURCE]: {
          mode: MODE_SVG
        }
      });
      assert.strictEqual(browser.menus.update.callCount, i + 3, 'called');
      assert.deepEqual(res, [
        undefined,
        undefined,
        undefined
      ], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.update.callCount;
      const res = await func(null, true);
      assert.strictEqual(browser.menus.update.callCount, i + 6, 'called');
      assert.deepEqual(res, [
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      ], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.update.callCount;
      mjs.localOpts.set(FILE_EXT_SELECT, true);
      mjs.localOpts.set(FILE_EXT_SELECT_HTML, false);
      mjs.localOpts.set(FILE_EXT_SELECT_MD, false);
      mjs.localOpts.set(FILE_EXT_SELECT_TXT, false);
      const res = await func(null, true);
      assert.strictEqual(browser.menus.update.callCount, i + 6, 'called');
      assert.deepEqual(res, [
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      ], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.update.callCount;
      mjs.localOpts.set(FILE_EXT_SELECT, true);
      mjs.localOpts.set(FILE_EXT_SELECT_HTML, true);
      mjs.localOpts.set(FILE_EXT_SELECT_MD, false);
      mjs.localOpts.set(FILE_EXT_SELECT_TXT, false);
      const res = await func(null, true);
      assert.strictEqual(browser.menus.update.callCount, i + 7, 'called');
      assert.deepEqual(res, [
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      ], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.update.callCount;
      mjs.localOpts.set(FILE_EXT_SELECT, true);
      mjs.localOpts.set(FILE_EXT_SELECT_HTML, true);
      mjs.localOpts.set(FILE_EXT_SELECT_MD, true);
      mjs.localOpts.set(FILE_EXT_SELECT_TXT, false);
      const res = await func(null, true);
      assert.strictEqual(browser.menus.update.callCount, i + 8, 'called');
      assert.deepEqual(res, [
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      ], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.update.callCount;
      mjs.localOpts.set(FILE_EXT_SELECT, true);
      mjs.localOpts.set(FILE_EXT_SELECT_HTML, true);
      mjs.localOpts.set(FILE_EXT_SELECT_MD, true);
      mjs.localOpts.set(FILE_EXT_SELECT_TXT, true);
      const res = await func(null, true);
      assert.strictEqual(browser.menus.update.callCount, i + 9, 'called');
      assert.deepEqual(res, [
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      ], 'result');
    });
  });

  describe('restore context menu', () => {
    const func = mjs.restoreContextMenu;

    it('should call function', async () => {
      const i = browser.menus.removeAll.callCount;
      const j = browser.menus.create.callCount;
      const res = await func();
      assert.strictEqual(browser.menus.removeAll.callCount, i + 1, 'called');
      assert.strictEqual(browser.menus.create.callCount, j + 6, 'called');
      assert.deepEqual(res, [
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      ], 'result');
    });
  });

  describe('add id to tab list', () => {
    const func = mjs.addIdToTabList;
    beforeEach(() => {
      mjs.tabList.clear();
    });
    afterEach(() => {
      mjs.tabList.clear();
    });

    it('should throw', async () => {
      await func().catch(e => {
        assert.strictEqual(e instanceof TypeError, true, 'error');
        assert.strictEqual(e.message, 'Expected Number but got Undefined.',
          'message');
      });
    });

    it('should add', async () => {
      const res = await func(1);
      assert.strictEqual(res instanceof Set, true, 'instance');
      assert.strictEqual(res.size, 1, 'size');
      assert.strictEqual(res.has(1), true, 'has');
      assert.deepEqual(res, mjs.tabList, 'result');
    });
  });

  describe('remove id from tab list', () => {
    const func = mjs.removeIdFromTabList;
    beforeEach(() => {
      mjs.tabList.clear();
    });
    afterEach(() => {
      mjs.tabList.clear();
    });

    it('should throw', async () => {
      await func().catch(e => {
        assert.strictEqual(e instanceof TypeError, true, 'error');
        assert.strictEqual(e.message, 'Expected Number but got Undefined.',
          'message');
      });
    });

    it('should remove', async () => {
      mjs.tabList.add(1);
      const res = await func(1);
      assert.strictEqual(res instanceof Set, true, 'instance');
      assert.strictEqual(res.size, 0, 'size');
      assert.deepEqual(res, mjs.tabList, 'result');
    });
  });

  describe('restore tab list', () => {
    const func = mjs.restoreTabList;
    beforeEach(() => {
      mjs.tabList.clear();
    });
    afterEach(() => {
      mjs.tabList.clear();
    });

    it('should restore', async () => {
      mjs.tabList.add(1);
      mjs.tabList.add(2);
      mjs.tabList.add(3);
      browser.tabs.get.withArgs(1).resolves({});
      browser.tabs.get.withArgs(2).rejects(new Error('error'));
      browser.tabs.get.withArgs(3).resolves({});
      await func();
      assert.strictEqual(mjs.tabList.size, 2, 'size');
      assert.strictEqual(mjs.tabList.has(1), true, 'has');
      assert.strictEqual(mjs.tabList.has(2), false, 'has');
      assert.strictEqual(mjs.tabList.has(3), true, 'has');
    });
  });

  describe('handle connectable tab', () => {
    const func = mjs.handleConnectableTab;
    beforeEach(() => {
      mjs.tabList.clear();
      mjs.localOpts.clear();
      mjs.globalOpts.set(IS_MAC, false);
    });
    afterEach(() => {
      mjs.tabList.clear();
      mjs.localOpts.clear();
      mjs.globalOpts.clear();
    });

    it('should get empty array', async () => {
      const res = await func();
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const i = browser.tabs.sendMessage.callCount;
      const res = await func({
        id: -1,
        windowId: -1
      });
      assert.strictEqual(mjs.tabList.size, 0, 'size');
      assert.strictEqual(browser.tabs.sendMessage.callCount, i, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      const i = browser.tabs.sendMessage.callCount;
      const j = browser.menus.update.callCount;
      mjs.localOpts.set(MENU_ENABLED, false);
      const res = await func({
        id: 2,
        windowId: 1
      });
      assert.strictEqual(mjs.tabList.size, 1, 'size');
      assert.strictEqual(mjs.tabList.has(2), true, 'has');
      assert.strictEqual(browser.tabs.sendMessage.callCount, i + 1, 'called');
      assert.strictEqual(browser.menus.update.callCount, j, 'not called');
      assert.strictEqual(mjs.localOpts.get(MENU_ENABLED), false, 'menu');
      assert.strictEqual(res.length, 2, 'length');
      assert.strictEqual(res[0] instanceof Set, true, 'result');
      assert.strictEqual(res[1], null, 'result');
    });

    it('should call function', async () => {
      const i = browser.tabs.sendMessage.callCount;
      const j = browser.menus.update.callCount;
      mjs.localOpts.set(MENU_ENABLED, false);
      const res = await func({
        active: true,
        id: 2,
        status: 'complete',
        windowId: 1
      });
      assert.strictEqual(mjs.tabList.size, 1, 'size');
      assert.strictEqual(mjs.tabList.has(2), true, 'has');
      assert.strictEqual(browser.tabs.sendMessage.callCount, i + 1, 'called');
      assert.strictEqual(browser.menus.update.callCount, j + 6, 'called');
      assert.strictEqual(mjs.localOpts.get(MENU_ENABLED), true, 'menu');
      assert.strictEqual(res.length, 3, 'length');
      assert.strictEqual(res[0] instanceof Set, true, 'result');
      assert.strictEqual(res[1], null, 'result');
      assert.deepEqual(res[2], [
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      ], 'result');
    });
  });

  describe('handle clicked context menu', () => {
    const func = mjs.handleClickedMenu;
    beforeEach(() => {
      mjs.tabList.clear();
    });
    afterEach(() => {
      mjs.tabList.clear();
    });

    it('should get null', async () => {
      const res = await func();
      assert.strictEqual(res, null, 'result');
    });

    it('should get null', async () => {
      const res = await func({}, {});
      assert.strictEqual(res, null, 'result');
    });

    it('should call function', async () => {
      const i = browser.runtime.openOptionsPage.callCount;
      browser.runtime.openOptionsPage.resolves({});
      const res = await func({
        menuItemId: OPTIONS_OPEN
      }, {
        id: 1
      });
      assert.strictEqual(browser.runtime.openOptionsPage.callCount, i + 1,
        'called');
      assert.deepEqual(res, {}, 'result');
    });

    it('should not call function', async () => {
      const i = browser.tabs.sendMessage.callCount;
      const res = await func({
        menuItemId: 'foo'
      }, {
        id: 2
      });
      assert.strictEqual(browser.tabs.sendMessage.callCount, i, 'not called');
      assert.strictEqual(res, null, 'result');
    });

    it('should call function', async () => {
      const i = browser.tabs.sendMessage.callCount;
      browser.tabs.sendMessage.resolves({});
      mjs.tabList.add(2);
      const res = await func({
        menuItemId: 'foo'
      }, {
        id: 2
      });
      assert.strictEqual(browser.tabs.sendMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, {}, 'result');
    });

    it('should call function', async () => {
      const i = browser.tabs.sendMessage.callCount;
      browser.tabs.sendMessage.resolves({});
      mjs.tabList.add(2);
      const res = await func({
        frameId: 0
      }, {
        id: 2
      });
      assert.strictEqual(browser.tabs.sendMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, {}, 'result');
    });
  });

  describe('send tmp file data', () => {
    const func = mjs.sendTmpFileData;

    it('should throw', async () => {
      await func().catch(e => {
        assert.strictEqual(e instanceof TypeError, true, 'error');
        assert.strictEqual(e.message, 'Expected String but got Undefined.',
          'message');
      });
    });

    it('should get null', async () => {
      const res = await func('foo');
      assert.strictEqual(res, null, 'result');
    });

    it('should get null', async () => {
      const res = await func('foo', {});
      assert.strictEqual(res, null, 'result');
    });

    it('should get null', async () => {
      const res = await func('foo', {
        data: {}
      });
      assert.strictEqual(res, null, 'result');
    });

    it('should get null', async () => {
      const res = await func('foo', {
        data: {
          tabId: 'bar'
        }
      });
      assert.strictEqual(res, null, 'result');
    });

    it('should not call function', async () => {
      const i = browser.tabs.sendMessage.callCount;
      browser.tabs.query.resolves([{
        id: 3
      }]);
      const res = await func('foo', {
        data: {
          tabId: '2'
        }
      });
      assert.strictEqual(browser.tabs.sendMessage.callCount, i, 'not called');
      assert.strictEqual(res, null, 'result');
    });

    it('should call function', async () => {
      const i = browser.tabs.sendMessage.callCount;
      browser.tabs.sendMessage.resolves({});
      browser.tabs.query.resolves([{
        id: 2
      }]);
      const res = await func('foo', {
        data: {
          tabId: '2'
        }
      });
      assert.strictEqual(browser.tabs.sendMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, {}, 'result');
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
      assert.strictEqual(res, undefined, 'result');
    });
  });

  describe('post message to host', () => {
    const func = mjs.hostPostMsg;
    beforeEach(() => {
      mjs.appHost.clear();
    });
    afterEach(() => {
      mjs.appHost.clear();
    });

    it('should not call function', async () => {
      const port = mockPort({ name: HOST });
      const i = port.postMessage.callCount;
      mjs.appHost.set('port', port);
      await func();
      assert.strictEqual(port.postMessage.callCount, i, 'not called');
    });

    it('should call function', async () => {
      const port = mockPort({ name: HOST });
      const i = port.postMessage.callCount;
      mjs.appHost.set('port', port);
      await func('foo');
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
    });
  });

  describe('handle host message', () => {
    const func = mjs.handleHostMsg;
    beforeEach(() => {
      mjs.appHost.clear();
    });
    afterEach(() => {
      mjs.appHost.clear();
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
      const { called } = stub;
      stub.restore();
      assert.strictEqual(called, false, 'not called');
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
      assert.strictEqual(calledOnce, true, 'called');
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
      assert.strictEqual(calledOnce, true, 'called');
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
      const { called } = stub;
      stub.restore();
      assert.strictEqual(called, false, 'called');
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
      assert.strictEqual(calledOnce, true, 'called');
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
      const { called } = stub;
      stub.restore();
      assert.strictEqual(called, false, 'called');
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
      assert.strictEqual(calledOnce, true, 'called');
      assert.strictEqual(browser.notifications.create.callCount, i + 1,
        'called');
      assert.deepEqual(res, [
        false,
        `${PROCESS_CHILD}_stderr`
      ], 'result');
    });

    it('should call function', async () => {
      const port = mockPort({ name: HOST });
      const i = port.postMessage.callCount;
      mjs.appHost.set('port', port);
      const msg = {
        status: 'ready'
      };
      const res = await func(msg);
      const status = mjs.appHost.get('status');
      assert.strictEqual(status[HOST_CONNECTION], true, 'value');
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const port = mockPort({ name: HOST });
      const i = port.postMessage.callCount;
      mjs.appHost.set('port', port);
      mjs.appHost.set('status', {
        [HOST_CONNECTION]: false
      });
      const msg = {
        status: 'ready'
      };
      const res = await func(msg);
      const status = mjs.appHost.get('status');
      assert.strictEqual(status[HOST_CONNECTION], true, 'value');
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });
  });

  describe('handle message', () => {
    const func = mjs.handleMsg;
    beforeEach(() => {
      mjs.appHost.clear();
      mjs.localOpts.clear();
      mjs.globalOpts.set(IS_MAC, false);
      mjs.tabList.clear();
    });
    afterEach(() => {
      mjs.appHost.clear();
      mjs.localOpts.clear();
      mjs.globalOpts.clear();
      mjs.tabList.clear();
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
      const i = browser.runtime.sendMessage.callCount;
      const msg = {
        [HOST_STATUS_GET]: true
      };
      const res = await func(msg);
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(res, [null], 'result');
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
        [IS_CONNECTABLE]: true
      };
      const res = await func(msg);
      assert.strictEqual(browser.tabs.sendMessage.callCount, i, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const i = browser.tabs.sendMessage.callCount;
      const msg = {
        [IS_CONNECTABLE]: true
      };
      const sender = {};
      const res = await func(msg, sender);
      assert.strictEqual(browser.tabs.sendMessage.callCount, i, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const i = browser.tabs.sendMessage.callCount;
      const msg = {
        [IS_CONNECTABLE]: true
      };
      const sender = {
        tab: {}
      };
      const res = await func(msg, sender);
      assert.strictEqual(browser.tabs.sendMessage.callCount, i, 'not called');
      assert.deepEqual(res, [[]], 'result');
    });

    it('should call function', async () => {
      browser.tabs.sendMessage.resolves({});
      const i = browser.tabs.sendMessage.callCount;
      const msg = {
        [IS_CONNECTABLE]: true
      };
      const sender = {
        tab: {
          id: 1,
          windowId: 2
        }
      };
      const res = await func(msg, sender);
      assert.strictEqual(mjs.tabList.size, 1, 'size');
      assert.strictEqual(browser.tabs.sendMessage.callCount, i + 1, 'called');
      assert.strictEqual(res.length, 1, 'length');
      assert.strictEqual(res[0][0] instanceof Set, true, 'set');
      assert.deepEqual(res[0][1], {}, 'result');
    });

    it('should call function', async () => {
      const port = mockPort({ name: HOST });
      const i = port.postMessage.callCount;
      mjs.appHost.set('port', port);
      const msg = {
        [EDITOR_CONFIG_GET]: true
      };
      const res = await func(msg);
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const port = mockPort({ name: HOST });
      const i = port.postMessage.callCount;
      const sender = {};
      mjs.appHost.set('port', port);
      const msg = {
        [EDITOR_CONFIG_GET]: true
      };
      const res = await func(msg, sender);
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const port = mockPort({ name: HOST });
      const i = port.postMessage.callCount;
      const sender = {
        tab: {}
      };
      mjs.appHost.set('port', port);
      const msg = {
        [EDITOR_CONFIG_GET]: true
      };
      const res = await func(msg, sender);
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const port = mockPort({ name: HOST });
      const i = port.postMessage.callCount;
      const sender = {
        tab: {
          id: browser.tabs.TAB_ID_NONE
        }
      };
      mjs.appHost.set('port', port);
      const msg = {
        [EDITOR_CONFIG_GET]: true
      };
      const res = await func(msg, sender);
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const port = mockPort({ name: HOST });
      const i = port.postMessage.callCount;
      const sender = {
        tab: {
          id: 1
        }
      };
      mjs.appHost.set('port', port);
      const msg = {
        [EDITOR_CONFIG_GET]: true
      };
      const res = await func(msg, sender);
      const connectedTabs = mjs.appHost.get('tabs');
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.strictEqual(connectedTabs.size, 1, 'size');
      assert.strictEqual(connectedTabs.has(1), true, 'tabs');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const port = mockPort({ name: HOST });
      const i = port.postMessage.callCount;
      const sender = {
        tab: {
          id: 1
        }
      };
      mjs.appHost.set('port', port);
      mjs.appHost.set('tabs', new Set([2]));
      const msg = {
        [EDITOR_CONFIG_GET]: true
      };
      const res = await func(msg, sender);
      const connectedTabs = mjs.appHost.get('tabs');
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.strictEqual(connectedTabs.size, 2, 'size');
      assert.strictEqual(connectedTabs.has(1), true, 'tabs');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const port = mockPort({ name: HOST });
      const i = port.postMessage.callCount;
      const sender = {
        tab: {
          id: 1
        }
      };
      mjs.appHost.set('port', port);
      mjs.appHost.set('tabs', new Set([2]));
      const msg = {
        [LOCAL_FILE_VIEW]: true
      };
      const res = await func(msg, sender);
      const connectedTabs = mjs.appHost.get('tabs');
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.strictEqual(connectedTabs.size, 2, 'size');
      assert.strictEqual(connectedTabs.has(1), true, 'tabs');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const port = mockPort({ name: HOST });
      const i = port.postMessage.callCount;
      const sender = {
        tab: {
          id: 1
        }
      };
      mjs.appHost.set('port', port);
      mjs.appHost.set('tabs', new Set([2]));
      const msg = {
        [TMP_FILE_CREATE]: true
      };
      const res = await func(msg, sender);
      const connectedTabs = mjs.appHost.get('tabs');
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.strictEqual(connectedTabs.size, 2, 'size');
      assert.strictEqual(connectedTabs.has(1), true, 'tabs');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const port = mockPort({ name: HOST });
      const i = port.postMessage.callCount;
      const sender = {
        tab: {
          id: 1
        }
      };
      mjs.appHost.set('port', port);
      mjs.appHost.set('tabs', new Set([2]));
      const msg = {
        [TMP_FILE_GET]: true
      };
      const res = await func(msg, sender);
      const connectedTabs = mjs.appHost.get('tabs');
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.strictEqual(connectedTabs.size, 2, 'size');
      assert.strictEqual(connectedTabs.has(1), true, 'tabs');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.update.callCount;
      const msg = {
        [CONTEXT_MENU]: {
          [MODE_EDIT]: {
            enabled: true,
            menuItemId: MODE_EDIT
          }
        }
      };
      const res = await func(msg);
      assert.strictEqual(browser.menus.update.callCount, i + 1, 'called');
      assert.deepEqual(res, [[undefined]], 'result');
    });

    it('should get empty array', async () => {
      const msg = {
        [EDITOR_CONFIG_RES]: {}
      };
      const res = await func(msg);
      assert.deepEqual(res, [], 'result');
    });

    it('should get empty array', async () => {
      const msg = {
        [HOST]: {}
      };
      const res = await func(msg);
      assert.deepEqual(res, [], 'result');
    });

    it('should get empty array', async () => {
      const msg = {
        [HOST_VERSION]: {}
      };
      const res = await func(msg);
      assert.deepEqual(res, [], 'result');
    });

    it('should get empty array', async () => {
      const msg = {
        [TMP_FILE_DATA_PORT]: {
          foo: 'bar'
        }
      };
      const res = await func(msg);
      assert.deepEqual(res, [], 'result');
    });

    it('should get empty array', async () => {
      const msg = {
        [TMP_FILE_DATA_REMOVE]: {
          data: {
            tabId: '2',
            windowId: '1'
          }
        }
      };
      const res = await func(msg);
      assert.deepEqual(res, [], 'result');
    });

    it('should get empty array', async () => {
      const msg = {
        [TMP_FILE_RES]: {
          data: {
            tabId: '2',
            windowId: '1'
          }
        }
      };
      const res = await func(msg);
      assert.deepEqual(res, [], 'result');
    });
  });

  describe('handle activated tab', () => {
    const func = mjs.onTabActivated;
    beforeEach(() => {
      mjs.localOpts.set(IS_EXECUTABLE, true);
      mjs.tabList.clear();
    });
    afterEach(() => {
      mjs.localOpts.clear();
      mjs.tabList.clear();
    });

    it('should throw', async () => {
      await func().catch(e => {
        assert.strictEqual(e instanceof Error, true, 'throws');
      });
    });

    it('should call function', async () => {
      const i = browser.menus.update.callCount;
      const info = {
        tabId: -1,
        windowId: -1
      };
      mjs.localOpts.set(MENU_ENABLED, false);
      const res = await func(info);
      assert.strictEqual(browser.menus.update.callCount, i + 6, 'called');
      assert.strictEqual(mjs.localOpts.get(MENU_ENABLED), false, 'value');
      assert.deepEqual(res, [
        [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.update.callCount;
      const j = browser.tabs.sendMessage.callCount;
      const info = {
        tabId: 2,
        windowId: 1
      };
      mjs.localOpts.set(MENU_ENABLED, false);
      mjs.tabList.add(2);
      const res = await func(info);
      assert.strictEqual(browser.menus.update.callCount, i + 6, 'called');
      assert.strictEqual(browser.tabs.sendMessage.callCount, j + 1, 'called');
      assert.strictEqual(mjs.localOpts.get(MENU_ENABLED), true, 'value');
      assert.deepEqual(res, [
        null,
        [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.update.callCount;
      const j = browser.tabs.sendMessage.callCount;
      const info = {
        tabId: 3,
        windowId: 1
      };
      mjs.localOpts.set(MENU_ENABLED, false);
      mjs.tabList.add(2);
      const res = await func(info);
      assert.strictEqual(browser.menus.update.callCount, i + 6, 'called');
      assert.strictEqual(browser.tabs.sendMessage.callCount, j, 'not called');
      assert.strictEqual(mjs.localOpts.get(MENU_ENABLED), false, 'value');
      assert.deepEqual(res, [
        [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });
  });

  describe('handle updated tab', () => {
    const func = mjs.onTabUpdated;
    beforeEach(() => {
      mjs.localOpts.set(IS_EXECUTABLE, true);
      mjs.tabList.clear();
    });
    afterEach(() => {
      mjs.localOpts.clear();
      mjs.tabList.clear();
    });

    it('should throw', async () => {
      await func().catch(e => {
        assert.strictEqual(e instanceof TypeError, true, 'error');
        assert.strictEqual(e.message, 'Expected Number but got Undefined.',
          'message');
      });
    });

    it('should throw', async () => {
      await func(1).catch(e => {
        assert.strictEqual(e instanceof Error, true, 'error');
      });
    });

    it('should throw', async () => {
      await func(1, undefined, { active: true }).catch(e => {
        assert.strictEqual(e instanceof Error, true, 'error');
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
      const i = browser.menus.update.callCount;
      const res = await func(2, { status: 'complete' }, { active: true });
      assert.strictEqual(browser.menus.update.callCount, i + 6, 'called');
      assert.deepEqual(res, [
        [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.update.callCount;
      mjs.localOpts.set(MENU_ENABLED, false);
      mjs.tabList.add(2);
      const res = await func(2, {
        status: 'complete'
      }, {
        active: true,
        url: 'https://example.com',
        windowId: 1
      });
      assert.strictEqual(mjs.localOpts.get(MENU_ENABLED), true, 'value');
      assert.strictEqual(browser.menus.update.callCount, i + 6, 'called');
      assert.deepEqual(res, [
        [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });
  });

  describe('handle removed tab', () => {
    const func = mjs.onTabRemoved;
    beforeEach(() => {
      mjs.appHost.clear();
      mjs.tabList.clear();
    });
    afterEach(() => {
      mjs.appHost.clear();
      mjs.tabList.clear();
    });

    it('should throw', async () => {
      await func().catch(e => {
        assert.strictEqual(e instanceof TypeError, true, 'error');
        assert.strictEqual(e.message, 'Expected Number but got Undefined.',
          'message');
      });
    });

    it('should not call function', async () => {
      const port = mockPort({ name: HOST });
      const i = port.postMessage.callCount;
      const j = browser.windows.get.callCount;
      mjs.appHost.set('port', port);
      mjs.appHost.set('tabs', new Set());
      mjs.tabList.add(2);
      browser.windows.get.resolves({
        incognito: false
      });
      const res = await func(3, { windowId: 1 });
      assert.strictEqual(mjs.tabList.size, 1, 'size');
      assert.strictEqual(mjs.tabList.has(2), true, 'has');
      assert.strictEqual(port.postMessage.callCount, i, 'not called');
      assert.strictEqual(browser.windows.get.callCount, j, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const port = mockPort({ name: HOST });
      const i = port.postMessage.callCount;
      const j = browser.windows.get.withArgs(1, null).callCount;
      mjs.appHost.set('port', port);
      mjs.appHost.set('tabs', new Set([2]));
      mjs.tabList.add(2);
      mjs.tabList.add(3);
      browser.windows.get.withArgs(1, null).resolves({
        incognito: false
      });
      const res = await func(1, { windowId: 1 });
      const connectedTabs = mjs.appHost.get('tabs');
      assert.strictEqual(mjs.tabList.size, 2, 'tabList size');
      assert.strictEqual(mjs.tabList.has(2), true, 'tabList has id');
      assert.strictEqual(connectedTabs.size, 1, 'connected tabs size');
      assert.strictEqual(connectedTabs.has(2), true, 'connected tabs has id');
      assert.strictEqual(port.postMessage.callCount, i, 'not called');
      assert.strictEqual(browser.windows.get.withArgs(1, null).callCount, j,
        'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const port = mockPort({ name: HOST });
      const i = port.postMessage.callCount;
      const j = browser.windows.get.withArgs(1, null).callCount;
      mjs.appHost.set('port', port);
      mjs.appHost.set('tabs', new Set([2]));
      mjs.tabList.add(2);
      mjs.tabList.add(3);
      browser.windows.get.withArgs(1, null).resolves({
        incognito: false
      });
      const res = await func(2, { windowId: 1 });
      const connectedTabs = mjs.appHost.get('tabs');
      assert.strictEqual(mjs.tabList.size, 1, 'tabList size');
      assert.strictEqual(mjs.tabList.has(2), false, 'tabList has id');
      assert.strictEqual(connectedTabs.size, 0, 'connected tabs size');
      assert.strictEqual(port.postMessage.callCount, i, 'not called');
      assert.strictEqual(browser.windows.get.withArgs(1, null).callCount, j + 1,
        'called');
      assert.strictEqual(res.length, 1, 'length');
      assert.strictEqual(res[0] instanceof Set, true, 'result');
    });

    it('should not call function', async () => {
      const port = mockPort({ name: HOST });
      const i = port.postMessage.callCount;
      const j = browser.windows.get.withArgs(1, null).callCount;
      mjs.appHost.set('port', port);
      mjs.appHost.set('tabs', new Set([2, 3]));
      mjs.tabList.add(2);
      mjs.tabList.add(3);
      mjs.tabList.add(4);
      browser.windows.get.withArgs(1, null).resolves({
        incognito: false
      });
      const res = await func(2, { windowId: 1 });
      const connectedTabs = mjs.appHost.get('tabs');
      assert.strictEqual(mjs.tabList.size, 2, 'tabList size');
      assert.strictEqual(mjs.tabList.has(2), false, 'tabList has id');
      assert.strictEqual(connectedTabs.size, 1, 'connected tabs size');
      assert.strictEqual(connectedTabs.has(2), false, 'connected tabs has id');
      assert.strictEqual(port.postMessage.callCount, i, 'not called');
      assert.strictEqual(browser.windows.get.withArgs(1, null).callCount, j + 1,
        'called');
      assert.strictEqual(res.length, 1, 'length');
      assert.strictEqual(res[0] instanceof Set, true, 'result');
    });

    it('should call function', async () => {
      const port = mockPort({ name: HOST });
      const i = port.postMessage.callCount;
      const j = browser.windows.get.withArgs(1, null).callCount;
      mjs.appHost.set('port', port);
      mjs.appHost.set('tabs', new Set([2, 3]));
      mjs.tabList.add(2);
      mjs.tabList.add(3);
      mjs.tabList.add(4);
      browser.windows.get.withArgs(1, null).resolves({
        incognito: true
      });
      const res = await func(2, { windowId: 1 });
      const connectedTabs = mjs.appHost.get('tabs');
      assert.strictEqual(mjs.tabList.size, 2, 'tabList size');
      assert.strictEqual(mjs.tabList.has(2), false, 'tabList has id');
      assert.strictEqual(connectedTabs.size, 1, 'connected tabs size');
      assert.strictEqual(connectedTabs.has(2), false, 'connected tabs has id');
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.strictEqual(browser.windows.get.withArgs(1, null).callCount, j + 1,
        'called');
      assert.strictEqual(res.length, 2, 'length');
      assert.strictEqual(res[0], undefined, 'result');
      assert.strictEqual(res[1] instanceof Set, true, 'result');
    });
  });

  describe('handle focused window', () => {
    const func = mjs.onWindowFocusChanged;
    beforeEach(() => {
      mjs.localOpts.set(MENU_ENABLED, true);
      mjs.localOpts.set(IS_EXECUTABLE, true);
      mjs.tabList.clear();
    });
    afterEach(() => {
      mjs.localOpts.clear();
      mjs.tabList.clear();
    });

    it('should not call function', async () => {
      const i = browser.menus.update.callCount;
      browser.windows.getCurrent.resolves({
        focused: false,
        id: 1,
        type: 'normal'
      });
      const res = await func();
      assert.strictEqual(browser.menus.update.callCount, i, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const i = browser.menus.update.callCount;
      browser.windows.getCurrent.resolves({
        focused: true,
        id: browser.windows.WINDOW_ID_NONE,
        type: 'normal'
      });
      const res = await func();
      assert.strictEqual(browser.menus.update.callCount, i, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should not call function', async () => {
      const i = browser.menus.update.callCount;
      browser.windows.getCurrent.resolves({
        focused: true,
        id: 1,
        type: 'popup'
      });
      const res = await func();
      assert.strictEqual(browser.menus.update.callCount, i, 'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.update.callCount;
      const j = browser.tabs.sendMessage.callCount;
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
      mjs.tabList.add(2);
      const res = await func(1);
      assert.strictEqual(browser.menus.update.callCount, i + 6, 'called');
      assert.strictEqual(browser.tabs.sendMessage.callCount, j + 1, 'called');
      assert.deepEqual(res, [
        null,
        [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });

    it('should not call function', async () => {
      const i = browser.menus.update.callCount;
      const j = browser.tabs.sendMessage.callCount;
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
        id: browser.tabs.TAB_ID_NONE
      }]);
      mjs.tabList.add(2);
      const res = await func(1);
      assert.strictEqual(browser.menus.update.callCount, i, 'not called');
      assert.strictEqual(browser.tabs.sendMessage.callCount, j, 'not called');
      assert.deepEqual(res, [], 'result');
    });
  });

  describe('handle removed window', () => {
    const func = mjs.onWindowRemoved;
    beforeEach(() => {
      mjs.appHost.clear();
      mjs.tabList.clear();
    });
    afterEach(() => {
      mjs.appHost.clear();
      mjs.tabList.clear();
    });

    it('should call function', async () => {
      const port = mockPort({ name: HOST });
      const i = port.postMessage.callCount;
      mjs.appHost.set('port', port);
      mjs.tabList.add(1);
      mjs.tabList.add(2);
      mjs.tabList.add(3);
      browser.tabs.get.withArgs(1).rejects(new Error('error'));
      browser.tabs.get.withArgs(2).resolves({});
      browser.tabs.get.withArgs(3).rejects(new Error('error'));
      browser.windows.getAll.withArgs({
        populate: false,
        windowTypes: ['normal']
      }).resolves([
        {
          incognito: false
        },
        {
          incognito: false
        }
      ]);
      const res = await func();
      assert.strictEqual(mjs.tabList.size, 1, 'size');
      assert.strictEqual(mjs.tabList.has(1), false, 'removed');
      assert.strictEqual(mjs.tabList.has(2), true, 'not removed');
      assert.strictEqual(mjs.tabList.has(3), false, 'removed');
      assert.strictEqual(port.postMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined, undefined], 'result');
    });

    it('should not call function', async () => {
      const port = mockPort({ name: HOST });
      const i = port.postMessage.callCount;
      mjs.appHost.set('port', port);
      mjs.tabList.add(1);
      mjs.tabList.add(2);
      mjs.tabList.add(3);
      browser.tabs.get.withArgs(1).rejects(new Error('error'));
      browser.tabs.get.withArgs(2).resolves({});
      browser.tabs.get.withArgs(3).rejects(new Error('error'));
      browser.windows.getAll.withArgs({
        populate: false,
        windowTypes: ['normal']
      }).resolves([
        {
          incognito: false
        },
        {
          incognito: true
        }
      ]);
      const res = await func();
      assert.strictEqual(mjs.tabList.size, 1, 'size');
      assert.strictEqual(mjs.tabList.has(1), false, 'removed');
      assert.strictEqual(mjs.tabList.has(2), true, 'not removed');
      assert.strictEqual(mjs.tabList.has(3), false, 'removed');
      assert.strictEqual(port.postMessage.callCount, i, 'not called');
      assert.deepEqual(res, [undefined], 'result');
    });
  });

  describe('handle command', () => {
    const func = mjs.handleCmd;
    beforeEach(() => {
      mjs.tabList.add(2);
    });
    afterEach(() => {
      mjs.tabList.clear();
    });

    it('should throw', async () => {
      await func().catch(e => {
        assert.strictEqual(e instanceof TypeError, true, 'error');
        assert.strictEqual(e.message, 'Expected String but got Undefined.',
          'message');
      });
    });

    it('should get null', async () => {
      const res = await func('foo');
      assert.strictEqual(res, null, 'result');
    });

    it('should call function', async () => {
      const i = browser.runtime.openOptionsPage.callCount;
      browser.runtime.openOptionsPage.resolves(undefined);
      const res = await func(OPTIONS_OPEN);
      assert.strictEqual(browser.runtime.openOptionsPage.callCount, i + 1,
        'called');
      assert.strictEqual(res, undefined, 'result');
    });

    it('should call function', async () => {
      const i = browser.tabs.sendMessage.callCount;
      const j = browser.tabs.query.callCount;
      browser.tabs.sendMessage.resolves({});
      browser.tabs.query.withArgs({
        windowId: browser.windows.WINDOW_ID_CURRENT,
        active: true,
        windowType: 'normal'
      }).resolves([{
        id: 2,
        windowId: 1
      }]);
      const res = await func(EDITOR_EXEC, {
        id: 2
      });
      assert.strictEqual(browser.tabs.sendMessage.callCount, i + 1, 'called');
      assert.strictEqual(browser.tabs.query.callCount, j, 'not called');
      assert.deepEqual(res, {}, 'result');
    });

    it('should call function', async () => {
      const i = browser.tabs.sendMessage.callCount;
      const j = browser.tabs.query.callCount;
      browser.tabs.sendMessage.resolves({});
      browser.tabs.query.withArgs({
        windowId: browser.windows.WINDOW_ID_CURRENT,
        active: true,
        windowType: 'normal'
      }).resolves([{
        id: 2,
        windowId: 1
      }]);
      const res = await func(EDITOR_EXEC);
      assert.strictEqual(browser.tabs.sendMessage.callCount, i + 1, 'called');
      assert.strictEqual(browser.tabs.query.callCount, j + 1, 'called');
      assert.deepEqual(res, {}, 'result');
    });
  });

  describe('send variable', () => {
    const func = mjs.sendVariables;
    beforeEach(() => {
      mjs.tabList.add(1);
    });
    afterEach(() => {
      mjs.tabList.clear();
    });

    it('should get empty array', async () => {
      const res = await func();
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      const i = browser.tabs.sendMessage.callCount;
      const res = await func({
        foo: 'bar'
      });
      assert.strictEqual(browser.tabs.sendMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [null], 'result');
    });

    it('should call function', async () => {
      mjs.tabList.add(2);
      const i = browser.tabs.sendMessage.callCount;
      const res = await func({
        foo: 'bar'
      });
      assert.strictEqual(browser.tabs.sendMessage.callCount, i + 2, 'called');
      assert.deepEqual(res, [null, null], 'result');
    });
  });

  describe('set storage value', () => {
    const func = mjs.setStorageValue;
    beforeEach(() => {
      browser.runtime.id = null;
      mjs.appHost.set('status', {
        [HOST_CONNECTION]: false,
        [HOST_COMPAT]: false,
        [HOST_VERSION_LATEST]: null
      });
      mjs.localOpts.set(MENU_ENABLED, true);
      mjs.globalOpts.clear();
      mjs.tabList.clear();
    });
    afterEach(() => {
      browser.runtime.id = null;
      mjs.appHost.clear();
      mjs.localOpts.clear();
      mjs.globalOpts.clear();
      mjs.tabList.clear();
    });

    it('should throw', async () => {
      await func().catch(e => {
        assert.strictEqual(e instanceof TypeError, true, 'error');
        assert.strictEqual(e.message, 'Expected String but got Undefined.',
          'message');
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
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      const res = await func(EDITOR_FILE_NAME, {
        app: {
          executable: true
        }
      });
      assert.strictEqual(mjs.localOpts.get(IS_EXECUTABLE), true, 'value');
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount, i,
        'not called');
      assert.strictEqual(browser.action.setBadgeText.callCount, j,
        'not called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k,
        'not called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      const res = await func(EDITOR_FILE_NAME, {
        app: {
          executable: true
        }
      }, true);
      assert.strictEqual(mjs.localOpts.get(IS_EXECUTABLE), true, 'value');
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount,
        i + 1, 'called');
      assert.strictEqual(browser.action.setBadgeText.callCount, j + 1,
        'called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k + 1,
        'called');
      assert.deepEqual(res, [
        undefined,
        [
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });

    it('should set value', async () => {
      const i = browser.menus.update.callCount;
      const res = await func(EDITOR_LABEL, {
        value: 'foo'
      });
      assert.strictEqual(mjs.localOpts.get(EDITOR_LABEL), 'foo', 'value');
      assert.strictEqual(browser.menus.update.callCount, i, 'not called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.update.callCount;
      const res = await func(EDITOR_LABEL, {
        value: 'foo'
      }, true);
      assert.strictEqual(mjs.localOpts.get(EDITOR_LABEL), 'foo', 'value');
      assert.strictEqual(browser.menus.update.callCount, i + 6, 'called');
      assert.deepEqual(res, [
        undefined,
        [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });

    it('should set value', async () => {
      const i = browser.menus.removeAll.callCount;
      const res = await func(FILE_EXT_SELECT, {
        checked: true
      });
      assert.strictEqual(mjs.localOpts.get(FILE_EXT_SELECT), true, 'value');
      assert.strictEqual(browser.menus.removeAll.callCount, i, 'not called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.removeAll.callCount;
      const res = await func(FILE_EXT_SELECT, {
        checked: true
      }, true);
      assert.strictEqual(mjs.localOpts.get(FILE_EXT_SELECT), true, 'value');
      assert.strictEqual(browser.menus.removeAll.callCount, i + 1, 'called');
      assert.deepEqual(res, [
        undefined,
        [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });

    it('should set value', async () => {
      const i = browser.menus.removeAll.callCount;
      const res = await func(FILE_EXT_SELECT_HTML, {
        checked: true
      });
      assert.strictEqual(mjs.localOpts.get(FILE_EXT_SELECT_HTML), true,
        'value');
      assert.strictEqual(browser.menus.removeAll.callCount, i, 'not called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.removeAll.callCount;
      const res = await func(FILE_EXT_SELECT_HTML, {
        checked: true
      }, true);
      assert.strictEqual(mjs.localOpts.get(FILE_EXT_SELECT_HTML), true,
        'value');
      assert.strictEqual(browser.menus.removeAll.callCount, i + 1, 'called');
      assert.deepEqual(res, [
        undefined,
        [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });

    it('should set value', async () => {
      const i = browser.menus.removeAll.callCount;
      const res = await func(FILE_EXT_SELECT_MD, {
        checked: true
      });
      assert.strictEqual(mjs.localOpts.get(FILE_EXT_SELECT_MD), true, 'value');
      assert.strictEqual(browser.menus.removeAll.callCount, i, 'not called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.removeAll.callCount;
      const res = await func(FILE_EXT_SELECT_MD, {
        checked: true
      }, true);
      assert.strictEqual(mjs.localOpts.get(FILE_EXT_SELECT_MD), true, 'value');
      assert.strictEqual(browser.menus.removeAll.callCount, i + 1, 'called');
      assert.deepEqual(res, [
        undefined,
        [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });

    it('should set value', async () => {
      const i = browser.menus.removeAll.callCount;
      const res = await func(FILE_EXT_SELECT_TXT, {
        checked: true
      });
      assert.strictEqual(mjs.localOpts.get(FILE_EXT_SELECT_TXT), true, 'value');
      assert.strictEqual(browser.menus.removeAll.callCount, i, 'not called');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      const i = browser.menus.removeAll.callCount;
      const res = await func(FILE_EXT_SELECT_TXT, {
        checked: true
      }, true);
      assert.strictEqual(mjs.localOpts.get(FILE_EXT_SELECT_TXT), true, 'value');
      assert.strictEqual(browser.menus.removeAll.callCount, i + 1, 'called');
      assert.deepEqual(res, [
        undefined,
        [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
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

    it('should call function', async () => {
      const i = browser.notifications.onClosed.addListener.callCount;
      const res = await func(HOST_ERR_NOTIFY, {
        checked: true
      });
      assert.strictEqual(browser.notifications.onClosed.addListener.callCount,
        i + 1, 'called');
      assert.deepEqual(res, [], 'result');
    });

    it('should set value', async () => {
      const res = await func(ONLY_EDITABLE, {
        checked: true
      });
      assert.strictEqual(mjs.globalOpts.get(ONLY_EDITABLE), true, 'value');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should call function', async () => {
      mjs.tabList.add(1);
      const i = browser.tabs.sendMessage.callCount;
      const res = await func(ONLY_EDITABLE, {
        checked: true
      });
      assert.strictEqual(mjs.globalOpts.get(ONLY_EDITABLE), true, 'value');
      assert.strictEqual(browser.tabs.sendMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined, [null]], 'result');
    });

    it('should call function', async () => {
      mjs.tabList.add(1);
      const i = browser.tabs.sendMessage.callCount;
      const j = browser.menus.removeAll.callCount;
      const res = await func(ONLY_EDITABLE, {
        checked: true
      }, true);
      assert.strictEqual(mjs.globalOpts.get(ONLY_EDITABLE), true, 'value');
      assert.strictEqual(browser.tabs.sendMessage.callCount, i + 1, 'called');
      assert.strictEqual(browser.menus.removeAll.callCount, j + 1, 'called');
      assert.deepEqual(res, [
        undefined,
        [null],
        [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });

    it('should set value', async () => {
      const res = await func(SYNC_AUTO, {
        checked: true
      });
      assert.strictEqual(mjs.globalOpts.get(SYNC_AUTO), true, 'value');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should set value', async () => {
      mjs.tabList.add(1);
      const i = browser.tabs.sendMessage.callCount;
      const res = await func(SYNC_AUTO, {
        checked: true
      });
      assert.strictEqual(mjs.globalOpts.get(SYNC_AUTO), true, 'value');
      assert.strictEqual(browser.tabs.sendMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [undefined, [null]], 'result');
    });

    it('should set value', async () => {
      const res = await func(SYNC_AUTO_URL, {
        value: 'https://example.com'
      });
      assert.strictEqual(mjs.globalOpts.get(SYNC_AUTO_URL),
        'https://example.com', 'value');
      assert.deepEqual(res, [undefined], 'result');
    });

    it('should set value', async () => {
      mjs.tabList.add(1);
      const i = browser.tabs.sendMessage.callCount;
      const res = await func(SYNC_AUTO_URL, {
        value: 'https://example.com'
      });
      assert.strictEqual(mjs.globalOpts.get(SYNC_AUTO_URL),
        'https://example.com', 'value');
      assert.strictEqual(browser.tabs.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(res, [undefined, [null]], 'result');
    });
  });

  describe('handle storage', () => {
    const func = mjs.handleStorage;

    it('should not set variables', async () => {
      const res = await func();
      assert.deepEqual(res, [], 'result');
    });

    it('should not set variables', async () => {
      const res = await func({
        foo: {
          checked: true
        }
      }, 'bar');
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

    it('should set variables', async () => {
      const res = await func({
        foo: {
          checked: true
        }
      }, 'local');
      assert.deepEqual(res, [[]], 'result');
    });

    it('should set variables', async () => {
      const res = await func({
        foo: {
          newValue: {
            checked: true
          }
        }
      });
      assert.deepEqual(res, [[]], 'result');
    });
  });

  describe('extract editor config data', () => {
    const func = mjs.extractEditorConfig;

    it('should not send message', async () => {
      const i = browser.runtime.sendMessage.callCount;
      browser.runtime.sendMessage.resolves({});
      browser.runtime.getURL.returns('moz-extension://foo/bar.html');
      browser.tabs.query.resolves([{
        url: 'https://example.com'
      }]);
      const res = await func();
      assert.strictEqual(browser.runtime.sendMessage.callCount, i,
        'not called');
      assert.deepEqual(res, [
        undefined,
        [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });

    it('should send message', async () => {
      const i = browser.runtime.sendMessage.callCount;
      browser.runtime.sendMessage.resolves({});
      browser.runtime.getURL.returns('moz-extension://foo/bar.html');
      browser.tabs.query.resolves([{
        url: 'moz-extension://foo/bar.html'
      }]);
      const res = await func();
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(res, [
        undefined,
        [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        ],
        {}
      ], 'result');
    });

    it('should not send message', async () => {
      const data = {
        editorConfigTimestamp: 1,
        editorName: 'foo',
        executable: true
      };
      const i = browser.runtime.sendMessage.callCount;
      browser.runtime.sendMessage.resolves({});
      browser.runtime.getURL.returns('moz-extension://foo/bar.html');
      browser.tabs.query.resolves([{
        url: 'https://example.com'
      }]);
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
      assert.strictEqual(browser.runtime.sendMessage.callCount, i,
        'not called');
      assert.deepEqual(res, [
        undefined,
        [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });

    it('should send message', async () => {
      const data = {
        editorConfigTimestamp: 1,
        editorName: 'foo',
        executable: true
      };
      const i = browser.runtime.sendMessage.callCount;
      browser.runtime.sendMessage.resolves({});
      browser.runtime.getURL.returns('moz-extension://foo/bar.html');
      browser.tabs.query.resolves([{
        url: 'moz-extension://foo/bar.html'
      }]);
      browser.storage.local.get.withArgs([
        EDITOR_FILE_NAME,
        EDITOR_LABEL
      ]).resolves({});
      const res = await func(data);
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.deepEqual(res, [
        undefined,
        [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        ],
        {}
      ], 'result');
    });
  });

  describe('handle disconnected host', () => {
    const func = mjs.handleDisconnectedHost;
    const lastErrorDefaultValue = browser.runtime.lastError;
    beforeEach(() => {
      mjs.appHost.set('status', {
        [HOST_CONNECTION]: true
      });
    });
    afterEach(() => {
      mjs.appHost.clear();
    });

    it('should call function', async () => {
      const stubErr = sinon.stub(console, 'error');
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      browser.runtime.lastError = null;
      const res = await func();
      const { called: errCalled } = stubErr;
      stubErr.restore();
      browser.runtime.lastError = lastErrorDefaultValue;
      assert.strictEqual(mjs.appHost.size, 0, 'size');
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount,
        i + 1, 'called');
      assert.strictEqual(browser.action.setBadgeText.callCount, j + 1,
        'called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k + 1,
        'called');
      assert.strictEqual(errCalled, false, 'not called');
      assert.deepEqual(res, [[
        undefined,
        undefined,
        undefined
      ]], 'result');
    });

    it('should call function and log error', async () => {
      const stubErr = sinon.stub(console, 'error');
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      const res = await func({
        error: new Error('error')
      });
      const { calledOnce: errCalled } = stubErr;
      stubErr.restore();
      assert.strictEqual(mjs.appHost.size, 0, 'size');
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount,
        i + 1, 'called');
      assert.strictEqual(browser.action.setBadgeText.callCount, j + 1,
        'called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k + 1,
        'called');
      assert.strictEqual(errCalled, true, 'called');
      assert.deepEqual(res, [
        false,
        [
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });

    it('should call function and log error', async () => {
      const stubErr = sinon.stub(console, 'error');
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      browser.runtime.lastError = new Error('error');
      const res = await func();
      const { calledOnce: errCalled } = stubErr;
      stubErr.restore();
      browser.runtime.lastError = lastErrorDefaultValue;
      assert.strictEqual(mjs.appHost.size, 0, 'size');
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount,
        i + 1, 'called'
      );
      assert.strictEqual(browser.action.setBadgeText.callCount, j + 1,
        'called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k + 1,
        'called');
      assert.strictEqual(errCalled, true, 'called');
      assert.deepEqual(res, [
        false,
        [
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });
  });

  describe('handle host on disconnect', () => {
    const func = mjs.handleHostOnDisconnect;
    const lastErrorDefaultValue = browser.runtime.lastError;
    beforeEach(() => {
      mjs.appHost.set('status', {
        [HOST_CONNECTION]: true
      });
    });
    afterEach(() => {
      mjs.appHost.clear();
    });

    it('should throw', async () => {
      const stubConsole = sinon.stub(console, 'error');
      browser.runtime.lastError = null;
      await func({
        error: new Error('error')
      }).catch(e => {
        assert.strictEqual(e instanceof Error, true, 'error');
        assert.strictEqual(e.message, 'error', 'message');
      });
      stubConsole.restore();
      browser.runtime.lastError = lastErrorDefaultValue;
    });

    it('should call function', async () => {
      const stubErr = sinon.stub(console, 'error');
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      browser.runtime.lastError = null;
      const res = await func();
      const { called: errCalled } = stubErr;
      stubErr.restore();
      browser.runtime.lastError = lastErrorDefaultValue;
      assert.strictEqual(mjs.appHost.size, 0, 'size');
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount,
        i + 1, 'called');
      assert.strictEqual(browser.action.setBadgeText.callCount, j + 1,
        'called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k + 1,
        'called');
      assert.strictEqual(errCalled, false, 'not called');
      assert.deepEqual(res, [[
        undefined,
        undefined,
        undefined
      ]], 'result');
    });
  });

  describe('handle host on message', () => {
    const func = mjs.handleHostOnMsg;
    beforeEach(() => {
      mjs.appHost.clear();
      mjs.localOpts.clear();
      mjs.globalOpts.set(IS_MAC, false);
      mjs.tabList.clear();
    });
    afterEach(() => {
      mjs.appHost.clear();
      mjs.localOpts.clear();
      mjs.globalOpts.clear();
      mjs.tabList.clear();
    });

    it('should get empty array', async () => {
      const res = await func();
      assert.deepEqual(res, [], 'result');
    });

    it('should get empty array', async () => {
      const res = await func({});
      assert.deepEqual(res, [], 'result');
    });

    it('should get empty array', async () => {
      const res = await func({
        foo: 'bar'
      });
      assert.deepEqual(res, [], 'result');
    });

    it('should throw', async () => {
      const stubErr = sinon.stub(console, 'error');
      browser.runtime.getURL.throws(new Error('error'));
      const res = await func({
        [HOST]: {
          foo: 'bar'
        }
      }).catch(e => {
        assert.strictEqual(e instanceof Error, true, 'error');
        assert.strictEqual(e.message, 'error', 'message');
        return false;
      });
      const { calledOnce: errCalled } = stubErr;
      stubErr.restore();
      assert.strictEqual(errCalled, true, 'called');
      assert.strictEqual(res, false, 'result');
    });

    it('should call function', async () => {
      const i = browser.runtime.sendMessage.callCount;
      const j = browser.storage.local.set.callCount;
      const k = browser.menus.removeAll.callCount;
      const msg = {
        [EDITOR_CONFIG_RES]: {}
      };
      browser.runtime.getURL.returns('moz-extension://foo/bar.html');
      browser.tabs.query.resolves([{
        url: 'moz-extension://foo/bar.html'
      }]);
      browser.storage.local.get.resolves({});
      const res = await func(msg);
      assert.strictEqual(browser.runtime.sendMessage.callCount, i + 1,
        'called');
      assert.strictEqual(browser.storage.local.set.callCount, j + 1, 'called');
      assert.strictEqual(browser.menus.removeAll.callCount, k + 1, 'called');
      assert.deepEqual(res, [
        [
          undefined,
          [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined
          ],
          null
        ]
      ], 'result');
    });

    it('should call function', async () => {
      const msg = {
        [HOST]: {}
      };
      const res = await func(msg);
      assert.deepEqual(res, [[]], 'result');
    });

    it('should call function', async () => {
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      const msg = {
        [HOST_VERSION]: {
          isLatest: true,
          latest: '1.2.3'
        }
      };
      const res = await func(msg);
      const status = mjs.appHost.get('status');
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount,
        i + 1, 'called');
      assert.strictEqual(browser.action.setBadgeText.callCount, j + 1,
        'called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k + 1,
        'called');
      assert.strictEqual(status[HOST_COMPAT], true, 'compat');
      assert.strictEqual(status[HOST_VERSION_LATEST], null, 'latest');
      assert.deepEqual(res, [
        [
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });

    it('should call function', async () => {
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      const msg = {
        [HOST_VERSION]: {
          isLatest: true,
          result: 1,
          latest: '1.2.3'
        }
      };
      const res = await func(msg);
      const status = mjs.appHost.get('status');
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount,
        i + 1, 'called');
      assert.strictEqual(browser.action.setBadgeText.callCount, j + 1,
        'called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k + 1,
        'called');
      assert.strictEqual(status[HOST_COMPAT], true, 'compat');
      assert.strictEqual(status[HOST_VERSION_LATEST], null, 'latest');
      assert.deepEqual(res, [
        [
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });

    it('should call function', async () => {
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      const msg = {
        [HOST_VERSION]: {
          isLatest: false,
          result: 1,
          latest: '1.2.3'
        }
      };
      const res = await func(msg);
      const status = mjs.appHost.get('status');
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount,
        i + 1, 'called'
      );
      assert.strictEqual(browser.action.setBadgeText.callCount, j + 1,
        'called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k + 1,
        'called');
      assert.strictEqual(status[HOST_COMPAT], true, 'compat');
      assert.strictEqual(status[HOST_VERSION_LATEST], '1.2.3', 'latest');
      assert.deepEqual(res, [
        [
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });

    it('should call function', async () => {
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      const msg = {
        [HOST_VERSION]: {
          result: true
        }
      };
      const res = await func(msg);
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount,
        i + 1, 'called');
      assert.strictEqual(browser.action.setBadgeText.callCount, j + 1,
        'called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k + 1,
        'called');
      assert.deepEqual(res, [
        [
          undefined,
          undefined,
          undefined
        ]
      ], 'result');
    });

    it('should not call function', async () => {
      const i = browser.action.setBadgeBackgroundColor.callCount;
      const j = browser.action.setBadgeText.callCount;
      const k = browser.action.setBadgeTextColor.callCount;
      const msg = {
        [HOST_VERSION]: {}
      };
      const res = await func(msg);
      assert.strictEqual(browser.action.setBadgeBackgroundColor.callCount, i,
        'not called');
      assert.strictEqual(browser.action.setBadgeText.callCount, j,
        'not called');
      assert.strictEqual(browser.action.setBadgeTextColor.callCount, k,
        'not called');
      assert.deepEqual(res, [], 'result');
    });

    it('should call function', async () => {
      const i = browser.tabs.sendMessage.callCount;
      mjs.tabList.add(2);
      const msg = {
        [TMP_FILE_DATA_PORT]: {
          foo: 'bar'
        }
      };
      const res = await func(msg);
      assert.strictEqual(browser.tabs.sendMessage.callCount, i + 1, 'called');
      assert.deepEqual(res, [null], 'result');
    });

    it('should call function', async () => {
      const i = browser.tabs.query.callCount;
      const j = browser.tabs.sendMessage.callCount;
      browser.tabs.query.resolves([{
        id: 2
      }]);
      mjs.tabList.add(2);
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
      assert.strictEqual(browser.tabs.sendMessage.callCount, j + 1, 'called');
      assert.deepEqual(res, [null], 'result');
    });

    it('should call function', async () => {
      const i = browser.tabs.query.callCount;
      const j = browser.tabs.sendMessage.callCount;
      browser.tabs.query.resolves([{
        id: 2
      }]);
      mjs.tabList.add(2);
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
      assert.strictEqual(browser.tabs.sendMessage.callCount, j + 1, 'called');
      assert.deepEqual(res, [null], 'result');
    });
  });

  describe('set host', () => {
    const func = mjs.setHost;
    beforeEach(() => {
      mjs.appHost.clear();
    });
    afterEach(() => {
      mjs.appHost.clear();
    });

    it('should not set map', async () => {
      browser.runtime.connectNative.returns(null);
      await func();
      assert.strictEqual(mjs.appHost.size, 0, 'size');
    });

    it('should set map', async () => {
      await func();
      assert.strictEqual(mjs.appHost.size, 3, 'size');
      assert.strictEqual(mjs.appHost.has('port'), true, 'port');
      assert.strictEqual(
        mjs.appHost.get('port').onDisconnect.addListener.called, true,
        'called');
      assert.strictEqual(mjs.appHost.get('port').onMessage.addListener.called,
        true, 'called');
      assert.strictEqual(mjs.appHost.has('status'), true, 'status');
      assert.strictEqual(mjs.appHost.has('tabs'), true, 'tabs');
    });
  });

  describe('startup', () => {
    const func = mjs.startup;
    beforeEach(() => {
      mjs.localOpts.clear();
      mjs.globalOpts.clear();
    });
    afterEach(() => {
      mjs.localOpts.clear();
      mjs.globalOpts.clear();
    });

    it('should get array', async () => {
      browser.runtime.getPlatformInfo.resolves({
        os: 'mac'
      });
      browser.storage.local.get.resolves({});
      const res = await func();
      assert.deepEqual(res, [
        undefined,
        undefined,
        undefined
      ], 'result');
    });

    it('should get array', async () => {
      browser.runtime.getPlatformInfo.resolves({
        os: 'win'
      });
      browser.storage.local.get.resolves({});
      const res = await func();
      assert.deepEqual(res, [
        undefined,
        undefined,
        undefined
      ], 'result');
    });

    it('should get array', async () => {
      browser.runtime.getPlatformInfo.resolves({
        os: 'linux'
      });
      browser.storage.local.get.resolves({});
      const res = await func();
      assert.deepEqual(res, [
        undefined,
        undefined,
        undefined
      ], 'result');
    });
  });
});
