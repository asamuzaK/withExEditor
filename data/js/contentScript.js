/**
*	contentScript.js
*/
(() => {
	"use strict";
	const DATA_ID = "data-with_ex_editor_id";
	const element = document.activeElement;
	const target = self.options["target"] || "";
	const value = self.options["value"] || "";

	/* set content editable element text */
	const setContentEditableText = (node, array = [""]) => {
		if(node) {
			let nodes = document.createDocumentFragment();
			for(let i = 0, l = array.length; i < l; i = i + 1) {
				nodes.appendChild(document.createTextNode(array[i]));
				i < l - 1 && nodes.appendChild(document.createElement("br"));
			}
			if(node.hasChildNodes()) {
				while(node.firstChild) {
					node.removeChild(node.firstChild);
				}
			}
			node.appendChild(nodes);
		}
	};

	/* get target element and and sync text value */
	element.hasAttribute(DATA_ID) && element.getAttribute(DATA_ID) === target && (
		/^(?:input|textarea)$/i.test(element.nodeName) ? element.value = value : element.contentEditable && setContentEditableText(element, value.split("\n"))
	);
})();
