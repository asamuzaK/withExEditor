/**
*	contentScript.js
*/
(function() {
	"use strict";
	var element = document.activeElement,
		value = self.options["value"] || "";
	function setContentEditableText(target, array) {
		var nodes, i, l;
		for(i = target.childNodes.length - 1, l = 0; i >= 0; i--) {
			target.removeChild(target.childNodes[i]);
		}
		for(nodes = document.createDocumentFragment(), i = 0, l = array.length; i < l; i++) {
			nodes.appendChild(document.createTextNode(array[i]));
			i < l - 1 && nodes.appendChild(document.createElement("br"));
		}
		target.appendChild(nodes);
	}
	/^(?:input|textarea)$/i.test(element.nodeName) ? element.value = value : element.contentEditable && setContentEditableText(element, value.split("\n"));
})();
