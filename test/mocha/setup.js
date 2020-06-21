/**
 * setup.js
 */

"use strict";
const {JSDOM} = require("jsdom");
const {Schema} = require("webext-schema");
const sinon = require("sinon");

/**
 * create jsdom
 *
 * @param {string} url - url
 * @returns {object} - jsdom instance
 */
const createJsdom = url => {
  const domstr = "<!DOCTYPE html><html><head></head><body></body></html>";
  const opt = {
    runScripts: "dangerously",
    url: url || "https://localhost",
    beforeParse(window) {
      window.alert = sinon.stub().callsFake((...args) => args.toString());
    },
  };
  return new JSDOM(domstr, opt);
};

const {window} = createJsdom();
const {document} = window;

const browser = new Schema("central").mock();

const mockPort = ({name, sender}) => {
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

module.exports = {
  browser, createJsdom, mockPort,
};
