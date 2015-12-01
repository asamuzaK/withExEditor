/**
 * contentScript.js
 */
(() => {
  "use strict";
  const DATA_ID = "data-with_ex_editor_id";
  const nsURI = { html: "http://www.w3.org/1999/xhtml" };
  const target = self.options.target || "";
  const value = self.options.value || "";
  const namespace = self.options.namespace || nsURI.html;

  /**
   * set content editable element text
   * @param {Object} node - editable element
   * @param {Array} array - array of values
   */
  const setContentEditableText = (node, array = [""]) => {
    if(node && node.nodeType === 1 && Array.isArray(array)) {
      const fragment = document.createDocumentFragment();
      const l = array.length;
      let i = 0;
      while(i < l) {
        fragment.appendChild(document.createTextNode(array[i]));
        i < l - 1 && namespace === nsURI.html &&
          fragment.appendChild(document.createElementNS(namespace, "br"));
        i = i + 1;
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
    const html = !elm.namespaceURI || elm.namespaceURI === nsURI.html;
    const ns = html ? null : nsURI.html;
    if(elm.hasAttributeNS(ns, DATA_ID) &&
       elm.getAttributeNS(ns, DATA_ID) === target) {
      /^(?:input|textarea)$/.test(elm.localName) ?
        elm.value = value : elm.isContentEditable &&
        setContentEditableText(elm, value.split("\n"))
    }
    else {
      elm.hasAttributeNS(ns, `${ DATA_ID }_controls`) &&
        elm.getAttributeNS(ns, `${ DATA_ID }_controls`) === target && (
          elm = document.querySelector(`[*|${ DATA_ID }=${ target }]`),
          elm && setContentEditableText(elm, value.split("\n"))
        );
    }
  })();
})();
