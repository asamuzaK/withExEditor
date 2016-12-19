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
  const NODE_ELEMENT = 1;

  const APP_MANIFEST = "appManifestPath";
  const APP_NAME = "appName";
  const EDITOR_NAME = "editorName";
  const KEY_ACCESS = "accessKey";

  /* shortcuts */
  const i18n = browser.i18n;
  const runtime = browser.runtime;
  const storage = browser.storage.local;

  /* variables */
  const vars = {
    [APP_MANIFEST]: null,
    [APP_NAME]: null,
    [EDITOR_NAME]: null,
    [KEY_ACCESS]: null
  };

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
   * @return {boolean}
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
   * @param {boolean} bool - executable
   * @return {Object}
   */
  const createPref = async (elm, bool = false) => {
    const id = elm && elm.id;
    return id && {
      [id]: {
        id,
        value: elm.value || "",
        checked: !!elm.checked,
        app: {
          executable: !!bool
        }
      }
    } || null;
  };

  /**
   * synchronize editorName value
   * @param {string} bool - native application is executable
   * @return {Object} - vars[EDITOR_NAME]
   */
  const syncEditorName = async (bool = false) => {
    const elm = vars[EDITOR_NAME];
    if (elm) {
      const name = vars[APP_NAME] && vars[APP_NAME].value;
      bool && name ? (
        elm.value = name,
        elm.disabled = false
      ) : (
        elm.value = "",
        elm.disabled = true
      );
    }
    return elm || null;
  };

  /**
   * extract application manifest
   * @param {Array} arr - uint8 array
   * @return {void}
   */
  const extractAppManifest = async (arr = []) => {
    const app = await JSON.parse((new TextDecoder(CHAR)).decode(arr));
    const name = app && app.name;
    const path = app && app.path;
    name && path && (
      vars[APP_NAME].value = name,
      createPref(name).then(setStorage).catch(logError),
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
    const elm = evt.target;
    if (elm) {
      if (elm.type === "radio") {
        const nodes = document.querySelectorAll(`[name=${elm.name}]`);
        if (nodes instanceof NodeList) {
          for (let node of nodes) {
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
      for (let node of nodes) {
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
        ariaLabel: "aria-label",
        alt: "alt",
        href: "href",
        placeholder: "placeholder",
        title: "title"
      };
      const items = Object.keys(attrs);
      for (let item of items) {
        if (elm.hasAttribute(attrs[item])) {
          const attr = i18n.getMessage(
            `${elm.getAttribute(DATA_ATTR_I18N)}.${item}`
          );
          attr && elm.setAttribute(attrs[item], attr);
        }
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
        for (let node of nodes) {
          const data = i18n.getMessage(node.getAttribute(DATA_ATTR_I18N));
          data && (node.textContent = data);
          node.hasAttributes() && localizeAttr(node);
        }
      }
    }
  };

  /**
   * set html input values from storage
   * @return {void}
   */
  const setValuesFromStorage = async () => {
    const pref = await storage.get() || {};
    const items = pref && Object.keys(pref);
    if (items && items.length > 0) {
      for (let item of items) {
        const obj = pref[item];
        const elm = document.getElementById(obj.id);
        if (elm) {
          switch (elm.type) {
            case "checkbox":
            case "radio":
              elm.checked = !!obj.checked;
              break;
            case "text":
              elm.value = isString(obj.value) && obj.value || "";
              elm === vars[EDITOR_NAME] && elm.value && (elm.disabled = false);
              break;
            default:
          }
        }
      }
    }
  };

  /**
   * set variables
   * @return {void}
   */
  const setVariables = async () => {
    const items = Object.keys(vars);
    if (items.length > 0) {
      for (let item of items) {
        vars[item] = document.getElementById(item);
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
    const items = Object.keys(msg);
    if (items.length > 0) {
      for (let item of items) {
        const obj = msg[item];
        switch (item) {
          case RES_APP_MANIFEST:
            extractAppManifest(obj.value).catch(logError);
            break;
          case RES_EXECUTABLE:
            Promise.all([
              createPref(vars[APP_MANIFEST], obj.executable).then(setStorage),
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
    setVariables().then(setValuesFromStorage),
    addInputChangeListener()
  ]).catch(logError), false);
}
