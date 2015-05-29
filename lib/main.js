/**
*	main.js
*/
(function() {
	"use strict";
	/* sdk */
	const { Cc, Ci, Cu } = require("chrome");
	const { OS, TextDecoder, TextEncoder } = Cu.import("resource://gre/modules/osfile.jsm", {});
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
		const SELECT_FILE = _("SelectFile");
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
		function onError(e) {
			console.error(e);
		}
		function initDirPath(path, callback) {
			OS.File.removeDir(path).then(function() {
				OS.File.makeDir(path).then(function() {
					return callback(path);
				}, onError);
			}, onError);
		}
		function makeDirPath(path, callback) {
			OS.File.makeDir(path).then(function() {
				return callback(path);
			}, onError);
		}
		function getFileNameFromUriPath(path, value) {
			return /\/((?:[a-zA-Z0-9\-_~!\$&'\(\)\*\+,;=:@]|%[0-9A-F]{2})+)(?:\.(?:[a-zA-Z0-9\-\_~!\$&'\(\)\*\+,;=:@]|%[0-9A-F]{2})+)*$/.test(path) ? path.match(/\/((?:[a-zA-Z0-9\-_~!\$&'\(\)\*\+,;=:@]|%[0-9A-F]{2})+)(?:\.(?:[a-zA-Z0-9\-\_~!\$&'\(\)\*\+,;=:@]|%[0-9A-F]{2})+)*$/)[1] : value;
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
		function parseDomFromString(res) {
			var domParser = Cc["@mozilla.org/xmlextras/domparser;1"].createInstance(Ci.nsIDOMParser);
			return domParser.parseFromString(res, "application/xml");
		}
		function workerPortEmit(worker, event, value) {
			worker.port.emit(event, value);
		}

		/* get tmpFile and edit contents text */
		function removeTmpFile() {	// but when ?
		}
		function editContent(res) {
			var tab = tabs.activeTab;
			tab.attach({
				contentScriptFile: CONTENTSCRIPT_JS,
				contentScriptOptions: {
					"value": res,
	 			},
			});
		}
		function storeTmpFile(res) {
			simpleStorage.storage.withExEditorTmpFiles[processId]["tmpFiles"][res["target"]] = res;
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
		function openTmpFileWithEditor(res) {
			var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile),
				process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess),
				filePath = res["filePath"];
			file.initWithPath(filePath);
			process.init(file);
			process.runAsync([editorPath], 1);
		}
		function createTmpFile(res) {
			var textEncoder = new TextEncoder(),
				filePath = OS.Path.join(tmpDirIdPath, res["fileName"]);
			res["filePath"] = filePath;
			res["fileURI"] = OS.Path.toFileURI(filePath);
			OS.File.writeAtomic(filePath, textEncoder.encode(res["value"]), { tmpPath: filePath + ".tmp" }).then(function() {
				storeTmpFile(res);
				openTmpFileWithEditor(res);
			}, onError);
		}
		function onEditMode(res) {
			/^(?:application\/(?:(?:[a-zA-Z0-9\.\-_]+\+)?json|(?:ecm|jav)ascript)|text\/(?!(?:ht|x)ml)[a-zA-Z0-9\.\-_]+)$/.test(res["type"]) && (res["value"] = parseDomFromString(res["value"]).documentElement.firstChild.nodeValue);
			createTmpFile(res);
		}
		function onViewMode(res) {
			!/.*\.txt$/.test(res["fileName"]) && (res["fileName"] = res["fileName"] + ".txt");
			createTmpFile(res);
		}
		function getSource(activeTab) {
			return Request({
				url: activeTab.url,
				contentType: activeTab.contentType,
				onComplete: function(res) {
					var target = getFileNameFromUriPath(urls.URL(activeTab.url).path, "index"), type = activeTab.contentType;
					onViewMode({
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
					onEditMode({
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
					onViewMode({
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
		function storeProcessIdTmpFiles() {
			simpleStorage.storage.withExEditorTmpFiles[processId] = {
				"processId": processId,
				"tmpDir": tmpDir,
				"tmpDirIdPath": tmpDirIdPath,
				"tmpFiles": {},
			};
		}
		function setTmpDirPath(res) {
			var existingWindows = windowUtils.windows().length;
			tmpDir = res;
			tmpDirIdPath = OS.Path.join(tmpDir, processId);
			existingWindows > 1 ? initDirPath(tempDirIdPath, storeProcessIdTmpFiles) : OS.File.makeDir(tmpDirIdPath).then(storeProcessIdTmpFiles, onError);
		}
		function setTmpDir() {
			var path = OS.Path.join(tmpDPath, "withExEditor");
			OS.File.exists(path).then(function(bool) {
				bool ? initDirPath(path, setTmpDirPath) : makeDirPath(path, setTmpDirPath);
			}, onError);
		}

		/* UI components and settings */
		function setContextMenuItem() {
			editorName !== "" && (contextMenuItem = contextMenu.Item({
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
			}));
			accessKey !== "" && (contextMenuItem.accessKey = accessKey);	// not working, accessKey does not appear on contextmenu...
		}
		function changeIcon(res) {
			toolbarButtonIcon = res["toolbarButtonIcon"];
			simpleStorage.storage.withExEditor["toolbarButtonIcon"] = toolbarButtonIcon;
			toolbarButton.icon = toolbarButtonIcon;
		}
		function storeUISettings(res) {
			res["toolbarButtonIcon"] && changeIcon(res);
			res["editorName"] && (editorName = res["editorName"], simpleStorage.storage.withExEditor["editorName"] = editorName);
			res["editorPath"] && (editorPath = res["editorName"], simpleStorage.storage.withExEditor["editorPath"] = editorPath);
			if(res["accessKey"]) {
				accessKey = res["accessKey"];
				simpleStorage.storage.withExEditor["accessKey"] = accessKey;
				contextMenuItem && (contextMenuItem.accessKey = accessKey);
			}
			else {
				accessKey = "";
				simpleStorage.storage.withExEditor["accessKey"] = "";
				contextMenuItem && contextMenuItem.accessKey && (contextMenuItem.accessKey = null);
			}
			if(editorName && editorPath) {
				contextMenuItem ? contextMenuItem.label = _("ViewSource", editorName) : setContextMenuItem();
				contextMenuItem && (contextMenuItem.accessKey = accessKey ? accessKey : null);
				toolbarButton.badge && (toolbarButton.badge = null, toolbarButton.badgeColor = null);
			}
			controlPanel.hide();
		}
		function storeEditor(res) {
			workerPortEmit(controlPanel, "editorValue", res);
			storeUISettings(res);
		}
		function promptForFile() {
			var nsIFilePicker = Ci.nsIFilePicker,
				filePicker = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
			filePicker.init(windowUtils.getMostRecentBrowserWindow(), _(SELECT_FILE), nsIFilePicker.modeOpen);
			filePicker.open(function() {
				var urlPath;
				if(filePicker && filePicker.fileURL && filePicker.file) {
					urlPath = filePicker.fileURL.path;
					storeEditor({
						"editorName": getFileNameFromUriPath(urlPath, "ExEditor"),
						"editorPath": filePicker.file.path,
						"toolbarButtonIcon": toolbarButtonIcon,
						"accessKey": accessKey,
					});
				}
			});
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
		function setControlPanel() {
			controlPanel = panel.Panel({
				contentURL: self.data.url("./html/controlPanel.html"),
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
				promptForFile();
				controlPanel.hide();
			});
			controlPanel.port.on("change", changeIcon);
			controlPanel.port.on("submit", storeUISettings);
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
			processId = ("withExEditor" + windowUtils.getMostRecentBrowserWindow().content.performance.now()).replace(/\./, "_");
			if(exEditor) {
				exEditor["editorName"] && (editorName = exEditor["editorName"]);
				exEditor["editorPath"] && (editorPath = exEditor["editorPath"]);
				exEditor["toolbarButtonIcon"] && (toolbarButtonIcon = exEditor["toolbarButtonIcon"]);
				exEditor["accessKey"] && (accessKey = exEditor["accessKey"]);
			}
			else {
				simpleStorage.storage.withExEditor = {
					"editorName": editorName,
					"editorPath": editorPath,
					"toolbarButtonIcon": toolbarButtonIcon,
					"accessKey": accessKey,
				};
			}
			!exEditorTmpFiles && (simpleStorage.storage.withExEditorTmpFiles = {});
			setTmpDir();
			setToolbarButton();
			setControlPanel();
			setContextMenuItem();
		})();
	};
})();
