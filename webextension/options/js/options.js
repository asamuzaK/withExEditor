/**
 * options.js
 */
"use strict";
{
  const logError = e => {
    console.error(e);
    return false;
  };

  const localizeAttr = async elm => {
    if (elm && elm.hasAttributes()) {
      const attrs = ["alt", "placeholder", "title"];
      let data = await browser.i18n.getMessage(`${elm.dataset.i18n}.ariaLabel`);
      data && elm.setAttribute("aria-label", data);
      for (let attr of attrs) {
        elm.hasAttribute(attr) &&
        (data = await browser.i18n.getMessage(`${elm.dataset.i18n}.${attr}`)) &&
          elm.setAttribute(attr, data);
      }
    }
  };

  const localizeElm = async () => {
    let nodes = document.querySelectorAll("[data-i18n]"),
        data;
    for (let node of nodes) {
      (data = await browser.i18n.getMessage(node.dataset.i18n)) &&
        (node.textContent = data);
      node.hasAttributes() && localizeAttr(node);
    }
  };

  const localizeLang = async () => {
    const lang = await browser.i18n.getUILanguage();
    lang && document.documentElement.setAttribute("lang", lang);
  };

  window.addEventListener(
    "DOMContentLoaded",
    () => Promise.all([localizeLang(), localizeElm()]).then(() => {
      console.log(browser.storage.local);
    }).catch(logError),
    false
  );
}
