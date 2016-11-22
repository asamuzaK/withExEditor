/**
 * options.js
 */
"use strict";
{
  /* constants */
  const PORT_OPTIONS = "portOptions";
  const RES_EXECUTABLE = "resExecutable";
  const DATA_ATTR_I18N = "data-i18n";
  const ELEMENT_NODE = 1;

  const EDITOR_PATH = "editorPath";
  const EDITOR_NAME = "editorName";

  /* shortcuts */
  const i18n = browser.i18n;
  const runtime = browser.runtime;
  const storage = browser.storage.local;

  /* port */
  const port = runtime.connect({name: PORT_OPTIONS});

  /* variables */
  const vars = {};

  vars[EDITOR_PATH] = null;
  vars[EDITOR_NAME] = null;

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
   * synchronize editorName value
   * @param {string} name - editor name
   * @return {void}
   */
  const synchronizeEditorName = async name => {
    vars[EDITOR_NAME] && (
      name && isString(name) ? (
        vars[EDITOR_NAME].value = name,
        vars[EDITOR_NAME].disabled = false
      ) : (
        vars[EDITOR_NAME].value = "",
        vars[EDITOR_NAME].disabled = true
      ),
      storage.set({
        editorName: {
          id: EDITOR_NAME,
          value: name && isString(name) && name || "",
          checked: false,
          data: {
            executable: false
          }
        }
      })
    );
  };

  /**
   * create pref object
   * @param {Object} elm - element
   * @return {Object}
   */
  const createPrefObj = async elm => {
    let pref = null;
    if (elm && elm.id) {
      pref = {};
      pref[elm.id] = {
        id: elm.id,
        value: elm.value || "",
        checked: !!elm.checked,
        data: {
          executable: false
        }
      };
    }
    return pref;
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
            pref = await createPrefObj(node);
            pref && storage.set(pref);
          }
        }
      }
      else {
        vars[EDITOR_PATH] && elm === vars[EDITOR_PATH] ?
          port.postMessage({
            checkExecutable: {
              path: elm.value
            }
          }) : (
            pref = await createPrefObj(elm),
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
        placeholder: "placeholder",
        title: "title"
      };
      const items = Object.keys(attrs);
      for (let item of items) {
        if (elm.hasAttribute(attrs[item])) {
          const data = await i18n.getMessage(
            `${elm.getAttribute(DATA_ATTR_I18N)}.${item}`
          );
          data && elm.setAttribute(attrs[item], data);
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
              vars[EDITOR_PATH] && elm === vars[EDITOR_PATH] && elm.value &&
              obj.data && obj.data.executable && (
                elm.dataset.executable = "true",
                vars[EDITOR_NAME] && (vars[EDITOR_NAME].disabled = false)
              );
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
    vars[EDITOR_PATH] = document.getElementById(EDITOR_PATH);
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
    if (items.length === 1) {
      const item = items[0] === RES_EXECUTABLE && msg[items[0]];
      if (item) {
        const bool = !!item.executable;
        storage.set({
          editorPath: {
            id: EDITOR_PATH,
            value: bool && item.value || "",
            checked: false,
            data: {
              executable: bool
            }
          }
        });
        synchronizeEditorName(bool && item.name || "");
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
