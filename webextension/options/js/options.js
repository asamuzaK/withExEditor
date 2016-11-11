/**
 * options.js
 */
"use strict";
{
  /* shortcuts */
  const i18n = browser.i18n;
  const storage = browser.storage.local;

  /* variables */
  let editorPath, editorName;

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
          id: "editorName",
          value: name && isString(name) && name || "",
          checked: null,
          data: {
            executable: null
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
      pref = {};
      pref[elm.id] = {
        id: elm.id,
        value: elm.value || "",
        checked: elm.type === "checkbox" || elm.type === "radio" ?
                   !!elm.checked :
                   null,
        data: {
          executable: editorPath && elm === editorPath ?
                        await !!checkExecutable(elm.value) :
                        null
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
        const inputs = document.querySelectorAll(`[name=${elm.name}]`);
        for (let input of inputs) {
          pref = await createPrefObj(input);
          pref && (
            storage.set(pref),
            pref.checked && storage.set({
              icon: {
                id: pref.id,
                value: pref.value,
                checked: pref.checked,
                data: pref.data
              }
            })
          );
        }
      }
      else {
        pref = await createPrefObj(elm);
        pref && storage.set(pref);
      }
    }
  };

  /**
   * set value / checked from storage
   * @return {void}
   */
  const setValuesFromStorage = async () => {
    const pref = await storage.get(null);
    if (pref) {
      for (let key in pref) {
        key = pref[key];
        let elm;
        if (key.id && (elm = document.getElementById(key.id))) {
          switch (elm.type) {
            case "checkbox":
            case "radio":
              elm.checked = !!key.checked;
              break;
            case "text":
              elm.value = isString(key.value) && key.value || "";
              editorPath && elm === editorPath && elm.value &&
              !!key.data.executable && (
                elm.dataset.executable = "true",
                editorName && (editorName.disabled = false)
              );
              break;
            default:
          }
        }
      }
    }
  };

  /**
   * localize attribute value
   * @param {Object} elm - element
   * @return {void}
   */
  const localizeAttr = async elm => {
    if (elm && elm.hasAttributes()) {
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
    for (let node of nodes) {
      const data = await i18n.getMessage(node.dataset.i18n);
      data && (node.textContent = data);
      node.hasAttributes() && localizeAttr(node);
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

  window.addEventListener(
    "DOMContentLoaded",
    () => {
      editorPath = document.getElementById("editorPath");
      editorName = document.getElementById("editorName");
      return Promise.all([localizeHtml(), setValuesFromStorage()]).then(() => {
        const inputs = document.querySelectorAll("input");
        for (let input of inputs) {
          input.addEventListener("change", setPrefStorage, false);
        }
      }).catch(logError);
    },
    false
  );
}
