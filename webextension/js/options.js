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

  /* storage */
  /**
   * set storage
   * @param {Object} pref - pref
   * @returns {Object} - ?Promise.<void>
   */
  const setStorage = async pref => pref && storage.set(pref) || null;

  /**
   * create pref
   * @param {Object} elm - element
   * @param {boolean} executable - executable
   * @returns {Object} - pref data
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
   * extract editor config
   * @param {string} obj - editor config object
   * @returns {Object} - Promise.<Array.<void>>
   */
  const extractEditorConfig = async (obj = {}) => {
    const {editorName, executable} = obj;
    const editor = document.getElementById(EDITOR_CONFIG);
    const name = document.getElementById(EDITOR_FILE_NAME);
    const label = document.getElementById(EDITOR_LABEL);
    const func = [];
    if (editor && name && label) {
      name.value = editorName || "";
      if (executable && name.value) {
        label.value = name.value;
        label.disabled = false;
      } else {
        label.value = "";
        label.disabled = true;
      }
      func.push(createPref(editor, executable).then(setStorage));
      func.push(createPref(name).then(setStorage));
      func.push(createPref(label).then(setStorage));
    }
    return Promise.all(func);
  };

  /**
   * set pref storage
   * @param {!Object} evt - Event
   * @returns {Object} - Promise.<Array.<*>>
   */
  const setPrefStorage = async evt => {
    const {target} = evt;
    const {id, name, type, value} = target;
    const func = [];
    if (type === "radio") {
      const nodes = document.querySelectorAll(`[name=${name}]`);
      if (nodes instanceof NodeList) {
        for (const node of nodes) {
          func.push(createPref(node).then(setStorage));
        }
      }
    } else {
      switch (id) {
        case EDITOR_CONFIG:
          func.push(portMsg({[EDITOR_CONFIG_GET]: value}));
          break;
        case KEY_ACCESS:
          (value === "" || value.length === 1) &&
            func.push(createPref(target).then(setStorage));
          break;
        default:
          func.push(createPref(target).then(setStorage));
      }
    }
    return Promise.all(func).catch(logError);
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
        node.addEventListener("change", setPrefStorage, false);
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
   * @returns {Object} - Promise.<Array.<void>>
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
   * @returns {Object} - Promise.<Array<*>>
   */
  const handleMsg = async msg => {
    const func = [];
    const items = msg && Object.keys(msg);
    if (items && items.length) {
      for (const item of items) {
        if (item === EDITOR_CONFIG_RES) {
          const obj = msg[item];
          func.push(extractEditorConfig(obj));
          // NOTE: for hybrid
          func.push(portMsg({removeSdkPrefs: obj.executable}));
          break;
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
