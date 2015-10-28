/**
* contentScript.js
*/
(() => {
  "use strict";
  const DATA_ID = "data-with_ex_editor_id";
  const elm = document.activeElement;
  const target = self.options.target || "";
  const value = self.options.value || "";

  /**
  * set content editable element text
  * @param {Object} node - editable element
  * @param {Array} array - array of values
  */
  const setContentEditableText = (node, array = [""]) => {
    if(node && node.nodeType === 1 && Array.isArray(array)) {
      const fragment = document.createDocumentFragment();
      const l = array.length;
      for(let i = 0; i < l; i = i + 1) {
        fragment.appendChild(document.createTextNode(array[i]));
        i < l - 1 && fragment.appendChild(document.createElement("br"));
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
  elm.hasAttribute(DATA_ID) && elm.getAttribute(DATA_ID) === target && (
    /^(?:input|textarea)$/i.test(elm.nodeName) ?
      elm.value = value :
      elm.isContentEditable && setContentEditableText(elm, value.split("\n"))
  );
})();
