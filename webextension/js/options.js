/**
 * options.js
 */
"use strict";
{
  /* constants */
  const PORT_OPTIONS = "portOptions";
  const CHECK_EXECUTABLE = "checkExecutable";
  const GET_APP_MANIFEST = "getAppManifest";
  const RES_APP_MANIFEST = "resAppManifest";
  const RES_EXECUTABLE = "resExecutable";

  const CHAR = "utf-8";
  const DATA_ATTR_I18N = "data-i18n";
  const ELEMENT_NODE = 1;

  const APP_MANIFEST = "appManifestPath";
  const APP_NAME = "appName";
  const EDITOR_NAME = "editorName";

  /* shortcuts */
  const i18n = browser.i18n;
  const runtime = browser.runtime;
  const storage = browser.storage.local;

  /* port */
  const port = runtime.connect({name: PORT_OPTIONS});

  /* variables */
  const vars = {
    [APP_MANIFEST]: null,
    [APP_NAME]: null,
    [EDITOR_NAME]: null
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

  /* storage */
  /**
   * create pref object
   * @param {Object} elm - element
   * @param {boolean} bool - executable
   * @return {Object}
   */
  const createPrefObj = async (elm, bool = false) => {
    const id = elm && elm.id;
    let pref = null;
    id && (
      pref = {
        [id]: {
          id,
          value: elm.value || "",
          checked: !!elm.checked,
          app: {
            executable: bool
          }
        }
      }
    );
    return pref;
  };

  /**
   * synchronize editorName value
   * @param {string} bool - native application is executable
   * @return {void}
   */
  const synchronizeEditorName = async (bool = false) => {
    if (vars[EDITOR_NAME]) {
      const name = vars[APP_NAME] && vars[APP_NAME].value;
      bool && name ? (
        vars[EDITOR_NAME].value = name,
        vars[EDITOR_NAME].disabled = false
      ) : (
        vars[EDITOR_NAME].value = "",
        vars[EDITOR_NAME].disabled = true
      );
      createPrefObj(vars[EDITOR_NAME]).then(pref => {
        pref && storage.set(pref);
      }).catch(logError);
    }
  };

  /**
   * extract app manifest
   * @param {Array} arr - uint8 array
   * @return {void}
   */
  const extractAppManifest = async (arr = []) => {
    const app = await JSON.parse((new TextDecoder(CHAR)).decode(arr));
    const name = app && app.name;
    const path = app && app.path;
    name && path && (
      vars[APP_NAME].value = name,
      createPrefObj(vars[APP_NAME]).then(pref => {
        pref && storage.set(pref);
      }).catch(logError),
      port.postMessage({
        [CHECK_EXECUTABLE]: {path}
      })
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
      let pref;
      if (elm.type === "radio") {
        const nodes = document.querySelectorAll(`[name=${elm.name}]`);
        if (nodes instanceof NodeList) {
          for (let node of nodes) {
            pref = await createPrefObj(node).catch(logError);
            pref && storage.set(pref);
          }
        }
      }
      else {
        elm === vars[APP_MANIFEST] ?
          port.postMessage({
            [GET_APP_MANIFEST]: {
              path: elm.value
            }
          }) : (
          pref = await createPrefObj(elm).catch(logError),
          pref && storage.set(pref)
        );
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
    if (elm && elm.nodeType === ELEMENT_NODE && elm.hasAttributes()) {
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
          const attr = await i18n.getMessage(
            `${elm.getAttribute(DATA_ATTR_I18N)}.${item}`
          );
          attr && elm.setAttribute(attrs[item], attr);
        }
      }
    }
  };

  /**
   * localize element content
   * @return {void}
   */
  const localizeElm = async () => {
    const nodes = document.querySelectorAll(`[${DATA_ATTR_I18N}]`);
    if (nodes instanceof NodeList) {
      for (let node of nodes) {
        const data = await i18n.getMessage(node.getAttribute(DATA_ATTR_I18N));
        data && (node.textContent = data);
        node.hasAttributes() && localizeAttr(node);
      }
    }
  };

  /**
   * localize html lang property
   * @return {void}
   */
  const localizeHtmlLang = async () => {
    const lang = await browser.i18n.getUILanguage();
    lang && document.documentElement.setAttribute("lang", lang);
  };

  /**
   * set values from storage
   * @return {void}
   */
  const createVariablesFromStorage = async () => {
    const pref = await storage.get() || {};
    const items = Object.keys(pref);
    if (items.length > 0) {
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
   * set default variables value
   * @return {void}
   */
  const setVariables = async () => {
    vars[APP_NAME] = document.getElementById(APP_NAME);
    vars[APP_MANIFEST] = document.getElementById(APP_MANIFEST);
    vars[EDITOR_NAME] = document.getElementById(EDITOR_NAME);
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
              createPrefObj(vars[APP_MANIFEST], obj.executable).then(pref => {
                storage.set(pref);
              }),
              synchronizeEditorName(obj.executable)
            ]).catch(logError);
            break;
          default:
        }
      }
    }
  };

  /* add listener */
  port.onMessage.addListener(handleMsg);

  window.addEventListener("DOMContentLoaded", () => Promise.all([
    localizeHtmlLang().then(localizeElm),
    setVariables().then(createVariablesFromStorage),
    addInputChangeListener()
  ]).catch(logError), false);
}
