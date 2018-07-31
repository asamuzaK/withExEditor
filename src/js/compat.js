/**
 * compat.js
 */
"use strict";
{
  /* api */
  const {commands, runtime} = browser;

  /* constant */
  const EDITOR_EXEC = "execEditor";
  const ICON_AUTO = "buttonIconAuto";
  const KEY_ACCESS = "accessKey";
  const MOD_KEYS_MAX = 2;
  const OPTIONS_OPEN = "openOptionsPage";
  const TYPE_FROM = 8;
  const TYPE_TO = -1;
  const VERSION_PART =
    "(?:0|[1-9]\\d{0,3}|[1-5]\\d{4}|6(?:[0-4]\\d{3}|5(?:[0-4]\\d{2}|5(?:[0-2]\\d|3[0-5]))))";
  const VERSION_TOOLKIT =
    `(${VERSION_PART}(?:\\.${VERSION_PART}){1,3})([A-z]+(?:-?[A-z\\d]+)?)?`;
  const VERSION_TOOLKIT_REGEXP = new RegExp(`^(?:${VERSION_TOOLKIT})$`);
  const WEBEXT_COMPAT_CMD_MIN = 63;
  const WEBEXT_ID = "jid1-WiAigu4HIo0Tag@jetpack";

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

  /**
   * get type
   * @param {*} o - object to check
   * @returns {string} - type of object
   */
  const getType = o =>
    Object.prototype.toString.call(o).slice(TYPE_FROM, TYPE_TO);

  /**
   * parse stringified integer
   * @param {string} i - stringified integer
   * @param {boolean} [zero] - accept leading zero
   * @returns {number} - integer
   */
  const parseStringifiedInt = (i, zero = false) => {
    if (!isString(i)) {
      throw new TypeError(`Expexted String but got ${getType(i)}`);
    }
    if (!zero && !/^-?(?:0|[1-9]\d*)$/.test(i)) {
      throw new Error(`${i} is not a stringified integer.`);
    }
    return parseInt(i);
  };

  /**
   * is valid Toolkit version string
   * @param {string} version - version string
   * @returns {boolean} - result
   */
  const isValidToolkitVersion = version => {
    if (!isString(version)) {
      throw new TypeError(`Expected String but got ${getType(version)}`);
    }
    return VERSION_TOOLKIT_REGEXP.test(version);
  };

  /**
   * parse version string
   * @param {string} version - version string
   * @returns {Object}
   *   - result which contains properties below
   *     version {string} - given version string
   *     major {number} - major version
   *     minor {number|undefined} - minor version
   *     patch {number|undefined} - patch version
   *     build {number|undefined} - build version
   *     pre {Array<string|number>|undefined} - pre release version in array
   */
  const parseVersion = version => {
    if (!isString(version)) {
      throw new TypeError(`Expected String but got ${getType(version)}`);
    }
    if (!isValidToolkitVersion(version)) {
      throw new Error(`${version} does not match toolkit format.`);
    }
    const [, vRelease, vPre] = version.match(VERSION_TOOLKIT_REGEXP);
    const [major, minor, patch, build] =
      vRelease.split(".").map(parseStringifiedInt);
    let pre;
    if (vPre) {
      pre = [vPre];
    }
    return {
      version, major, minor, patch, build, pre,
    };
  };

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
   * @returns {void}
   */
  const updateCmdKey = async evt => {
    if (typeof commands.update === "function") {
      const {target} = evt;
      const {id, value} = target;
      if (isString(id) && isString(value)) {
        const shortcut =
          value.trim().replace(/\+([a-z])$/, (m, c) => `+${c.toUpperCase()}`);
        if (/^(?:(?:(?:(?:Alt|Command|(?:Mac)?Ctrl)(?:\+Shift)?|Alt\+(?:Command|(?:Mac)?Ctrl)|Command\+(?:Alt|MacCtrl)|Ctrl\+(?:Alt|MacCtrl)|MacCtrl\+(?:Alt|Command|Ctrl))\+(?:[\dA-Z]|F(?:[1-9]|1[0-2])|(?:Page)?(?:Down|Up)|Left|Right|Comma|Period|Home|End|Delete|Insert|Space))|F(?:[1-9]|1[0-2]))?$/.test(shortcut)) {
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
    if (!disabled && typeof runtime.getBrowserInfo === "function") {
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
  const addListenerToCmdInputs = async () => {
    const cmdInputs = [EDITOR_EXEC, OPTIONS_OPEN];
    for (const item of cmdInputs) {
      const elm = document.getElementById(item);
      if (elm) {
        elm.addEventListener("keyup", evt =>
          detectKeyCombo(evt).catch(throwErr)
        );
        elm.addEventListener("input", evt =>
          updateCmdKey(evt).catch(throwErr)
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
    if (id === WEBEXT_ID) {
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

  /* startup */
  Promise.all([
    disableIncompatibleInputs(),
    addListenerToCmdInputs(),
  ]).catch(throwErr);
}
