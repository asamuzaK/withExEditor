/**
*	controlPanel.js
*/
(() => {
	"use strict";
	document.addEventListener("DOMContentLoaded", () => {
		var html = document.querySelector("html"),
			controlPanelForm = document.getElementById("controlPanelForm"),
			buttonIcon = document.getElementById("buttonIcon"),
			buttonIconGray = document.getElementById("buttonIconGray"),
			buttonIconWhite = document.getElementById("buttonIconWhite"),
			selectIcon = document.getElementById("selectIcon"),
			currentEditorName = document.getElementById("currentEditorName"),
			selectEditor = document.getElementById("selectEditor"),
			editorName = document.getElementById("editorName"),
			editorLabel = document.getElementById("editorLabel"),
			storeLabel = document.getElementById("storeLabel"),
			accessKey = document.getElementById("accessKey"),
			setKey = document.getElementById("setKey");

		/* for back compat prior to Fx39 */
		var iconColorLabel = document.querySelector("label[data-l10n-id=IconColorLabel]"),
			iconGrayLabel = document.querySelector("label[data-l10n-id=IconGrayLabel]"),
			iconWhiteLabel = document.querySelector("label[data-l10n-id=IconWhiteLabel]");

		/* modules */
		function removeChildNodes(node) {
			if(node && node.hasChildNodes()) {
				for(var i = node.childNodes.length - 1; i >= 0; i = (i - 1) | 0) {
					node.removeChild(node.childNodes[i]);
				}
			}
		}

		/* disable form inputs for editor label rename, if editor is not selected */
		function toggleFieldset() {
			editorLabel && storeLabel && (
				editorName && editorName.value && currentEditorName && currentEditorName.hasChildNodes() ? (
					removeChildNodes(currentEditorName),
					currentEditorName.appendChild(document.createTextNode(editorName.value)),
					editorLabel.removeAttribute("disabled"),
					storeLabel.removeAttribute("disabled")
				) : (
					editorLabel.setAttribute("disabled", "disabled"),
					storeLabel.setAttribute("disabled", "disabled")
				)
			);
		}

		/* get radio button value if checked or not */
		function getCheckedRadioButtonValue(name) {
			var value, nodes = document.querySelectorAll("input[type=radio]"), node;
			for(node of nodes) {
				if(node.name && node.name === name && node.checked) {
					node.value && (value = node.value); break;
				}
			}
			return value;
		}

		/* event handlers */
		function addonPortEmit(evt) {
			var settings = {
					"editorName": editorLabel && editorLabel.value ? editorLabel.value : editorName && editorName.value ? editorName.value : "",
					"accessKey": accessKey && accessKey.value ? accessKey.value : ""
				},
				icon = buttonIcon && getCheckedRadioButtonValue(buttonIcon.name);
			icon && (settings["toolbarButtonIcon"] = icon);
			evt && (
				evt.type && addon.port.emit(evt.type, settings),
				evt.preventDefault()
			);
		}
		function isRadioChecked(evt) {
			evt && evt.target && evt.target.checked && addonPortEmit(evt);
		}

		/* update control panel */
		addon.port.on("editorValue", res => {
			res && (
				editorName && (
					editorName.value = res["editorName"],
					currentEditorName && (
						currentEditorName.hasChildNodes() && removeChildNodes(currentEditorName),
						currentEditorName.appendChild(document.createTextNode(editorName.value !== "" ? editorName.value : res["currentEditorName"]))
					),
					editorLabel.value = editorName.value
				),
				accessKey && (accessKey.value = res["accessKey"] ? res["accessKey"] : ""),
				toggleFieldset()
			);
		});

		/* localize control panel */
		addon.port.on("htmlValue", res => {
			res && (
				html && (html.lang = res["lang"]),
				selectIcon && (selectIcon.value = res["submit"]),
				currentEditorName && (
					currentEditorName.hasChildNodes() && removeChildNodes(currentEditorName),
					currentEditorName.appendChild(document.createTextNode(res["currentEditorName"]))
				),
				editorLabel && (editorLabel.placeholder = res["editorLabel"]),
				storeLabel && (storeLabel.value = res["submit"]),
				setKey && (setKey.value = res["submit"]),
				/* back compat localize attributes prior to Fx39 */
				(res["compat"] < 0 || isNaN(res["compat"])) && (
					iconColorLabel && (iconColorLabel.ariaLabel = res["iconColorLabel"]),
					buttonIcon && (buttonIcon.alt = res["iconColorAlt"]),
					iconGrayLabel && (iconGrayLabel.ariaLabel = res["iconGrayLabel"]),
					buttonIconGray && (buttonIconGray.alt = res["iconGrayAlt"]),
					iconWhiteLabel && (iconWhiteLabel.ariaLabel = res["iconWhiteLabel"]),
					buttonIconWhite && (buttonIconWhite.alt = res["iconWhiteAlt"]),
					currentEditorName && (currentEditorName.ariaLabel = res["currentEditorNameLabel"]),
					accessKey && (accessKey.placeholder = res["accessKeyPlaceholder"])
				)
			);
		});

		/* event listeners */
		window.addEventListener("load", evt => {
			evt && evt.type && addon.port.emit(evt.type);
		}, false);
		controlPanelForm && controlPanelForm.addEventListener("submit", addonPortEmit, false);
		buttonIcon && buttonIcon.addEventListener("change", isRadioChecked, false);
		buttonIconGray && buttonIconGray.addEventListener("change", isRadioChecked, false);
		buttonIconWhite && buttonIconWhite.addEventListener("change", isRadioChecked, false);
		selectEditor && selectEditor.addEventListener("click", evt => {
			evt && (
				evt.type && evt.target && evt.target.href && addon.port.emit(evt.type, evt.target.href),
				evt.preventDefault()
			);
		}, false);

		/* on initial run */
		toggleFieldset();
	}, false);
})();
