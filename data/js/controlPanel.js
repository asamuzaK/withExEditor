/**
*	controlPanel.js
*/
(function() {
	"use strict";
	document.addEventListener("DOMContentLoaded", function() {
		var html = document.querySelector("html"),
			title = document.querySelector("title"),
			controlPanelForm = document.getElementById("controlPanelForm"),
			editorName = document.getElementById("editorName"),
			editorPath = document.getElementById("editorPath"),
			getFile = document.getElementById("getFile"),
			getFileLabel = document.getElementById("getFileLabel"),
			renameEditor = document.getElementById("renameEditor"),
			renameEditorLabel = document.getElementById("renameEditorLabel"),
			storeFile = document.getElementById("storeFile"),
			storeFileLabel = document.getElementById("storeFileLabel"),
			buttonIcon = document.getElementById("buttonIcon"),
			buttonIconWhite = document.getElementById("buttonIconWhite"),
			selectIcon = document.getElementById("selectIcon"),
			selectIconLabel = document.getElementById("selectIconLabel"),
			setAccessKeyLabel = document.getElementById("setAccessKeyLabel"),
			accessKey = document.getElementById("accessKey"),
			setKey = document.getElementById("setKey");
		function removeChildNodes(node) {
			for(var i = node.childNodes.length - 1, l = 0; i >= 0; i--) {
				node.removeChild(node.childNodes[i]);
			}
		}
		function setInputTextMaxWidth() {
			for(var nodes = document.querySelectorAll('input[type=text]'), node, i = 0, l = nodes.length; i < l; i++) {
				node = nodes[i];
				node.style.maxWidth = document.defaultView.getComputedStyle(node.parentNode).width;
			}
		}
		function toggleFieldset() {
			if(editorName.value && renameEditorLabel.hasChildNodes()) {
				removeChildNodes(renameEditorLabel);
				renameEditorLabel.appendChild(document.createTextNode(editorName.value));
				storeFile.removeAttribute("disabled");
				renameEditor.removeAttribute("disabled");
			}
			else {
				storeFile.setAttribute("disabled", "disabled");
				renameEditor.setAttribute("disabled", "disabled");
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
				"editorName": renameEditor.value ? renameEditor.value : editorName.value,
				"editorPath": editorPath.value,
			}
			getCheckedRadioButtonValue(buttonIcon.name) && (settings["toolbarButtonIcon"] = getCheckedRadioButtonValue(buttonIcon.name));
			settings["accessKey"] = accessKey.value ? accessKey.value : "";
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
		getFile.addEventListener("click", addonPortEmit, false);
		buttonIcon.addEventListener("change", isRadioChecked, false);
		buttonIconWhite.addEventListener("change", isRadioChecked, false);
		addon.port.on("editorValue", function(res) {
			editorName.value = res["editorName"];
			editorPath.value = res["editorPath"];
			editorName.value !== "" && renameEditorLabel.hasChildNodes() && (
				removeChildNodes(renameEditorLabel),
				renameEditorLabel.appendChild(document.createTextNode(res["editorName"])),
				renameEditor.value = res["editorName"]
			);
			accessKey.value = res["accessKey"] ? res["accessKey"] : "";
			toggleFieldset();
		});
		addon.port.on("htmlValue", function(res) {
			html.lang = res["HtmlLang"];
			title.hasChildNodes() && removeChildNodes(title);
			title.appendChild(document.createTextNode(res["ControlPanelTitle"]));
			getFile.value = res["Select"];
			getFileLabel.hasChildNodes() && removeChildNodes(getFileLabel);
			getFileLabel.appendChild(document.createTextNode(res["GetFileLabel"]));
			storeFile.value = res["Submit"];
			storeFileLabel.hasChildNodes() && removeChildNodes(storeFileLabel);
			storeFileLabel.appendChild(document.createTextNode(res["StoreFileLabel"]));
			renameEditor.placeholder = res["RenameEditorPlaceholder"];
			renameEditorLabel.hasChildNodes() && removeChildNodes(renameEditorLabel);
			renameEditorLabel.appendChild(document.createTextNode(res["RenameEditorLabel"]));
			selectIcon.value = res["Submit"];
			selectIconLabel.hasChildNodes() && removeChildNodes(selectIconLabel);
			selectIconLabel.appendChild(document.createTextNode(res["SelectIconLabel"]));
			setAccessKeyLabel.hasChildNodes() && removeChildNodes(setAccessKeyLabel);
			setAccessKeyLabel.appendChild(document.createTextNode(res["setAccessKeyLabel"]));
			accessKeyLabel.hasChildNodes() && removeChildNodes(accessKeyLabel);
			accessKeyLabel.appendChild(document.createTextNode(res["accessKeyPlaceholder"]));
			accessKey.placeholder = res["accessKeyPlaceholder"];
			setKey.value = res["Submit"];
		});
		setInputTextMaxWidth();
		toggleFieldset();
	}, false);
})();
