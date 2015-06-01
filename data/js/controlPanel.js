/**
*	controlPanel.js
*/
(function() {
	"use strict";
	document.addEventListener("DOMContentLoaded", function() {
		var html = document.querySelector("html"),
			title = document.querySelector("title"),
			controlPanelForm = document.getElementById("controlPanelForm"),
			buttonIcon = document.getElementById("buttonIcon"),
			buttonIconWhite = document.getElementById("buttonIconWhite"),
			selectIconLabel = document.getElementById("selectIconLabel"),
			selectIcon = document.getElementById("selectIcon"),
			renameEditorLabel = document.getElementById("renameEditorLabel"),
			currentEditorName = document.getElementById("currentEditorName"),
			editorName = document.getElementById("editorName"),
			editorLabel = document.getElementById("editorLabel"),
			storeLabel = document.getElementById("storeLabel"),
			renameEditorLabel = document.getElementById("renameEditorLabel"),
			setAccessKeyLabel = document.getElementById("setAccessKeyLabel"),
			accessKey = document.getElementById("accessKey"),
			setKey = document.getElementById("setKey");
		function removeChildNodes(node) {
			for(var i = node.childNodes.length - 1, l = 0; i >= 0; i--) {
				node.removeChild(node.childNodes[i]);
			}
		}
		function toggleFieldset() {
			if(editorName.value && currentEditorName.hasChildNodes()) {
				removeChildNodes(currentEditorName);
				currentEditorName.appendChild(document.createTextNode(editorName.value));
				editorLabel.removeAttribute("disabled");
				storeLabel.removeAttribute("disabled");
			}
			else {
				editorLabel.setAttribute("disabled", "disabled");
				storeLabel.setAttribute("disabled", "disabled");
			}
		}
		function getCheckedRadioButtonValue(name) {
			for(var value, nodes = document.querySelectorAll("input[type=radio]"), node, i = 0, l = nodes.length; i < l; i++) {
				node = nodes[i];
				if(node.name === name && node.checked) {
					value = node.value;
					break;
				}
			}
			return value;
		}
		function addonPortEmit(event) {
			var settings = {
				"editorName": editorLabel.value ? editorLabel.value : editorName.value,
				"accessKey": accessKey.value ? accessKey.value : "",
			}
			getCheckedRadioButtonValue(buttonIcon.name) && (settings["toolbarButtonIcon"] = getCheckedRadioButtonValue(buttonIcon.name));
			addon.port.emit(event.type, settings);
			event.preventDefault();
		}
		function isRadioChecked(event) {
			event.target.checked && addonPortEmit(event);
		}
		window.addEventListener("load", function(event) {
			addon.port.emit(event.type);
		}, false);
		controlPanelForm.addEventListener("submit", addonPortEmit, false);
		buttonIcon.addEventListener("change", isRadioChecked, false);
		buttonIconWhite.addEventListener("change", isRadioChecked, false);
		currentEditorName.addEventListener("click", function(event) {
			addon.port.emit(event.type, currentEditorName.href);
			event.preventDefault();
		}, false);
		addon.port.on("editorValue", function(res) {
			editorName.value = res["editorName"];
			editorName.value !== "" && currentEditorName.hasChildNodes() && (
				removeChildNodes(currentEditorName),
				currentEditorName.appendChild(document.createTextNode(res["editorName"])),
				editorLabel.value = res["editorName"]
			);
			accessKey.value = res["accessKey"] ? res["accessKey"] : "";
			toggleFieldset();
		});
		addon.port.on("htmlValue", function(res) {
			html.lang = res["Lang"];
			title.hasChildNodes() && removeChildNodes(title);
			title.appendChild(document.createTextNode(res["ControlPanelTitle"]));
			selectIconLabel.hasChildNodes() && removeChildNodes(selectIconLabel);
			selectIconLabel.appendChild(document.createTextNode(res["SelectIconLabel"]));
			selectIcon.value = res["Submit"];
			renameEditorLabel.hasChildNodes() && removeChildNodes(renameEditorLabel);
			renameEditorLabel.appendChild(document.createTextNode(res["RenameEditorLabel"]));
			currentEditorName.hasChildNodes() && removeChildNodes(currentEditorName);
			currentEditorName.appendChild(document.createTextNode(res["CurrentEditorName"]));
			editorLabel.placeholder = res["EditorLabel"];
			storeLabel.value = res["Submit"];
			setAccessKeyLabel.hasChildNodes() && removeChildNodes(setAccessKeyLabel);
			setAccessKeyLabel.appendChild(document.createTextNode(res["AccessKeyLabel"]));
			accessKeyLabel.hasChildNodes() && removeChildNodes(accessKeyLabel);
			accessKeyLabel.appendChild(document.createTextNode(res["AccessKeyPlaceholder"]));
			accessKey.placeholder = res["AccessKeyPlaceholder"];
			setKey.value = res["Submit"];
		});
		toggleFieldset();
	}, false);
})();
