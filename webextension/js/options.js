/**
 * options.js
 */
"use strict";
{
  /* constants */
  const PORT_NAME = "portOptions";

  const CHECK_EXECUTABLE = "checkExecutable";
  const GET_APP_MANIFEST = "getAppManifest";
  const RES_APP_MANIFEST = "resAppManifest";
  const RES_EXECUTABLE = "resExecutable";

  const CHAR = "utf-8";
  const DATA_ATTR_I18N = "data-i18n";
  const LANG = "optionsLang";

  const APP_MANIFEST = "appManifestPath";
  const APP_NAME = "appName";
  const EDITOR_NAME = "editorName";
  const KEY_ACCESS = "accessKey";

  /* shortcuts */
  const i18n = browser.i18n;
  const runtime = browser.runtime;
  const storage = browser.storage.local;

  /**
   * log error
   * @param {Object} e - Error
   * @return {boolean} - false
   */
  const logError = e => {
    e && console.error(e);
    return false;
  };

  /**
   * is string
   * @param {*} o - object to check
   * @return {boolean} - result
   */
  const isString = o =>
    o && (typeof o === "string" || o instanceof String) || false;

  /* port */
  const port = runtime.connect({name: PORT_NAME});

  /**
   * port message
   * @param {*} msg - message
   * @return {void}
   */
  const portMsg = async msg => {
    msg && port.postMessage(msg);
  };

  /* storage */
  /**
   * set storage
   * @param {Object} pref - pref
   * @return {void}
   */
  const setStorage = async pref => {
    pref && storage.set(pref);
  };

  /**
   * create pref
   * @param {Object} elm - element
   * @param {boolean} executable - executable
   * @return {Object} - pref data
   */
  const createPref = async (elm, executable = false) => {
    const id = elm && elm.id;
    return id && {
      [id]: {
        id,
        value: elm.value || "",
        checked: !!elm.checked,
        app: {
          executable: !!executable
        }
      }
    } || null;
  };

  /**
   * synchronize editorName value
   * @param {string} executable - executable
   * @return {Object} - element
   */
  const syncEditorName = async (executable = false) => {
    const elm = document.getElementById(EDITOR_NAME);
    if (elm) {
      const app = document.getElementById(APP_NAME);
      const name = app && app.value;
      if (executable && name) {
        elm.value = name;
        elm.disabled = false;
      }
      else {
        elm.value = "";
        elm.disabled = true;
      }
    }
    return elm || null;
  };

  /**
   * extract application manifest
   * @param {Array} arr - Uint8Array
   * @return {void}
   */
  const extractAppManifest = async (arr = []) => {
    const app = await JSON.parse((new TextDecoder(CHAR)).decode(arr));
    const name = app && app.name;
    const path = app && app.path;
    const elm = document.getElementById(APP_NAME);
    name && path && elm && (
      elm.value = name,
      createPref(elm).then(setStorage).catch(logError),
      portMsg({
        [CHECK_EXECUTABLE]: {path}
      }).catch(logError)
    );
  };

  /**
   * set pref storage
   * @param {Object} evt - Event
   * @return {void}
   */
  const setPrefStorage = async evt => {
    const elm = evt && evt.target;
    if (elm) {
      if (elm.type === "radio") {
        const nodes = document.querySelectorAll(`[name=${elm.name}]`);
        if (nodes instanceof NodeList) {
          for (const node of nodes) {
            createPref(node).then(setStorage).catch(logError);
          }
        }
      }
      else {
        switch (elm.id) {
          case APP_MANIFEST:
            portMsg({
              [GET_APP_MANIFEST]: {
                path: elm.value
              }
            });
            break;
          case KEY_ACCESS:
            (elm.value === "" || elm.value.length === 1) &&
              createPref(elm).then(setStorage).catch(logError);
            break;
          default:
            createPref(elm).then(setStorage).catch(logError);
        }
      }
    }
  };

  /* html */
  /**
   * add event listener to input elements
   * @return {void}
   */
  const addInputChangeListener = async () => {
    const nodes = document.querySelectorAll("input");
    if (nodes instanceof NodeList) {
      for (const node of nodes) {
        node.addEventListener("change", setPrefStorage, false);
      }
    }
  };

  /**
   * localize attribute value
   * @param {Object} elm - element
   * @return {void}
   */
  const localizeAttr = async elm => {
    if (elm && elm.nodeType === Node.ELEMENT_NODE && elm.hasAttributes()) {
      const attrs = {
        ariaLabel: "aria-label",
        alt: "alt",
        href: "href",
        placeholder: "placeholder",
        title: "title"
      };
      const dataAttr = elm.getAttribute(DATA_ATTR_I18N);
      const items = Object.keys(attrs);
      for (const item of items) {
        const attr = attrs[item];
        elm.hasAttribute(attr) &&
          elm.setAttribute(attr, i18n.getMessage(`${dataAttr}.${item}`));
      }
    }
  };

  /**
   * localize html
   * @return {void}
   */
  const localizeHtml = async () => {
    const lang = i18n.getMessage(LANG);
    if (lang) {
      document.documentElement.setAttribute("lang", lang);
      const nodes = document.querySelectorAll(`[${DATA_ATTR_I18N}]`);
      if (nodes instanceof NodeList) {
        for (const node of nodes) {
          const data = i18n.getMessage(node.getAttribute(DATA_ATTR_I18N));
          data && (node.textContent = data);
          node.hasAttributes() && localizeAttr(node);
        }
      }
    }
  };

  /**
   * set HTML input value
   * @param {Object} data - storage data
   * @return {void}
   */
  const setHtmlInputValue = async data => {
    const elm = data && data.id && document.getElementById(data.id);
    if (elm) {
      switch (elm.type) {
        case "checkbox":
        case "radio":
          elm.checked = !!data.checked;
          break;
        case "text":
          elm.value = isString(data.value) && data.value || "";
          elm === document.getElementById(EDITOR_NAME) && elm.value &&
            (elm.disabled = false);
          break;
        default:
      }
    }
  };

  /**
   * set html input values from storage
   * @return {void}
   */
  const setValuesFromStorage = async () => {
    const pref = await storage.get();
    const items = pref && Object.keys(pref);
    if (items && items.length > 0) {
      for (const item of items) {
        setHtmlInputValue(pref[item]);
      }
    }
  };

  /* handler */
  /**
   * handle message
   * @param {*} msg - message
   * @return {void}
   */
  const handleMsg = async msg => {
    const items = msg && Object.keys(msg);
    if (items && items.length > 0) {
      for (const item of items) {
        const obj = msg[item];
        switch (item) {
          case RES_APP_MANIFEST:
            extractAppManifest(obj.value).catch(logError);
            break;
          case RES_EXECUTABLE:
            Promise.all([
              createPref(
                document.getElementById(APP_MANIFEST), obj.executable
              ).then(setStorage),
              syncEditorName(obj.executable).then(createPref).then(setStorage),
              // NOTE: for hybrid
              portMsg({removeSdkPrefs: obj.executable})
            ]).catch(logError);
            break;
          default:
        }
      }
    }
  };

  /* listeners */
  port.onMessage.addListener(handleMsg);

  document.addEventListener("DOMContentLoaded", () => Promise.all([
    localizeHtml(),
    setValuesFromStorage(),
    addInputChangeListener()
  ]).catch(logError), false);
}
