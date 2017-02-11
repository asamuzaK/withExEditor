/**
 * background.js
 */
"use strict";
{
  /* api */
  const {browserAction, contextMenus, i18n, runtime, tabs, windows} = browser;
  const storage = browser.storage.local;

  /* constants */
  const CONTENT_GET = "getContent";
  const CONTEXT_MENU = "contextMenu";
  const EDITOR_CONFIG = "editorConfigPath";
  const EDITOR_CONFIG_GET = "getEditorConfig";
  const EDITOR_CONFIG_RES = "resEditorConfig";
  const EDITOR_FILE_NAME = "editorFileName";
  const EDITOR_LABEL = "editorLabel";
  const ENABLE_PB = "enablePB";
  const FILE_EXT = "fileExt";
  const FILE_EXT_PATH = "../data/fileExt.json";
  const HOST = "withexeditorhost";
  const ICON = "./img/icon.svg";
  const ICON_COLOR = "buttonIcon";
  const ICON_GRAY = "buttonIconGray";
  const ICON_PATH = "iconPath";
  const ICON_WHITE = "buttonIconWhite";
  const IS_ENABLED = "isEnabled";
  const IS_EXECUTABLE = "isExecutable";
  const KEY_ACCESS = "accessKey";
  const KEY_EDITOR = "editorShortCut";
  const KEY_OPTIONS = "optionsShortCut";
  const LABEL = "withExEditor";
  const LOCAL_FILE_VIEW = "viewLocalFile";
  const MENU_ENABLED = "menuEnabled";
  const MODE_EDIT = "modeEditText";
  const MODE_MATHML = "modeViewMathML";
  const MODE_SELECTION = "modeViewSelection";
  const MODE_SOURCE = "modeViewSource";
  const MODE_SVG = "modeViewSVG";
  const NS_URI = "nsUri";
  const NS_URI_PATH = "../data/nsUri.json";
  const ONLY_EDITABLE = "enableOnlyEditable";
  const OPTIONS_OPEN = "openOptions";
  const PORT_CONTENT = "portContent";
  const PROCESS_CHILD = "childProcess";
  const STORAGE_SET = "setStorage";
  const TEXT_SYNC = "syncText";
  const TMP_FILES_PB_REMOVE = "removePrivateTmpFiles";
  const TMP_FILE_CREATE = "createTmpFile";
  const TMP_FILE_DATA_PORT = "portTmpFileData";
  const TMP_FILE_GET = "getTmpFile";
  const TMP_FILE_RES = "resTmpFile";
  const WARN_COLOR = "#C13832";
  const WARN_TEXT = "!";
  const VARS_SET = "setVars";

  /* variables */
  const vars = {
    [IS_ENABLED]: false,
    [KEY_ACCESS]: "e",
    [KEY_EDITOR]: true,
    [KEY_OPTIONS]: true,
    [ONLY_EDITABLE]: false,
  };

  const varsL = {
    [EDITOR_LABEL]: "",
    [ENABLE_PB]: false,
    [ICON_PATH]: `${ICON}#gray`,
    [IS_EXECUTABLE]: false,
    [MENU_ENABLED]: false,
    [MODE_MATHML]: "",
    [MODE_SOURCE]: "",
    [MODE_SVG]: "",
  };

  /**
   * log error
   * @param {!Object} e - Error
   * @returns {boolean} - false
   */
  const logError = e => {
    console.error(e);
    return false;
  };

  /**
   * log warn
   * @param {Object} msg - message
   * @returns {boolean} - false
   */
  const logWarn = msg => {
    msg && console.warn(msg);
    return false;
  };

  /**
   * is string
   * @param {*} o - object to check
   * @returns {boolean} - result
   */
  const isString = o => typeof o === "string" || o instanceof String;

  /**
   * stringify positive integer
   * @param {number} i - integer
   * @param {boolean} zero - treat 0 as a positive integer
   * @returns {?string} - stringified integer
   */
  const stringifyPositiveInt = (i, zero = false) =>
    Number.isSafeInteger(i) && (zero && i >= 0 || i > 0) && `${i}` || null;

  /* windows */
  /**
   * check if any of windows is incognito
   * @returns {boolean} - result
   */
  const checkWindowIncognito = async () => {
    const windowIds = await windows.getAll({windowTypes: ["normal"]});
    let incog;
    if (windowIds && windowIds.length) {
      for (const windowId of windowIds) {
        incog = windowId.incognito;
        if (incog) {
          break;
        }
      }
    }
    return incog || false;
  };

  /* port */
  /* native application host */
  const host = runtime.connectNative(HOST);

  /**
   * port message to host
   * @param {*} msg - message
   * @returns {void}
   */
  const portHostMsg = async msg => {
    msg && host && host.postMessage(msg);
  };

  /* storage */
  /**
   * set storage
   * @param {Object} obj - object to store
   * @returns {Object} - ?Promise.<void>
   */
  const setStorage = async obj => obj && storage.set(obj) || null;

  /**
   * fetch shared data and store
   * @param {string} path - data path
   * @param {string} key - storage key
   * @returns {Object} - ?Promise.<void>
   */
  const storeFetchedData = async (path, key) =>
    isString(path) && isString(key) && fetch(path).then(async res => {
      const data = await res.json();
      return data && {
        [key]: data,
      } || null;
    }).then(setStorage) || null;

  /**
   * extract editor config data
   * @param {Object} data - editor config data
   * @returns {Object} - ?data to store
   */
  const extractEditorConfig = async (data = {}) => {
    const {editorConfig, editorName, executable} = data;
    const store = await storage.get([
      EDITOR_CONFIG, EDITOR_FILE_NAME, EDITOR_LABEL,
    ]);
    const editorConfigPath = store[EDITOR_CONFIG] && store[EDITOR_CONFIG].value;
    const editorFileName = store[EDITOR_FILE_NAME] &&
                             store[EDITOR_FILE_NAME].value;
    const editorLabel = store[EDITOR_LABEL] && store[EDITOR_LABEL].value;
    const msg = {};
    if (!editorConfigPath || editorConfigPath !== editorConfig) {
      msg[EDITOR_CONFIG] = {
        id: EDITOR_CONFIG,
        app: {
          executable: !!executable,
        },
        checked: false,
        value: editorConfig || "",
      };
      msg[EDITOR_FILE_NAME] = {
        id: EDITOR_FILE_NAME,
        app: {
          executable: false,
        },
        checked: false,
        value: executable && editorName || "",
      };
      msg[EDITOR_LABEL] = {
        id: EDITOR_LABEL,
        app: {
          executable: false,
        },
        checked: false,
        value: editorFileName === editorName && editorLabel ||
               executable && editorName || "",
      };
    }
    return Object.keys(msg).length && msg || null;
  };

  /**
   * extract editor config file path from storage data
   * @param {Object} data - storage data
   * @returns {?string} - file path
   */
  const extractEditorConfigStorage = data =>
    data && data[EDITOR_CONFIG] && data[EDITOR_CONFIG].value || null;

  /**
   * port editor config path
   * @returns {Object} - Promise.<void>
   */
  const portEditorConfigPath = () =>
    storage.get(EDITOR_CONFIG).then(extractEditorConfigStorage).then(filePath =>
      portHostMsg({[EDITOR_CONFIG_GET]: filePath || ""})
    );

  /* content ports collection */
  const ports = {};

  /**
   * restore ports collection
   * @param {Object} data - disconnected port data
   * @returns {Object} - ?Promise.<void>
   */
  const restorePorts = async (data = {}) => {
    const {tabId, windowId} = data;
    let func;
    if (windowId && tabId && ports[windowId]) {
      delete ports[windowId][tabId];
      Object.keys(ports[windowId]).length === 0 &&
        (func = restorePorts({windowId}));
    } else {
      windowId && delete ports[windowId];
    }
    return func || null;
  };

  /**
   * remove port from ports collection
   * @param {!Object} port - removed port
   * @return {void}
   */
  const removePort = async (port = {}) => {
    const {sender} = port;
    if (sender) {
      const {tab, url} = sender;
      if (tab) {
        let {windowId, id: tabId} = tab;
        tabId = stringifyPositiveInt(tabId, true);
        windowId = stringifyPositiveInt(windowId, true);
        tabId && windowId && url && ports[windowId] && ports[windowId][tabId] &&
          delete ports[windowId][tabId][url];
      }
    }
  };

  /**
   * port message
   * @param {*} msg - message
   * @param {string} windowId - windowId
   * @param {string} tabId - tabId
   * @returns {void}
   */
  const portMsg = async (msg, windowId, tabId) => {
    if (msg) {
      if (windowId && tabId) {
        const frameUrls = ports[windowId] && ports[windowId][tabId] &&
                            Object.keys(ports[windowId][tabId]);
        if (frameUrls && frameUrls.length) {
          for (const frameUrl of frameUrls) {
            const port = ports[windowId][tabId][frameUrl];
            try {
              port && port.postMessage(msg);
            } catch (e) {
              delete ports[windowId][tabId][frameUrl];
            }
          }
        }
      } else if (windowId) {
        const tabIds = ports[windowId] && Object.keys(ports[windowId]);
        if (tabIds && tabIds.length) {
          for (tabId of tabIds) {
            portMsg(msg, windowId, tabId);
          }
        }
      } else {
        const windowIds = Object.keys(ports);
        if (windowIds.length) {
          for (windowId of windowIds) {
            portMsg(msg, windowId);
          }
        }
      }
    }
  };

  /**
   * port context menu data
   * @param {!Object} info - contextMenus.OnClickData
   * @param {!Object} tab - tabs.Tab
   * @returns {void}
   */
  const portContextMenuData = async (info, tab) => {
    const {frameUrl} = info;
    let {windowId, id: tabId} = tab;
    windowId = stringifyPositiveInt(windowId, true);
    tabId = stringifyPositiveInt(tabId, true);
    if (windowId && tabId) {
      const port = ports[windowId] && ports[windowId][tabId] &&
                     ports[windowId][tabId][frameUrl];
      port && port.postMessage({
        [CONTENT_GET]: {info, tab},
      });
    }
  };

  /**
   * port sync text
   * @param {*} msg - message
   * @returns {Object} - ?Promise.<void>
   */
  const portSyncText = async msg => {
    let func;
    if (msg) {
      const {data} = msg;
      if (data) {
        const {tabId, windowId} = data;
        func = portMsg({[TEXT_SYNC]: msg}, windowId, tabId);
      }
    }
    return func || null;
  };

  /* icon */
  /**
   * replace icon
   * @param {Object} path - icon path
   * @returns {Object} - Promise.<void>
   */
  const replaceIcon = async (path = varsL[ICON_PATH]) =>
    browserAction.setIcon({path});

  /**
   * toggle badge
   * @param {boolean} executable - executable
   * @returns {Object} - Promise.<Array.<void>>
   */
  const toggleBadge = async (executable = varsL[IS_EXECUTABLE]) => {
    const color = !executable && WARN_COLOR || "transparent";
    const text = !executable && WARN_TEXT || "";
    return Promise.all([
      browserAction.setBadgeBackgroundColor({color}),
      browserAction.setBadgeText({text}),
    ]);
  };

  /* context menu */
  /* context menu items collection */
  const menus = {
    [MODE_SOURCE]: null,
    [MODE_SELECTION]: null,
    [MODE_EDIT]: null,
  };

  // TODO: implement accesskey, Issue #18
  /**
   * create context menu item
   * @param {string} id - menu item ID
   * @param {Array} contexts - contexts
   * @returns {void}
   */
  const createMenuItem = async (id, contexts) => {
    const label = varsL[EDITOR_LABEL] || LABEL;
    isString(id) && menus.hasOwnProperty(id) && Array.isArray(contexts) && (
      menus[id] = contextMenus.create({
        id, contexts,
        title: i18n.getMessage(id, label),
        enabled: !!varsL[MENU_ENABLED],
      })
    );
  };

  /**
   * create context menu items
   * @returns {Object} - Promise.<Array.<void>>
   */
  const createMenuItems = async () => {
    const func = [];
    const enabled = vars[IS_ENABLED];
    const bool = enabled && !vars[ONLY_EDITABLE];
    const items = Object.keys(menus);
    for (const item of items) {
      menus[item] = null;
      switch (item) {
        case MODE_EDIT:
          enabled && func.push(createMenuItem(item, ["editable"]));
          break;
        case MODE_SELECTION:
          bool && func.push(createMenuItem(item, ["selection"]));
          break;
        case MODE_SOURCE:
          bool && func.push(createMenuItem(item, ["frame", "page"]));
          break;
        default:
      }
    }
    return Promise.all(func);
  };

  /**
   * restore context menu
   * @returns {Object} - Promise.<Array.<void>>
   */
  const restoreContextMenu = () =>
    contextMenus.removeAll().then(createMenuItems);

  // FIXME: sometimes, update does not make it in time, Issue #20
  /**
   * update context menu
   * @param {Object} type - context type data
   * @returns {void}
   */
  const updateContextMenu = async type => {
    if (type) {
      const items = Object.keys(type);
      if (items.length) {
        for (const item of items) {
          const obj = type[item];
          const {menuItemId} = obj;
          if (menus[menuItemId]) {
            if (item === MODE_SOURCE) {
              const title = varsL[obj.mode] || varsL[menuItemId];
              title && contextMenus.update(menuItemId, {title});
            } else if (item === MODE_EDIT) {
              const enabled = !!obj.enabled;
              contextMenus.update(menuItemId, {enabled});
            }
          }
        }
      }
    } else {
      const items = Object.keys(menus);
      if (items.length) {
        for (const item of items) {
          menus[item] && contextMenus.update(item, {
            title: i18n.getMessage(item, varsL[EDITOR_LABEL] || LABEL),
          });
        }
      }
    }
  };

  /**
   * cache localized context menu item title
   * @returns {void}
   */
  const cacheMenuItemTitle = async () => {
    const items = [MODE_SOURCE, MODE_MATHML, MODE_SVG];
    const label = varsL[EDITOR_LABEL] || LABEL;
    for (const item of items) {
      varsL[item] = i18n.getMessage(item, label);
    }
  };

  /* UI */
  /**
   * synchronize UI components
   * @returns {Object} - ?Promise.<Array.<*>>
   */
  const syncUI = async () => {
    const win = await windows.getCurrent({windowTypes: ["normal"]});
    const enabled = vars[IS_ENABLED] = win && (
      !win.incognito || varsL[ENABLE_PB]
    ) || false;
    return win && Promise.all([
      portMsg({[IS_ENABLED]: !!enabled}),
      replaceIcon(!enabled && `${ICON}#off` || varsL[ICON_PATH]),
      toggleBadge(),
    ]) || null;
  };

  /* handlers */
  /**
   * open options page
   * @returns {Object} - ?Promise.<void>
   */
  const openOptionsPage = async () =>
    vars[IS_ENABLED] && runtime.openOptionsPage() || null;

  /**
   * handle host message
   * @param {Object} msg - message
   * @returns {Object|Function} - Promise.<void> or Function
   */
  const handleHostMsg = async msg => {
    const {message, pid, status} = msg;
    const log = pid && message && `${HOST} (${pid}): ${message}`;
    let func;
    switch (status) {
      case `${PROCESS_CHILD}_stderr`:
      case "error":
        log && (func = logError(log));
        break;
      case "ready":
        func = portEditorConfigPath();
        break;
      case "warn":
        log && (func = logWarn(log));
        break;
      default:
        // NOTE: need this?
        //log && console.log(log);
    }
    return func || null;
  };

  /**
   * handle message
   * @param {*} msg - message
   * @returns {Object} - Promise.<Array.<*>>
   */
  const handleMsg = async msg => {
    const func = [];
    const items = msg && Object.keys(msg);
    if (items && items.length) {
      for (const item of items) {
        const obj = msg[item];
        if (obj) {
          switch (item) {
            case CONTEXT_MENU:
              func.push(updateContextMenu(obj));
              break;
            case EDITOR_CONFIG_GET:
              func.push(portHostMsg({[item]: obj}));
              break;
            case EDITOR_CONFIG_RES:
              func.push(extractEditorConfig(obj).then(setStorage));
              func.push(portMsg({[item]: obj}));
              break;
            case HOST:
              func.push(handleHostMsg(obj));
              break;
            case LOCAL_FILE_VIEW:
            case TMP_FILE_CREATE:
            case TMP_FILE_GET:
              func.push(portHostMsg({[item]: obj}));
              break;
            case OPTIONS_OPEN:
              func.push(openOptionsPage());
              break;
            case STORAGE_SET:
              func.push(setStorage(obj));
              break;
            case TMP_FILE_DATA_PORT:
              func.push(portMsg({[item]: obj}));
              break;
            case TMP_FILE_RES:
              func.push(portSyncText(obj));
              break;
            default:
          }
        }
      }
    }
    return Promise.all(func).catch(logError);
  };

  /**
   * handle connected port
   * @param {!Object} port - runtime.Port
   * @returns {void}
   */
  const handlePort = async port => {
    const {tab, url} = port.sender;
    const {incognito} = tab;
    let {windowId, id: tabId} = tab;
    windowId = stringifyPositiveInt(windowId, true);
    tabId = stringifyPositiveInt(tabId, true);
    if (windowId && tabId && url) {
      ports[windowId] = ports[windowId] || {};
      ports[windowId][tabId] = ports[windowId][tabId] || {};
      ports[windowId][tabId][url] = port;
      port.onDisconnect.addListener(removePort);
      port.onMessage.addListener(handleMsg);
      port.postMessage({
        incognito, tabId, windowId,
        [VARS_SET]: vars,
      });
    }
  };

  /**
   * handle tab activated
   * @param {!Object} info - activated tab info
   * @returns {Object} - Promise.<Array.<void>>
   */
  const onTabActivated = async info => {
    let {tabId, windowId} = info, bool;
    windowId = stringifyPositiveInt(windowId, true);
    tabId = stringifyPositiveInt(tabId, true);
    if (windowId && tabId) {
      const items = ports[windowId] && ports[windowId][tabId] &&
                      Object.keys(ports[windowId][tabId]);
      if (items && items.length) {
        for (const item of items) {
          const obj = ports[windowId][tabId][item];
          if (obj && obj.name) {
            bool = obj.name === PORT_CONTENT;
            break;
          }
        }
      }
    }
    varsL[MENU_ENABLED] = bool || false;
    return restoreContextMenu().catch(logError);
  };

  /**
   * handle tab updated
   * @param {!number} id - tabId
   * @param {!Object} info - changed tab info
   * @param {!Object} tab - tabs.Tab
   * @returns {Object} - ?Promise.<Array.<void>>
   */
  const onTabUpdated = async (id, info, tab) => {
    const {active, url} = tab;
    let func;
    if (active) {
      const tabId = stringifyPositiveInt(id, true);
      let {windowId} = tab;
      windowId = stringifyPositiveInt(windowId, true);
      varsL[MENU_ENABLED] = windowId && tabId && url &&
                            ports[windowId] && ports[windowId][tabId] &&
                            ports[windowId][tabId][url] &&
                            ports[windowId][tabId][url].name === PORT_CONTENT ||
                            false;
      func = info.status === "complete" && restoreContextMenu();
    }
    return func || null;
  };

  /**
   * handle tab removed
   * @param {!number} id - tabId
   * @param {!Object} info - removed tab info
   * @returns {Object} - ?Promise.<Array.<*>>
   */
  const onTabRemoved = async (id, info) => {
    const tabId = stringifyPositiveInt(id, true);
    let {windowId} = info;
    windowId = stringifyPositiveInt(windowId, true);
    return windowId && tabId && ports[windowId] && ports[windowId][tabId] &&
           restorePorts({windowId, tabId}) || null;
  };

  /**
   * handle window focus changed
   * @returns {Object} - Promise.<?Array.<*>>
   */
  const onWindowFocusChanged = () =>
    windows.getAll({windowTypes: ["normal"]}).then(arr =>
      arr.length && syncUI() || null
    ).catch(logError);

  /**
   * handle window removed
   * @param {!number} windowId - windowId
   * @returns {Object} - Promise.<Array.<*>>
   */
  const onWindowRemoved = async windowId => {
    const func = [];
    const win = await windows.getAll({windowTypes: ["normal"]});
    if (win.length) {
      func.push(restorePorts({windowId: stringifyPositiveInt(windowId, true)}));
      func.push(checkWindowIncognito().then(bool =>
        !bool && portHostMsg({[TMP_FILES_PB_REMOVE]: !bool})
      ));
    }
    return Promise.all(func).catch(logError);
  };

  /* handle variables */
  /**
   * port variable
   * @param {Object} v - variable
   * @returns {Object} - ?Promise.<void>
   */
  const portVar = async v => v && portMsg({[VARS_SET]: v}) || null;

  /**
   * set variable
   * @param {string} item - item
   * @param {Object} obj - value object
   * @param {boolean} changed - changed
   * @returns {Object} - Promise.<Array.<*>>
   */
  const setVar = async (item, obj, changed = false) => {
    const func = [];
    if (item && obj) {
      const hasPorts = Object.keys(ports).length;
      switch (item) {
        case EDITOR_CONFIG:
          varsL[item] = obj.value;
          varsL[IS_EXECUTABLE] = obj.app && !!obj.app.executable;
          changed && func.push(toggleBadge());
          break;
        case EDITOR_LABEL:
          varsL[item] = obj.value;
          func.push(cacheMenuItemTitle());
          changed && func.push(updateContextMenu());
          break;
        case ONLY_EDITABLE:
          vars[item] = !!obj.checked;
          hasPorts && func.push(portVar({[item]: !!obj.checked}));
          changed && func.push(restoreContextMenu());
          break;
        case ENABLE_PB:
          varsL[item] = !!obj.checked;
          changed && func.push(syncUI());
          break;
        case ICON_COLOR:
        case ICON_GRAY:
        case ICON_WHITE:
          if (obj.checked) {
            varsL[ICON_PATH] = obj.value;
            changed && func.push(replaceIcon());
          }
          break;
        case KEY_ACCESS:
          vars[item] = obj.value;
          hasPorts && func.push(portVar({[item]: obj.value}));
          break;
        case KEY_EDITOR:
        case KEY_OPTIONS:
          vars[item] = !!obj.checked;
          hasPorts && func.push(portVar({[item]: !!obj.checked}));
          break;
        default:
      }
    }
    return Promise.all(func);
  };

  /**
   * set variables
   * @param {Object} data - storage data
   * @returns {Object} - Promise.<Array.<*>>
   */
  const setVars = async (data = {}) => {
    const func = [];
    const items = Object.keys(data);
    if (items.length) {
      for (const item of items) {
        const obj = data[item];
        func.push(setVar(item, obj.newValue || obj, !!obj.newValue));
      }
    }
    return Promise.all(func);
  };

  /* listeners */
  browserAction.onClicked.addListener(() => openOptionsPage().catch(logError));
  browser.storage.onChanged.addListener(data => setVars(data).catch(logError));
  contextMenus.onClicked.addListener((info, tab) =>
    portContextMenuData(info, tab).catch(logError)
  );
  host.onMessage.addListener(handleMsg);
  runtime.onConnect.addListener(port => handlePort(port).catch(logError));
  runtime.onMessage.addListener(handleMsg);
  tabs.onActivated.addListener(onTabActivated);
  tabs.onUpdated.addListener((id, info, tab) =>
    onTabUpdated(id, info, tab).catch(logError)
  );
  tabs.onRemoved.addListener((id, info) =>
    onTabRemoved(id, info).catch(logError)
  );
  windows.onFocusChanged.addListener(onWindowFocusChanged);
  windows.onRemoved.addListener(onWindowRemoved);

  /* startup */
  Promise.all([
    storage.get().then(setVars).then(syncUI),
    storeFetchedData(NS_URI_PATH, NS_URI),
    storeFetchedData(FILE_EXT_PATH, FILE_EXT),
  ]).catch(logError);
}
