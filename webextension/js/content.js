/**
 * content.js
 */
"use strict";
{
  /* constants */
  const KEY = "e";
  const PORT_KBD = "portKbdEvent";

  /* shortcut */
  const runtime = browser.runtime;

  /* connect to background */
  const port = runtime.connect({name: PORT_KBD});

  /**
   * is string
   * @param {*} o - object to check
   * @return {boolean}
   */
  const isString = o =>
    o && (typeof o === "string" || o instanceof String) || false;

  /**
   * key combination class
   */
  class KeyCombo {
    /**
     * @param {Object} opt - key settings
     * @param {string} [opt.key] - key string
     * @param {boolean} [opt.alt] - altKey
     * @param {boolean} [opt.ctrl] - ctrlKey
     * @param {boolean} [opt.meta] - metaKey
     * @param {boolean} [opt.shift] - shiftKey
     * @param {boolean} [opt.enabled] - enabled
     */
    constructor(opt = {}) {
      this._key = isString(opt.key) && opt.key.length === 1 && opt.key || "";
      this._alt = opt.alt || false;
      this._ctrl = opt.ctrl || false;
      this._meta = opt.meta || false;
      this._shift = opt.shift || false;
      this._enabled = opt.enabled || false;
    }

    get key() {
      return this._key;
    }

    set key(key) {
      this._key = isString(key) && key.length === 1 && key || "";
    }

    get altKey() {
      return this._alt;
    }

    set altKey(bool) {
      this._alt = !!bool;
    }

    get ctrlKey() {
      return this._ctrl;
    }

    set ctrlKey(bool) {
      this._ctrl = !!bool;
    }

    get metaKey() {
      return this._meta;
    }

    set metaKey(bool) {
      this._meta = !!bool;
    }

    get shiftKey() {
      return this._shift;
    }

    set shiftKey(bool) {
      this._shift = !!bool;
    }

    get enabled() {
      return this._enabled;
    }

    set enabled(bool) {
      this._enabled = !!bool;
    }
  }

  /* open options key combination */
  const openOptionsKey = new KeyCombo({
    key: KEY,
    alt: true,
    ctrl: true,
    meta: false,
    shift: false,
    enabled: true
  });

  /* execute editor key combination */
  const execEditorKey = new KeyCombo({
    key: KEY,
    alt: false,
    ctrl: true,
    meta: false,
    shift: true,
    enabled: true
  });

  /**
   * key combination matches
   * @param {Object} evt - Event
   * @param {Object} key - KeyCombo
   * @return {boolean}
   */
  const keyComboMatches = async (evt, key) =>
    key.enabled && evt.key && evt.key.toLowerCase() === key.key.toLowerCase() &&
    evt.altKey === key.altKey && evt.ctrlKey === key.ctrlKey &&
    evt.metaKey === key.metaKey && evt.shiftKey === key.shiftKey || false;

  /**
   * port key combination matches
   * @param {Object} evt - Event
   * @return {void}
   */
  const portKeyCombo = async evt => {
    const openOptions = await keyComboMatches(evt, openOptionsKey);
    const execEditor = await keyComboMatches(evt, execEditorKey);
    port.postMessage({openOptions, execEditor});
  };

  /**
   * update key combo
   * @param {*} msg - message
   * @return {void}
   */
  const updateKeyCombo = async msg => {
    const items = Object.keys(msg);
    if (items.length > 0) {
      for (let item of items) {
        switch (item) {
          case "keyCombo":
            item = msg[item];
            openOptionsKey.key = item.key;
            execEditorKey.key = item.key;
            openOptionsKey.enabled = item.openOptions;
            execEditorKey.enabled = item.execEditor;
            break;
          default:
        }
      }
    }
  };

  port.onMessage.addListener(updateKeyCombo);

  port.postMessage({
    keyCombo: {
      key: KEY,
      openOptions: openOptionsKey.enabled,
      execEditor: execEditorKey.enabled
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.addEventListener("keypress", portKeyCombo, false);
  }, false);
}
