/**
*	controlPanel.js
*/
(() => {
	"use strict";
	const html = document.querySelector("html");
	const controlPanelForm = document.getElementById("controlPanelForm");
	const buttonIcon = document.getElementById("buttonIcon");
	const buttonIconGray = document.getElementById("buttonIconGray");
	const buttonIconWhite = document.getElementById("buttonIconWhite");
	const selectIcon = document.getElementById("selectIcon");
	const currentEditorName = document.getElementById("currentEditorName");
	const editorName = document.getElementById("editorName");
	const editorLabel = document.getElementById("editorLabel");
	const storeLabel = document.getElementById("storeLabel");
	const openAddonManager = document.getElementById("openAddonManager");
	const inputRadios = document.querySelectorAll("input[type=radio]");

	/* for back compat prior to Fx39 */
	const iconColorLabel = document.querySelector("label[data-l10n-id=IconColorLabel]");
	const iconGrayLabel = document.querySelector("label[data-l10n-id=IconGrayLabel]");
	const iconWhiteLabel = document.querySelector("label[data-l10n-id=IconWhiteLabel]");

	/* remove child nodes */
	const removeChildNodes = node => {
		if(node && node.hasChildNodes()) {
			while(node.firstChild) {
				node.removeChild(node.firstChild);
			}
		}
	};

	/* disable form inputs for editor label rename, if editor is not selected */
	const toggleFieldset = () => {
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
	};

	/* get radio button value if checked or not */
	const getCheckedRadioButtonValue = name => {
		let value;
		for(let node of inputRadios) {
			if(node.name && node.name === name && node.checked) {
				node.value && (value = node.value); break;
			}
		}
		return value;
	};

	/* event handlers */
	const selfPortEmit = evt => {
		const icon = buttonIcon && getCheckedRadioButtonValue(buttonIcon.name);
		let settings = {
			"editorName": editorLabel && editorLabel.value ? editorLabel.value : editorName && editorName.value ? editorName.value : ""
		};
		icon && (settings["toolbarButtonIcon"] = icon);
		evt && (
			evt.type && self.port.emit(evt.type, settings),
			evt.preventDefault()
		);
	};
	const isRadioChecked = evt => evt && evt.target && evt.target.checked && selfPortEmit(evt);

	/* update control panel */
	self.port.on("editorValue", res => {
		res && (
			editorName && (
				editorName.value = res["editorName"],
				currentEditorName && (
					currentEditorName.hasChildNodes() && removeChildNodes(currentEditorName),
					currentEditorName.appendChild(document.createTextNode(editorName.value !== "" ? editorName.value : res["currentEditorName"]))
				),
				editorLabel.value = editorName.value
			),
			toggleFieldset()
		);
	});

	/* localize control panel */
	self.port.on("htmlValue", res => {
		res && (
			html && (html.lang = res["lang"]),
			selectIcon && (selectIcon.value = res["submit"]),
			currentEditorName && (
				currentEditorName.hasChildNodes() && removeChildNodes(currentEditorName),
				currentEditorName.appendChild(document.createTextNode(res["currentEditorName"]))
			),
			editorLabel && (editorLabel.placeholder = res["editorLabel"]),
			storeLabel && (storeLabel.value = res["submit"]),
			/* back compat localize attributes prior to Fx39 */
			(res["compat"] < 0 || isNaN(res["compat"])) && (
				iconColorLabel && (iconColorLabel.ariaLabel = res["iconColorLabel"]),
				buttonIcon && (buttonIcon.alt = res["iconColorAlt"]),
				iconGrayLabel && (iconGrayLabel.ariaLabel = res["iconGrayLabel"]),
				buttonIconGray && (buttonIconGray.alt = res["iconGrayAlt"]),
				iconWhiteLabel && (iconWhiteLabel.ariaLabel = res["iconWhiteLabel"]),
				buttonIconWhite && (buttonIconWhite.alt = res["iconWhiteAlt"]),
				currentEditorName && (currentEditorName.ariaLabel = res["currentEditorNameLabel"])
			)
		);
	});

	/* on initial run */
	(() => {
		window.addEventListener("load", evt => {
			evt && evt.type && self.port.emit(evt.type);
		}, false);
		controlPanelForm && controlPanelForm.addEventListener("submit", selfPortEmit, false);
		buttonIcon && buttonIcon.addEventListener("change", isRadioChecked, false);
		buttonIconGray && buttonIconGray.addEventListener("change", isRadioChecked, false);
		buttonIconWhite && buttonIconWhite.addEventListener("change", isRadioChecked, false);
		openAddonManager && openAddonManager.addEventListener("click", evt => {
			evt && (
				evt.type && evt.target && evt.target.hasAttribute("data-href") && self.port.emit(evt.type, evt.target.getAttribute("data-href")),
				evt.preventDefault()
			);
		}, false);
		toggleFieldset();
	})();
})();
