/**
 * options.js
 */
"use strict";
{
  /* api */
  const {i18n, runtime} = browser;
  const storage = browser.storage.local;

  /* constants */
  const PORT_NAME = "portOptions";

  const CHECK_EXECUTABLE = "checkExecutable";
  const GET_APP_MANIFEST = "getAppManifest";
  const RES_APP_MANIFEST = "resAppManifest";
  const RES_EXECUTABLE = "resExecutable";

  const CHAR = "utf-8";
  const DATA_ATTR_I18N = "data-i18n";
  const LANG = "optionsLang";
  const NODE_ELEMENT = Node.ELEMENT_NODE;

  const APP_MANIFEST = "appManifestPath";
  const APP_NAME = "appName";
  const EDITOR_NAME = "editorName";
  const KEY_ACCESS = "accessKey";

  /**
   * log error
   * @param {!Object} e - Error
   * @return {boolean} - false
   */
  const logError = e => {
    console.error(e);
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
   * @return {Object} - ?Promise.<void>
   */
  const setStorage = async pref => pref && storage.set(pref) || null;

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
        app: {
          executable: !!executable,
        },
        checked: !!elm.checked,
        value: elm.value || "",
      },
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
      } else {
        elm.value = "";
        elm.disabled = true;
      }
    }
    return elm || null;
  };

  /**
   * extract application manifest
   * @param {Array} arr - Uint8Array
   * @return {Object} - Promise.<Array.<*>>
   */
  const extractAppManifest = async (arr = []) => {
    const func = [];
    const app = await JSON.parse((new TextDecoder(CHAR)).decode(arr));
    if (app) {
      const {name, path} = app;
      const elm = document.getElementById(APP_NAME);
      if (elm && name && path) {
        elm.value = name;
        func.push(createPref(elm).then(setStorage));
        func.push(portMsg({
          [CHECK_EXECUTABLE]: {path},
        }));
      }
    }
    return Promise.all(func);
  };

  /**
   * set pref storage
   * @param {!Object} evt - Event
   * @return {Object} - Promise.<Array.<*>>
   */
  const setPrefStorage = async evt => {
    const func = [];
    const elm = evt.target;
    if (elm.type === "radio") {
      const nodes = document.querySelectorAll(`[name=${elm.name}]`);
      if (nodes instanceof NodeList) {
        for (const node of nodes) {
          func.push(createPref(node).then(setStorage));
        }
      }
    } else {
      switch (elm.id) {
        case APP_MANIFEST:
          func.push(portMsg({
            [GET_APP_MANIFEST]: {
              path: elm.value,
            },
          }));
          break;
        case KEY_ACCESS:
          (elm.value === "" || elm.value.length === 1) &&
            func.push(createPref(elm).then(setStorage));
          break;
        default:
          func.push(createPref(elm).then(setStorage));
      }
    }
    return Promise.all(func).catch(logError);
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
    if (elm && elm.nodeType === NODE_ELEMENT && elm.hasAttributes()) {
      const attrs = {
        alt: "alt",
        ariaLabel: "aria-label",
        href: "href",
        placeholder: "placeholder",
        title: "title",
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
   * set html input value
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
   * @return {Object} - Promise.<Array.<*>>
   */
  const setValuesFromStorage = async () => {
    const func = [];
    const pref = await storage.get();
    const items = pref && Object.keys(pref);
    if (items && items.length) {
      for (const item of items) {
        func.push(setHtmlInputValue(pref[item]));
      }
    }
    return Promise.all(func);
  };

  /* handler */
  /**
   * handle message
   * @param {*} msg - message
   * @return {Object} - Promise.<Array<*>>
   */
  const handleMsg = async msg => {
    const func = [];
    const items = msg && Object.keys(msg);
    if (items && items.length) {
      for (const item of items) {
        const obj = msg[item];
        switch (item) {
          case RES_APP_MANIFEST:
            func.push(extractAppManifest(obj.value));
            break;
          case RES_EXECUTABLE:
            func.push(
              createPref(
                document.getElementById(APP_MANIFEST), obj.executable
              ).then(setStorage)
            );
            func.push(
              syncEditorName(obj.executable).then(createPref).then(setStorage)
            );
            // NOTE: for hybrid
            func.push(portMsg({removeSdkPrefs: obj.executable}));
            break;
          default:
        }
      }
    }
    return Promise.all(func).catch(logError);
  };

  /* listeners */
  port.onMessage.addListener(handleMsg);

  document.addEventListener("DOMContentLoaded", () => Promise.all([
    localizeHtml(),
    setValuesFromStorage(),
    addInputChangeListener(),
  ]).catch(logError), false);
}
