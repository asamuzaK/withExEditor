/**
 * options.js
 */
"use strict";
{
  /* constants */
  const EDITOR_PATH = "editorPath";
  const EDITOR_NAME = "editorName";
  const ELEMENT_NODE = 1;

  /* variables */
  let editorPath, editorName;

  /* shortcuts */
  const i18n = browser.i18n;
  const runtime = browser.runtime;
  const storage = browser.storage.local;

  /* error handling */
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

  /**
   * synchronize editorName value
   * @param {string} name - editor name
   * @return {void}
   */
  const synchronizeEditorName = async name => {
    editorName && (
      name && isString(name) ? (
        editorName.value = name,
        editorName.disabled = false
      ) : (
        editorName.value = "",
        editorName.disabled = true
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
   * check given path is executable (FAKE NOW)
   * @param {string} path - path
   * @return {boolean}
   */
  const checkExecutable = async path => {
    const app = {
      executable: isString(path) && !!path,
      name: isString(path) && path.replace(/\..*$/, "") || ""
    };
    synchronizeEditorName(app.name);
    return app.executable;
  };

  /**
   * create pref object
   * @param {Object} elm - element
   * @return {Object}
   */
  const createPrefObj = async elm => {
    let pref = null;
    if (elm && elm.id) {
      const bool = editorPath && elm === editorPath &&
                     await checkExecutable(elm.value) || false;
      pref = {};
      pref[elm.id] = {
        id: elm.id,
        value: elm.value || "",
        checked: (elm.type === "checkbox" || elm.type === "radio") &&
                   !!elm.checked || false,
        data: {
          executable: bool
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
        pref = await createPrefObj(elm);
        pref && storage.set(pref);
      }
    }
  };

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
      for (let attr in attrs) {
        if (elm.hasAttribute(attrs[attr])) {
          const data = await i18n.getMessage(`${elm.dataset.i18n}.${attr}`);
          data && elm.setAttribute(attrs[attr], data);
        }
      }
    }
  };

  /**
   * localize element content
   * @return {void}
   */
  const localizeElm = async () => {
    const nodes = document.querySelectorAll("[data-i18n]");
    if (nodes instanceof NodeList) {
      for (let node of nodes) {
        const data = await i18n.getMessage(node.dataset.i18n);
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
   * localize html
   * @return {Object} - Promise
   */
  const localizeHtml = () => localizeHtmlLang().then(localizeElm);

  /**
   * set value / checked from storage
   * @return {void}
   */
  const setValuesFromStorage = async () => {
    const pref = await storage.get() || {};
    for (let key in pref) {
      const elm = (key = pref[key]) && key.id &&
                    document.getElementById(key.id);
      if (elm) {
        switch (elm.type) {
          case "checkbox":
          case "radio":
            elm.checked = !!key.checked;
            break;
          case "text":
            elm.value = isString(key.value) && key.value || "";
            editorPath && elm === editorPath && elm.value &&
            key.data.executable && (
              elm.dataset.executable = "true",
              editorName && (editorName.disabled = false)
            );
            break;
          default:
        }
      }
    }
  };

  /**
   * set variables value
   * @return {void}
   */
  const setVariables = async () => {
    editorPath = document.getElementById(EDITOR_PATH);
    editorName = document.getElementById(EDITOR_NAME);
  };

  /**
   * start up
   * @return {Object} - Promise
   */
  const startUp = () => Promise.all([
    localizeHtml(),
    setVariables().then(setValuesFromStorage),
    addInputChangeListener()
  ]).catch(logError);

  window.addEventListener("DOMContentLoaded", startUp, false);
}
