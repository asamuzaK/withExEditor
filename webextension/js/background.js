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
  const MODE_EDIT_TEXT = "modeEditText";
  const MODE_MATHML = "modeViewMathML";
  const MODE_SELECTION = "modeViewSelection";
  const MODE_SOURCE = "modeViewSource";
  const MODE_SVG = "modeViewSVG";
  const FILE_EXT_PATH = "../data/fileExt.json";
  const NS_URI_PATH = "../data/nsUri.json";
  const WARN_COLOR = "#C13832";
  const WARN_TEXT = "!";

  const APP_MANIFEST = "appManifestPath";
  const APP_NAME = "appName";
  const EDITOR_NAME = "editorName";
  const KEY_ACCESS = "accessKey";
  const KEY_OPEN_OPTIONS = "optionsShortCut";
  const KEY_EXEC_EDITOR = "editorShortCut";
  const ENABLE_PB = "enablePB";
  const EDITABLE_CONTEXT = "editableContext";
  const FORCE_REMOVE = "forceRemove";
  const IS_ENABLED = "isEnabled";
  const IS_EXECUTABLE = "isExecutable";
  const ICON_PATH = "iconPath";

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
    [KEY_ACCESS]: "e",
    [KEY_OPEN_OPTIONS]: true,
    [KEY_EXEC_EDITOR]: true,
    [EDITABLE_CONTEXT]: false,
    [IS_ENABLED]: false
  };

  const varsLocal = {
    [APP_MANIFEST]: "",
    [APP_NAME]: "",
    [EDITOR_NAME]: "",
    [ENABLE_PB]: false,
    [FORCE_REMOVE]: true,
    [IS_EXECUTABLE]: false,
    [ICON_PATH]: `${ICON}#gray`,
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
    win && win.type === "normal" && (
      enable = !win.incognito || varsLocal[ENABLE_PB]
    );
    vars[IS_ENABLED] = enable;
    return enable;
  };

  /**
   * check one of window is incognito
   * @return {boolean}
   */
  const checkWindowIncognito = async () => {
    const windowIds = await windows.getAll();
    let isIncognito = false;
    if (windowIds.length > 0) {
      for (let windowId of windowIds) {
        isIncognito = windowId.incognito;
        if (isIncognito) {
          break;
        }
      }
    }
    return isIncognito;
  };

  /**
   * open options page
   * @return {void}
   */
  const openOptionsPage = async () => {
    vars[IS_ENABLED] && runtime.openOptionsPage();
  };

  /* port */
  let host;

  /**
   * connect to native application host
   * @return {void}
   */
  const connectHost = async () => {
    host && host.disconnect();
    host = runtime.connectNative(varsLocal[APP_NAME]);
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
      tabId ?
        windowId && ports[windowId] && (
          delete ports[windowId][tabId],
          Object.keys(ports[windowId]).length === 0 &&
            restorePorts({windowId})
        ) :
        windowId && delete ports[windowId];
    }
  };

  /**
   * port message
   * @param {*} msg - message
   * @return {void}
   */
  const portMsg = async msg => {
    /**
     * handle ports[windowId][tabId][frameUrl]
     * @param {string} windowId - windowId
     * @param {string} tabId - tabId
     * @return {void}
     */
    const handlePortFrameUrl = (windowId, tabId) => {
      const frameUrls = windowId && tabId &&
                        ports[windowId] && ports[windowId][tabId] &&
                          Object.keys(ports[windowId][tabId]);
      if (frameUrls && frameUrls.length > 0) {
        for (let frameUrl of frameUrls) {
          if (frameUrl !== INCOGNITO) {
            const port = ports[windowId][tabId][frameUrl];
            port && port.postMessage(msg);
          }
        }
      }
    };

    /**
     * handle ports[windowId][tabId]
     * @param {string} windowId - windowId
     * @return {void}
     */
    const handlePortTabId = windowId => {
      const tabIds = windowId && ports[windowId] &&
                       Object.keys(ports[windowId]);
      if (tabIds && tabIds.length > 0) {
        for (let tabId of tabIds) {
          handlePortFrameUrl(windowId, tabId);
        }
      }
    };

    if (msg) {
      const windowIds = Object.keys(ports);
      if (windowIds.length > 0) {
        for (let windowId of windowIds) {
          handlePortTabId(windowId);
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
    const getContent = {info, tab};
    const windowId = `${tab.windowId}`;
    const tabId = `${tab.id}`;
    const frameUrl = info.frameUrl;
    ports[windowId] && ports[windowId][tabId] &&
    ports[windowId][tabId][frameUrl] &&
      ports[windowId][tabId][frameUrl].postMessage({getContent});
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
  const replaceIcon = async (path = varsLocal[ICON_PATH]) => {
    browserAction.setIcon({path});
  };

  /**
   * toggle badge
   * @param {boolean} bool - executable
   * @return {void}
   */
  const toggleBadge = async (bool = varsLocal[IS_EXECUTABLE]) => {
    const color = !bool && WARN_COLOR || "transparent";
    const text = !bool && WARN_TEXT || "";
    browserAction.setBadgeBackgroundColor({color});
    browserAction.setBadgeText({text});
  };

  /* context menu */
  /* context menu items collection */
  const menus = {};

  /**
   * cache context menu item localized title
   * @return {void}
   */
  const cacheMenuItemTitle = async () => {
    if (await menus[MODE_SOURCE]) {
      const items = [MODE_SOURCE, MODE_MATHML, MODE_SVG];
      const label = varsLocal[EDITOR_NAME] || LABEL;
      for (let item of items) {
        varsLocal[item] = i18n.getMessage(item, label);
      }
    }
  };

  // NOTE: no "accesskey" feature
  /**
   * create context menu item
   * @param {string} id - menu item ID
   * @param {Array} contexts - contexts
   * @param {boolean} enabled - enabled
   * @return {Object}
   */
  const createMenuItem = async (id, contexts, enabled = false) => {
    const label = varsLocal[EDITOR_NAME] || LABEL;
    let menu;
    isString(id) && Array.isArray(contexts) && (
      menu = contextMenus.create({
        id, contexts,
        title: i18n.getMessage(id, label),
        enabled: !!enabled
      })
    );
    return menu || null;
  };

  /**
   * create context menu items
   * @param {boolean} enabled - enabled
   * @return {void}
   */
  const createMenuItems = async enabled => {
    if (vars[IS_ENABLED]) {
      const items = [MODE_SOURCE, MODE_SELECTION, MODE_EDIT_TEXT];
      for (let item of items) {
        switch (item) {
          case MODE_SOURCE:
            !vars[EDITABLE_CONTEXT] &&
              (menus[item] = createMenuItem(item, ["frame", "page"], enabled));
            break;
          case MODE_SELECTION:
            !vars[EDITABLE_CONTEXT] &&
              (menus[item] = createMenuItem(item, ["selection"], enabled));
            break;
          case MODE_EDIT_TEXT:
            menus[item] = createMenuItem(item, ["editable"], enabled);
            break;
          default:
        }
      }
    }
  };

  /**
   * restore context menu items
   * @param {boolean} enabled - enabled
   * @return {Object} - Promise
   */
  const restoreContextMenuItems = enabled =>
    contextMenus.removeAll().then(() =>
      createMenuItems(enabled)
    ).then(cacheMenuItemTitle);

  /**
   * update context menu items
   * @param {Object} type - context type data
   * @return {void}
   */
  const updateContextMenuItems = async type => {
    if (type) {
      const items = Object.keys(type);
      if (items.length > 0) {
        for (let item of items) {
          const obj = type[item];
          const menuItemId = obj.menuItemId;
          const title = varsLocal[obj.mode] || varsLocal[menuItemId] || "";
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
        for (let item of items) {
          menus[item] &&
            contextMenus.update(item, {
              title: i18n.getMessage(item, varsLocal[EDITOR_NAME] || LABEL)
            });
        }
      }
    }
  };

  /* UI */
  /**
   * synchronize UI components
   * @return {Object} - Promise
   */
  const syncUI = () => Promise.all([
    portMsg({
      isEnabled: vars[IS_ENABLED]
    }),
    replaceIcon(!vars[IS_ENABLED] && `${ICON}#off` || varsLocal[ICON_PATH]),
    toggleBadge()
  ]);

  /* handle variables */
  /**
   * port variable
   * @param {Object} v - variable
   * @return {void}
   */
  const portVar = async v => {
    v && portMsg({
      [SET_VARS]: v
    }).catch(logError);
  };

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
          varsLocal[item] = obj.value;
          varsLocal[IS_EXECUTABLE] = obj.app && !!obj.app.executable;
          changed && toggleBadge().catch(logError);
          break;
        case APP_NAME:
          varsLocal[item] = obj.value;
          connectHost().catch(logError);
          break;
        case EDITABLE_CONTEXT:
          vars[item] = !!obj.checked;
          changed && (
            restoreContextMenuItems().catch(logError),
            portVar({
              [item]: !!obj.checked
            }).catch(logError)
          );
          break;
        case EDITOR_NAME:
          varsLocal[item] = obj.value;
          changed &&
            updateContextMenuItems().then(cacheMenuItemTitle).catch(logError);
          break;
        case ENABLE_PB:
          varsLocal[item] = !!obj.checked;
          changed && syncUI().catch(logError);
          break;
        case FORCE_REMOVE:
          varsLocal[item] = !!obj.checked;
          // NOTE: for hybrid
          portHybridMsg({
            [item]: !!obj.checked
          }).catch(logError);
          break;
        case ICON_COLOR:
        case ICON_GRAY:
        case ICON_WHITE:
          obj.checked && (
            varsLocal[ICON_PATH] = obj.value,
            changed && replaceIcon().catch(logError)
          );
          break;
        case KEY_OPEN_OPTIONS:
        case KEY_EXEC_EDITOR:
          vars[item] = !!obj.checked;
          changed && portVar({
            [item]: !!obj.checked
          }).catch(logError);
          break;
        case KEY_ACCESS:
          vars[item] = obj.value;
          changed && portVar({
            [item]: obj.value
          }).catch(logError);
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
      for (let item of items) {
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
      for (let item of items) {
        setVar(item, data[item].newValue, true);
      }
    }
  };

  /**
   * handle runtime message
   * @param {*} msg - message
   * @return {void}
   */
  const handleMsg = async msg => {
    const items = Object.keys(msg);
    if (items.length > 0) {
      for (let item of items) {
        const obj = msg[item];
        switch (item) {
          case CONTEXT_MENU:
            obj && updateContextMenuItems(obj).catch(logError);
            break;
          case OPEN_OPTIONS:
            obj && openOptionsPage().catch(logError);
            break;
          case PORT_HOST:
            obj.path && portHostMsg(obj.path).catch(logError);
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
    port.onMessage.addListener(handleMsg);
    port.postMessage({
      incognito, tabId,
      [SET_VARS]: vars
    });
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
        for (let item of items) {
          const obj = ports[windowId][tabId][item];
          if (obj && obj.name) {
            bool = obj.name === PORT_CONTENT;
            break;
          }
        }
      }
    }
    restoreContextMenuItems(bool).catch(logError);
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
      const bool = ports[windowId] && ports[windowId][tabId] &&
                   ports[windowId][tabId][frameUrl] &&
                     ports[windowId][tabId][frameUrl].name === PORT_CONTENT;
      info.status === "complete" && tab.active &&
        restoreContextMenuItems(bool).catch(logError);
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
    portHybridMsg({
      removeTabRelatedStorage: {tabId, incognito, info}
    }).catch(logError);
    ports[windowId] && ports[windowId][tabId] &&
      restorePorts({windowId, tabId}).catch(logError);
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
   * @return {Object|boolean} - Promise or false
   */
  const handleRemovedWindow = windowId => Promise.all([
    restorePorts({
      windowId: `${windowId}`
    }),
    checkWindowIncognito().then(isIncognito => !isIncognito && portHybridMsg({
      removePrivateTmpFiles: !isIncognito
    }))
  ]).catch(logError);

  /* listeners */
  browserAction.onClicked.addListener(openOptionsPage);
  browser.storage.onChanged.addListener(handleStorageChanged);
  contextMenus.onClicked.addListener(portContextMenu);
  runtime.onMessage.addListener(handleMsg);
  runtime.onConnect.addListener(handlePort);
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
      portMsg({
        [SET_VARS]: vars
      })
    ),
    fetch(NS_URI_PATH).then(async data => {
      const nsURI = await data.json();
      nsURI && storage.set({nsURI});
    }),
    fetch(FILE_EXT_PATH).then(async data => {
      const fileExt = await data.json();
      fileExt && storage.set({fileExt});
    })
  ]).catch(logError);
}
