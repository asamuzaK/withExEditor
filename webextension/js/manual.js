/**
 * manual.js
 */
"use strict";
{
  const PATH_CODE_SAMPLE = "../data/codeSample.json";

  document.addEventListener("DOMContentLoaded", () =>
    fetch(PATH_CODE_SAMPLE).then(async res => {
      const codes = await res.json();
      const items = Object.keys(codes);
      if (items.length > 0) {
        for (let item of items) {
          const target = document.getElementById(item);
          target && (target.textContent = codes[item]);
        }
      }
    }), false);
}
