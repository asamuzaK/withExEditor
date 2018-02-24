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
   * dispatch change event
   * @param {Object} elm - element
   * @returns {void}
   */
  const dispatchChangeEvt = elm => {
    if (elm && elm.nodeType === Node.ELEMENT_NODE) {
      const opt = {
        bubbles: true,
        cancelable: false,
      };
      const evt = new Event("change", opt);
      elm.dispatchEvent(evt);
    }
  };

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
      if (isString(id) && isString(value)) {
        const shortcut =
          value.trim().replace(/\+([a-z])$/, (m, c) => `+${c.toUpperCase()}`);
        if (/^(?:(?:(?:Alt|Command|(?:Mac)?Ctrl)\+(?:Shift\+)?(?:[\dA-Z]|F(?:[1-9]|1[0-2])|(?:Page)?(?:Down|Up)|Left|Right|Comma|Period|Home|End|Delete|Insert|Space))|F(?:[1-9]|1[0-2]))$/.test(shortcut)) {
          await commands.update({
            shortcut,
            name: id,
          });
          dispatchChangeEvt(target);
        } else if (shortcut === "") {
          await commands.reset(id);
          dispatchChangeEvt(target);
        }
      }
    }
  };

  /**
   * detect key combination
   * @param {Object} evt - Event
   * @returns {void}
   */
  const detectKeyCombo = async evt => {
    const {altKey, ctrlKey, key, metaKey, shiftKey, target} = evt;
    const {disabled} = target;
    if (!disabled &&
        /^(?:[\dA-z,. ]|Arrow(?:Down|Left|Right|Up)|F(?:[1-9]|1[0-2])|Page(?:Down|Up)|Home|End|Insert|Delete)$/.test(key)) {
      const {os} = await runtime.getPlatformInfo();
      const isMac = os === "mac";
      if (altKey && !ctrlKey || !altKey && ctrlKey || isMac && metaKey) {
        const modKeys = {
          altKey: {
            value: "Alt",
          },
          ctrlKey: {
            value: "Ctrl",
            macValue: "MacCtrl",
          },
          metaKey: {
            macValue: "Command",
          },
          shiftKey: {
            value: "Shift",
          },
        };
        const cmd = [];
        if (altKey) {
          cmd.push(modKeys.altKey.value);
        } else if (ctrlKey) {
          cmd.push(isMac && modKeys.ctrlKey.macValue || modKeys.ctrlKey.value);
        } else if (isMac && metaKey) {
          cmd.push(modKeys.metaKey.macValue);
        }
        shiftKey && cmd.push(modKeys.shiftKey.value);
        // FIXME:
        cmd.push(/^[a-z]$/.test(key) && key.toUpperCase() ||
                 /^,$/.test(key) && "Comma" || /^\.$/.test(key) && "Period" ||
                 /^ $/.test(key) && "Space" || key.replace(/^Arrow/, ""));
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
        elm.addEventListener("keyup", evt =>
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
