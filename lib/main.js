/**
*	main.js
*/
(() => {
	"use strict";
	/* sdk */
	const _ = require("sdk/l10n").get;
	const ActionButton = require("sdk/ui/button/action").ActionButton;
	const Panel = require("sdk/panel").Panel;
	const Request = require("sdk/request").Request;
	const browserWindows = require("sdk/windows").browserWindows;
	const contextMenu = require("sdk/context-menu");
	const events = require("sdk/system/events");
	const isPrivate = require("sdk/private-browsing").isPrivate;
	const notify = require("sdk/notifications").notify;
	const self = require("sdk/self");
	const simplePrefs = require("sdk/simple-prefs");
	const simpleStorage = require("sdk/simple-storage");
	const tabs = require("sdk/tabs");
	const tmpDPath = require("sdk/system").pathFor("TmpD");
	const urls = require("sdk/url");

	/* component utils */
	const componentUtils = require("./componentUtils");

	/* constants */
	const LABEL = "withExEditor";
	const CONTENT_SCRIPT_JS = "./js/contentScript.js";
	const CONTEXT_MENU_JS = "./js/contextMenu.js";
	const CONTROL_PANEL = "./html/controlPanel.html";
	const CONTROL_PANEL_JS = "./js/controlPanel.js";
	const ICON = "./img/icon.svg";
	const ICON_DISABLED = "./img/icon.svg#off";
	const ICON_GRAY = "./img/icon.svg#gray";
	const PREFS_FILE_NAME = "WithExEditorPrefsFile";
	const PREFS_ACCESS_KEY = "WithExEditorPrefsAccessKey";
	const PREFS_ENABLE_PB = "WithExEditorPrefsEnablePB";
	const PREFS_FORCE_REMOVE = "WithExEditorPrefsForceRemove";
	const PREFS_ENV_DISPLAY = "WithExEditorPrefsEnvDisplay";
	const TMP_FILES_DIR_NAME = "tmpFiles";
	const PB_TMP_FILES_DIR_NAME = "pbTmpFiles";
	const RECOMMEND_MIN_VERSION = "39.*";
	const PROCESS_ID = componentUtils.getProfName() || LABEL;

	exports.main = (option, callback) => {
		let storageTmpFilesProcessId, tmpDir, processIdTmpDir,
			prefsFile, prefsAccessKey, prefsEnablePb, prefsForceRemove, prefsEnvDisplay,
			isPb, isEnabled,
			editorName = "", editorPath = "",
			toolbarButton, toolbarButtonIcon = ICON, controlPanel, contextMenuItem;

		/* modules */
		function notifyOnError(e, v = null) {
			let title, text, reason;
			e && e.operation && v && (
				title = `${ LABEL }: ${ e.operation }`,
				reason = e.becauseExists ? _("BecauseExists") : e.becauseNoSuchFile ? _("BecauseNoSuchFile") : e.becauseClosed && _("BecauseClosed"),
				text = reason ? _(v, reason) : _(v)
			)
			notify({
				title: title ? title : `${ LABEL }: ${ _("Error") }`,
				text: text ? text : e && e.operation ? e.operation : e && e.message ? e.message : e.toString()
			});
		}
		function getFileNameFromUriPath(path, value) {
			const fileName = path && /(?:.*\/)?((?:[a-zA-Z0-9\-_~!\$&'\(\)\*\+,;=:@]|%[0-9a-fA-F]{2})+)(?:\.(?:[a-zA-Z0-9\-\_~!\$&'\(\)\*\+,;=:@]|%[0-9a-fA-F]{2})+)*$/.exec(path);
			return fileName ? fileName[1] : value ? value : path;
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
				case /^application\/(?!(?:math|xht)ml\+)(?:[a-zA-Z0-9\.\-_]+\+)?xml$/.test(type) || /^text\/xml$/.test(type):
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
		function workerPortEmit(worker, evt, value) {
			worker && evt && value && worker.port.emit(evt, value);
		}

		/* simpleStorage */
		function storeProcessIdTmpFiles() {
			simpleStorage.storage.withExEditorTmpFiles && (
				storageTmpFilesProcessId = {
					"processId": PROCESS_ID,
					"tmpDir": tmpDir,
					"processIdTmpDir": processIdTmpDir,
					"tmpFiles": {},
					"pbTmpFiles": {}
				},
				simpleStorage.storage.withExEditorTmpFiles[PROCESS_ID] = storageTmpFilesProcessId
			);
		}
		function storeTmpFile(store, tmpFiles) {
			let target;
			store && tmpFiles && storageTmpFilesProcessId && storageTmpFilesProcessId[tmpFiles] && (
				target = store["target"],
				target && (storageTmpFilesProcessId[tmpFiles][target] = store)
			);
		}
		function storeSettings(store) {
			store && (simpleStorage.storage.withExEditor = store);
		}
		function storeKeyValue(key, value = "") {
			key && (simpleStorage.storage.withExEditor[key] = value);
		}

		/* get tmpFile and sync contents value (or text) with edited text */
		function syncContentsValue(target = "", value = "") {
			const tab = tabs.activeTab;
			tab && tab.attach({
				contentScriptFile: CONTENT_SCRIPT_JS,
				contentScriptOptions: {
					"target": target,
					"value": value
				}
			});
		}
		function getTmpFile(target) {
			let tmpFiles, file;
			isEnabled && target && (
				tmpFiles = isPb ? PB_TMP_FILES_DIR_NAME : TMP_FILES_DIR_NAME,
				storageTmpFilesProcessId && storageTmpFilesProcessId[tmpFiles] && storageTmpFilesProcessId[tmpFiles][target] && (
					file = storageTmpFilesProcessId[tmpFiles][target],
					new Request({
						url: file["fileURI"],
						overrideMimeType: file["type"],
						onComplete: res => {
							let value;
							res && (
								value = res.text || "",
								file["value"] = value,
								storeTmpFile(file, tmpFiles),
								syncContentsValue(target, value)
							);
						}
					}).get()
				)
			);
		}

		/* create tmpFile from contents and open with ExEditor */
		function openFileWithExEditor(filePath, fileURI) {
			let tmpFiles, target;
			isEnabled && filePath && fileURI && editorPath !== "" && (
				tmpFiles = isPb ? PB_TMP_FILES_DIR_NAME : TMP_FILES_DIR_NAME,
				target = getFileNameFromUriPath(urls.URL(fileURI).path),
				storageTmpFilesProcessId && storageTmpFilesProcessId[tmpFiles] && storageTmpFilesProcessId[tmpFiles][target] && (
					storageTmpFilesProcessId[tmpFiles][target]["filePath"] = filePath,
					storageTmpFilesProcessId[tmpFiles][target]["fileURI"] = fileURI,
					componentUtils.openFileWithApp(filePath, editorPath, prefsEnvDisplay, notifyOnError)
				)
			);
		}
		function setTmpFile(res) {
			let tmpFiles;
			isEnabled && res && (
				tmpFiles = isPb ? PB_TMP_FILES_DIR_NAME : TMP_FILES_DIR_NAME,
				storeTmpFile(res, tmpFiles),
				componentUtils.createFile([processIdTmpDir, tmpFiles, res["fileName"]], res["value"], openFileWithExEditor)
			);
		}
		function getSource(url = tabs.activeTab.url, type = tabs.activeTab.contentType) {
			function requestFile() {
				new Request({
					url: url,
					contentType: type,
					onComplete: res => {
						const target = getFileNameFromUriPath(urls.URL(url).path, "index");
						res && setTmpFile({
							"mode": "viewSource",
							"fileName": target + getFileExtention(type),
							"target": target,
							"type": type,
							"value": res.text || ""
						});
					}
				}).get();
			}
			if(isEnabled && urls.isValidURI(url)) {
				const fileURI = urls.URL(url);
				if(fileURI.protocol === "file:") {
					try {
						const filePath = urls.toFilename(url);
						filePath && (
							storeTmpFile({
								"mode": "viewSource",
								"target": getFileNameFromUriPath(fileURI.path, "index")
							}, isPb ? PB_TMP_FILES_DIR_NAME : TMP_FILES_DIR_NAME),
							openFileWithExEditor(filePath, fileURI.toString())
						);
					}
					catch(e) {
						requestFile();
					}
				}
				else {
					requestFile();
				}
			}
		}
		function parseContextStringToVariables(res) {
			if(res) {
				const activeTab = tabs.activeTab;
				const type = activeTab.contentType;
				const url = activeTab.url;
				let target, value;
				switch(true) {
					case /^mode=editText;target=withExEditor[0-9]+_[0-9]+;value=.*/.test(res):
						target = /^mode=editText;target=(withExEditor[0-9]+_[0-9]+);.*/.exec(res)[1];
						value = res.replace(/^mode=editText;target=withExEditor[0-9]+_[0-9]+;value=/, "");
						setTmpFile({
							"mode": "editText",
							"fileName": `${ target }.txt`,
							"target": target,
							"type": "text/plain",
							"value": value ? value : ""
						});
						break;
					case /^mode=viewSelection;value=.*/.test(res):
						target = getFileNameFromUriPath(urls.URL(url).path, "index");
						value = res.replace(/^mode=viewSelection;value=/, "");
						!/^(?:(?:application\/(?:(?:[a-zA-Z0-9\.\-_]+\+)?|image\/[a-zA-Z0-9\.\-_]+\+)xml|text\/(?:ht|x)ml))$/.test(type) && (value = value.replace(/^<(?:"(?:[.\n]*)?"|'(?:[.\n]*)?'|[^'"])*?>/, "").replace(/<\/(?:"(?:[.\n]*)?"|'(?:[.\n]*)?'|[^'"])*?>$/, ""));
						setTmpFile({
							"mode": "viewSelection",
							"fileName": target + getFileExtention(type),
							"target": target,
							"type": type,
							"value": value ? value : ""
						});
						break;
					default:
						getSource(url, type);
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
			path && (
				tmpDir = path,
				componentUtils.createDir([tmpDir, PROCESS_ID], setProcessIdSubDir)
			);
		}

		/* UI components and settings */
		function setContextMenuItem() {
			contextMenuItem = contextMenu.Item({
				label: _("ViewSource", editorName),
				image: self.data.url(ICON_GRAY),
				context: contextMenu.PredicateContext(context => {
					return isEnabled && /^(?:application\/(?:(?:[a-zA-Z0-9\.\-_]+\+)?(?:json|xml)|(?:ecm|jav)ascript)|image\/[a-zA-Z0-9\.\-_]+\+xml|text\/[a-zA-Z0-9\.\-_]+)$/.test(context.documentType);
				}),
				contentScriptFile: CONTEXT_MENU_JS,
				onMessage: res => {
					switch(true) {
						case /^(?:ViewS(?:ource|election)|EditText)$/.test(res):
							contextMenuItem.label = _(res, editorName); break;
						case /^withExEditor.*/.test(res):
							getTmpFile(res); break;
						default:
							parseContextStringToVariables(res);
					}
				}
			});
			prefsAccessKey !== "" && (contextMenuItem.accesskey = prefsAccessKey);
		}
		function setControlPanel() {
			controlPanel = new Panel({
				contentURL: self.data.url(CONTROL_PANEL),
				contentScriptFile: CONTROL_PANEL_JS,
				contentScriptWhen: "ready",
				position: toolbarButton,
				onHide: () => {
					setUI({
						"editorName": editorName,
						"toolbarButtonIcon": toolbarButtonIcon,
					});
				}
			});
			controlPanel.port.on("load", () => {
				workerPortEmit(controlPanel, "htmlValue", {
					"currentEditorName": _("CurrentEditor"),
					"editorLabel": _("EditorLabel"),
					"lang": _("Lang"),
					"submit": _("Submit"),
					/* back compat localize attributes prior to Fx39 */
					"compat": componentUtils.compareVersion(RECOMMEND_MIN_VERSION),
					"iconColorLabel": _("IconColorLable.ariaLabel"),
					"iconColorAlt": _("IconColor.alt"),
					"iconGrayLabel": _("IconGrayLable.ariaLabel"),
					"iconGrayAlt": _("IconGray.alt"),
					"iconWhiteLabel": _("IconWhiteLable.ariaLabel"),
					"iconWhiteAlt": _("IconWhite.alt"),
					"currentEditorNameLabel": _("CurrentEditorName.ariaLabel")
				});
			});
			controlPanel.port.on("click", toggleTab);
			controlPanel.port.on("change", changeIcon);
			controlPanel.port.on("submit", setUI);
		}
		function setToolbarButton(stored) {
			toolbarButton = new ActionButton({
				id: LABEL,
				label: LABEL,
				icon: toolbarButtonIcon,
				onClick: showControlPanel
			});
			switch(true) {
				case editorName === "":
					toolbarButton.badge = "!";
					toolbarButton.badgeColor = "#c13832";
					break;
				case !stored && editorName !== "":
					toolbarButton.badge = "i";
					toolbarButton.badgeColor = "#00539f";
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
			});
			controlPanel && !controlPanel.isShowing && controlPanel.show();
		}
		function toggleTab(href) {
			if(href) {
				let tab;
				for(let i of tabs) {
					if(i.url === href) {
						tab = i; break;
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
			res && (
				res["toolbarButtonIcon"] && changeIcon(res),
				res["editorName"] && (
					editorName = res["editorName"],
					storeKeyValue("editorName", editorName)
				),
				editorName && editorPath && (
					contextMenuItem ? contextMenuItem.label = _("ViewSource", editorName) : setContextMenuItem(),
					toolbarButton.badge && (
						toolbarButton.badge = null,
						toolbarButton.badgeColor = null
					)
				),
				controlPanel && controlPanel.isShowing && controlPanel.hide()
			);
		}

		/* private browsing */
		function onLastPbContextExisted() {
			let path;
			processIdTmpDir && storageTmpFilesProcessId && (
				path = componentUtils.joinPath([processIdTmpDir, PB_TMP_FILES_DIR_NAME]),
				componentUtils.initDirPath(path, prefsForceRemove ? { ignorePermissions: true } : null, notifyOnError, "NotifyOnFailRemoveTmpFilesBecause"),
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
			bool ? (
				editorPath = prefsFile ? prefsFile : "",
				editorName = prefsFile ? getFileNameFromUriPath(urls.URL(urls.fromFilename(editorPath)).path, "ExEditor") : ""
			) : (
				editorPath = "",
				editorName = "",
				contextMenuItem = null,
				toolbarButton && (
					toolbarButton.badge = "!",
					toolbarButton.badgeColor = "#c13832"
				)
			);
			storeKeyValue("prefsFile", prefsFile);
			storeKeyValue("editorPath", editorPath);
			storeKeyValue("editorName", editorName);
			editorName !== "" && toolbarButton && (
				toolbarButton.badge = "i",
				toolbarButton.badgeColor = "#00539f"
			);
			showControlPanel();
		}
		function checkAccessKey(k) {
			return k && k.length === 1 ? k : "";
		}
		function onPrefsChange(prefName) {
			if(prefName) {
				switch(prefName) {
					case PREFS_FILE_NAME:
						prefsFile = simplePrefs.prefs[prefName];
						componentUtils.fileIsExecutable(prefsFile).then(replaceEditor, componentUtils.onError);
						break;
					case PREFS_ACCESS_KEY:
						prefsAccessKey = checkAccessKey(simplePrefs.prefs[prefName]);
						prefsAccessKey !== "" && contextMenuItem && (contextMenuItem.accesskey = prefsAccessKey);
						break;
					case PREFS_ENABLE_PB:
						prefsEnablePb = simplePrefs.prefs[prefName];
						onActiveWindow(browserWindows.activeWindow);
						break;
					case PREFS_FORCE_REMOVE:
						prefsForceRemove = simplePrefs.prefs[prefName];
						break;
					case PREFS_ENV_DISPLAY:
						prefsEnvDisplay = simplePrefs.prefs[prefName];
						break;
					default:
				}
			}
		}

		/* prepare to set items, add listeners */
		function setItems(bool) {
			const exEditor = simpleStorage.storage.withExEditor || false;
			bool && prefsFile && exEditor && storeKeyValue("prefsFile", prefsFile);
			editorPath = bool && prefsFile ? prefsFile : "";
			editorName = bool && prefsFile ? exEditor && exEditor["editorPath"] && exEditor["editorPath"] === exEditor["prefsFile"] && exEditor["editorName"] ? exEditor["editorName"] : getFileNameFromUriPath(urls.URL(urls.fromFilename(prefsFile)).path, "ExEditor") : "";
			exEditor && exEditor["toolbarButtonIcon"] && (toolbarButtonIcon = exEditor["toolbarButtonIcon"]);
			storeSettings({
				"prefsFile": prefsFile,
				"editorName": editorName,
				"editorPath": editorPath,
				"toolbarButtonIcon": toolbarButtonIcon
			});
			simplePrefs.on(PREFS_FILE_NAME, onPrefsChange);
			simplePrefs.on(PREFS_ACCESS_KEY, onPrefsChange);
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
		(() => {
			prefsAccessKey = checkAccessKey(simplePrefs.prefs[PREFS_ACCESS_KEY]);
			prefsEnablePb = simplePrefs.prefs[PREFS_ENABLE_PB] || false;
			prefsForceRemove = simplePrefs.prefs[PREFS_FORCE_REMOVE] || false;
			prefsEnvDisplay = simplePrefs.prefs[PREFS_ENV_DISPLAY] || "";
			prefsFile = simplePrefs.prefs[PREFS_FILE_NAME] || false;
			prefsFile ? componentUtils.fileIsExecutable(prefsFile).then(setItems, componentUtils.onError) : setItems(false);
		})();
	};

	/* remove temporary data */
	exports.onUnload = (reason) => {
		let path;
		simpleStorage.storage.withExEditorTmpFiles && (
			path = simpleStorage.storage.withExEditorTmpFiles[PROCESS_ID],
			path && (
				path["processIdTmpDir"] && componentUtils.attemptRemoveDir(path["processIdTmpDir"], simplePrefs.prefs[PREFS_FORCE_REMOVE] ? { ignorePermissions: true } : null),
				simpleStorage.storage.withExEditorTmpFiles[PROCESS_ID] = null
			)
		);
	};
})();
