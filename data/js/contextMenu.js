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

		/* create element */
		function getElement(node, nodes) {
			const namespaces = {
					html: "http://www.w3.org/1999/xhtml",
				};
			var element, fragment, value, i, l;
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
							}
							fragment.appendChild(value);
						}
						element.appendChild(fragment);
					}
					Object.keys(nodes).forEach(function(key) {
						var val = nodes[key],
							attr = getNamespace(key);
						//typeof val === "function" ? element.addEventListener(key.replace(/^on/, ""), val, false) : element.setAttributeNS(attr.namespace || "", attr.shortName, val);
						typeof val !== "function" && element.setAttributeNS(attr.namespace || "", attr.shortName, val);
					});
				}
			}
			return element ? element : "";
		}

		/* create DOM tree */
		function getDomTree(container, nodes) {
			for(var fragment = document.createDocumentFragment(), value, node, i = 0, l = nodes.childNodes.length; i < l; i++) {
				node = nodes.childNodes[i];
				switch(node.nodeType) {
					case 1:
						value = getElement(node.nodeName.toLowerCase(), node); break;
					case 3:
						value = document.createTextNode(node.nodeValue); break;
					default:
				}
				fragment.appendChild(value);
			}
			container = getElement(container.nodeName.toLowerCase());
			container.appendChild(fragment);
			return container;
		}

		/* set temporary ID to the target element */
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
			return id ? "mode=editText;target=" + id + ";value=" : VIEW_SOURCE;
		}

		/* get text node from editable content */
		function onContentEditable(nodes) {
			var array = [], node, container, i, l;
			function getTextNode(children) {
				var arr = [], child, j, k;
				if(children) {
					for(j = 0, k = children.childNodes.length; j < k; i++) {
						child = children.childNodes[j];
						switch(true) {
							case child.nodeType === 3:
								arr[arr.length] = child.nodeValue; break;
							case child.nodeType === 1 && child.nodeName.toLowerCase() === "br":
								arr[arr.length] = "\n"; break;
							case child.nodeType === 1 && child.hasChildNodes():
								arr[arr.length] = getTextNode(child); break;
							default:
						}
					}
				}
				return arr.length > 0 ? arr.join("") : "";
			}
			if(nodes) {
				for(i = 0, l = nodes.childNodes.length; i < l; i++) {
					node = nodes.childNodes[i];
					switch(true) {
						case node.nodeType === 3:
							array[array.length] = node.nodeValue; break;
						case node.nodeType === 1 && node.nodeName.toLowerCase() === "br":
							array[array.length] = "\n"; break;
						case node.nodeType === 1 && node.hasChildNodes():
							container = getElement(node.nodeName.toLowerCase());
							container && container.nodeType === 1 && (
								container = getDomTree(container, node),
								array[array.length] = getTextNode(container)
							);
							break;
						default:
					}
				}
			}
			return array.length > 0 ? array.join("") : "";
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
			targetObj = selection.getRangeAt(0).commonAncestorContainer;
			k = selection.rangeCount;
			switch(true) {
				case selection.anchorNode === selection.focusNode && selection.anchorNode.parentNode === document.documentElement:
					nodeValue = VIEW_SOURCE; break;
				case k === 1 && /^(?:contenteditabl|tru)e$/i.test(targetObj):
					nodeValue = onEditText(targetObj) + onContentEditable(targetObj);
					break;
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
