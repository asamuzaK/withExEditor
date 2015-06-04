/**
*	contextMenu.js
*/
(function() {
	"use strict";
	/* Set Context Menu Item Label */
	self.on("context", function setContextMenuItemLabel() {
		var element = document.activeElement, selection = window.getSelection(), label;
		switch(true) {
			case (/^input$/i.test(element.nodeName) && element.hasAttribute("type") && element.getAttribute("type") === "text") || /^textarea$/i.test(element.nodeName) || /^(?:contenteditabl|tru)e$/i.test(element.contentEditable):
				label = "EditText"; break;
			case !selection.isCollapsed:
				label = "ViewSelection"; break;
			default:
				label = "ViewSource";
		}
		self.postMessage(label);
		return true;
	});

	/* Get Node Value */
	self.on("click", function getNodeValue() {
		var selection = window.getSelection(), custom, element, nodes, node, value, i, l;
		function onEditText(target) {
			var id;
			if(target) {
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
			}
			return id ? "mode=editText;target=" + id + ";value=" : "mode=viewSource;value=";
		}
		function onContentEditable(target) {
			for(var array = [onEditText(target)], child, childNodes = target.childNodes, i = 0, l = childNodes.length; i < l; i++) {
				child = childNodes[i];
				child.nodeType === 1 && child.nodeName.toLowerCase() === "br" ? (array[array.length] = "\n") : child.nodeType === 3 && (array[array.length] = child.nodeValue);
			}
			return array.join("");
		}
		if(selection.isCollapsed) {
			element = document.activeElement;
			switch(true) {
				case (/^input$/i.test(element.nodeName) && element.hasAttribute("type") && element.getAttribute("type") === "text") || /^textarea$/i.test(element.nodeName):
					value = onEditText(element) + (element.value ? element.value : "");
					break;
				case /^(?:contenteditabl|tru)e$/i.test(element.contentEditable):
					value = onContentEditable(element);
					break;
				default:
					value = "mode=viewSource;";
			}
		}
		else {
			element = selection.getRangeAt(0).commonAncestorContainer;
			if(selection.rangeCount === 1 && /^(?:contenteditabl|tru)e$/i.test(element.contentEditable)) {
				value = onContentEditable(element);
			}
			else {
				for(nodes = document.createDocumentFragment(), i = 0, l = selection.rangeCount; i < l; i++) {
					node = selection.getRangeAt(i).cloneContents();
					if(node.firstChild.nodeType === 3 || node.lastChild.nodeType === 3) {
						element = selection.getRangeAt(i).commonAncestorContainer.nodeName.toLowerCase();
						element = document.createElement("with_ex_editor_custom-" + element);
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
				value = ("mode=viewSelection;value=" + element.innerHTML).replace(/with_ex_editor_custom-/mg, "");
			}
		}
		self.postMessage(value);
	});
})();
