/**
*	contextMenu.js
*/
(function() {
	"use strict";
	/* set context menu item label */
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

	/* get node value */
	self.on("click", function getNodeValue() {
		const VIEW_SOURCE = "mode=viewSource;";
		const IS_REMOVED = " is removed by withExEditor.";

		var selection = window.getSelection(), targetObj, ranges, nodeValue, j, k;

		/* on Edit Text mode: set temporary ID to the target element */
		function onEditText(target) {
			const DATA_ID = "data-with_ex_editor_id";
			var id;
			target && (
				target.hasAttribute(DATA_ID) ? id = target.getAttribute(DATA_ID) : (
					id = ("withExEditor" + window.performance.now()).replace(/\./, "_"),
					target.setAttribute(DATA_ID, id),
					target.addEventListener("focus", function(event) {
						event && event.currentTarget === target && self.postMessage(event.target.getAttribute(DATA_ID));
					}, false)
				)
			);
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

		/* on View Selection mode: create DOM tree from range */
		function nodeTypeToNamedConstant(type) {
			switch(type) {
				case 1:
					type = "ELEMENT_NODE"; break;
				case 2:
					type = "ATTRIBUTE_NODE"; break;
				case 3:
					type = "TEXT_NODE"; break;
				case 4:
					type = "CDATA_SECTION_NODE"; break;
				case 5:
					type = "ENTITY_REFERENCE_NODE"; break;
				case 6:
					type = "ENTITY_NODE"; break;
				case 7:
					type = "PROCESSING_INSTRUCTION_NODE"; break;
				case 8:
					type = "COMMENT_NODE"; break;
				case 9:
					type = "DOCUMENT_NODE"; break;
				case 10:
					type = "DOCUMENT_TYPE_NODE"; break;
				case 11:
					type = "DOCUMENT_FRAGMENT_NODE"; break;
				case 12:
					type = "NOTATION_NODE"; break;
				default:
					type = "FAILED: Unknown Node.nodeType";
			}
			return type;
		}
		function getElement(node, nodes) {
			var element, fragment, value, i, l,
				namespaces = {
					html: "http://www.w3.org/1999/xhtml",
				};
			function getNamespace(name) {
				var elementNameParts = /^(?:(.*):)?(.*)$/.exec(name);
				return {
					namespace: namespaces[elementNameParts[1]],
					shortName: elementNameParts[2],
				};
			}
			if(node) {
				node = getNamespace(node),
				element = document.createElementNS(node.namespace || namespaces.html, node.shortName);
				if(nodes && element) {
					if(nodes.hasChildNodes()) {
						for(fragment = document.createDocumentFragment(), value, i = 0, l = nodes.childNodes.length; i < l; i++) {
							node = nodes.childNodes[i];
							switch(node.nodeType) {
								case 1:
									value = getElement(node.nodeName.toLowerCase(), node); break;
								case 3:
									value = document.createTextNode(node.nodeValue); break;
								default:
									// Maybe not necessary?
									value = document.createComment(nodeTypeToNamedConstant(type) + IS_REMOVED);
							}
							fragment.appendChild(value);
						}
						element.appendChild(fragment);
					}
					Object.keys(nodes).forEach(function(key) {
						var val = nodes[key],
							attr = getNamespace(key);
						typeof val === "function" ? element.addEventListener(key.replace(/^on/, ""), val, false) : element.setAttributeNS(attr.namespace || "", attr.shortName, val);
					});
				}
			}
			return element ? element : "";
		}
		function getDomTree(container, nodes) {
			for(var fragment = document.createDocumentFragment(), value, node, i = 0, l = nodes.childNodes.length; i < l; i++) {
				node = nodes.childNodes[i];
				switch(node.nodeType) {
					case 1:
						value = getElement(node.nodeName.toLowerCase(), node); break;
					case 3:
						value = document.createTextNode(node.nodeValue); break;
					default:
						// Maybe not necessary?
						value = document.createComment(nodeTypeToNamedConstant(type) + IS_REMOVED);
				}
				fragment.appendChild(value);
			}
			container = getElement(container.nodeName.toLowerCase());
			container.appendChild(fragment);
			return container;
		}

		/* switch mode by context */
		if(selection.isCollapsed) {
			targetObj = document.activeElement;
			switch(true) {
				case (/^input$/i.test(targetObj.nodeName) && targetObj.hasAttribute("type") && targetObj.getAttribute("type") === "text") || /^textarea$/i.test(targetObj.nodeName):
					nodeValue = onEditText(targetObj) + (targetObj.value ? targetObj.value : ""); break;
				case /^(?:contenteditabl|tru)e$/i.test(targetObj.contentEditable):
					nodeValue = onEditText(targetObj) + onContentEditable(targetObj); break;
				default:
					nodeValue = VIEW_SOURCE;
			}
		}
		else {
			k = selection.rangeCount;
			targetObj = selection.getRangeAt(0).commonAncestorContainer;
			switch(true) {
				case selection.anchorNode === selection.focusNode && selection.anchorNode.parentNode === document.documentElement:
					nodeValue = VIEW_SOURCE; break;
				case k === 1 && /^(?:contenteditabl|tru)e$/i.test(targetObj.contentEditable):
					nodeValue = onEditText(targetObj) + onContentEditable(targetObj); break;
				default:
					for(ranges = [], j = 0; j < k; j++) {
						targetObj = selection.getRangeAt(j);
						nodeValue = targetObj.commonAncestorContainer.parentNode.nodeName.toLowerCase();
						targetObj = getDomTree(targetObj.commonAncestorContainer, targetObj.cloneContents());
						nodeValue = getElement(nodeValue);
						nodeValue && nodeValue.nodeType === 1 && (
							nodeValue.appendChild(targetObj),
							ranges[ranges.length] = nodeValue.innerHTML
						);
					}
					nodeValue = ranges.length > 0 ? "mode=viewSelection;value=" + ranges.join("\n") : VIEW_SOURCE;
			}
		}
		self.postMessage(nodeValue);
	});
})();
