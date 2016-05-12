/**
 * contentScript.js
 */
(() => {
  "use strict";
  const DATA_ID = "data-with_ex_editor_id";
  const DATA_TS = "data-with_ex_editor_timestamp";
  const nsURI = { html: "http://www.w3.org/1999/xhtml" };
  const opt = window.self.options || {};
  const target = opt.target || "";
  const value = opt.value || "";
  const timestamp = opt.timestamp || 0;
  const namespace = opt.namespace || nsURI.html;

  /**
   * set content editable element text
   * @param {Object} node - editable element
   * @param {Array} arr - array of values
   */
  const setContentEditableText = (node, arr = [""]) => {
    if(node && node.nodeType === 1 && Array.isArray(arr)) {
      const fragment = document.createDocumentFragment();
      const l = arr.length;
      let i = 0;
      while(i < l) {
        fragment.appendChild(document.createTextNode(arr[i]));
        i < l - 1 && namespace === nsURI.html &&
          fragment.appendChild(document.createElementNS(namespace, "br"));
        i++;
      }
      if(node.hasChildNodes()) {
        while(node.firstChild) {
          node.removeChild(node.firstChild);
        }
      }
      node.appendChild(fragment);
    }
  };

  /* get target element and and sync text value */
  (() => {
    let elm = document.activeElement;
    const ns = !elm.namespaceURI || elm.namespaceURI === nsURI.html ?
      null : nsURI.html;
    if(elm.hasAttributeNS(ns, `${ DATA_ID }_controls`)) {
      const attr = (elm.getAttributeNS(ns, `${ DATA_ID }_controls`)).split(" ");
      for(let id of attr) {
        if(id === target) {
          (elm = document.querySelector(`[*|${ DATA_ID }=${ target }]`)) &&
          (!elm.hasAttributeNS(ns, DATA_TS) ||
           timestamp > elm.getAttributeNS(ns, DATA_TS) * 1) && (
            elm.setAttributeNS(ns, DATA_TS, timestamp),
            setContentEditableText(elm, value.split("\n"))
          );
          break;
        }
      }
    }
    else {
      elm.hasAttributeNS(ns, DATA_ID) &&
      elm.getAttributeNS(ns, DATA_ID) === target &&
      (!elm.hasAttributeNS(ns, DATA_TS) ||
       timestamp > elm.getAttributeNS(ns, DATA_TS) * 1) && (
        elm.setAttributeNS(ns, DATA_TS, timestamp),
        /^(?:input|textarea)$/.test(elm.localName) ?
          elm.value = value : elm.isContentEditable &&
          setContentEditableText(elm, value.split("\n"))
      );
    }
  })();
})();
