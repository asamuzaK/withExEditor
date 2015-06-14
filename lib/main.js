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
	const componentUtils = require("./componentUtils");
	const LABEL = "withExEditor";

	var processId = (LABEL + windowUtils.getMostRecentBrowserWindow().content.performance.now()).replace(/\./, "_");

	exports.main = function(option, callback) {
		const CONTENTSCRIPT_JS = "./js/contentScript.js";
		const CONTEXTMENU_JS = "./js/contextMenu.js";
		const ICON = "./img/icon_color.svg";
		const ICON_GRAY = "./img/icon_gray.svg";
		const PREFS_FILE_NAME = "withExEditorFile";

		var tmpDir,
			processIdTmpDir,
			prefsFile,
			editorName = "",
			editorPath = "",
			toolbarButton,
			toolbarButtonIcon = ICON,
			controlPanel,
			contextMenuItem,
			accessKey = "e";

		/* modules */
		function getFileNameFromUriPath(uri, value) {
			var fileName;
			uri && (fileName = uri.match(/(?:.*\/)?((?:[a-zA-Z0-9\-_~!\$&'\(\)\*\+,;=:@]|%[0-9a-fA-F]{2})+)(?:\.(?:[a-zA-Z0-9\-\_~!\$&'\(\)\*\+,;=:@]|%[0-9a-fA-F]{2})+)*$/));
			return fileName ? fileName[1] : value ? value : uri;
		}
		function getFileExtention(type) {
			switch(true) {
				case /^(?:application\/(?:ecm|jav)|text\/(?:(?:x-)?jav|ecm))ascript$/.test(type):
					type = ".js"; break;
				case /^application\/ld\+json$/.test(type):
					type = ".jsonld"; break;
				case /^application\/(?!ld\+)(?:[a-zA-Z0-9\.\-_]+\+)?json$/.test(type):
					type = ".json"; break;
				case /^application\/mathml\+xml$/.test(type):
					type = ".mml"; break;
				case /^application\/xhtml\+xml$/.test(type):
					type = ".xhtml"; break;
				case (/^application\/(?!(?:math|xht)ml\+)(?:[a-zA-Z0-9\.\-_]+\+)?xml$/.test(type) || /^text\/xml$/.test(type)):
					type = ".xml"; break;
				case /^image\/svg\+xml$/.test(type):
					type = ".svg"; break;
				case /^text\/cache-manifest$/.test(type):
					type = ".appcache"; break;
				case /^text\/css$/.test(type):
					type = ".css"; break;
				case /^text\/csv$/.test(type):
					type = ".csv"; break;
				case /^text\/html$/.test(type):
					type = ".html"; break;
				case /^text\/markdown$/.test(type):
					type = ".md"; break;
				case /^text\/n3$/.test(type):
					type = ".n3"; break;
				case /^text\/turtle$/.test(type):
					type = ".ttl"; break;
				case /^text\/vcard$/.test(type):
					type = ".vcf"; break;
				default:
					type = ".txt";
			}
			return type;
		}
		function workerPortEmit(worker, event, value) {
			worker && event && value && worker.port.emit(event, value);
		}

		/* simpleStorage */
		function storeProcessIdTmpFiles() {
			processId && (simpleStorage.storage.withExEditorTmpFiles[processId] = {
				"processId": processId,
				"tmpDir": tmpDir,
				"processIdTmpDir": processIdTmpDir,
				"tmpFiles": {},
			});
		}
		function storeTmpFile(store) {
			var target;
			processId && store && (
				target = store["target"],
				target && (simpleStorage.storage.withExEditorTmpFiles[processId]["tmpFiles"][target] = store)
			);
		}
		function storeSettings(store) {
			store && (simpleStorage.storage.withExEditor = store);
		}
		function storeKeyValue(key, value) {
			key && (simpleStorage.storage.withExEditor[key] = value ? value : "");
		}

		/* get tmpFile and sync contents value (or text) with edited text */
		function syncContentsValue(target, value) {
			var tab = tabs.activeTab;
			tab && tab.attach({
				contentScriptFile: CONTENTSCRIPT_JS,
				contentScriptOptions: {
					"target": target ? target : "",
					"value": value ? value : "",
	 			},
			});
		}
		function getTmpFile(target) {
			var file;
			target && (
				file = simpleStorage.storage.withExEditorTmpFiles[processId]["tmpFiles"][target],
				file && Request({
					url: file["fileURI"],
					contentType: "text/plain",
					onComplete: function(res) {
						var value;
						res && (
							value = res.text || "",
							file["value"] = value,
							storeTmpFile(file),
							syncContentsValue(target, value)
						);
					},
				}).get()
			);
		}

		/* create tmpFile from contents and open with ExEditor */
		function openFileWithExEditor(filePath, fileURI) {
			var target;
			filePath && fileURI && (
				target = getFileNameFromUriPath(urls.URL(fileURI).path),
				target && (
					simpleStorage.storage.withExEditorTmpFiles[processId]["tmpFiles"][target]["filePath"] = filePath,
					simpleStorage.storage.withExEditorTmpFiles[processId]["tmpFiles"][target]["fileURI"] = fileURI,
					componentUtils.openFileWithApp(filePath, simplePrefs.prefs[PREFS_FILE_NAME])
				)
			);
		}
		function setTmpFile(res) {
			res && (
				storeTmpFile(res),
				componentUtils.createFile(processIdTmpDir, res["fileName"], res["value"], openFileWithExEditor)
			);
		}
		function setFileToBeTxt(fileName) {
			return fileName && (/.*\.txt$/.test(fileName) ? fileName : fileName + ".txt");
		}
		function getSource() {
			var activeTab = tabs.activeTab, url = activeTab.url, type = activeTab.contentType;
			return url && type && Request({
				url: url,
				contentType: type,
				onComplete: function(res) {
					var target = getFileNameFromUriPath(urls.URL(url).path, "index"),
						fileName = setFileToBeTxt(target + getFileExtention(type));
					res && target && type && fileName && setTmpFile({
						"mode": "viewSource",
						"fileName": fileName,
						"target": target,
						"type": type,
						"value": res.text ? res.text : "",
					});
				},
			}).get();
		}
		function parseContextStringToVariables(res) {
			var activeTab, type, target, fileName, value;
			if(res) {
				activeTab = tabs.activeTab;
				type = activeTab.contentType;
				switch(true) {
					case /^mode=editText;target=withExEditor[0-9]+_[0-9]+;value=.*/.test(res):
						target = res.match(/^mode=editText;target=(withExEditor[0-9]+_[0-9]+);.*/)[1];
						fileName = setFileToBeTxt(target);
						value = res.replace(/^mode=editText;target=withExEditor[0-9]+_[0-9]+;value=/, "");
						type && target && fileName && setTmpFile({
							"mode": "editText",
							"fileName": fileName,
							"target": target,
							"type": type,
							"value": value ? value : "",
						});
						break;
					case /^mode=viewSelection;value=.*/.test(res):
						target = getFileNameFromUriPath(urls.URL(activeTab.url).path, "index");
						fileName = setFileToBeTxt(target + getFileExtention(type));
						value = res.replace(/^mode=viewSelection;value=/, "");
						!/^(?:(?:application\/(?:(?:[a-zA-Z0-9\.\-_]+\+)?|image\/[a-zA-Z0-9\.\-_]+\+)xml|text\/(?:ht|x)ml))$/.test(type) && (value = value.replace(/^<(?:"(?:[.\n]*)?"|'(?:[.\n]*)?'|[^'"])*?>/, "").replace(/<\/(?:"(?:[.\n]*)?"|'(?:[.\n]*)?'|[^'"])*?>$/, ""));
						type && target && fileName && setTmpFile({
							"mode": "viewSelection",
							"fileName": fileName,
							"target": target,
							"type": type,
							"value": value ? value : "",
						});
						break;
					default:
						getSource();
				}
			}
		}

		/* tmpFiles settings */
		function setProcessIdTmpDir(path) {
			path && (
				processIdTmpDir = path,
				windowUtils.windows().length > 1 ? componentUtils.initDirPath(processIdTmpDir, storeProcessIdTmpFiles) : componentUtils.makeDirPath(processIdTmpDir, storeProcessIdTmpFiles)
			);
		}
		function setTmpDirPath(path) {
			path && (
				tmpDir = path,
				componentUtils.createDir(tmpDir, processId, setProcessIdTmpDir)
			);
		}

		/* UI components and settings */
		function setContextMenuItem() {
			contextMenuItem = contextMenu.Item({
				label: _("ViewSource", editorName),
				image: self.data.url(ICON_GRAY),
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
			res && (
				toolbarButtonIcon = res["toolbarButtonIcon"],
				storeKeyValue("toolbarButtonIcon", toolbarButtonIcon),
				toolbarButton.icon = toolbarButtonIcon
			);
		}
		function setUI(res) {
			if(res) {
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
					toolbarButton.badge && (
						toolbarButton.badge = null,
						toolbarButton.badgeColor = null
					)
				);
				controlPanel && controlPanel.isShowing && controlPanel.hide();
			}
		}
		function toggleTab(href) {
			if(href) {
				for(var tab, i = 0, l = tabs.length; i < l; i++) {
					if(tabs[i].url === href) {
						tab = tabs[i]; break;
					}
				}
				tab ? tab.activate() : tabs.open(href);
				controlPanel && controlPanel.isShowing && controlPanel.hide();
			}
		}
		function setControlPanel() {
			controlPanel = panel.Panel({
				contentURL: self.data.url("./html/controlPanel.html"),
				position: toolbarButton,
				onHide: function () {
					setUI({
						"editorName": editorName,
						"toolbarButtonIcon": toolbarButtonIcon,
						"accessKey": accessKey,
					});
				},
			});
			controlPanel.port.on("load", function() {
				workerPortEmit(controlPanel, "htmlValue", {
					"aboutAddons": _("SelectEditor"),
					"accessKeyLabel": _("SetAccessKey"),
					"accessKeyPlaceholder": _("AccessKey"),
					"controlPanelTitle": _("Settings"),
					"currentEditorName": _("CurrentEditor"),
					"editorLabel": _("EditorLabel"),
					"lang": _("Lang"),
					"renameEditorLabel": _("RenameEditor"),
					"selectIconLabel": _("SelectIcon"),
					"submit": _("Submit"),
				});
			});
			controlPanel.port.on("click", toggleTab);
			controlPanel.port.on("change", changeIcon);
			controlPanel.port.on("submit", setUI);
		}

		function showControlPanel() {
			workerPortEmit(controlPanel, "editorValue", {
				"editorName": editorName,
				"currentEditorName": _("CurrentEditor"),
				"toolbarButtonIcon": toolbarButtonIcon,
				"accessKey": accessKey,
			});
			controlPanel && !controlPanel.isShowing && controlPanel.show();
		}
		function setToolbarButton(stored) {
			toolbarButton = ActionButton({
				id: LABEL,
				label: LABEL,
				icon: toolbarButtonIcon,
				onClick: showControlPanel,
			});
			switch(true) {
				case editorName === "":
					toolbarButton.badge = "!";
					toolbarButton.badgeColor = "#C13832";
					break;
				case (!stored && editorName !== ""):
					toolbarButton.badge = "i";
					toolbarButton.badgeColor = "#00539F";
					break;
				default:
					toolbarButton.badge = null;
					toolbarButton.badgeColor = null;
			}
		}
		function replaceEditor(bool) {
			if(bool) {
				editorPath = prefsFile ? prefsFile : "";
				editorName = prefsFile ? getFileNameFromUriPath(urls.URL(urls.fromFilename(editorPath)).path, "ExEditor") : "";
			}
			else {
				editorPath = "";
				editorName = "";
				contextMenuItem = null;
				toolbarButton && (
					toolbarButton.badge = "!",
					toolbarButton.badgeColor = "rgb(255,0,0)"
				);
			}
			storeKeyValue("prefsFile", prefsFile);
			storeKeyValue("editorPath", editorPath);
			storeKeyValue("editorName", editorName);
			editorName !== "" && toolbarButton && (
				toolbarButton.badge = "i",
				toolbarButton.badgeColor = "rgb(0,0,255)"
			);
			showControlPanel();
		}
		function onPrefsChange(prefName) {
			prefName && (
				prefsFile = simplePrefs.prefs[prefName],
				componentUtils.fileIsExecutable(prefsFile).then(replaceEditor, componentUtils.onError)
			);
		}

		function setItems(bool) {
			var exEditor = simpleStorage.storage.withExEditor || false,
				exEditorTmpFiles = simpleStorage.storage.withExEditorTmpFiles || false;
			bool && prefsFile && exEditor && (
				storeKeyValue("prefsFile", prefsFile),
				exEditor = simpleStorage.storage.withExEditor
			);
			editorPath = bool && prefsFile ? prefsFile : "";
			editorName = bool && prefsFile ? exEditor && exEditor["editorPath"] && exEditor["editorPath"] === exEditor["prefsFile"] && exEditor["editorName"] ? exEditor["editorName"] : getFileNameFromUriPath(urls.URL(urls.fromFilename(prefsFile)).path, "ExEditor") : "";
			exEditor && (
				exEditor["toolbarButtonIcon"] && (toolbarButtonIcon = exEditor["toolbarButtonIcon"]),
				exEditor["accessKey"] && (accessKey = exEditor["accessKey"])
			);
			storeSettings({
				"prefsFile": prefsFile,
				"editorName": editorName,
				"editorPath": editorPath,
				"toolbarButtonIcon": toolbarButtonIcon,
				"accessKey": accessKey,
			});
			simplePrefs.on(PREFS_FILE_NAME, onPrefsChange);
			!exEditorTmpFiles && (simpleStorage.storage.withExEditorTmpFiles = {});
			componentUtils.createDir(tmpDPath, LABEL, setTmpDirPath);
			editorName !== "" && setContextMenuItem();
			setToolbarButton(exEditor ? true : false);
			setControlPanel();
		}

		// initialize (for debug)
		//simpleStorage.storage.withExEditor && (simpleStorage.storage.withExEditor = null);
		//simpleStorage.storage.withExEditorTmpFiles && (simpleStorage.storage.withExEditorTmpFiles = null);
		(function getPrefsFile() {
			prefsFile = simplePrefs.prefs[PREFS_FILE_NAME] || false;
			prefsFile ? componentUtils.fileIsExecutable(prefsFile).then(setItems, componentUtils.onError) : setItems(false);
		})();
	};

	exports.onUnload = function(reason) {
		var path = simpleStorage.storage.withExEditorTmpFiles[processId];
		path && path["processIdTmpDir"] && componentUtils.attemptRemoveDir(path["processIdTmpDir"]);
	};
})();
