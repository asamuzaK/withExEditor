/**
*	contentScript.js
*/
(function() {
	"use strict";
	var element = document.activeElement,
		value = self.options["value"];
	function removeChildNodes(node) {
		for(var i = node.childNodes.length - 1, l = 0; i >= 0; i--) {
			node.removeChild(node.childNodes[i]);
		}
	}
	/^(?:input|textarea)$/i.test(element.nodeName) ? element.value = value : /^(?:contenteditabl|tru)e$/i.test(element.contentEditable) && (
		removeChildNodes(element),
		element.appendChild(document.createTextNode(value))
	);
})();
