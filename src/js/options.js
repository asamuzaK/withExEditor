/**
 * options.js
 */
"use strict";
{
  /* api */
  const {i18n, runtime} = browser;
  const storage = browser.storage.local;

  /* constants */
  const DATA_ATTR_I18N = "data-i18n";
  const EDITOR_CONFIG = "editorConfigPath";
  const EDITOR_CONFIG_GET = "getEditorConfig";
  const EDITOR_CONFIG_RES = "resEditorConfig";
  const EDITOR_FILE_NAME = "editorFileName";
  const EDITOR_LABEL = "editorLabel";
  const KEY_ACCESS = "accessKey";
  const LANG = "optionsLang";
  const NODE_ELEMENT = Node.ELEMENT_NODE;
  const PORT_NAME = "portOptions";
  const STORAGE_SET = "setStorage";

  /**
   * log error
   * @param {!Object} e - Error
   * @returns {boolean} - false
   */
  const logError = e => {
    console.error(e);
    return false;
  };

  /**
   * is string
   * @param {*} o - object to check
   * @returns {boolean} - result
   */
  const isString = o => typeof o === "string" || o instanceof String;

  /* port */
  const port = runtime.connect({name: PORT_NAME});

  /**
   * port message
   * @param {*} msg - message
   * @returns {void}
   */
  const portMsg = async msg => {
    msg && port.postMessage(msg);
  };

  /**
   * create pref
   * @param {Object} elm - element
   * @param {boolean} executable - executable
   * @returns {Object} - pref data
   */
  const createPref = async (elm, executable = false) => {
    const id = elm && elm.id;
    return id && {
      [STORAGE_SET]: {
        [id]: {
          id,
          app: {
            executable: !!executable,
          },
          checked: !!elm.checked,
          value: elm.value || "",
        },
      },
    } || null;
  };

  /**
   * extract editor config
   * @param {string} obj - editor config object
   * @returns {void}
   */
  const extractEditorConfig = async (obj = {}) => {
    const {editorName, executable} = obj;
    const name = document.getElementById(EDITOR_FILE_NAME);
    const label = document.getElementById(EDITOR_LABEL);
    if (name && label) {
      name.value = editorName || "";
      if (executable && name.value) {
        label.value = name.value;
        label.disabled = false;
      } else {
        label.value = "";
        label.disabled = true;
      }
    }
  };

  /**
   * port pref
   * @param {!Object} evt - Event
   * @returns {Promise.<Array>} - results of each handler
   */
  const portPref = async evt => {
    const {target} = evt;
    const {id, name, type, value} = target;
    const func = [];
    if (type === "radio") {
      const nodes = document.querySelectorAll(`[name=${name}]`);
      if (nodes instanceof NodeList) {
        for (const node of nodes) {
          func.push(createPref(node).then(portMsg));
        }
      }
    } else {
      switch (id) {
        case EDITOR_CONFIG:
          func.push(portMsg({[EDITOR_CONFIG_GET]: value}));
          break;
        case KEY_ACCESS:
          (value === "" || value.length === 1) &&
            func.push(createPref(target).then(portMsg));
          break;
        default:
          func.push(createPref(target).then(portMsg));
      }
    }
    return Promise.all(func);
  };

  /* html */
  /**
   * add event listener to input elements
   * @returns {void}
   */
  const addInputChangeListener = async () => {
    const nodes = document.querySelectorAll("input");
    if (nodes instanceof NodeList) {
      for (const node of nodes) {
        node.addEventListener(
          "change", evt => portPref(evt).catch(logError), false
        );
      }
    }
  };

  /**
   * localize attribute value
   * @param {Object} elm - element
   * @returns {void}
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
   * @returns {void}
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
   * @returns {void}
   */
  const setHtmlInputValue = async (data = {}) => {
    const {id} = data;
    const elm = id && document.getElementById(id);
    if (elm) {
      switch (elm.type) {
        case "checkbox":
        case "radio":
          elm.checked = !!data.checked;
          break;
        case "text":
          elm.value = isString(data.value) && data.value || "";
          elm === document.getElementById(EDITOR_LABEL) && elm.value &&
            (elm.disabled = false);
          break;
        default:
      }
    }
  };

  /**
   * set html input values from storage
   * @returns {Promise.<Array>} - results of each handler
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
   * @returns {Promise.<Array>} - results of each handler
   */
  const handleMsg = async msg => {
    const func = [];
    const items = msg && Object.keys(msg);
    if (items && items.length) {
      for (const item of items) {
        if (item === EDITOR_CONFIG_RES) {
          const obj = msg[item];
          func.push(extractEditorConfig(obj));
          break;
        }
      }
    }
    return Promise.all(func);
  };

  /* listeners */
  port.onMessage.addListener(msg => handleMsg(msg).catch(logError));

  document.addEventListener("DOMContentLoaded", () => Promise.all([
    localizeHtml(),
    setValuesFromStorage(),
    addInputChangeListener(),
  ]).catch(logError), false);
}
