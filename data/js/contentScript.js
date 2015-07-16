/**
*	contentScript.js
*/
(() => {
	'use strict';
	const DATA_ID = 'data-with_ex_editor_id';
	var element = document.activeElement,
		target = self.options['target'] || '',
		value = self.options['value'] || '';

	/* set content editable element text */
	function setContentEditableText(node, array = ['']) {
		if(node) {
			for(var nodes = document.createDocumentFragment(), i = 0, l = array.length; i < l; i++) {
				nodes.appendChild(document.createTextNode(array[i]));
				i < l - 1 && nodes.appendChild(document.createElement('br'));
			}
			if(node.hasChildNodes()) {
				for(i = node.childNodes.length - 1, l = 0; i >= 0; i--) {
					node.removeChild(node.childNodes[i]);
				}
			}
			node.appendChild(nodes);
		}
	}

	/* get target element and and sync text value */
	element.hasAttribute(DATA_ID) && element.getAttribute(DATA_ID) === target && (/^(?:input|textarea)$/i.test(element.nodeName) ? element.value = value : element.contentEditable && setContentEditableText(element, value.split('\n')));
})();
