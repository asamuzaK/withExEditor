/**
 * manual.js
 */
"use strict";
{
  /* constant */
  const CODE_PATH = "../data/codeSample.json";

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
   * insert code sample to html
   * @returns {Object} - Promise.<void>
   */
  const insertCodeSample = () => fetch(CODE_PATH).then(async res => {
    const codes = await res.json();
    const items = codes && Object.keys(codes);
    if (items && items.length) {
      for (const item of items) {
        const target = document.getElementById(item);
        target && (target.textContent = codes[item]);
      }
    }
  }).catch(logError);

  /* listener */
  document.addEventListener("DOMContentLoaded", insertCodeSample, false);
}
