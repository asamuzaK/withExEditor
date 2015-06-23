/**
*	main.js
*/
(function() {
	"use strict";
	/* sdk */
	const _ = require("sdk/l10n").get;
	const { ActionButton } = require("sdk/ui/button/action");
	const Request = require("sdk/request").Request;
	const browserWindows = require("sdk/windows").browserWindows;
	const contextMenu = require("sdk/context-menu");
	const events = require("sdk/system/events");
	const isPrivate = require("sdk/private-browsing").isPrivate;
	const notifications = require("sdk/notifications");
	const panel = require("sdk/panel");
	const self = require("sdk/self");
	const simplePrefs = require('sdk/simple-prefs');
	const simpleStorage = require("sdk/simple-storage");
	const tabs = require("sdk/tabs");
	const tmpDPath = require("sdk/system").pathFor("TmpD");
	const urls = require("sdk/url");

	/* component utils */
	const componentUtils = require("./componentUtils");

	/* variables */
	const LABEL = "withExEditor";
	const CONTENTSCRIPT_JS = "./js/contentScript.js";
	const CONTEXTMENU_JS = "./js/contextMenu.js";
	const ICON = "./img/icon_color.svg";
	const ICON_DISABLED = "./img/icon_disabled.svg";
	const ICON_GRAY = "./img/icon_gray.svg";
	const PREFS_FILE_NAME = "withExEditorFile";
	const PREFS_FORCE_REMOVE = "withExEditorForceRemove";
	const PREFS_ENABLE_PB = "withExEditorEnablePB";
	const TMP_FILES_DIR_NAME = "tmpFiles";
	const PB_TMP_FILES_DIR_NAME = "pbTmpFiles";

	var processId = (function() {
			return LABEL + "_" + (componentUtils.getProfName() || (new Date().getTime()));
		})();

	exports.main = function(option, callback) {
		var storageTmpFilesProcessId,
			tmpDir,
			processIdTmpDir,
			prefsFile,
			prefsEnablePb,
			prefsForceRemove,
			isPb,
			isEnabled,
			editorName = "",
			editorPath = "",
			toolbarButton,
			toolbarButtonIcon = ICON,
			controlPanel,
			contextMenuItem,
			accessKey = "e";

		/* modules */
		function getFileNameFromUriPath(uri, value) {
			var fileName = uri && /(?:.*\/)?((?:[a-zA-Z0-9\-_~!\$&'\(\)\*\+,;=:@]|%[0-9a-fA-F]{2})+)(?:\.(?:[a-zA-Z0-9\-\_~!\$&'\(\)\*\+,;=:@]|%[0-9a-fA-F]{2})+)*$/.exec(uri);
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
			processId && simpleStorage.storage.withExEditorTmpFiles && (
				simpleStorage.storage.withExEditorTmpFiles[processId] = {
					"processId": processId,
					"tmpDir": tmpDir,
					"processIdTmpDir": processIdTmpDir,
					"tmpFiles": {},
					"pbTmpFiles": {},
				},
				storageTmpFilesProcessId = simpleStorage.storage.withExEditorTmpFiles[processId]
			);
		}
		function storeTmpFile(store, tmpFiles) {
			var target;
			store && tmpFiles && storageTmpFilesProcessId && storageTmpFilesProcessId[tmpFiles] && (
				target = store["target"],
				target && (storageTmpFilesProcessId[tmpFiles][target] = store)
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
		function getTmpFile(target, tmpFiles) {
			var file;
			target && tmpFiles && storageTmpFilesProcessId && storageTmpFilesProcessId[tmpFiles] && storageTmpFilesProcessId[tmpFiles][target] && (
				file = storageTmpFilesProcessId[tmpFiles][target],
				Request({
					url: file["fileURI"],
					contentType: "text/plain",
					onComplete: function(res) {
						var value;
						res && (
							value = res.text || "",
							file["value"] = value,
							storeTmpFile(file, tmpFiles),
							syncContentsValue(target, value)
						);
					},
				}).get()
			);
		}

		/* create tmpFile from contents and open with ExEditor */
		function openFileWithExEditor(filePath, fileURI) {
			var tmpFiles, target;
			processId && isEnabled && filePath && fileURI && (
				tmpFiles = isPb ? PB_TMP_FILES_DIR_NAME : TMP_FILES_DIR_NAME,
				target = getFileNameFromUriPath(urls.URL(fileURI).path),
				target && storageTmpFilesProcessId && storageTmpFilesProcessId[tmpFiles] && storageTmpFilesProcessId[tmpFiles][target] && (
					storageTmpFilesProcessId[tmpFiles][target]["filePath"] = filePath,
					storageTmpFilesProcessId[tmpFiles][target]["fileURI"] = fileURI,
					componentUtils.openFileWithApp(filePath, simplePrefs.prefs[PREFS_FILE_NAME])
				)
			);
		}
		function setTmpFile(res) {
			var tmpFiles;
			res && isEnabled && (
				tmpFiles = isPb ? PB_TMP_FILES_DIR_NAME : TMP_FILES_DIR_NAME,
				storeTmpFile(res, tmpFiles),
				componentUtils.createFile([processIdTmpDir, tmpFiles, res["fileName"]], res["value"], openFileWithExEditor)
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
		function setProcessIdSubDir(path) {
			path && (
				processIdTmpDir = path,
				componentUtils.makeDirPath(componentUtils.joinPath([processIdTmpDir, TMP_FILES_DIR_NAME])),
				componentUtils.makeDirPath(componentUtils.joinPath([processIdTmpDir, PB_TMP_FILES_DIR_NAME])),
				storeProcessIdTmpFiles()
			);
		}
		function setProcessIdTmpDir(path) {
			processId && path && (
				tmpDir = path,
				componentUtils.createDir([tmpDir, processId], setProcessIdSubDir)
			);
		}

		/* UI components and settings */
		function setContextMenuItem() {
			contextMenuItem = contextMenu.Item({
				label: _("ViewSource", editorName),
				image: self.data.url(ICON_GRAY),
				context: contextMenu.PredicateContext(function(context) {
					return isEnabled && /^(?:application\/(?:(?:[a-zA-Z0-9\.\-_]+\+)?(?:json|xml)|(?:ecm|jav)ascript)|image\/[a-zA-Z0-9\.\-_]+\+xml|text\/[a-zA-Z0-9\.\-_]+)$/.test(context.documentType);
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
					"currentEditorName": _("CurrentEditor"),
					"editorLabel": _("EditorLabel"),
					"lang": _("Lang"),
					"submit": _("Submit"),
				});
			});
			controlPanel.port.on("click", toggleTab);
			controlPanel.port.on("change", changeIcon);
			controlPanel.port.on("submit", setUI);
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
			onActiveWindow(browserWindows.activeWindow);
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

		/* private browsing */
		function notifyOnFail(e) {
			var reason = e.becauseExists ? _("BecauseExists") : becauseNoSuchFile ? _("BecauseNoSuchFile") : becauseClosed && _("BecauseClosed");
			notifications.notify({
				title: e.operation ? e.operation : _("Error"),
				text: reason ? _("NotifyOnFailBecause", reason) : _("NotifyOnFail"),
			});
		}
		function onLastPbContextExisted() {
			var path, option = prefsForceRemove ? { ignorePermissions: true, } : null;
			processIdTmpDir && storageTmpFilesProcessId && (
				path = componentUtils.joinPath([processIdTmpDir, PB_TMP_FILES_DIR_NAME]),
				componentUtils.initDirPath(path, option, notifyOnFail),
				storageTmpFilesProcessId["pbTmpFiles"] = {}
			);
		}
		function onActiveWindow(win) {
			isPb = isPrivate(win);
			isEnabled = !isPb || isPb && prefsEnablePb;
			toolbarButton && (
				isEnabled ? (
					toolbarButton.disabled = false,
					toolbarButton.icon = toolbarButtonIcon
				) : (
					toolbarButton.disabled = true,
					toolbarButton.icon = ICON_DISABLED
				)
			);
		}

		/* on prefs change */
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
					toolbarButton.badgeColor = "#C13832"
				);
			}
			storeKeyValue("prefsFile", prefsFile);
			storeKeyValue("editorPath", editorPath);
			storeKeyValue("editorName", editorName);
			editorName !== "" && toolbarButton && (
				toolbarButton.badge = "i",
				toolbarButton.badgeColor = "#00539F"
			);
			showControlPanel();
		}
		function onPrefsChange(prefName) {
			if(prefName) {
				switch(prefName) {
					case PREFS_FILE_NAME:
						prefsFile = simplePrefs.prefs[prefName];
						componentUtils.fileIsExecutable(prefsFile).then(replaceEditor, componentUtils.onError);
						break;
					case PREFS_ENABLE_PB:
						prefsEnablePb = simplePrefs.prefs[prefName];
						onActiveWindow(browserWindows.activeWindow);
						break;
					case PREFS_FORCE_REMOVE:
						prefsForceRemove = simplePrefs.prefs[prefName];
						break;
					default:
				}
			}
		}

		/* prepare to set items, add listeners */
		function setItems(bool) {
			var exEditor = simpleStorage.storage.withExEditor || false;
			bool && prefsFile && exEditor && storeKeyValue("prefsFile", prefsFile);
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
			simplePrefs.on(PREFS_ENABLE_PB, onPrefsChange);
			simplePrefs.on(PREFS_FORCE_REMOVE, onPrefsChange);
			browserWindows.on("activate", onActiveWindow);
			events.on("last-pb-context-exited", onLastPbContextExisted);
			simpleStorage.storage.withExEditorTmpFiles = {};
			componentUtils.createDir([tmpDPath, LABEL], setProcessIdTmpDir);
			editorName !== "" && setContextMenuItem();
			setToolbarButton(exEditor ? true : false);
			setControlPanel();
		}

		// initialize (for debug)
		//simpleStorage.storage.withExEditor && (simpleStorage.storage.withExEditor = null);
		//simpleStorage.storage.withExEditorTmpFiles && (simpleStorage.storage.withExEditorTmpFiles = null);
		(function getPrefsFile() {
			prefsEnablePb = simplePrefs.prefs[PREFS_ENABLE_PB] || false;
			prefsForceRemove = simplePrefs.prefs[PREFS_FORCE_REMOVE] || false;
			prefsFile = simplePrefs.prefs[PREFS_FILE_NAME] || false;
			prefsFile ? componentUtils.fileIsExecutable(prefsFile).then(setItems, componentUtils.onError) : setItems(false);
		})();
	};

	/* remove temporary data */
	exports.onUnload = function(reason) {
		var path, option = simplePrefs.prefs[PREFS_FORCE_REMOVE] ? { ignorePermissions: true, } : null;
		simpleStorage.storage.withExEditorTmpFiles && processId && (
			path = simpleStorage.storage.withExEditorTmpFiles[processId],
			path && (
				path["processIdTmpDir"] && componentUtils.attemptRemoveDir(path["processIdTmpDir"], option),
				simpleStorage.storage.withExEditorTmpFiles[processId] = null
			)
		);
	};
})();
