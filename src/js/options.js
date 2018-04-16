/**
 * options.js
 */
"use strict";
{
  /* api */
  const {
    i18n, permissions, runtime,
    storage: {
      local: localStorage,
    },
  } = browser;

  /* constants */
  const DATA_ATTR_I18N = "data-i18n";
  const EDITOR_CONFIG_RES = "resEditorConfig";
  const EDITOR_FILE_NAME = "editorFileName";
  const EDITOR_LABEL = "editorLabel";
  const EXT_RELOAD = "reloadExtension";
  const HOST_CONNECTION = "hostConnection";
  const HOST_ERR_NOTIFY = "notifyHostError";
  const HOST_STATUS = "hostStatus";
  const HOST_STATUS_GET = "getHostStatus";
  const HOST_VERSION = "hostVersion";
  const KEY_ACCESS = "accessKey";
  const LANG = "optionsLang";
  const PORT_NAME = "portOptions";
  const STORAGE_SET = "setStorage";
  const SYNC_AUTO_URL = "syncAutoUrls";
  const WARN = "warn";

  /**
   * throw error
   * @param {!Object} e - Error
   * @throws
   */
  const throwErr = e => {
    throw e;
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
    const {editorLabel, editorName, executable} = obj;
    const name = document.getElementById(EDITOR_FILE_NAME);
    const label = document.getElementById(EDITOR_LABEL);
    if (name) {
      name.value = editorName || "";
    }
    if (label) {
      if (executable && (editorLabel || editorName)) {
        label.value = editorLabel || editorName;
        label.disabled = false;
      } else {
        label.value = "";
        label.disabled = true;
      }
    }
  };

  /**
   * extract host status
   * @param {Object} status - host status
   * @returns {void}
   */
  const extractHostStatus = async status => {
    const {hostConnection, hostVersion} = status;
    const connect = document.getElementById(HOST_CONNECTION);
    const version = document.getElementById(HOST_VERSION);
    if (connect) {
      connect.textContent = i18n.getMessage(`hostConnection_${hostConnection}`);
      if (hostConnection) {
        connect.classList.remove(WARN);
      } else {
        connect.classList.add(WARN);
      }
    }
    if (version) {
      version.textContent = i18n.getMessage(`hostVersion_${hostVersion}`);
      if (hostVersion) {
        version.classList.remove(WARN);
      } else {
        version.classList.add(WARN);
      }
    }
  };

  /**
   * get host status
   * @returns {AsyncFunction} - port message
   */
  const getHostStatus = async () => portMsg({[HOST_STATUS_GET]: true});

  /**
   * port reload extension
   * @param {boolean} reload - reload
   * @returns {?AsyncFunction} - port message
   */
  const portReloadExt = async (reload = false) =>
    reload && portMsg({
      [EXT_RELOAD]: !!reload,
    }) || null;

  /**
   * port pref
   * @param {!Object} evt - Event
   * @returns {Promise.<Array>} - results of each handler
   */
  const portPref = async evt => {
    const {target} = evt;
    const {checked, id, name, type, value} = target;
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
        case HOST_ERR_NOTIFY:
          if (checked) {
            target.checked = await permissions.request({
              permissions: ["notifications"],
            });
          } else {
            await permissions.remove({
              permissions: ["notifications"],
            });
          }
          func.push(createPref(target).then(portMsg));
          break;
        case KEY_ACCESS:
          (value === "" || /^[a-z]$/i.test(value)) &&
            func.push(createPref(target).then(portMsg));
          break;
        default:
          func.push(createPref(target).then(portMsg));
      }
    }
    return Promise.all(func);
  };

  /**
   * extract sync urls input
   * @param {!Object} evt - Event
   * @returns {?AsyncFunction} - port message
   */
  const extractSyncUrlsInput = async evt => {
    const {target} = evt;
    const {value} = target;
    const items = isString(value) && value.split("\n");
    let func;
    if (items && items.length) {
      let bool = false;
      for (let item of items) {
        item = item.trim();
        if (item.length) {
          try {
            const url = new URL(item);
            bool = url && true || false;
            if (!bool) {
              break;
            }
          } catch (e) {
            bool = false;
            break;
          }
        }
      }
      if (bool) {
        func = createPref(target).then(portMsg);
      }
    }
    return func || null;
  };

  /* html */
  /**
   * add event listener to reload extension button
   * @returns {void}
   */
  const addReloadExtensionListener = async () => {
    const elm = document.getElementById(EXT_RELOAD);
    if (elm) {
      elm.addEventListener("click", evt => {
        const {currentTarget, target} = evt;
        evt.preventDefault();
        evt.stopPropagation();
        return portReloadExt(currentTarget === target).catch(throwErr);
      }, false);
    }
  };

  /**
   * add event listener to sync urls textarea
   * @returns {void}
   */
  const addSyncUrlsInputListener = async () => {
    const elm = document.getElementById(SYNC_AUTO_URL);
    elm && elm.addEventListener(
      "input",
      evt => extractSyncUrlsInput(evt).catch(throwErr),
      false
    );
  };

  /**
   * add event listener to input elements
   * @returns {void}
   */
  const addInputChangeListener = async () => {
    const nodes = document.querySelectorAll("input");
    if (nodes instanceof NodeList) {
      for (const node of nodes) {
        node.addEventListener(
          "change",
          evt => portPref(evt).catch(throwErr),
          false
        );
      }
    }
  };

  /**
   * add event listener to form elements
   * @returns {void}
   */
  const addFormSubmitListener = async () => {
    const nodes = document.getElementById("form");
    if (nodes instanceof NodeList) {
      for (const node of nodes) {
        node.addEventListener("submit", evt => {
          evt.stopPropagation();
          evt.preventDefault();
        }, false);
      }
    }
  };

  /**
   * localize attribute value
   * @param {Object} elm - element
   * @returns {void}
   */
  const localizeAttr = async elm => {
    if (elm && elm.nodeType === Node.ELEMENT_NODE && elm.hasAttributes()) {
      const attrs = {
        alt: "alt",
        ariaLabel: "aria-label",
        href: "href",
        placeholder: "placeholder",
        title: "title",
      };
      const dataAttr = elm.getAttribute(DATA_ATTR_I18N);
      const items = Object.entries(attrs);
      for (const item of items) {
        const [key, value] = item;
        elm.hasAttribute(value) &&
          elm.setAttribute(value, i18n.getMessage(`${dataAttr}_${key}`));
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
          if (data) {
            node.textContent = data;
          }
          node.hasAttributes() && localizeAttr(node);
        }
      }
    }
  };

  /**
   * set html input value
   * @param {Object} data - data
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
          if (elm.id === EDITOR_LABEL && elm.value) {
            elm.disabled = false;
          }
          break;
        default:
          if (elm.id === SYNC_AUTO_URL) {
            elm.value = isString(data.value) && data.value || "";
          }
      }
    }
  };

  /**
   * set html input values from local storage
   * @returns {Promise.<Array>} - results of each handler
   */
  const setValuesFromLocalStorage = async () => {
    const func = [];
    const pref = await localStorage.get();
    const items = pref && Object.values(pref);
    if (items && items.length) {
      for (const item of items) {
        func.push(setHtmlInputValue(item));
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
    const items = msg && Object.entries(msg);
    if (items && items.length) {
      for (const item of items) {
        const [key, value] = item;
        switch (key) {
          case EDITOR_CONFIG_RES:
            func.push(extractEditorConfig(value));
            break;
          case HOST_STATUS:
            func.push(extractHostStatus(value));
            break;
          default:
        }
      }
    }
    return Promise.all(func);
  };

  /* listeners */
  port.onMessage.addListener(msg => handleMsg(msg).catch(throwErr));

  document.addEventListener("DOMContentLoaded", () => Promise.all([
    localizeHtml(),
    setValuesFromLocalStorage(),
    addInputChangeListener(),
    addSyncUrlsInputListener(),
    addReloadExtensionListener(),
    addFormSubmitListener(),
    getHostStatus(),
  ]).catch(throwErr));
}
