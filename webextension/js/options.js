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
  const ELEMENT_NODE = 1;

  const APP_MANIFEST = "appManifestPath";
  const APP_NAME = "appName";
  const EDITOR_NAME = "editorName";

  /* shortcuts */
  const i18n = browser.i18n;
  const runtime = browser.runtime;
  const storage = browser.storage.local;

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
   * create pref object
   * @param {Object} elm - element
   * @param {boolean} bool - executable
   * @return {Object}
   */
  const createPrefObj = async (elm, bool = false) => {
    const id = elm && elm.id;
    return id && {
      [id]: {
        id,
        value: elm.value || "",
        checked: !!elm.checked,
        app: {
          executable: bool
        }
      }
    } || null;
  };

  /**
   * synchronize editorName value
   * @param {string} bool - native application is executable
   * @return {void}
   */
  const syncEditorName = async (bool = false) => {
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
      createPrefObj(name).then(pref => {
        pref && storage.set(pref);
      }).catch(logError),
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
            createPrefObj(node).then(pref => {
              pref && storage.set(pref);
            }).catch(logError);
          }
        }
      }
      else {
        elm === vars[APP_MANIFEST] ?
          portMsg({
            [GET_APP_MANIFEST]: {
              path: elm.value
            }
          }) :
          createPrefObj(elm).then(pref => {
            pref && storage.set(pref);
          }).catch(logError);
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
          const attr = i18n.getMessage(
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
        const data = i18n.getMessage(node.getAttribute(DATA_ATTR_I18N));
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
    const lang = i18n.getMessage(LANG);
    lang && document.documentElement.setAttribute("lang", lang);
  };

  /**
   * set html input values from storage
   * @return {void}
   */
  const setValuesFromStorage = async () => {
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
   * set variables
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
              syncEditorName(obj.executable),
              /* NOTE: for hybrid */
              portMsg({
                removeSdkPrefs: obj.executable
              })
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
    localizeHtmlLang().then(localizeElm),
    setVariables().then(setValuesFromStorage),
    addInputChangeListener()
  ]).catch(logError), false);
}
