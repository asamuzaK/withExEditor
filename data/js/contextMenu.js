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
		var selection = window.getSelection(), targetObj, nodeValue, j, k;

		/* create element */
		function getElement(node, nodes) {
			const namespaces = {
				html: "http://www.w3.org/1999/xhtml",
			};
			var element;
			function getNamespace(name) {
				var elementNameParts = /^(?:(.*):)?(.*)$/.exec(name);
				return {
					namespace: namespaces[elementNameParts[1]],
					shortName: elementNameParts[2],
				};
			}
			function appendChildNodes(obj) {
				for(var fragment = document.createDocumentFragment(), child, i = 0, l = obj.childNodes.length; i < l; i++) {
					child = obj.childNodes[i];
					switch(child.nodeType) {
						case 1:
							fragment.appendChild(getElement(child.nodeName.toLowerCase(), child)); break;
						case 3:
							fragment.appendChild(document.createTextNode(child.nodeValue)); break;
						default:
					}
				}
				return fragment;
			}
			function setAttributes(nodes, element) {
				for(var attr, attrNs, i = 0, l = nodes.attributes.length; i < l; i++) {
					attr = nodes.attributes[i];
					attrNs = getNamespace(attr.nodeName);
					typeof nodes[attr.nodeName] !== "function" && element.setAttributeNS(attrNs.namespace || "", attrNs.shortName, attr.nodeValue);
				}
			}
			node && (
				node = getNamespace(node),
				element = document.createElementNS(node.namespace || namespaces.html, node.shortName),
				nodes && element && (
					nodes.hasChildNodes() && element.appendChild(appendChildNodes(nodes)),
					nodes.attributes && setAttributes(nodes, element)
				)
			);
			return element ? element : "";
		}

		/* create DOM tree */
		function getDomTree(container, nodes) {
			for(var fragment = document.createDocumentFragment(), value, node, i = 0, l = nodes.childNodes.length; i < l; i++) {
				node = nodes.childNodes[i];
				switch(node.nodeType) {
					case 1:
						i === 0 && fragment.appendChild(document.createTextNode("\n"));
						fragment.appendChild(getElement(node.nodeName.toLowerCase(), node));
						i === l - 1 && fragment.appendChild(document.createTextNode("\n"));
						break;
					case 3:
						fragment.appendChild(document.createTextNode(node.nodeValue)); break;
					default:
				}
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
			var array = [];
			function getTextNode(obj) {
				var arr = [], node, i, l;
				if(obj) {
					for(i = 0, l = obj.childNodes.length; i < l; i++) {
						node = obj.childNodes[i];
						switch(true) {
							case node.nodeType === 3:
								arr[arr.length] = node.nodeValue; break;
							case node.nodeType === 1 && node.nodeName.toLowerCase() === "br":
								arr[arr.length] = "\n"; break;
							case node.nodeType === 1 && node.hasChildNodes():
								arr[arr.length] = getTextNode(node); break;
							default:
						}
					}
				}
				return arr.length > 0 ? arr.join("") : "";
			}
			function setNodesArray(nodes, array) {
				for(var node, container, i = 0, l = nodes.childNodes.length; i < l; i++) {
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
			nodes && setNodesArray(nodes, array);
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
				case k === 1 && /^(?:contenteditabl|tru)e$/i.test(targetObj.contentEditable):
					nodeValue = onEditText(targetObj) + onContentEditable(targetObj); break;
				default:
					for(nodeValue = document.createDocumentFragment(), j = 0; j < k; j++) {
						targetObj = selection.getRangeAt(j);
						nodeValue.appendChild(getDomTree(targetObj.commonAncestorContainer, targetObj.cloneContents()));
						j < k - 1 && nodeValue.appendChild(document.createTextNode("\n"));
					}
					nodeValue = nodeValue.hasChildNodes() && window.XMLSerializer ? "mode=viewSelection;value=" + (new XMLSerializer().serializeToString(nodeValue)) : VIEW_SOURCE;
			}
		}
		self.postMessage(nodeValue);
	});
})();
