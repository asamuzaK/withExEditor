/**
 * compat.js
 */
"use strict";
{
  /* api */
  const {commands, runtime} = browser;

  /* constant */
  const EDITOR_EXEC = "execEditor";
  const EXT_WEBEXT = "jid1-WiAigu4HIo0Tag@jetpack";
  const ICON_AUTO = "buttonIconAuto";
  const KEY_ACCESS = "accessKey";
  const OPTIONS_OPEN = "openOptionsPage";

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

  /**
   * dispatch input event
   * @param {Object} elm - element
   * @returns {void}
   */
  const dispatchInputEvt = elm => {
    if (elm && elm.nodeType === Node.ELEMENT_NODE) {
      const opt = {
        bubbles: true,
        cancelable: false,
      };
      const evt = window.InputEvent && new InputEvent("input", opt) ||
                  new Event("input", opt);
      elm.dispatchEvent(evt);
    }
  };

  /**
   * update command
   * @param {Object} evt - Event
   * @retunrs {void}
   */
  const updateCmdKey = async evt => {
    if (typeof commands.update === "function") {
      const {target} = evt;
      const {id, value} = target;
      const shortcut = value.trim().replace(/SpaceBar/ig, " ");
      await commands.update({
        shortcut,
        name: id,
      });
    }
  };

  /**
   * detect key
   * @param {Object} evt - Event
   * @returns {void}
   */
  const detectKeyCombo = async evt => {
    const {altKey, ctrlKey, key, metaKey, shiftKey, target} = evt;
    const {disabled} = target;
    if (!disabled &&
        /^(?:[0-9A-z,.\ ]|Arrow(?:Down|Left|Right|Up)|Delete|End|F(?:[1-9]|1[0-2])|Home|Insert|Page(?:Down|Up))$/.test(key)) {
      const {os} = await runtime.getPlatformInfo();
      const isMac = os === "mac";
      if (altKey || ctrlKey || isMac && metaKey) {
        const modifiers = {
          altKey: {
            default: "Alt",
          },
          ctrlKey: {
            default: "Ctrl",
            mac: "MacCtrl",
          },
          metaKey: {
            default: null,
            mac: "Command",
          },
          shiftKey: {
            default: "Shift",
          },
        };
        const cmd = [];
        altKey && cmd.push(modifiers.altKey.default);
        ctrlKey &&
          cmd.push(isMac && modifiers.ctrlKey.mac || modifiers.ctrlKey.default);
        metaKey && isMac && cmd.push(modifiers.metaKey.mac);
        shiftKey && cmd.push(modifiers.shiftKey.default);
        cmd.push(/^[A-z]$/.test(key) && key.toUpperCase() ||
                 /^ $/.test(key) && "SpaceBar" || key);
        target.value = cmd.join("+");
        dispatchInputEvt(target);
      }
    }
  };

  /**
   * add listener to command inputs
   * @returns {void}
   */
  const addListenerToCmdInputs = async () => {
    const cmdInputs = [EDITOR_EXEC, OPTIONS_OPEN];
    for (const item of cmdInputs) {
      const elm = document.getElementById(item);
      if (elm) {
        elm.addEventListener("keydown", evt =>
          detectKeyCombo(evt).catch(logError)
        );
        elm.addEventListener("input", evt =>
          updateCmdKey(evt).catch(logError)
        );
      }
    }
  };

  /**
   * disable input
   * @param {string} id - ID
   * @returns {void}
   */
  const disableInput = async id => {
    if (isString(id)) {
      const elm = document.getElementById(id);
      if (elm) {
        elm.disabled = true;
      }
    }
  };

  /**
   * disable incompatible inputs
   * @returns {Promise.<Array>} - results of each handler
   */
  const disableIncompatibleInputs = async () => {
    const {id} = runtime;
    const disableBlink = [EDITOR_EXEC, ICON_AUTO, OPTIONS_OPEN];
    const disableGecko = [KEY_ACCESS];
    const func = [];
    if (id === EXT_WEBEXT) {
      for (const item of disableGecko) {
        func.push(disableInput(item));
      }
    } else {
      for (const item of disableBlink) {
        func.push(disableInput(item));
      }
    }
    return Promise.all(func);
  };

  document.addEventListener("DOMContentLoaded", () => Promise.all([
    disableIncompatibleInputs(),
    addListenerToCmdInputs(),
  ]).catch(logError));
}
