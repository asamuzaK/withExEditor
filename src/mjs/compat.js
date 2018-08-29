/**
 * compat.js
 */

import {EDITOR_EXEC, ICON_AUTO, OPTIONS_OPEN, WEBEXT_ID} from "./constant.js";
import {
  dispatchChangeEvt, dispatchInputEvt, isString, parseVersion, throwErr,
} from "./common.js";
import {isCommandCustomizable, updateCommand} from "./browser.js";

/* api */
const {runtime} = browser;

/* constants */
const IS_WEBEXT = runtime.id === WEBEXT_ID;
const MOD_KEYS_MAX = 2;
const WEBEXT_COMPAT_CMD_MIN = 63;

/**
 * update command key
 * @param {Object} evt - Event
 * @returns {void}
 */
export const updateCommandKey = async evt => {
  if (isCommandCustomizable()) {
    const {target} = evt;
    const {id, value} = target;
    if (isString(id) && isString(value)) {
      const shortcut =
        value.trim().replace(/\+([a-z])$/, (m, c) => `+${c.toUpperCase()}`);
      if (/^(?:(?:(?:(?:Alt|Command|(?:Mac)?Ctrl)(?:\+Shift)?|Alt\+(?:Command|(?:Mac)?Ctrl)|Command\+(?:Alt|MacCtrl)|Ctrl\+(?:Alt|MacCtrl)|MacCtrl\+(?:Alt|Command|Ctrl))\+(?:[\dA-Z]|F(?:[1-9]|1[0-2])|(?:Page)?(?:Down|Up)|Left|Right|Comma|Period|Home|End|Delete|Insert|Space))|F(?:[1-9]|1[0-2]))?$/.test(shortcut)) {
        await updateCommand(id, shortcut);
        dispatchChangeEvt(target);
      } else if (shortcut === "") {
        await updateCommand(id);
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
export const detectKeyCombo = async evt => {
  const {altKey, ctrlKey, key, metaKey, shiftKey, target} = evt;
  const {disabled} = target;
  if (!disabled && IS_WEBEXT) {
    const {version} = await runtime.getBrowserInfo();
    const {major: majorVersion} = await parseVersion(version);
    const {os} = await runtime.getPlatformInfo();
    const isMac = os === "mac";
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
    // Media keys
    if (/^Media(?:(?:Next|Prev)Track|PlayPause|Stop)$/.test(key) &&
        !altKey && !ctrlKey && !metaKey && !shiftKey) {
      target.value = key;
      dispatchInputEvt(target);
    // Function keys
    } else if (/^F(?:[1-9]|1[0-2])$/.test(key)) {
      ctrlKey &&
        cmd.push(isMac && modKeys.ctrlKey.macValue || modKeys.ctrlKey.value);
      altKey && cmd.push(modKeys.altKey.value);
      isMac && metaKey &&
        cmd.push(modKeys.metaKey.macValue);
      if (cmd.length < MOD_KEYS_MAX ||
          majorVersion >= WEBEXT_COMPAT_CMD_MIN) {
        shiftKey && cmd.push(modKeys.shiftKey.value);
        if (cmd.length <= MOD_KEYS_MAX) {
          cmd.push(key);
          target.value = cmd.join("+");
          dispatchInputEvt(target);
        }
      }
    // Other keys
    } else if (/^(?:[\dA-z,. ]|Arrow(?:Down|Left|Right|Up)|F(?:[1-9]|1[0-2])|Page(?:Down|Up)|Home|End|Insert|Delete)$/.test(key)) {
      ctrlKey &&
        cmd.push(isMac && modKeys.ctrlKey.macValue || modKeys.ctrlKey.value);
      altKey && cmd.push(modKeys.altKey.value);
      isMac && metaKey && cmd.push(modKeys.metaKey.macValue);
      if (cmd.length === 1 ||
          majorVersion >= WEBEXT_COMPAT_CMD_MIN && cmd.length) {
        shiftKey && cmd.push(modKeys.shiftKey.value);
        if (cmd.length <= MOD_KEYS_MAX) {
          cmd.push(/^[a-z]$/.test(key) && key.toUpperCase() ||
                   /^,$/.test(key) && "Comma" ||
                   /^\.$/.test(key) && "Period" ||
                   /^ $/.test(key) && "Space" || key.replace(/^Arrow/, ""));
          target.value = cmd.join("+");
          dispatchInputEvt(target);
        }
      }
    }
  }
};

/**
 * add listener to command inputs
 * @returns {void}
 */
export const addListenerToCmdInputs = async () => {
  const cmdInputs = [EDITOR_EXEC, OPTIONS_OPEN];
  for (const item of cmdInputs) {
    const elm = document.getElementById(item);
    if (elm) {
      elm.addEventListener("keyup", evt =>
        detectKeyCombo(evt).catch(throwErr)
      );
      elm.addEventListener("input", evt =>
        updateCommandKey(evt).catch(throwErr)
      );
    }
  }
};

/**
 * disable input
 * @param {string} id - ID
 * @returns {void}
 */
export const disableInput = async id => {
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
export const disableIncompatibleInputs = async () => {
  const func = [];
  if (!IS_WEBEXT) {
    const items = [EDITOR_EXEC, ICON_AUTO, OPTIONS_OPEN];
    for (const item of items) {
      func.push(disableInput(item));
    }
  }
  return Promise.all(func);
};
