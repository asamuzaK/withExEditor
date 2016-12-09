/*
 * manual.js
 */
"use strict";
{
  document.addEventListener("DOMContentLoaded", () => {
    const codes = {
      host: "../data/python.txt",
      shell: "../data/shell.txt",
      manifest: "../data/appManifest.json",
      reg: "../data/reg.txt"
    }
    const items = Object.keys(codes);
    for (let item of items) {
      const data = codes[item];
      const elm = document.getElementById(item);
      elm && fetch(data).then(async res => {
        elm.textContent = await res.text();
      });
    }
  }, false);
}
