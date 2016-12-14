/**
 * manual.js
 */
"use strict";
{
  const CODE_SAMPLE_PATH = "../data/codeSample.json";

  document.addEventListener("DOMContentLoaded", () =>
    fetch(CODE_SAMPLE_PATH).then(async res => {
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
