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
		const DATA_ID = "data-with_ex_editor_id";
		const namespaces = {
			"cc": "http://creativecommons.org/ns#",
			"cnt": "http://www.w3.org/2008/content#",
			"csvw": "http://www.w3.org/ns/csvw#",
			"ctag": "http://commontag.org/ns#",
			"dc": "http://purl.org/dc/terms/",
			"dc11": "http://purl.org/dc/elements/1.1/",
			"dcat": "http://www.w3.org/ns/dcat#",
			"dcterms": "http://purl.org/dc/terms/",
			"earl": "http://www.w3.org/ns/earl#",
			"foaf": "http://xmlns.com/foaf/0.1/",
			"gr": "http://purl.org/goodrelations/v1#",
			"grddl": "http://www.w3.org/2003/g/data-view#",
			"ht": "http://www.w3.org/2006/http#",
			"html": "http://www.w3.org/1999/xhtml",
			"ical": "http://www.w3.org/2002/12/cal/icaltzd#",
			"ma": "http://www.w3.org/ns/ma-ont#",
			"math": "http://www.w3.org/1998/Math/MathML",
			"oa": "http://www.w3.org/ns/oa#",
			"og": "http://ogp.me/ns#",
			"org": "http://www.w3.org/ns/org#",
			"owl": "http://www.w3.org/2002/07/owl#",
			"prov": "http://www.w3.org/ns/prov#",
			"ptr": "http://www.w3.org/2009/pointers#",
			"qb": "http://purl.org/linked-data/cube#",
			"rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
			"rdfa": "http://www.w3.org/ns/rdfa#",
			"rdfs": "http://www.w3.org/2000/01/rdf-schema#",
			"rev": "http://purl.org/stuff/rev#",
			"rif": "http://www.w3.org/2007/rif#",
			"rr": "http://www.w3.org/ns/r2rml#",
			"schema": "http://schema.org/",
			"sd": "http://www.w3.org/ns/sparql-service-description#",
			"sioc": "http://rdfs.org/sioc/ns#",
			"skos": "http://www.w3.org/2004/02/skos/core#",
			"skosxl": "http://www.w3.org/2008/05/skos-xl#",
			"svg": "http://www.w3.org/2000/svg",
			"v": "http://rdf.data-vocabulary.org/#",
			"vcard": "http://www.w3.org/2006/vcard/ns#",
			"void": "http://rdfs.org/ns/void#",
			"wdr": "http://www.w3.org/2007/05/powder#",
			"wdrs": "http://www.w3.org/2007/05/powder-s#",
			"xhv": "http://www.w3.org/1999/xhtml/vocab#",
			"xlink": "http://www.w3.org/1999/xlink",
			"xml": "http://www.w3.org/XML/1998/namespace",
			"xmlns": "http://www.w3.org/2000/xmlns/",
			"xsd": "http://www.w3.org/2001/XMLSchema#",
		};

		/* get namespace of node from ancestor */
		function getNodeNs(obj) {
			for(var namespace = {}, name; obj && obj.parentNode; obj = obj.parentNode) {
				name = /^(?:(?:math:)?(math)|(?:svg:)?(svg))$/.exec(obj.nodeName.toLowerCase());
				if(name) {
					namespace["node"] = obj;
					namespace["name"] = name[1] || name[2];
					namespace["uri"] = namespaces[namespace["name"]];
					break;
				}
			}
			!name && (
				obj = document.documentElement,
				namespace["node"] = obj,
				namespace["name"] = obj.nodeName.toLowerCase(),
				namespace["uri"] = obj.hasAttribute("xmlns") ? obj.getAttribute("xmlns") : namespaces[namespace["name"]] ? namespaces[namespace["name"]] : null
			);
			return namespace;
		}

		/* create element */
		function getElement(node, nodes) {
			function getNamespace(obj, bool) {
				var elementNameParts = /^(?:(.*):)?(.*)$/.exec(obj.nodeName.toLowerCase()),
					prefix = elementNameParts[1] || null,
					shortName = elementNameParts[2],
					namespace = prefix && namespaces[prefix] ? namespaces[prefix] : null;
				return {
					"namespace": namespace ? namespace : bool ? getNodeNs(obj).uri : null,
					"prefix": prefix ? (prefix + ":") : "",
					"shortName": shortName,
				};
			}
			function appendChildNodes(obj) {
				for(var fragment = document.createDocumentFragment(), child, i = 0, l = obj.childNodes.length; i < l; i++) {
					child = obj.childNodes[i];
					switch(child.nodeType) {
						case 1:
							fragment.appendChild(getElement(child, child)); break;
						case 3:
							fragment.appendChild(document.createTextNode(child.nodeValue)); break;
						default:
					}
				}
				return fragment;
			}
			var element;
			if(node) {
				node = getNamespace(node, true);
				element = node["shortName"] && document.createElementNS(node["namespace"] || namespaces["html"], node["shortName"]);
				if(nodes && element) {
					nodes.hasChildNodes() && element.appendChild(appendChildNodes(nodes));
					if(nodes.attributes) {
						for(var attr, attrNs, i = 0, l = nodes.attributes.length; i < l; i++) {
							attr = nodes.attributes[i];
							attrNs = getNamespace(attr, false);
							typeof nodes[attr.nodeName] !== "function" && attrNs["shortName"] && element.setAttributeNS(attrNs["namespace"] || "", attrNs["prefix"] + attrNs["shortName"], attr.nodeValue);
						}
					}
				}
			}
			return element ? element : document.createTextNode("");
		}

		/* create DOM tree */
		function getDomTree(container, nodes) {
			function createDom(obj) {
				for(var fragment = document.createDocumentFragment(), value, node, i = 0, l = obj.childNodes.length; i < l; i++) {
					node = obj.childNodes[i];
					switch(node.nodeType) {
						case 1:
							i === 0 && fragment.appendChild(document.createTextNode("\n"));
							fragment.appendChild(getElement(node, node));
							i === l - 1 && fragment.appendChild(document.createTextNode("\n"));
							break;
						case 3:
							fragment.appendChild(document.createTextNode(node.nodeValue)); break;
						default:
					}
				}
				return fragment;
			}
			container = container ? getElement(container) : "";
			container && container.nodeType === 1 ? nodes && nodes.hasChildNodes() && container.appendChild(createDom(nodes)) : (container = document.createTextNode(""));
			return container;
		}

		/* set temporary ID to the target element */
		function onEditText(target) {
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
			function getTextNode(obj) {
				for(var array = [], node, i = 0, l = obj.childNodes.length; i < l; i++) {
					node = obj.childNodes[i];
					switch(true) {
						case node.nodeType === 3:
							array[array.length] = node.nodeValue; break;
						case node.nodeType === 1 && node.nodeName.toLowerCase() === "br":
							array[array.length] = "\n"; break;
						case node.nodeType === 1 && node.hasChildNodes():
							array[array.length] = getTextNode(node); break;
						default:
					}
				}
				return array.length > 0 ? array.join("") : "";
			}
			function getTextNodeFromContent(obj) {
				for(var array = [], node, container, i = 0, l = obj.childNodes.length; i < l; i++) {
					node = obj.childNodes[i];
					switch(true) {
						case node.nodeType === 3:
							array[array.length] = node.nodeValue; break;
						case node.nodeType === 1 && node.nodeName.toLowerCase() === "br":
							array[array.length] = "\n"; break;
						case node.nodeType === 1 && node.hasChildNodes():
							container = getElement(node);
							container && container.nodeType === 1 && (
								container = getDomTree(container, node),
								array[array.length] = getTextNode(container)
							);
							break;
						default:
					}
				}
				return array.length > 0 ? array.join("") : "";
			}
			return nodes ? getTextNodeFromContent(nodes) : "";
		}

		/* create DOM from range and get childNodes */
		function onViewSelection(sel) {
			var fragment = document.createDocumentFragment();
			if(sel && sel.rangeCount) {
				for(var range, element, i = 0, l = sel.rangeCount; i < l; i++) {
					range = sel.getRangeAt(i);
					if(range.commonAncestorContainer.nodeType === 1) {
						element = getNodeNs(range.commonAncestorContainer);
						if(/^(?:svg|math)$/.test(element["name"])) {
							if(element["node"] === document.documentElement) {
								fragment = null;
								break;
							}
							else {
								element["node"].parentNode && (
									range.setStart(element["node"].parentNode, 0),
									range.setEnd(element["node"].parentNode, element["node"].parentNode.childNodes.length)
								);
							}
						}
						fragment.appendChild(getDomTree(range.commonAncestorContainer, range.cloneContents()));
					}
					else if(range.commonAncestorContainer.nodeType === 3) {
						element = getElement(range.commonAncestorContainer.parentNode);
						element.appendChild(document.createTextNode(range.commonAncestorContainer.nodeValue));
						fragment.appendChild(element);
					}
					i < l - 1 && fragment.appendChild(document.createTextNode("\n\n"));
				}
			}
			return fragment && fragment.hasChildNodes() && window.XMLSerializer ? "mode=viewSelection;value=" + (new XMLSerializer().serializeToString(fragment)) : VIEW_SOURCE;
		}

		/* switch mode by context */
		var selection = window.getSelection(), targetObj, nodeValue;
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
			switch(true) {
				case selection.anchorNode === selection.focusNode && selection.anchorNode.parentNode === document.documentElement:
					nodeValue = VIEW_SOURCE; break;
				case selection.rangeCount === 1 && /^(?:contenteditabl|tru)e$/i.test(targetObj.contentEditable):
					nodeValue = onEditText(targetObj) + onContentEditable(targetObj); break;
				default:
					nodeValue = onViewSelection(selection);
			}
		}
		self.postMessage(nodeValue);
	});
})();
