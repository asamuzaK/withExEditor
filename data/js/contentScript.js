/**
 * contentScript.js
 */
"use strict";
{
  /* constants */
  const DATA_ID = "data-with_ex_editor_id";
  const DATA_TS = "data-with_ex_editor_timestamp";
  const CONTROLS = `${DATA_ID}_controls`;
  const ELEMENT_NODE = 1;

  /* nsURI */
  const nsURI = {html: "http://www.w3.org/1999/xhtml"};

  /* options */
  const opt = window.self.options || {};
  const target = opt.target || "";
  const value = opt.value || "";
  const timestamp = opt.timestamp || 0;
  const namespace = opt.namespace || nsURI.html;

  /**
   * sync content editable element text
   * @param {Object} node - editable element
   * @param {Array} arr - array of values
   * @return {void}
   */
  const syncContentEditableText = (node, arr = [""]) => {
    if (node && node.nodeType === ELEMENT_NODE && Array.isArray(arr)) {
      const fragment = document.createDocumentFragment();
      const l = arr.length;
      let i = 0;
      while (i < l) {
        fragment.appendChild(document.createTextNode(arr[i]));
        i < l - 1 && namespace === nsURI.html &&
          fragment.appendChild(document.createElementNS(namespace, "br"));
        i++;
      }
      if (node.hasChildNodes()) {
        while (node.firstChild) {
          node.removeChild(node.firstChild);
        }
      }
      node.appendChild(fragment);
    }
  };

  /* get target element and and sync text */
  {
    const elm = document.activeElement;
    let html = !elm.namespaceURI || elm.namespaceURI === nsURI.html,
        ns = !html && nsURI.html || "",
        attr = html && DATA_TS || `html:${DATA_TS}`;
    if (elm.hasAttributeNS(ns, CONTROLS)) {
      const arr = (elm.getAttributeNS(ns, CONTROLS)).split(" ");
      for (let id of arr) {
        if (id === target) {
          (id = document.querySelector(`[*|${DATA_ID}=${id}]`)) && (
            html = !id.namespaceURI || id.namespaceURI === nsURI.html,
            ns = !html && nsURI.html || "",
            attr = html && DATA_TS || `html:${DATA_TS}`,
            (!id.hasAttributeNS(ns, DATA_TS) ||
             timestamp > id.getAttributeNS(ns, DATA_TS) * 1) && (
              id.setAttributeNS(ns, attr, timestamp),
              syncContentEditableText(id, value.split("\n"))
            )
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
        elm.setAttributeNS(ns, attr, timestamp),
        /^(?:input|textarea)$/.test(elm.localName) ?
          elm.value = value :
        elm.isContentEditable &&
          syncContentEditableText(elm, value.split("\n"))
      );
    }
  }
}
