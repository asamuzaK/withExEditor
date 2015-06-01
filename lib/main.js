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
	const simplePrefs = require('sdk/simple-prefs');
	const simpleStorage = require("sdk/simple-storage");
	const tabs = require("sdk/tabs");
	const tmpDPath = require("sdk/system").pathFor("TmpD");
	const urls = require("sdk/url");
	const windowUtils = require("sdk/window/utils");
	const componentUtils = require("componentUtils");

	exports.main = function(option, callback) {
		const CONTENTSCRIPT_JS = "./js/contentScript.js";
		const CONTEXTMENU_JS = "./js/contextMenu.js";
		const ICON = "./img/icon.svg";
		const ACCESSKEY_LABEL = _("AccessKeyLabel");
		const ACCESSKEY_PLACEHOLDER = _("AccessKeyPlaceholder");
		const CONTROL_PANEL_TITLE = _("ControlPanelTitle");
		const CURRENT_EDITOR_NAME = _("CurrentEditorName");
		const EDITOR_LABEL = _("EditorLabel");
		const GET_FILE_LABEL = _("GetFileLabel");
		const LABEL = "withExEditor";
		const LANG = _("HtmlLang");
		const RENAME_EDITOR_LABEL = _("RenameEditorLabel");
		const SELECT = _("Select");
		const SELECT_ICON_LABEL = _("SelectIconLabel");
		const SUBMIT = _("Submit");

		var processId = LABEL,
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
		function storeProcessIdTmpFiles() {
			simpleStorage.storage.withExEditorTmpFiles[processId] = {
				"processId": processId,
				"tmpDir": tmpDir,
				"tmpDirIdPath": tmpDirIdPath,
				"tmpFiles": {},
			};
		}
		function storeTmpFile(store) {
			simpleStorage.storage.withExEditorTmpFiles[processId]["tmpFiles"][store["target"]] = store;
		}
		function storeSettings(store) {
			simpleStorage.storage.withExEditor = store;
		}
		function storeKeyValue(key, value) {
			simpleStorage.storage.withExEditor[key] = value ? value : "";
		}

		/* get tmpFile and sync contents text */
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
		function setFileToBeTxt(fileName) {
			return /.*\.txt$/.test(fileName) ? fileName : fileName + ".txt";
		}
		function getSource(activeTab) {
			return Request({
				url: activeTab.url,
				contentType: activeTab.contentType,
				onComplete: function(res) {
					var target = getFileNameFromUriPath(urls.URL(activeTab.url).path, "index"),
						type = activeTab.contentType,
						fileName = target + getFileExtention(type);
					setTmpFile({
						"mode": "viewSource",
						"fileName": setFileToBeTxt(fileName),
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
					setTmpFile({
						"mode": "editText",
						"fileName": setFileToBeTxt(target),
						"target": target,
						"type": type,
						"value": value,
					});
					break;
				case /^mode=viewSelection;value=.*/.test(res):
					target = getFileNameFromUriPath(urls.URL(activeTab.url).path, "index");
					value = res.replace(/^mode=viewSelection;value=/, "");
					!/^(?:(?:application\/(?:(?:[a-zA-Z0-9\.\-_]+\+)?|image\/svg\+)xml|text\/(?:ht|x)ml))$/.test(type) && (value = componentUtils.parseDomFromString(value).documentElement.firstChild.nodeValue);
					setTmpFile({
						"mode": "viewSelection",
						"fileName": setFileToBeTxt(target + getFileExtention(type)),
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
			editorName && editorPath && (
				contextMenuItem ? contextMenuItem.label = _("ViewSource", editorName) : setContextMenuItem(),
				toolbarButton.badge && (toolbarButton.badge = null, toolbarButton.badgeColor = null)
			);
			controlPanel && controlPanel.hide();
		}
		function setControlPanel() {
			controlPanel = panel.Panel({
				contentURL: self.data.url("./html/controlPanel.html"),
				position: toolbarButton,
			});
			controlPanel.port.on("load", function() {
				workerPortEmit(controlPanel, "htmlValue", {
					"AccessKeyLabel": ACCESSKEY_LABEL,
					"AccessKeyPlaceholder": ACCESSKEY_PLACEHOLDER,
					"ControlPanelTitle": CONTROL_PANEL_TITLE,
					"CurrentEditorName": CURRENT_EDITOR_NAME,
					"EditorLabel": EDITOR_LABEL,
					"Lang": LANG,
					"RenameEditorLabel": RENAME_EDITOR_LABEL,
					"SelectIconLabel": SELECT_ICON_LABEL,
					"Submit": SUBMIT,
				});
			});
			controlPanel.port.on("click", toggleTab);
			controlPanel.port.on("change", changeIcon);
			controlPanel.port.on("submit", setUI);
		}

		function showControlPanel() {
			workerPortEmit(controlPanel, "editorValue", {
				"editorName": editorName,
				"toolbarButtonIcon": toolbarButtonIcon,
				"accessKey": accessKey,
			});
			controlPanel && controlPanel.show();
		}
		function setToolbarButton(stored) {
			toolbarButton = ActionButton({
				id: LABEL,
				label: LABEL,
				icon: toolbarButtonIcon,
				onClick: showControlPanel,
			});
			editorName === "" && (
				toolbarButton.badge = stored ? "i" : "!",
				toolbarButton.badgeColor = stored ? "rgb(0,255,0)" : "rgb(255,0,0)"
			);
		}
		function onPrefsChange(prefName) {
			var prefsFile = simplePrefs.prefs[prefName];
			editorPath = prefsFile;
			editorName = getFileNameFromUriPath(urls.URL(urls.fromFilename(editorPath)).path, "ExEditor");
			storeKeyValue("prefsFile", prefsFile);
			storeKeyValue("editorPath", editorPath);
			storeKeyValue("editorName", editorName);
			showControlPanel();
		}
		function toggleTab(href) {
			for(var tab, i = 0, l = tabs.length; i < l; i++) {
				if(tabs[i].url === href) {
					tab = tabs[i];
					break;
				}
			}
			tab ? tab.activate() : tabs.open(href);
			controlPanel && controlPanel.hide();
		}

		// initialize (for debug)
		simpleStorage.storage.withExEditor && (simpleStorage.storage.withExEditor = null);
		simpleStorage.storage.withExEditorTmpFiles && (simpleStorage.storage.withExEditorTmpFiles = null);
		(function setItems() {
			var prefsFile = simplePrefs.prefs["withExEditorFile"] || false,
				exEditor = simpleStorage.storage.withExEditor || false,
				exEditorTmpFiles = simpleStorage.storage.withExEditorTmpFiles || false;
			processId = (LABEL + windowUtils.getMostRecentBrowserWindow().content.performance.now()).replace(/\./, "_");
			if(prefsFile) {
				if(exEditor) {
					storeKeyValue("prefsFile", prefsFile);
					exEditor = simpleStorage.storage.withExEditor;
					editorName = exEditor["editorPath"] && exEditor["editorPath"] === exEditor["prefsFile"] && exEditor["editorName"] ? exEditor["editorName"] : getFileNameFromUriPath(urls.URL(urls.fromFilename(prefsFile)).path, "ExEditor");
					exEditor["toolbarButtonIcon"] && (toolbarButtonIcon = exEditor["toolbarButtonIcon"]);
					exEditor["accessKey"] && (accessKey = exEditor["accessKey"]);
				}
				else {
					editorName = getFileNameFromUriPath(urls.URL(urls.fromFilename(prefsFile)).path, "ExEditor");
				}
				editorPath = prefsFile;
			}
			else {
				editorName = "";
				editorPath = "";
				exEditor && (
					exEditor["toolbarButtonIcon"] && (toolbarButtonIcon = exEditor["toolbarButtonIcon"]),
					exEditor["accessKey"] && (accessKey = exEditor["accessKey"])
				);
			}
			storeSettings({
				"prefsFile": prefsFile,
				"editorName": editorName,
				"editorPath": editorPath,
				"toolbarButtonIcon": toolbarButtonIcon,
				"accessKey": accessKey,
			});
			simplePrefs.on("withExEditorFile", onPrefsChange);
			!exEditorTmpFiles && (simpleStorage.storage.withExEditorTmpFiles = {});
			componentUtils.createDir(tmpDPath, LABEL, setTmpDirPath);
			editorName !== "" && setContextMenuItem();
			setToolbarButton(exEditor ? true : false);
			setControlPanel();
		})();
	};
})();
