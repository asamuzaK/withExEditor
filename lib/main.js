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
	const all = require("sdk/core/promise").all;
	const browserWindows = require("sdk/windows").browserWindows;
	const contextMenu = require("sdk/context-menu");
	const events = require("sdk/system/events");
	const execFile = require("sdk/system/child_process").execFile;
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
	const VIEW_SOURCE = "ViewSource";
	const CONTENT_SCRIPT_JS = "./js/contentScript.js";
	const CONTEXT_MENU_JS = "./js/contextMenu.js";
	const CONTROL_PANEL = "./html/controlPanel.html";
	const CONTROL_PANEL_JS = "./js/controlPanel.js";
	const ICON = "./img/icon.svg";
	const ICON_DISABLED = "./img/icon.svg#off";
	const ICON_GRAY = "./img/icon.svg#gray";
	const PREFS_FILE_NAME = "WithExEditorPrefsFile";
	const PREFS_CMD_ARGS = "WithExEditorPrefsCmdArgs";
	const PREFS_ENV_DISPLAY = "WithExEditorPrefsEnvDisplay";
	const PREFS_ACCESS_KEY = "WithExEditorPrefsAccessKey";
	const PREFS_ENABLE_PB = "WithExEditorPrefsEnablePB";
	const PREFS_FORCE_REMOVE = "WithExEditorPrefsForceRemove";
	const PREFS_ON_DISABLE = "WithExEditorPrefsOnDisable";
	const TMP_FILES_DIR_NAME = "tmpFiles";
	const PB_TMP_FILES_DIR_NAME = "pbTmpFiles";
	const RECOMMEND_MIN_VERSION = "39.*";
	const PROCESS_ID = componentUtils.getProfName() || LABEL;

	/* variables */
	let storageId, tmpDir, processIdTmpDir,
		prefsFile, prefsCmdArgs, prefsEnvDisplay,
		prefsAccessKey, prefsEnablePb, prefsForceRemove,
		isPb, isEnabled,
		editorName = "", editorPath = "",
		toolbarButton, toolbarButtonIcon = ICON,
		controlPanel, contextMenuItem;

	/* error handling */
	const logOnError = e => e && console.error(e);
	const notifyOnError = e => {
		e && notify({
			title: `${ LABEL }: ${ _("Error") }`,
			text: e.toString()
		});
	};

	/* worker port emit */
	const workerPortEmit = (worker, evt, value) => {
		worker && evt && value && worker.port.emit(evt, value);
		return;
	};

	/* file utils */
	/**
	*	get file name from uri path
	*	@param {string} path - uri path
	*	@param {string} value - fallback value
	*	@returns {string} - file name
	*/
	const getFileNameFromUriPath = (path, value = LABEL) => {
		path = path && /(?:.*\/)?((?:[a-zA-Z0-9\-_~!\$&'\(\)\*\+,;=:@]|%[0-9a-fA-F]{2})+)(?:\.(?:[a-zA-Z0-9\-\_~!\$&'\(\)\*\+,;=:@]|%[0-9a-fA-F]{2})+)*$/.exec(path);
		return path && path[1] ? path[1] : value;
	};
	/**
	*	get file extension from content type
	*	@param {string} type - content type
	*	@returns {string} - file extention
	*/
	const getFileExtension = type => {
		switch(true) {
			case /^(?:application\/(?:ecm|jav)|text\/(?:(?:x-)?jav|ecm))ascript$/.test(type):
				type = ".js";
				break;
			case /^application\/ld\+json$/.test(type):
				type = ".jsonld";
				break;
			case /^application\/(?!ld\+)(?:[a-zA-Z0-9\.\-_]+\+)?json$/.test(type):
				type = ".json";
				break;
			case /^application\/mathml\+xml$/.test(type):
				type = ".mml";
				break;
			case /^application\/xhtml\+xml$/.test(type):
				type = ".xhtml";
				break;
			case /^application\/(?!(?:math|xht)ml\+)(?:[a-zA-Z0-9\.\-_]+\+)?xml$/.test(type) || /^text\/xml$/.test(type):
				type = ".xml";
				break;
			case /^image\/svg\+xml$/.test(type):
				type = ".svg";
				break;
			case /^text\/cache-manifest$/.test(type):
				type = ".appcache";
				break;
			case /^text\/css$/.test(type):
				type = ".css";
				break;
			case /^text\/csv$/.test(type):
				type = ".csv";
				break;
			case /^text\/html$/.test(type):
				type = ".html";
				break;
			case /^text\/markdown$/.test(type):
				type = ".md";
				break;
			case /^text\/n3$/.test(type):
				type = ".n3";
				break;
			case /^text\/turtle$/.test(type):
				type = ".ttl";
				break;
			case /^text\/vcard$/.test(type):
				type = ".vcf";
				break;
			default:
				type = ".txt";
		}
		return type;
	};

	/* simpleStorage */
	/**
	*	store process ID tmp files
	*	@param {Object} store - simpleStorage.storage.withExEditorTmpFiles
	*	@returns {Object} - simpleStorage.storage.withExEditorTmpFiles[PROCESS_ID]
	*/
	const storeProcessIdTmpFiles = store => {
		!store && (
			simpleStorage.storage.withExEditorTmpFiles = {},
			store = simpleStorage.storage.withExEditorTmpFiles
		);
		store[PROCESS_ID] = {
			"processId": PROCESS_ID,
			"tmpDir": tmpDir,
			"processIdTmpDir": processIdTmpDir,
			"tmpFiles": {},
			"pbTmpFiles": {}
		};
		return store[PROCESS_ID];
	};
	/**
	*	store data of the tmp file
	*	@param {Object} store
	*	@param {string} tmpFiles
	*/
	const storeTmpFile = (store, tmpFiles) => {
		let target;
		store && tmpFiles && storageId && storageId[tmpFiles] && (
			target = store["target"],
			target && (storageId[tmpFiles][target] = store)
		);
	};
	/**
	*	store editor settings
	*	@param {Object} store - json
	*	@returns {void}
	*/
	const storeSettings = store => {
		store && (simpleStorage.storage.withExEditor = store);
		return;
	};
	/**
	*	store pair of key / value
	*	@param {string} key
	*	@param {string} value
	*	@returns {void}
	*/
	const storeKeyValue = (key, value = "") => {
		key && (simpleStorage.storage.withExEditor[key] = value);
		return;
	};

	/* get tmpFile and sync contents value (or text) with edited text */
	/**
	*	sync contents value of the target
	*	@param {string} target - target ID
	*	@param {string} value - value to sync
	*/
	const syncContentsValue = (target = "", value = "") => {
		const tab = tabs.activeTab;
		tab && tab.attach({
			contentScriptFile: CONTENT_SCRIPT_JS,
			contentScriptOptions: {
				"target": target,
				"value": value
			}
		});
	};
	/**
	*	get target file from tmp files
	*	@param {string} target - target ID
	*	@returns {Object} - Response object
	*/
	const getTmpFile = target => {
		let tmpFiles, file;
		isEnabled && target && (
			tmpFiles = isPb ? PB_TMP_FILES_DIR_NAME : TMP_FILES_DIR_NAME,
			storageId && storageId[tmpFiles] && storageId[tmpFiles][target] && (
				file = storageId[tmpFiles][target],
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
	};

	/* create tmpFile from contents and open with ExEditor */
	/**
	*	open file with app
	*	@param {string} filePath - file path to open
	*	@param {string} fileURI - file uri
	*	@returns {Object} - child process object
	*/
	const openFileWithApp = (filePath, fileURI) => {
		let tmpFiles, target;
		isEnabled && filePath && fileURI && (
			tmpFiles = isPb ? PB_TMP_FILES_DIR_NAME : TMP_FILES_DIR_NAME,
			target = getFileNameFromUriPath(urls.URL(fileURI).path),
			storageId && storageId[tmpFiles] && storageId[tmpFiles][target] && (
				storageId[tmpFiles][target]["filePath"] = filePath,
				storageId[tmpFiles][target]["fileURI"] = fileURI
			),
			editorPath !== "" && all([componentUtils.fileIsFile(filePath), componentUtils.fileIsExecutable(editorPath)]).then(
				array => {
					let run;
					for(let i of array) {
						run = i;
						if(!run) {
							break;
						}
					}
					run && execFile(
						editorPath,
						/\S+/.test(prefsCmdArgs) ? [filePath].concat(prefsCmdArgs.match(/"[^"]?(?:(?:[^"]|\\"[^"]?(?:[^"]*[^"\s])?\\")*[^"\s])?"|[^"\s]+/g)) : [filePath],
						prefsEnvDisplay !== "" ? { env: { DISPLAY: prefsEnvDisplay } } : {},
						(error, stdout, stderr) => {
							error && (
								notifyOnError(error),
								logOnError(error)
							);
						}
					);
				}
			).catch(logOnError)
		);
	};
	/**
	*	set tmp file
	*	@param { object } res - json
	*/
	const setTmpFile = res => {
		let tmpFiles;
		isEnabled && res && (
			tmpFiles = isPb ? PB_TMP_FILES_DIR_NAME : TMP_FILES_DIR_NAME,
			storeTmpFile(res, tmpFiles),
			componentUtils.createFile([processIdTmpDir, tmpFiles, res["fileName"]], res["value"], openFileWithApp)
		);
	};
	/**
	*	request file and set tmp file
	*	@param {string} url
	*	@param {string} type
	*	@returns {Object|void} - Response object, or nothing if a local file
	*/
	const getSource = (url = tabs.activeTab.url, type = tabs.activeTab.contentType) => {
		const requestFile = () => {
			new Request({
				url: url,
				contentType: type,
				onComplete: res => {
					const target = getFileNameFromUriPath(urls.URL(url).path, "index");
					res && setTmpFile({
						"mode": VIEW_SOURCE,
						"fileName": target + getFileExtension(type),
						"target": target,
						"type": type,
						"value": res.text || ""
					});
				}
			}).get();
		};
		if(isEnabled && urls.isValidURI(url)) {
			const fileURI = urls.URL(url);
			if(fileURI.protocol === "file:") {
				try {
					const filePath = urls.toFilename(url);
					filePath && (
						storeTmpFile({
							"mode": VIEW_SOURCE,
							"target": getFileNameFromUriPath(fileURI.path, "index")
						}, isPb ? PB_TMP_FILES_DIR_NAME : TMP_FILES_DIR_NAME),
						openFileWithApp(filePath, fileURI.toString())
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
	};
	/**
	*	parse context string to variables
	*	@param {string} res - stringified values
	*/
	const parseContextStringToVariables = res => {
		if(res) {
			const activeTab = tabs.activeTab;
			const type = activeTab.contentType;
			const url = activeTab.url;
			let target, value;
			switch(true) {
				case /^mode=EditText;target=withExEditor[0-9]+_[0-9]+;value=.*/.test(res):
					target = /^mode=EditText;target=(withExEditor[0-9]+_[0-9]+);.*/.exec(res)[1];
					value = res.replace(/^mode=EditText;target=withExEditor[0-9]+_[0-9]+;value=/, "");
					setTmpFile({
						"mode": "EditText",
						"fileName": `${ target }.txt`,
						"target": target,
						"type": "text/plain",
						"value": value ? value : ""
					});
					break;
				case /^mode=ViewSelection;value=.*/.test(res):
					target = getFileNameFromUriPath(urls.URL(url).path, "index");
					value = res.replace(/^mode=ViewSelection;value=/, "");
					!/^(?:(?:application\/(?:(?:[a-zA-Z0-9\.\-_]+\+)?|image\/[a-zA-Z0-9\.\-_]+\+)xml|text\/(?:ht|x)ml))$/.test(type) && (
						value = value.replace(/^<(?:"(?:[.\n]*)?"|'(?:[.\n]*)?'|[^'"])*?>/, "").replace(/<\/(?:"(?:[.\n]*)?"|'(?:[.\n]*)?'|[^'"])*?>$/, "")
					);
					setTmpFile({
						"mode": "ViewSelection",
						"fileName": target + getFileExtension(type),
						"target": target,
						"type": type,
						"value": value ? value : ""
					});
					break;
				default:
					getSource(url, type);
			}
		}
	};

	/* tmpFiles settings */
	/**
	*	set process ID sub directory
	*	@param {string} path - directory path
	*/
	const setProcessIdSubDir = path => {
		path && (
			processIdTmpDir = path,
			componentUtils.createDir([processIdTmpDir, TMP_FILES_DIR_NAME]),
			componentUtils.createDir([processIdTmpDir, PB_TMP_FILES_DIR_NAME]),
			storageId = storeProcessIdTmpFiles(simpleStorage.storage.withExEditorTmpFiles)
		);
	};
	/**
	*	set process ID tmp directory
	*	@param {string} path - directory path
	*/
	const setProcessIdTmpDir = path => {
		path && (
			tmpDir = path,
			componentUtils.createDir([tmpDir, PROCESS_ID], setProcessIdSubDir)
		);
	};

	/* private browsing */
	/**
	* remove tmp files on last private browsing context existed
	*/
	const onLastPbContextExisted = () => {
		let path;
		processIdTmpDir && storageId && (
			path = componentUtils.joinPath([processIdTmpDir, PB_TMP_FILES_DIR_NAME]),
			componentUtils.initDirPath(
				path,
				prefsForceRemove ? { ignorePermissions: true } : null,
				notifyOnError
			),
			storageId["pbTmpFiles"] = {}
		);
	};
	/**
	*	set toobar button icon on active window
	*	@param {Object} win - window
	*/
	const onActiveWindow = win => {
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
	};

	/* UI components and settings */
	/**
	*	set context menu item
	*/
	const setContextMenuItem = () => {
		const Item = contextMenu.Item;
		contextMenuItem = new Item({
			label: _(VIEW_SOURCE, editorName),
			image: self.data.url(ICON_GRAY),
			context: contextMenu.PredicateContext(
				context => isEnabled && /^(?:application\/(?:(?:[a-zA-Z0-9\.\-_]+\+)?(?:json|xml)|(?:ecm|jav)ascript)|image\/[a-zA-Z0-9\.\-_]+\+xml|text\/[a-zA-Z0-9\.\-_]+)$/.test(context.documentType)
			),
			contentScriptFile: CONTEXT_MENU_JS,
			onMessage: res => {
				switch(true) {
					case /^(?:ViewS(?:ource|election)|EditText)$/.test(res):
						contextMenuItem.label = _(res, editorName); break;
					case /^withExEditor[^\.].*/.test(res):
						getTmpFile(res); break;
					default:
						parseContextStringToVariables(res);
				}
			}
		});
		prefsAccessKey !== "" && (contextMenuItem.accesskey = prefsAccessKey);
	};
	/**
	*	toggle tab and activate (or open)
	*	@param {string} href
	*/
	const toggleTab = href => {
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
	};
	/**
	*	change toolbar button icon
	*	@param {Object} res - json
	*/
	const changeIcon = res => {
		res && (
			toolbarButtonIcon = res["toolbarButtonIcon"],
			storeKeyValue("toolbarButtonIcon", toolbarButtonIcon),
			toolbarButton.icon = toolbarButtonIcon
		);
	};
	/**
	*	set UI
	*	@param {Object} res - json
	*/
	const setUI = res => {
		res && (
			res["toolbarButtonIcon"] && changeIcon(res),
			res["editorName"] && (
				editorName = res["editorName"],
				storeKeyValue("editorName", editorName)
			),
			editorName && editorPath && (
				contextMenuItem ? contextMenuItem.label = _(VIEW_SOURCE, editorName) : setContextMenuItem(),
				toolbarButton.badge && (
					toolbarButton.badge = null,
					toolbarButton.badgeColor = null
				)
			),
			controlPanel && controlPanel.isShowing && controlPanel.hide()
		);
	};
	/**
	*	set control panel
	*/
	const setControlPanel = () => {
		controlPanel = new Panel({
			contentURL: CONTROL_PANEL,
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
	};
	/**
	*	show control panel
	*/
	const showControlPanel = () => {
		workerPortEmit(controlPanel, "editorValue", {
			"editorName": editorName,
			"currentEditorName": _("CurrentEditor"),
			"toolbarButtonIcon": toolbarButtonIcon,
		});
		controlPanel && !controlPanel.isShowing && controlPanel.show();
	};
	/**
	*	set toolbar button
	*	@param {boolean} stored - settings are stored
	*/
	const setToolbarButton = stored => {
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
	};

	/* on prefs change */
	/**
	*	replace editor
	*	@param {boolean} bool - file is executable
	*/
	const replaceEditor = bool => {
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
	};
	/**
	*	check and set access key
	*	@param {string} k - must be a single character
	*	@returns {string}
	*/
	const checkAccessKey = k =>
		k && k.length === 1 ? k : "";
	/**
	*	switch on prefs change
	*	@param {string} prefName - prefs name
	*/
	const onPrefsChange = (prefName = "") => {
		switch(prefName) {
			case PREFS_FILE_NAME:
				prefsFile = simplePrefs.prefs[prefName];
				componentUtils.fileIsExecutable(prefsFile).then(replaceEditor, logOnError);
				break;
			case PREFS_CMD_ARGS:
				prefsCmdArgs = simplePrefs.prefs[prefName];
				break;
			case PREFS_ENV_DISPLAY:
				prefsEnvDisplay = simplePrefs.prefs[prefName];
				break;
			case PREFS_ACCESS_KEY:
				prefsAccessKey = checkAccessKey(simplePrefs.prefs[prefName]);
				prefsAccessKey !== "" && contextMenuItem && (
					contextMenuItem.accesskey = prefsAccessKey
				);
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
	};

	exports.main = (option, callback) => {
		/**
		*	prepare to set items, add listeners
		*	@param {boolean} bool - is all prepared
		*/
		const setItems = bool => {
			const exEditor = simpleStorage.storage.withExEditor || false;
			bool && prefsFile && (
				exEditor && storeKeyValue("prefsFile", prefsFile),
				editorPath = prefsFile,
				editorName = exEditor && exEditor["editorPath"] && exEditor["editorPath"] === exEditor["prefsFile"] && exEditor["editorName"] ? exEditor["editorName"] : getFileNameFromUriPath(urls.URL(urls.fromFilename(prefsFile)).path, "ExEditor")
			);
			exEditor && exEditor["toolbarButtonIcon"] && (toolbarButtonIcon = exEditor["toolbarButtonIcon"]);
			storeSettings({
				"prefsFile": prefsFile,
				"editorName": editorName,
				"editorPath": editorPath,
				"toolbarButtonIcon": toolbarButtonIcon
			});
			simplePrefs.on(PREFS_FILE_NAME, onPrefsChange);
			simplePrefs.on(PREFS_CMD_ARGS, onPrefsChange);
			simplePrefs.on(PREFS_ENV_DISPLAY, onPrefsChange);
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
		};
		/* load prefs settings */
		prefsFile = simplePrefs.prefs[PREFS_FILE_NAME] || "";
		prefsCmdArgs = simplePrefs.prefs[PREFS_CMD_ARGS] || "";
		prefsEnvDisplay = simplePrefs.prefs[PREFS_ENV_DISPLAY] || "";
		prefsAccessKey = checkAccessKey(simplePrefs.prefs[PREFS_ACCESS_KEY]);
		prefsEnablePb = simplePrefs.prefs[PREFS_ENABLE_PB] || false;
		prefsForceRemove = simplePrefs.prefs[PREFS_FORCE_REMOVE] || false;
		prefsFile ? componentUtils.fileIsExecutable(prefsFile).then(setItems, logOnError) : setItems(false);
	};

	exports.onUnload = reason => {
		/* remove temporary data */
		storageId && storageId["processIdTmpDir"] && (
			componentUtils.attemptRemoveDir(
				storageId["processIdTmpDir"],
				simplePrefs.prefs[PREFS_FORCE_REMOVE] ? { ignorePermissions: true } : null
			),
			simpleStorage.storage.withExEditorTmpFiles[PROCESS_ID] = null
		);
		/* initialize all settings when add-on is disabled */
		reason === "disable" && simplePrefs.prefs[PREFS_ON_DISABLE] === true && (
			simpleStorage.storage.withExEditor && (
				simpleStorage.storage.withExEditor = null
			),
			simpleStorage.storage.withExEditorTmpFiles && (
				simpleStorage.storage.withExEditorTmpFiles = null
			),
			simplePrefs.prefs[PREFS_FILE_NAME] && (
				simplePrefs.removeListener(PREFS_FILE_NAME, onPrefsChange),
				simplePrefs.prefs[PREFS_FILE_NAME] = ""
			),
			simplePrefs.prefs[PREFS_CMD_ARGS] && (
				simplePrefs.removeListener(PREFS_CMD_ARGS, onPrefsChange),
				simplePrefs.prefs[PREFS_CMD_ARGS] = ""
			),
			simplePrefs.prefs[PREFS_ENV_DISPLAY] && (
				simplePrefs.removeListener(PREFS_ENV_DISPLAY, onPrefsChange),
				simplePrefs.prefs[PREFS_ENV_DISPLAY] = ""
			),
			simplePrefs.prefs[PREFS_ACCESS_KEY] && (
				simplePrefs.removeListener(PREFS_ACCESS_KEY, onPrefsChange),
				simplePrefs.prefs[PREFS_ACCESS_KEY] = "e"
			),
			simplePrefs.prefs[PREFS_ENABLE_PB] && (
				simplePrefs.removeListener(PREFS_ENABLE_PB, onPrefsChange),
				simplePrefs.prefs[PREFS_ENABLE_PB] = false
			),
			simplePrefs.prefs[PREFS_FORCE_REMOVE] && (
				simplePrefs.removeListener(PREFS_FORCE_REMOVE, onPrefsChange),
				simplePrefs.prefs[PREFS_FORCE_REMOVE] = false
			),
			simplePrefs.prefs[PREFS_ON_DISABLE] = false,
			browserWindows.removeListener("activate", onActiveWindow),
			events.off("last-pb-context-exited", onLastPbContextExisted)
		);
	};
})();
