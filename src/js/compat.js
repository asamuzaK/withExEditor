/**
 * compat.js
 */
"use strict";
{
  /* api */
  const {runtime} = browser;

  /* constant */
  const EXT_WEBEXT = "jid1-WiAigu4HIo0Tag@jetpack";

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
    const disableBlink = ["buttonIconAuto", "execEditor", "openOptionsPage"];
    const disableGecko = ["accessKey"];
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

  document.addEventListener("DOMContentLoaded", () =>
    disableIncompatibleInputs().catch(logError)
  );
}
