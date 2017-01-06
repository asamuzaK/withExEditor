/**
 * background.js
 */
"use strict";
{
  /* constants */
  const LABEL = "withExEditor";

  const CONTEXT_MENU = "contextMenu";
  const OPEN_OPTIONS = "openOptions";
  const PORT_CONTENT = "portContent";
  const PORT_HOST = "portHost";
  const SET_VARS = "setVars";

  const FILE_EXT = "fileExt";
  const FILE_EXT_PATH = "../data/fileExt.json";
  const ICON = "./img/icon.svg";
  const ICON_COLOR = "buttonIcon";
  const ICON_GRAY = "buttonIconGray";
  const ICON_WHITE = "buttonIconWhite";
  const INCOGNITO = "incognito";
  const MENU_ENABLED = "menuEnabled";
  const MODE_EDIT_TEXT = "modeEditText";
  const MODE_MATHML = "modeViewMathML";
  const MODE_SELECTION = "modeViewSelection";
  const MODE_SOURCE = "modeViewSource";
  const MODE_SVG = "modeViewSVG";
  const NS_URI = "nsUri";
  const NS_URI_PATH = "../data/nsUri.json";
  const WARN_COLOR = "#C13832";
  const WARN_TEXT = "!";

  const APP_MANIFEST = "appManifestPath";
  const APP_NAME = "appName";
  const EDITOR_NAME = "editorName";
  const ENABLE_ONLY_EDITABLE = "enableOnlyEditable";
  const ENABLE_PB = "enablePB";
  const FORCE_REMOVE = "forceRemove";
  const IS_ENABLED = "isEnabled";
  const IS_EXEC = "isExecutable";
  const ICON_PATH = "iconPath";
  const KEY_ACCESS = "accessKey";
  const KEY_EXEC_EDITOR = "editorShortCut";
  const KEY_OPEN_OPTIONS = "optionsShortCut";

  /* shortcuts */
  const browserAction = browser.browserAction;
  const contextMenus = browser.contextMenus;
  const i18n = browser.i18n;
  const runtime = browser.runtime;
  const storage = browser.storage.local;
  const tabs = browser.tabs;
  const windows = browser.windows;

  /* variables */
  const vars = {
    [IS_ENABLED]: false,
    [KEY_ACCESS]: "e",
    [KEY_EXEC_EDITOR]: true,
    [KEY_OPEN_OPTIONS]: true,
    [ENABLE_ONLY_EDITABLE]: false,
  };

  const varsLoc = {
    [APP_MANIFEST]: "",
    [APP_NAME]: "",
    [EDITOR_NAME]: "",
    [ENABLE_PB]: false,
    [FORCE_REMOVE]: true,
    [ICON_PATH]: `${ICON}#gray`,
    [IS_EXEC]: false,
    [MENU_ENABLED]: false,
    [MODE_SOURCE]: "",
    [MODE_MATHML]: "",
    [MODE_SVG]: "",
  };

  /**
   * log error
   * @param {Object} e - Error
   * @return {boolean} - false
   */
  const logError = e => {
    e && console.error(e);
    return false;
  };

  /**
   * is string
   * @param {*} o - object to check
   * @return {boolean} - result
   */
  const isString = o =>
    o && (typeof o === "string" || o instanceof String) || false;

  /* windows */
  /**
   * check if add-on can be enabled
   * @param {Object} win - current window.Window
   * @return {boolean} - result
   */
  const checkEnable = async (win = null) => {
    let enable = false;
    !win && (win = await windows.getCurrent());
    win && win.type === "normal" &&
      (enable = !win.incognito || varsLoc[ENABLE_PB]);
    vars[IS_ENABLED] = enable;
    return enable;
  };

  /**
   * check one of window is incognito
   * @return {boolean} - result
   */
  const checkWindowIncognito = async () => {
    const windowIds = await windows.getAll();
    let incognito;
    if (windowIds && windowIds.length) {
      for (const windowId of windowIds) {
        incognito = windowId.incognito;
        if (incognito) {
          break;
        }
      }
    }
    return incognito || false;
  };

  /**
   * open options page
   * @return {Object} - ?Promise
   */
  const openOptionsPage = async () =>
    vars[IS_ENABLED] && runtime.openOptionsPage() || null;

  /* port */
  let host = null;

  /**
   * connect to native application host
   * @return {void}
   */
  const connectHost = async () => {
    const name = varsLoc[APP_NAME];
    host && host.disconnect();
    host = varsLoc[IS_EXEC] && name && runtime.connectNative(name) || null;
  };

  /**
   * port message to native application host
   * @param {*} msg - message
   * @return {void}
   */
  const portHostMsg = async msg => {
    msg && host && host.postMessage(msg);
  };

  /* content ports collection */
  const ports = {};

  /**
   * restore ports collection
   * @param {Object} data - disconnected port data
   * @return {void}
   */
  const restorePorts = async data => {
    if (data) {
      const windowId = data.windowId;
      const tabId = data.tabId;
      if (tabId) {
        windowId && ports[windowId] && (
          delete ports[windowId][tabId],
          Object.keys(ports[windowId]).length === 0 &&
            restorePorts({windowId})
        );
      } else if (windowId) {
        delete ports[windowId];
      }
    }
  };

  /**
   * port message
   * @param {*} msg - message
   * @param {string} windowId - windowId
   * @param {string} tabId - tabId
   * @return {void}
   */
  const portMsg = async (msg, windowId, tabId) => {
    if (msg) {
      if (windowId && tabId) {
        const frameUrls = ports[windowId] && ports[windowId][tabId] &&
                            Object.keys(ports[windowId][tabId]);
        if (frameUrls && frameUrls.length) {
          for (const frameUrl of frameUrls) {
            if (frameUrl !== INCOGNITO) {
              const port = ports[windowId][tabId][frameUrl];
              port && port.postMessage(msg);
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
   * port context menu
   * @param {Object} info - contextMenus.OnClickData
   * @param {Object} tab - tabs.Tab
   * @return {void}
   */
  const portContextMenu = async (info, tab) => {
    if (info && tab) {
      const getContent = {info, tab};
      const windowId = `${tab.windowId}`;
      const tabId = `${tab.id}`;
      const frameUrl = info.frameUrl;
      const port = ports[windowId] && ports[windowId][tabId] &&
                     ports[windowId][tabId][frameUrl];
      port && port.postMessage({getContent});
    }
  };

  // NOTE: for hybrid
  const hybrid = runtime.connect({name: "portBackground"});

  /**
   * port hybrid message
   * @param {*} msg - message
   * @return {void}
   */
  const portHybridMsg = async msg => {
    msg && hybrid.postMessage(msg);
  };

  /* icon */
  /**
   * replace icon
   * @param {Object} path - icon path
   * @return {void}
   */
  const replaceIcon = async (path = varsLoc[ICON_PATH]) => {
    browserAction.setIcon({path});
  };

  /**
   * toggle badge
   * @param {boolean} executable - executable
   * @return {void}
   */
  const toggleBadge = async (executable = varsLoc[IS_EXEC]) => {
    const color = !executable && WARN_COLOR || "transparent";
    const text = !executable && WARN_TEXT || "";
    browserAction.setBadgeBackgroundColor({color});
    browserAction.setBadgeText({text});
  };

  /* context menu */
  /* context menu items collection */
  const menus = {
    [MODE_SOURCE]: null,
    [MODE_SELECTION]: null,
    [MODE_EDIT_TEXT]: null,
  };

  // NOTE: no "accesskey" feature
  /**
   * create context menu item
   * @param {string} id - menu item ID
   * @param {Array} contexts - contexts
   * @return {void}
   */
  const createMenuItem = async (id, contexts) => {
    const label = varsLoc[EDITOR_NAME] || LABEL;
    isString(id) && menus.hasOwnProperty(id) && Array.isArray(contexts) && (
      menus[id] = contextMenus.create({
        id, contexts,
        title: i18n.getMessage(id, label),
        enabled: !!varsLoc[MENU_ENABLED],
      })
    );
  };

  /**
   * create context menu items
   * @return {void}
   */
  const createMenuItems = async () => {
    const enabled = vars[IS_ENABLED];
    const bool = enabled && !vars[ENABLE_ONLY_EDITABLE];
    const items = Object.keys(menus);
    for (const item of items) {
      menus[item] = null;
      switch (item) {
        case MODE_EDIT_TEXT:
          enabled && createMenuItem(item, ["editable"]).catch(logError);
          break;
        case MODE_SELECTION:
          bool && createMenuItem(item, ["selection"]).catch(logError);
          break;
        case MODE_SOURCE:
          bool && createMenuItem(item, ["frame", "page"]).catch(logError);
          break;
        default:
      }
    }
  };

  /**
   * restore context menu
   * @return {Object} - Promise.<void>
   */
  const restoreContextMenu = () =>
    contextMenus.removeAll().then(createMenuItems);

  /**
   * update context menu
   * @param {Object} type - context type data
   * @return {void}
   */
  const updateContextMenu = async type => {
    if (type) {
      const items = Object.keys(type);
      if (items.length) {
        for (const item of items) {
          const obj = type[item];
          const menuItemId = obj.menuItemId;
          if (menus[menuItemId]) {
            if (item === MODE_SOURCE) {
              const title = varsLoc[obj.mode] || varsLoc[menuItemId];
              title && contextMenus.update(menuItemId, {title});
            } else if (item === MODE_EDIT_TEXT) {
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
            title: i18n.getMessage(item, varsLoc[EDITOR_NAME] || LABEL),
          });
        }
      }
    }
  };

  /**
   * cache localized context menu item title
   * @return {void}
   */
  const cacheMenuItemTitle = async () => {
    const items = [MODE_SOURCE, MODE_MATHML, MODE_SVG];
    const label = varsLoc[EDITOR_NAME] || LABEL;
    for (const item of items) {
      varsLoc[item] = i18n.getMessage(item, label);
    }
  };

  /* UI */
  /**
   * synchronize UI components
   * @param {boolean} enabled - enabled
   * @return {Object} - Promise.<Array.<*>>
   */
  const syncUI = (enabled = false) => Promise.all([
    portMsg({isEnabled: !!enabled}),
    replaceIcon(!enabled && `${ICON}#off` || varsLoc[ICON_PATH]),
    toggleBadge(),
  ]);

  /* handle variables */
  /**
   * port variable
   * @param {Object} v - variable
   * @return {Object} - ?Promise
   */
  const portVar = async v => v && portMsg({[SET_VARS]: v}) || null;

  /**
   * set variable
   * @param {string} item - item
   * @param {Object} obj - value object
   * @param {boolean} changed - changed
   * @return {void}
   */
  const setVar = async (item, obj, changed = false) => {
    if (item && obj) {
      switch (item) {
        case APP_MANIFEST:
          varsLoc[item] = obj.value;
          varsLoc[IS_EXEC] = obj.app && !!obj.app.executable;
          connectHost().catch(logError);
          changed && toggleBadge().catch(logError);
          break;
        case APP_NAME:
          varsLoc[item] = obj.value;
          break;
        case EDITOR_NAME:
          varsLoc[item] = obj.value;
          cacheMenuItemTitle().catch(logError);
          changed && updateContextMenu().catch(logError);
          break;
        case ENABLE_ONLY_EDITABLE:
          vars[item] = !!obj.checked;
          changed && (
            restoreContextMenu().catch(logError),
            portVar({[item]: !!obj.checked}).catch(logError)
          );
          break;
        case ENABLE_PB:
          varsLoc[item] = !!obj.checked;
          changed && checkEnable().then(syncUI).catch(logError);
          break;
        case FORCE_REMOVE:
          varsLoc[item] = !!obj.checked;
          // NOTE: for hybrid
          portHybridMsg({[item]: !!obj.checked}).catch(logError);
          break;
        case ICON_COLOR:
        case ICON_GRAY:
        case ICON_WHITE:
          obj.checked && (
            varsLoc[ICON_PATH] = obj.value,
            changed && replaceIcon().catch(logError)
          );
          break;
        case KEY_ACCESS:
          vars[item] = obj.value;
          changed && portVar({[item]: obj.value}).catch(logError);
          break;
        case KEY_EXEC_EDITOR:
        case KEY_OPEN_OPTIONS:
          vars[item] = !!obj.checked;
          changed && portVar({[item]: !!obj.checked}).catch(logError);
          break;
        default:
      }
    }
  };

  /**
   * set variables from storage
   * @param {Object} data - storage data
   * @return {void}
   */
  const setVars = async data => {
    const items = data && Object.keys(data);
    if (items && items.length) {
      for (const item of items) {
        const obj = data[item];
        setVar(item, obj.newValue || obj, !!obj.newValue).catch(logError);
      }
    }
  };

  /**
   * fetch static data and set storage
   * @param {string} path - data path
   * @param {string} key - storage key
   * @return {Object} - ?Promise.<void>
   */
  const setStorage = async (path, key) =>
    isString(path) && isString(key) && fetch(path).then(async res => {
      const data = await res.json();
      return data && storage.set({
        [key]: data,
      }) || null;
    }) || null;

  /* handlers */
  /**
   * handle runtime update
   * @param {Object} details - install details
   * @return {Object} - ?Promise
   */
  const handleRuntimeUpdate = async details =>
    details && details.reason === "update" && runtime.reload() || null;

  /**
   * handle runtime message
   * @param {*} msg - message
   * @return {void}
   */
  const handleMsg = async msg => {
    const items = msg && Object.keys(msg);
    if (items && items.length) {
      for (const item of items) {
        const obj = msg[item];
        switch (item) {
          case CONTEXT_MENU:
            obj && updateContextMenu(obj).catch(logError);
            break;
          case OPEN_OPTIONS:
            obj && openOptionsPage().catch(logError);
            break;
          case PORT_HOST:
            obj && obj.path && portHostMsg(obj.path).catch(logError);
            break;
          default:
        }
      }
    }
  };

  /**
   * handle connected port
   * @param {Object} port - runtime.Port
   * @return {void}
   */
  const handlePort = async port => {
    const windowId = `${port.sender.tab.windowId}`;
    const tabId = `${port.sender.tab.id}`;
    const frameId = port.sender.frameId;
    const frameUrl = port.sender.url;
    const incognito = port.sender.tab.incognito;
    ports[windowId] = ports[windowId] || {};
    ports[windowId][tabId] = ports[windowId][tabId] || {};
    ports[windowId][tabId][frameUrl] = port;
    frameId === 0 && (ports[windowId][tabId][INCOGNITO] = incognito);
    port.onMessage.addListener(msg => handleMsg(msg).catch(logError));
    port.postMessage({
      incognito, tabId,
      [SET_VARS]: vars,
    });
  };

  /**
   * handle active tab
   * @param {Object} info - activated tab info
   * @return {void}
   */
  const handleActiveTab = async info => {
    let bool;
    if (info) {
      const windowId = `${info.windowId}`;
      const tabId = `${info.tabId}`;
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
    varsLoc[MENU_ENABLED] = bool || false;
  };

  /**
   * handle updated tab
   * @param {number} id - tabId
   * @param {Object} info - changed tab info
   * @param {Object} tab - tabs.Tab
   * @return {Object} - ?Promise
   */
  const handleUpdatedTab = async (id, info, tab) => {
    let bool;
    if (id && info && tab) {
      const windowId = `${tab.windowId}`;
      const tabId = `${id}`;
      const frameUrl = tab.url;
      const portName = ports[windowId] && ports[windowId][tabId] &&
                       ports[windowId][tabId][frameUrl] &&
                         ports[windowId][tabId][frameUrl].name;
      varsLoc[MENU_ENABLED] = portName === PORT_CONTENT;
      bool = info.status === "complete" && tab.active;
    }
    return bool && restoreContextMenu() || null;
  };

  /**
   * handle removed tab
   * @param {number} id - tabId
   * @param {Object} info - removed tab info
   * @return {void}
   */
  const handleRemovedTab = async (id, info) => {
    const windowId = `${info.windowId}`;
    const tabId = `${id}`;
    const incognito = ports[windowId] && ports[windowId][tabId] &&
                        !!ports[windowId][tabId][INCOGNITO];
    ports[windowId] && ports[windowId][tabId] &&
      restorePorts({windowId, tabId}).catch(logError);
    // NOTE: for hybrid
    portHybridMsg({
      removeTabRelatedStorage: {tabId, incognito, info},
    }).catch(logError);
  };

  /**
   * handle focus changed window
   * @param {number} windowId - windowId
   * @return {Object} - ?Promise.<Array.<*>>
   */
  const handleFocusChangedWindow = async windowId => {
    const current = windowId !== windows.WINDOW_ID_NONE &&
                      await windows.getCurrent();
    return current && current.focused &&
           checkEnable(current).then(syncUI) || null;
  };

  /**
   * handle removed window
   * @param {number} windowId - windowId
   * @return {Object} - Promise.<Array.<*>>
   */
  const handleRemovedWindow = windowId => Promise.all([
    restorePorts({windowId: `${windowId}`}),
    // NOTE: for hybrid
    checkWindowIncognito().then(incognito =>
      !incognito && portHybridMsg({removePrivateTmpFiles: !incognito})
    ),
  ]);

  /* listeners */
  browserAction.onClicked.addListener(() => openOptionsPage().catch(logError));
  browser.storage.onChanged.addListener(data => setVars(data).catch(logError));
  contextMenus.onClicked.addListener((info, tab) =>
    portContextMenu(info, tab).catch(logError)
  );
  runtime.onConnect.addListener(port => handlePort(port).catch(logError));
  runtime.onInstalled.addListener(details =>
    handleRuntimeUpdate(details).catch(logError)
  );
  runtime.onMessage.addListener(msg => handleMsg(msg).catch(logError));
  tabs.onActivated.addListener(info =>
    handleActiveTab(info).then(restoreContextMenu).catch(logError)
  );
  tabs.onUpdated.addListener((id, info, tab) =>
    handleUpdatedTab(id, info, tab).catch(logError)
  );
  tabs.onRemoved.addListener((id, info) =>
    handleRemovedTab(id, info).catch(logError)
  );
  windows.onFocusChanged.addListener(windowId =>
    handleFocusChangedWindow(windowId).catch(logError)
  );
  windows.onRemoved.addListener(windowId =>
    handleRemovedWindow(windowId).catch(logError)
  );

  // NOTE: for hybrid
  hybrid.onMessage.addListener(msg => handleMsg(msg).catch(logError));

  /* startup */
  Promise.all([
    storage.get().then(setVars).then(checkEnable).then(syncUI).then(() =>
      portMsg({[SET_VARS]: vars})
    ),
    setStorage(NS_URI_PATH, NS_URI),
    setStorage(FILE_EXT_PATH, FILE_EXT),
  ]).catch(logError);
}
