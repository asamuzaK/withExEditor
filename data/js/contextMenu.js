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
		var selection = window.getSelection(), custom, element, ranges, range, value, i, l;
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
			var array, node, nodes, i, l;
			if(target) {
				for(array = [], nodes = target.childNodes, i = 0, l = nodes.length; i < l; i++) {
					node = nodes[i];
					node.nodeType === 1 && node.nodeName.toLowerCase() === "br" ? (array[array.length] = "\n") : node.nodeType === 3 && (array[array.length] = node.nodeValue);
				}
			}
			return array ? array.join("") : "";
		}
		function getNodeToString(node, tag) {
			var div;
			if(node) {
				div = document.createElement("div");
				div.appendChild(node);
				node = div.innerHTML;
			}
			else {
				node = node.toString();
			}
			return tag ? "<" + tag + ">" + node + "</" + tag + ">" : node;
		}
		if(selection.isCollapsed) {
			element = document.activeElement;
			switch(true) {
				case (/^input$/i.test(element.nodeName) && element.hasAttribute("type") && element.getAttribute("type") === "text") || /^textarea$/i.test(element.nodeName):
					value = onEditText(element) + (element.value ? element.value : "");
					break;
				case /^(?:contenteditabl|tru)e$/i.test(element.contentEditable):
					value = onEditText(element) + onContentEditable(element);
					break;
				default:
					value = "mode=viewSource;";
			}
		}
		else {
			l = selection.rangeCount;
			element = selection.getRangeAt(0).commonAncestorContainer;
			if(l === 1 && /^(?:contenteditabl|tru)e$/i.test(element.contentEditable)) {
				value = onEditText(element) + onContentEditable(element);
			}
			else {
				for(ranges = [], i = 0; i < l; i++) {
					range = selection.getRangeAt(i).cloneContents();
					if(range.firstChild.nodeType === 3 || range.lastChild.nodeType === 3) {
						element = selection.getRangeAt(i).commonAncestorContainer.nodeName.toLowerCase();
						ranges[ranges.length] = getNodeToString(range, element);
					}
					else {
						element = document.createElement("div");
						element.appendChild(range);
						ranges[ranges.length] = element.innerHTML;
					}
				}
				value = "mode=viewSelection;value=" + ranges.join("\n");
			}
		}
		self.postMessage(value);
	});
})();
