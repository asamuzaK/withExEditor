/**
*	contextMenu.js
*/
(function() {
	"use strict";
	/* Set Context Menu Item Label */
	self.on("context", function setContextMenuItemLabel() {
		var element = document.activeElement, selection = window.getSelection(), label;
		switch(true) {
			case (/^(?:input|textarea)$/i.test(element.nodeName) || /^(?:contenteditabl|tru)e$/i.test(element.contentEditable)):
				label = "EditText";
				break;
			case !selection.isCollapsed:
				label = "ViewSelection";
				break;
			default:
				label = "ViewSource";
		}
		self.postMessage(label);
		return true;
	});

	/* Get Node Value */
	self.on("click", function getNodeValue() {
		var selection = window.getSelection(), element, dataId, nodes, node, value, i, l;
		function onEditText(target) {
			var id;
			if(target.hasAttribute("data-with_ex_editor_id")) {
				id = target.getAttribute("data-with_ex_editor_id");
			}
			else {
				id = ("withExEditor" + window.performance.now()).replace(/\./, "_");
				target.setAttribute("data-with_ex_editor_id", id);
				target.addEventListener("focus", function(event) {
					self.postMessage(event.target.getAttribute("data-with_ex_editor_id"));
				}, false);
			}
			return "mode=editText;target=" + id + ";value=";
		}
		if(selection.isCollapsed) {
			element = document.activeElement;
			switch(true) {
				case /^(?:input|textarea)$/i.test(element.nodeName):
					value = onEditText(element) + (element.value ? element.value : "");
					break;
				case /^(?:contenteditabl|tru)e$/i.test(element.contentEditable):
					for(value = [onEditText(element)], nodes = element.childNodes, i = 0, l = nodes.length; i < l; i++) {
						node = nodes[i];
						node.nodeType === 1 && node.nodeName.toLowerCase() === "br" ? (value[value.length] = "\n") : node.nodeType === 3 && (value[value.length] = node.nodeValue);
					}
					value = value.join("");
					break;
				default:
					value = "mode=viewSource;";
			}
		}
		else {
			for(nodes = document.createDocumentFragment(), i = 0, l = selection.rangeCount; i < l; i++) {
				node = selection.getRangeAt(i).cloneContents();
				if(node.firstChild.nodeType === 3 || node.lastChild.nodeType === 3) {
					element = document.createElement(node.firstChild.nodeType === 3 ? selection.getRangeAt(i).startContainer.parentNode.nodeName.toLowerCase() : selection.getRangeAt(i).endContainer.parentNode.nodeName.toLowerCase());
					element.appendChild(node);
					nodes.appendChild(element);
				}
				else {
					nodes.appendChild(node);
				}
				i > 0 && i < l - 1 && nodes.appendChild(document.createTextNode("\n"));
			}
			element = document.createElement("div");
			element.appendChild(nodes);
			value = "mode=viewSelection;value=" + element.innerHTML;
		}
		self.postMessage(value);
	});
})();
