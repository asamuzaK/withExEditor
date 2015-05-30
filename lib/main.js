/**
*	main.js
*/
(function() {
	"use strict";
	/* sdk */
	const _ = require("sdk/l10n").get;
	const { ActionButton } = require("sdk/ui/button/action");
	const Request = require("sdk/request").Request;
	const contextMenu = require("sdk/context-menu");
	const panel = require("sdk/panel");
	const self = require("sdk/self");
	const simpleStorage = require("sdk/simple-storage");
	const tabs = require("sdk/tabs");
	const tmpDPath = require("sdk/system").pathFor("TmpD");
	const urls = require("sdk/url");
	const windowUtils = require("sdk/window/utils");
	const componentUtils = require("componentUtils");

	exports.main = function(option, callback) {
		const ACCESSKEY_LABEL = _("SetAccessKeyLabel");
		const ACCESSKEY_PLACEHOLDER = _("AccessKeyPlaceholder");
		const CONTENTSCRIPT_JS = "./js/contentScript.js";
		const CONTEXTMENU_JS = "./js/contextMenu.js";
		const CONTROL_PANEL_TITLE = _("ControlPanelTitle");
		const GET_FILE_LABEL = _("GetFileLabel");
		const ICON = "./img/icon.svg";
		const LABEL = "with Ex Editor";
		const LANG = _("HtmlLang");
		const RENAME_EDITOR_LABEL = _("RenameEditorLabel");
		const RENAME_EDITOR_PLACEHOLDER = _("RenameEditorPlaceholder");
		const SELECT = _("Select");
		const SELECT_ICON_LABEL = _("SelectIconLabel");
		const STORE_FILE_LABEL = _("StoreFileLabel");
		const SUBMIT = _("Submit");

		var processId = "withExEditor",
			tmpDir,
			tmpDirIdPath,
			editorName = "",
			editorPath = "",
			toolbarButton,
			toolbarButtonIcon = ICON,
			controlPanel,
			contextMenuItem,
			accessKey = "e";

		/* modules */
		function getFileNameFromUriPath(uri, value) {
			var fileName = uri.match(/.*\/((?:[a-zA-Z0-9\-_~!\$&'\(\)\*\+,;=:@]|%[0-9a-fA-F]{2})+)(?:\.(?:[a-zA-Z0-9\-\_~!\$&'\(\)\*\+,;=:@]|%[0-9a-fA-F]{2})+)*$/);
			return fileName ? fileName[1] : value;
		}
		function getFileExtention(type) {
			switch(true) {
				case /^(?:application\/(?:ecm|jav)|text\/(?:(?:x-)?jav|ecm))ascript$/.test(type):
					type = '.js'; break;
				case /^application\/xhtml\+xml$/.test(type):
					type = '.xhtml'; break;
				case /^application\/(?:[a-zA-Z0-9\.\-_]+\+)?xml$/.test(type) && !/^application\/xhtml\+xml$/.test(type):
					type = '.xml'; break;
				case /^application\/(?:[a-zA-Z0-9\.\-_]+\+)?json$/.test(type):
					type = '.json'; break;
				case /^image\/svg\+xml$/.test(type):
					type = '.svg'; break;
				case /^text\/css$/.test(type):
					type = '.css'; break;
				case /^text\/csv$/.test(type):
					type = '.csv'; break;
				case /^text\/markdown$/.test(type):
					type = '.md'; break;
				case /^text\/html$/.test(type):
					type = '.html'; break;
				case /^text\/xml$/.test(type):
					type = '.xml'; break;
				default:
					type = '.txt';
			}
			return type;
		}
		function workerPortEmit(worker, event, value) {
			worker.port.emit(event, value);
		}

		/* simpleStorage */
		function storeTmpFile(store) {
			simpleStorage.storage.withExEditorTmpFiles[processId]["tmpFiles"][store["target"]] = store;
		}
		function storeProcessIdTmpFiles() {
			simpleStorage.storage.withExEditorTmpFiles[processId] = {
				"processId": processId,
				"tmpDir": tmpDir,
				"tmpDirIdPath": tmpDirIdPath,
				"tmpFiles": {},
			};
		}
		function storeSettings(store) {
			simpleStorage.storage.withExEditor = store;
		}
		function storeKeyValue(key, value) {
			simpleStorage.storage.withExEditor[key] = value ? value : "";
		}

		/* get tmpFile and edit contents text */
		function editContent(value) {
			var tab = tabs.activeTab;
			tab.attach({
				contentScriptFile: CONTENTSCRIPT_JS,
				contentScriptOptions: {
					"value": value,
	 			},
			});
		}
		function getTmpFile(target) {
			var file = simpleStorage.storage.withExEditorTmpFiles[processId]["tmpFiles"][target];
			Request({
				url: file["fileURI"],
				contentType: "text/plain",
				onComplete: function(res) {
					var value = res.text;
					file["value"] = value;
					storeTmpFile(file);
					editContent(value);
				},
			}).get();
		}

		/* create tmpFile from contents and open with ExEditor */
		function openFileWithExEditor(filePath, fileURI) {
			var target = getFileNameFromUriPath(urls.URL(fileURI).path);
			simpleStorage.storage.withExEditorTmpFiles[processId]["tmpFiles"][target]["filePath"] = filePath;
			simpleStorage.storage.withExEditorTmpFiles[processId]["tmpFiles"][target]["fileURI"] = fileURI;
			componentUtils.openFileWithApp(filePath, editorPath);
		}
		function setTmpFile(res) {
			storeTmpFile(res);
			componentUtils.createFile(tmpDirIdPath, res["fileName"], res["value"], openFileWithExEditor);
		}
		function onEditTextMode(res) {
			setTmpFile(res);
		}
		function onViewSelectionMode(res) {
			var value = res["value"];
			/^(?:application\/(?:(?:[a-zA-Z0-9\.\-_]+\+)?json|(?:ecm|jav)ascript)|text\/(?!(?:ht|x)ml)[a-zA-Z0-9\.\-_]+)$/.test(value) && (res["value"] = componentUtils.parseDomFromString(value).documentElement.firstChild.nodeValue);
			setTmpFile(res);
		}
		function onViewSourceMode(res) {
			var fileName = res["fileName"];
			!/.*\.txt$/.test(fileName) && (res["fileName"] = fileName + ".txt");
			setTmpFile(res);
		}
		function getSource(activeTab) {
			return Request({
				url: activeTab.url,
				contentType: activeTab.contentType,
				onComplete: function(res) {
					var target = getFileNameFromUriPath(urls.URL(activeTab.url).path, "index"), type = activeTab.contentType;
					onViewSourceMode({
						"mode": "viewSource",
						"fileName": target + getFileExtention(type),
						"target": target,
						"type": type,
						"value": res.text,
					});
				},
			}).get();
		}
		function parseContextStringToVariables(res) {
			var activeTab = tabs.activeTab, type = activeTab.contentType, target, value;
			switch(true) {
				case /^mode=editText;target=withExEditor[0-9]+_[0-9]+;value=.*/.test(res):
					target = res.match(/^mode=editText;target=(withExEditor[0-9]+_[0-9]+);.*/)[1];
					value = res.replace(/^mode=editText;target=withExEditor[0-9]+_[0-9]+;value=/, "");
					onEditTextMode({
						"mode": "editText",
						"fileName": target + ".txt",
						"target": target,
						"type": type,
						"value": value,
					});
					break;
				case /^mode=viewSelection;value=.*/.test(res):
					target = getFileNameFromUriPath(urls.URL(activeTab.url).path, "index");
					value = res.replace(/^mode=viewSelection;value=/, "");
					onViewSelectionMode({
						"mode": "viewSelection",
						"fileName": target + getFileExtention(type),
						"target": target,
						"type": type,
						"value": value,
					});
					break;
				default:
					getSource(activeTab);
			}
		}

		/* tmpFiles settings */
		function setTmpDirIdPath(path) {
			tmpDirIdPath = path;
			windowUtils.windows().length > 1 ? componentUtils.initDirPath(tempDirIdPath, storeProcessIdTmpFiles) : componentUtils.makeDirPath(tmpDirIdPath, storeProcessIdTmpFiles);
		}
		function setTmpDirPath(path) {
			tmpDir = path;
			componentUtils.createDir(tmpDir, processId, setTmpDirIdPath);
		}

		/* UI components and settings */
		function setContextMenuItem() {
			contextMenuItem = contextMenu.Item({
				label: _("ViewSource", editorName),
				image: self.data.url(ICON),
				context: contextMenu.PredicateContext(function(context) {
					return /^(?:application\/(?:(?:[a-zA-Z0-9\.\-_]+\+)?(?:json|xml)|(?:ecm|jav)ascript)|image\/[a-zA-Z0-9\.\-_]+\+xml|text\/[a-zA-Z0-9\.\-_]+)$/.test(context.documentType);
				}),
				contentScriptFile: CONTEXTMENU_JS,
				onMessage: function(res) {
					switch(true) {
						case /^(?:ViewS(?:ource|election)|EditText)$/.test(res):
							contextMenuItem.label = _(res, editorName); break;
						case /^withExEditor.*/.test(res):
							getTmpFile(res); break;
						default:
							parseContextStringToVariables(res);
					}
				},
			});
			accessKey !== "" && (contextMenuItem.accesskey = accessKey);
		}

		function changeIcon(res) {
			toolbarButtonIcon = res["toolbarButtonIcon"];
			storeKeyValue("toolbarButtonIcon", toolbarButtonIcon);
			toolbarButton.icon = toolbarButtonIcon;
		}
		function setUI(res) {
			res["toolbarButtonIcon"] && changeIcon(res);
			res["editorName"] && (editorName = res["editorName"], storeKeyValue("editorName", editorName));
			res["editorPath"] && (editorPath = res["editorName"], storeKeyValue("editorPath", editorPath));
			if(res["accessKey"]) {
				accessKey = res["accessKey"];
				storeKeyValue("accessKey", accessKey);
				contextMenuItem && (contextMenuItem.accesskey = accessKey);
			}
			else {
				accessKey = "";
				storeKeyValue("accessKey", "");
				contextMenuItem && contextMenuItem.accesskey && (contextMenuItem.accesskey = null);
			}
			if(editorName && editorPath) {
				contextMenuItem ? contextMenuItem.label = _("ViewSource", editorName) : setContextMenuItem();
				toolbarButton.badge && (toolbarButton.badge = null, toolbarButton.badgeColor = null);
			}
			controlPanel.hide();
		}
		function setSettings(filePath, fileURL) {
			var res = {
				"editorName": getFileNameFromUriPath(fileURL.path, "ExEditor"),
				"editorPath": filePath,
				"toolbarButtonIcon": toolbarButtonIcon,
				"accessKey": accessKey,
			};
			workerPortEmit(controlPanel, "editorValue", res);
			setUI(res);
		}
		function setControlPanel() {
			controlPanel = panel.Panel({
				contentURL: self.data.url("./html/controlPanel.html"),
				height: 300,
				position: toolbarButton,
			});
			controlPanel.port.on("load", function() {
				workerPortEmit(controlPanel, "htmlValue", {
					"GetFileLabel": GET_FILE_LABEL,
					"Lang": LANG,
					"RenameEditorLabel": RENAME_EDITOR_LABEL,
					"RenameEditorPlaceholder": RENAME_EDITOR_PLACEHOLDER,
					"Select": SELECT,
					"SelectIconLabel": SELECT_ICON_LABEL,
					"StoreFileLabel": STORE_FILE_LABEL,
					"Submit": SUBMIT,
					"Title": CONTROL_PANEL_TITLE,
					"IconValue": toolbarButtonIcon,
					"setAccessKeyLabel": ACCESSKEY_LABEL,
					"accessKeyPlaceholder": ACCESSKEY_PLACEHOLDER,
				});
			});
			controlPanel.port.on("click", function() {
				componentUtils.openFilePicker(setSettings);
				controlPanel.hide();
			});
			controlPanel.port.on("change", changeIcon);
			controlPanel.port.on("submit", setUI);
		}

		function selectEditor() {
			workerPortEmit(controlPanel, "editorValue", {
				"editorName": editorName,
				"editorPath": editorPath,
				"toolbarButtonIcon": toolbarButtonIcon,
				"accessKey": accessKey,
			});
			controlPanel.show();
		}
		function setToolbarButton() {
			toolbarButton = ActionButton({
				id: "withExEditor",
				label: LABEL,
				icon: toolbarButtonIcon,
				onClick: selectEditor,
			});
			editorName === "" && (toolbarButton.badge = "!", toolbarButton.badgeColor = "rgb(255,0,0)");
		}

		// initialize (for debug)
		//simpleStorage.storage.withExEditor && (simpleStorage.storage.withExEditor = null);
		//simpleStorage.storage.withExEditorTmpFiles && (simpleStorage.storage.withExEditorTmpFiles = null);
		(function setItems() {
			var exEditor = simpleStorage.storage.withExEditor || false,
				exEditorTmpFiles = simpleStorage.storage.withExEditorTmpFiles || false;
			!exEditorTmpFiles && (simpleStorage.storage.withExEditorTmpFiles = {});
			processId = ("withExEditor" + windowUtils.getMostRecentBrowserWindow().content.performance.now()).replace(/\./, "_");
			if(exEditor) {
				exEditor["editorName"] && (editorName = exEditor["editorName"]);
				exEditor["editorPath"] && (editorPath = exEditor["editorPath"]);
				exEditor["toolbarButtonIcon"] && (toolbarButtonIcon = exEditor["toolbarButtonIcon"]);
				exEditor["accessKey"] && (accessKey = exEditor["accessKey"]);
				setContextMenuItem();
			}
			else {
				storeSettings({
					"editorName": editorName,
					"editorPath": editorPath,
					"toolbarButtonIcon": toolbarButtonIcon,
					"accessKey": accessKey,
				});
			}
			componentUtils.createDir(tmpDPath, "withExEditor", setTmpDirPath);
			setToolbarButton();
			setControlPanel();
		})();
	};
})();
