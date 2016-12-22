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
  const PATH_FILE_EXT = "../data/fileExt.json";
  const PATH_NS_URI = "../data/nsUri.json";
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
    [ENABLE_ONLY_EDITABLE]: false
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
    [MODE_SVG]: ""
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
   * @return {boolean}
   */
  const isString = o =>
    o && (typeof o === "string" || o instanceof String) || false;

  /* windows */
  /**
   * check if add-on can be enabled
   * @param {Object} win - current window.Window
   * @return {boolean}
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
   * @return {boolean}
   */
  const checkWindowIncognito = async () => {
    const windowIds = await windows.getAll();
    let incognito = false;
    if (windowIds.length > 0) {
      for (const windowId of windowIds) {
        incognito = windowId.incognito;
        if (incognito) {
          break;
        }
      }
    }
    return incognito;
  };

  /**
   * open options page
   * @return {void}
   */
  const openOptionsPage = async () => {
    vars[IS_ENABLED] && runtime.openOptionsPage();
  };

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
      }
      else {
        windowId && delete ports[windowId];
      }
    }
  };

  /**
   * handle ports[windowId][tabId][frameUrl]
   * @param {*} msg - message
   * @param {string} windowId - windowId
   * @param {string} tabId - tabId
   * @return {void}
   */
  const handlePortFrameUrl = (msg, windowId, tabId) => {
    if (msg) {
      const frameUrls = windowId && tabId &&
                        ports[windowId] && ports[windowId][tabId] &&
                          Object.keys(ports[windowId][tabId]);
      if (frameUrls && frameUrls.length > 0) {
        for (const frameUrl of frameUrls) {
          if (frameUrl !== INCOGNITO) {
            const port = ports[windowId][tabId][frameUrl];
            port && port.postMessage(msg);
          }
        }
      }
    }
  };

  /**
   * handle ports[windowId][tabId]
   * @param {*} msg - message
   * @param {string} windowId - windowId
   * @return {void}
   */
  const handlePortTabId = (msg, windowId) => {
    if (msg) {
      const tabIds = windowId && ports[windowId] &&
                       Object.keys(ports[windowId]);
      if (tabIds && tabIds.length > 0) {
        for (const tabId of tabIds) {
          handlePortFrameUrl(msg, windowId, tabId);
        }
      }
    }
  };

  /**
   * port message
   * @param {*} msg - message
   * @return {void}
   */
  const portMsg = async msg => {
    if (msg) {
      const windowIds = Object.keys(ports);
      if (windowIds.length > 0) {
        for (const windowId of windowIds) {
          handlePortTabId(msg, windowId);
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
      ports[windowId] && ports[windowId][tabId] &&
      ports[windowId][tabId][frameUrl] &&
        ports[windowId][tabId][frameUrl].postMessage({getContent});
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
    [MODE_EDIT_TEXT]: null
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

  // NOTE: no "accesskey" feature
  /**
   * create context menu item
   * @param {string} id - menu item ID
   * @param {Array} contexts - contexts
   * @return {Object}
   */
  const createMenuItem = async (id, contexts) => {
    const label = varsLoc[EDITOR_NAME] || LABEL;
    let menu;
    isString(id) && Array.isArray(contexts) && (
      menu = contextMenus.create({
        id, contexts,
        title: i18n.getMessage(id, label),
        enabled: !!varsLoc[MENU_ENABLED]
      })
    );
    return menu || null;
  };

  /**
   * create context menu items
   * @return {void}
   */
  const createMenuItems = async () => {
    const enabled = vars[IS_ENABLED];
    const onlyEdit = vars[ENABLE_ONLY_EDITABLE];
    const items = Object.keys(menus);
    for (const item of items) {
      switch (item) {
        case MODE_SOURCE:
          menus[item] = enabled && !onlyEdit &&
                        createMenuItem(item, ["frame", "page"]) || null;
          break;
        case MODE_SELECTION:
          menus[item] = enabled && !onlyEdit &&
                        createMenuItem(item, ["selection"]) || null;
          break;
        case MODE_EDIT_TEXT:
          menus[item] = enabled && createMenuItem(item, ["editable"]) || null;
          break;
        default:
      }
    }
  };

  /**
   * restore context menu
   * @return {Object} - Promise
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
      if (items.length > 0) {
        for (const item of items) {
          const obj = type[item];
          const menuItemId = obj.menuItemId;
          const title = varsLoc[obj.mode] || varsLoc[menuItemId] || "";
          const enabled = !!obj.enabled;
          switch (item) {
            case MODE_EDIT_TEXT:
              menus[menuItemId] && contextMenus.update(menuItemId, {enabled});
              break;
            case MODE_SOURCE:
              menus[menuItemId] && title &&
                contextMenus.update(menuItemId, {title});
              break;
            default:
          }
        }
      }
    }
    else {
      const items = Object.keys(menus);
      if (items.length > 0) {
        for (const item of items) {
          menus[item] && contextMenus.update(item, {
            title: i18n.getMessage(item, varsLoc[EDITOR_NAME] || LABEL)
          });
        }
      }
    }
  };

  /* UI */
  /**
   * synchronize UI components
   * @param {boolean} enabled - enabled
   * @return {Object} - Promise
   */
  const syncUI = (enabled = false) => Promise.all([
    portMsg({isEnabled: !!enabled}),
    replaceIcon(!enabled && `${ICON}#off` || varsLoc[ICON_PATH]),
    toggleBadge()
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
   * @param {Object} res - storage response
   * @return {void}
   */
  const setVars = async res => {
    const items = Object.keys(res);
    if (items.length > 0) {
      for (const item of items) {
        setVar(item, res[item], false);
      }
    }
  };

  /* handlers */
  /**
   * handle storage changed
   * @param {Object} data - storage.StorageChange
   * @return {void}
   */
  const handleStorageChanged = async data => {
    const items = Object.keys(data);
    if (items.length > 0) {
      for (const item of items) {
        setVar(item, data[item].newValue, true);
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
    port.onMessage.addListener(handleMsg);
    port.postMessage({
      incognito, tabId,
      [SET_VARS]: vars
    });
  };

  /**
   * handle runtime update
   * @param {Object} details - install details
   * @return {void}
   */
  const handleRuntimeUpdate = async details => {
    details && details.reason === "update" && runtime.reload();
  };

  /**
   * handle runtime message
   * @param {*} msg - message
   * @return {void}
   */
  const handleMsg = async msg => {
    const items = Object.keys(msg);
    if (items.length > 0) {
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
   * handle active tab
   * @param {Object} info - activated tab info
   * @return {void}
   */
  const handleActiveTab = async info => {
    let bool = false;
    if (info) {
      const windowId = `${info.windowId}`;
      const tabId = `${info.tabId}`;
      const items = ports[windowId] && ports[windowId][tabId] &&
                      Object.keys(ports[windowId][tabId]);
      if (items && items.length > 0) {
        for (const item of items) {
          const obj = ports[windowId][tabId][item];
          if (obj && obj.name) {
            bool = obj.name === PORT_CONTENT;
            break;
          }
        }
      }
    }
    varsLoc[MENU_ENABLED] = bool;
    restoreContextMenu().catch(logError);
  };

  /**
   * handle updated tab
   * @param {number} id - tabId
   * @param {Object} info - changed tab info
   * @param {Object} tab - tabs.Tab
   * @return {void}
   */
  const handleUpdatedTab = async (id, info, tab) => {
    if (id && info && tab) {
      const windowId = `${tab.windowId}`;
      const tabId = `${id}`;
      const frameUrl = tab.url;
      const portName = ports[windowId] && ports[windowId][tabId] &&
                       ports[windowId][tabId][frameUrl] &&
                         ports[windowId][tabId][frameUrl].name;
      varsLoc[MENU_ENABLED] = portName === PORT_CONTENT;
      info.status === "complete" && tab.active &&
        restoreContextMenu().catch(logError);
    }
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
      removeTabRelatedStorage: {tabId, incognito, info}
    }).catch(logError);
  };

  /**
   * handle focus changed window
   * @param {number} windowId - windowId
   * @return {void}
   */
  const handleFocusChangedWindow = async windowId => {
    if (windowId !== windows.WINDOW_ID_NONE) {
      const current = await windows.getCurrent();
      current && current.focused &&
        checkEnable(current).then(syncUI).catch(logError);
    }
  };

  /**
   * handle removed window
   * @param {number} windowId - windowId
   * @return {Object} - Promise
   */
  const handleRemovedWindow = windowId => Promise.all([
    restorePorts({windowId: `${windowId}`}),
    // NOTE: for hybrid
    checkWindowIncognito().then(incognito =>
      !incognito && portHybridMsg({removePrivateTmpFiles: !incognito})
    )
  ]).catch(logError);

  /* listeners */
  browserAction.onClicked.addListener(openOptionsPage);
  browser.storage.onChanged.addListener(handleStorageChanged);
  contextMenus.onClicked.addListener(portContextMenu);
  runtime.onConnect.addListener(handlePort);
  runtime.onInstalled.addListener(handleRuntimeUpdate);
  runtime.onMessage.addListener(handleMsg);
  tabs.onActivated.addListener(handleActiveTab);
  tabs.onUpdated.addListener(handleUpdatedTab);
  tabs.onRemoved.addListener(handleRemovedTab);
  windows.onFocusChanged.addListener(handleFocusChangedWindow);
  windows.onRemoved.addListener(handleRemovedWindow);

  // NOTE: for hybrid
  hybrid.onMessage.addListener(handleMsg);

  /* startup */
  Promise.all([
    storage.get().then(setVars).then(checkEnable).then(syncUI).then(() =>
      portMsg({[SET_VARS]: vars})
    ),
    fetch(PATH_NS_URI).then(async data => {
      const nsURI = await data.json();
      nsURI && storage.set({nsURI});
    }),
    fetch(PATH_FILE_EXT).then(async data => {
      const fileExt = await data.json();
      fileExt && storage.set({fileExt});
    })
  ]).catch(logError);
}
