/**
 * setup.js
 */

import domPurify from 'dompurify';
import sinon from 'sinon';
import { JSDOM } from 'jsdom';
import { Schema } from 'webext-schema';

export class DataTransfer {
  #items;

  constructor() {
    this.#items = new Map();
  }

  get types() {
    return Array.from(this.#items.keys());
  }

  clearData(format) {
    if (format) {
      this.#items.remove(format);
    } else {
      this.#items.clear();
    }
  }

  getData(type) {
    return this.#items.get(type) || '';
  }

  setData(type, value) {
    this.#items.set(type, value);
  }
}

/**
 * create jsdom
 * @param {string} url - url
 * @returns {object} - jsdom instance
 */
export const createJsdom = url => {
  const domstr = '<!DOCTYPE html><html><head></head><body></body></html>';
  const opt = {
    runScripts: 'dangerously',
    url: url || 'https://localhost',
    beforeParse(window) {
      window.alert = sinon.stub();
      window.DOMPurify = domPurify(window);
    }
  };
  return new JSDOM(domstr, opt);
};

const { window } = createJsdom();
const { document } = window;

/**
 * get channel
 * @returns {string} - channel
 */
const getChannel = () => {
  let ch;
  const reg = /(?<=--channel=)[a-z]+/;
  const args = process.argv.filter(arg => reg.test(arg));
  if (args.length) {
    [ch] = reg.exec(args);
  } else {
    ch = 'beta';
  }
  return ch;
};

const channel = getChannel();

console.log(`Channel: ${channel}`);

export const browser = new Schema(channel).mock();

export const mockPort = ({ name, sender }) => {
  const port = Object.assign({}, browser.runtime.Port);
  port.name = name;
  port.sender = sender;
  return port;
};

browser.i18n.getMessage.callsFake((...args) => args.toString());
browser.menus.removeAll.resolves(undefined);
browser.permissions.contains.resolves(true);
browser.runtime.connect.callsFake(mockPort);
browser.runtime.connectNative.callsFake(mockPort);

global.window = window;
global.document = document;
global.browser = browser;

const globalKeys = [
  'ClipboardEvent', 'DataTransfer', 'DOMTokenList', 'DOMParser', 'DOMPurify',
  'Event', 'FocusEvent', 'Headers', 'HTMLUnknownElement', 'InputEvent',
  'KeyboardEvent', 'Node', 'NodeList', 'Selection', 'StaticRange',
  'XMLSerializer'
];
for (const key of globalKeys) {
  // Not implemented in jsdom
  if (key === 'InputEvent') {
    if (typeof window.InputEvent.prototype.getTargetRanges !== 'function') {
      Object.defineProperty(window.InputEvent.prototype, 'getTargetRanges', {
        value: sinon.stub()
      });
    }
    if (typeof window.InputEvent.prototype.dataTransfer === 'undefined') {
      window.InputEvent.prototype.dataTransfer = new DataTransfer();
    }
  } else if (!window[key]) {
    if (key === 'ClipboardEvent') {
      window[key] = class ClipboardEvent extends window.Event {
        constructor(arg, initEvt) {
          super(arg, initEvt);
          this.clipboardData = initEvt.clipboardData || null;
        }
      };
    } else if (key === 'DataTransfer') {
      window[key] = DataTransfer;
    }
  }
  if (window[key] && !global[key]) {
    global[key] = window[key];
  }
}
