/**
*	contentScript.js
*/
(() => {
	"use strict";
	const DATA_ID = "data-with_ex_editor_id";
	const element = document.activeElement;
	const target = self.options.target || "";
	const value = self.options.value || "";

	/**
	*	set content editable element text
	*	@param {Object} node - editable element
	*	@param {Array} array - array of values
	*/
	const setContentEditableText = (node, array = [""]) => {
		if(node) {
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
	element && element.hasAttribute(DATA_ID) && element.getAttribute(DATA_ID) === target && (
		/^(?:input|textarea)$/i.test(element.nodeName) ? element.value = value : element.isContentEditable && setContentEditableText(element, value.split("\n"))
	);
})();
