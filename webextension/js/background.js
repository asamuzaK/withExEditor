/**
 * background.js
 */
"use strict";
{
  /* constants */
  const LABEL = "withExEditor";

  const CONTEXT_MENU = "contextMenu";
  const OPEN_OPTIONS = "openOptions";
  const PORT_HOST = "portHost";

  const ICON = "./img/icon.svg";
  const ICON_COLOR = "buttonIcon";
  const ICON_GRAY = "buttonIconGray";
  const ICON_WHITE = "buttonIconWhite";
  const INCOGNITO = "incognito";
  const MODE_EDIT_TEXT = "modeEditText";
  const MODE_SELECTION = "modeViewSelection";
  const MODE_SOURCE = "modeViewSource";
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
  const FILE_EXT = "fileExt";

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
    [APP_MANIFEST]: "",
    [APP_NAME]: "",
    [EDITOR_NAME]: "",
    [KEY_ACCESS]: "e",
    [KEY_OPEN_OPTIONS]: true,
    [KEY_EXEC_EDITOR]: true,
    [ENABLE_PB]: false,
    [EDITABLE_CONTEXT]: false,
    [FORCE_REMOVE]: true,
    [IS_ENABLED]: false,
    [IS_EXECUTABLE]: false,
    [ICON_PATH]: `${ICON}#gray`,
    [FILE_EXT]: null
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

  /* windows */
  /**
   * check add-on is enabled
   * @return {boolean}
   */
  const checkEnabled = async () => {
    const win = await windows.getCurrent();
    const isEnabled = !win.incognito || vars[ENABLE_PB];
    vars[IS_ENABLED] = isEnabled;
    return isEnabled;
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
  // NOTE: for hybrid
  const hybrid = runtime.connect({name: "portBackground"});

  let host;

  /**
   * connect to native application host
   * @return {void}
   */
  const connectHost = async () => {
    host && host.disconnect();
    host = runtime.connectNative(vars[APP_NAME]);
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
    const windowId = data.windowId;
    const tabId = data.tabId;
    const frameUrl = data.frameUrl;
    const incognito = !!data.incognito;
    frameUrl ?
      windowId && tabId && ports[windowId] && ports[windowId][tabId] &&
        delete ports[windowId][tabId][frameUrl] :
    incognito ?
      windowId && tabId && ports[windowId] && ports[windowId][tabId] && (
        delete ports[windowId][tabId][INCOGNITO],
        Object.keys(ports[windowId][tabId]).length === 0 &&
          restorePorts({windowId, tabId})
      ) :
    tabId ?
      windowId && ports[windowId] && (
        delete ports[windowId][tabId],
        Object.keys(ports[windowId]).length === 0 && restorePorts({windowId})
      ) :
      windowId && delete ports[windowId];
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

    if (Object.keys(msg).length > 0) {
      const windowIds = Object.keys(ports);
      if (windowIds.length > 0) {
        for (let windowId of windowIds) {
          handlePortTabId(windowId);
        }
      }
      // NOTE: for hybrid
      hybrid.postMessage(msg);
    }
  };

  /**
   * port variables
   * @param {Object} msg - message
   * @return {void}
   */
  const portVars = async msg => {
    const setVars = msg;
    portMsg({setVars});
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

  /* icon */
  /**
   * replace icon
   * @param {Object} path - icon path
   * @return {void}
   */
  const replaceIcon = async (path = vars[ICON_PATH]) => {
    browserAction.setIcon({path});
  };

  /**
   * toggle icon
   * @return {void}
   */
  const toggleIcon = async () => {
    vars[IS_ENABLED] ?
      replaceIcon() :
      replaceIcon(`${ICON}#off`);
  };

  /**
   * toggle badge
   * @param {boolean} bool - executable
   * @return {void}
   */
  const toggleBadge = async (bool = vars[IS_EXECUTABLE]) => {
    const color = !bool && WARN_COLOR || "transparent";
    const text = !bool && WARN_TEXT || "";
    browserAction.setBadgeBackgroundColor({color});
    browserAction.setBadgeText({text});
  };

  /* context menu */
  /* context menu items collection */
  const menus = {};

  // NOTE: no "accesskey" feature
  /**
   * create context menu items
   * @param {boolean} enable - enable
   * @return {Object} - Promise
   */
  const createContextMenuItems = (enable = false) =>
    contextMenus.removeAll().then(async () => {
      const items = [MODE_EDIT_TEXT, MODE_SELECTION, MODE_SOURCE];
      for (let item of items) {
        switch (item) {
          case MODE_EDIT_TEXT:
            menus[item] = vars[IS_ENABLED] && await contextMenus.create({
              id: item,
              title: i18n.getMessage(item, vars[EDITOR_NAME] || LABEL),
              contexts: ["editable"],
              enabled: !!enable
            }) || null;
            break;
          case MODE_SELECTION:
            menus[item] = vars[IS_ENABLED] && !vars[EDITABLE_CONTEXT] &&
              await contextMenus.create({
                id: item,
                title: i18n.getMessage(item, vars[EDITOR_NAME] || LABEL),
                contexts: ["selection"],
                enabled: !!enable
              }) || null;
            break;
          case MODE_SOURCE:
            menus[item] = vars[IS_ENABLED] && !vars[EDITABLE_CONTEXT] &&
              await contextMenus.create({
                id: item,
                title: i18n.getMessage(item, vars[EDITOR_NAME] || LABEL),
                contexts: ["frame", "image", "page"],
                enabled: !!enable
              }) || null;
            break;
          default:
        }
      }
    });

  /**
   * update context menu items
   * @param {Object} type - context type data
   * @return {void}
   */
  const updateContextMenuItems = async (type = null) => {
    if (type) {
      const items = Object.keys(type);
      if (items.length > 0) {
        for (let item of items) {
          const obj = type[item];
          const menuItemId = obj.menuItemId;
          switch (item) {
            case MODE_EDIT_TEXT:
              menus[menuItemId] &&
                contextMenus.update(menuItemId, {
                  enabled: !!obj.enabled
                });
              break;
            case MODE_SOURCE:
              menus[menuItemId] &&
                contextMenus.update(menuItemId, {
                  title: i18n.getMessage(obj.mode || menuItemId,
                                         vars[EDITOR_NAME] || LABEL)
                });
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
              title: i18n.getMessage(item, vars[EDITOR_NAME] || LABEL)
            });
        }
      }
    }
  };

  /* storage */
  /**
   * set storage
   * @param {Object} obj - object to set
   * @return {void}
   */
  const setStorage = async obj => {
    Object.keys(obj).length > 0 && storage.set(obj);
  };

  /**
   * set variables from storage
   * @param {Object} res - result
   * @return {void}
   */
  const setVariablesFromStorage = async res => {
    const items = Object.keys(res);
    if (items.length > 1) {
      for (let item of items) {
        const obj = res[item];
        switch (item) {
          case ENABLE_PB:
          case EDITABLE_CONTEXT:
            vars[item] = !!obj.checked;
            break;
          case ICON_COLOR:
          case ICON_GRAY:
          case ICON_WHITE:
            obj.checked && (
              vars[ICON_PATH] = obj.value
            );
            break;
          case APP_NAME:
            vars[item] = obj.value;
            connectHost();
            break;
          case EDITOR_NAME:
            vars[item] = obj.value;
            break;
          case APP_MANIFEST:
            vars[item] = obj.value;
            vars[IS_EXECUTABLE] = obj.app && !!obj.app.executable;
            break;
          default:
        }
      }
      checkEnabled().then(() => {
        portMsg({
          setVars: vars
        });
      }).catch(logError);
    }
  };

  /* UI */
  /**
   * synchronize UI components
   * @return {Object} - Promise
   */
  const syncUI = () =>
    checkEnabled().then(() => Promise.all([
      portMsg({
        isEnabled: vars[IS_ENABLED]
      }),
      toggleIcon(),
      toggleBadge()
    ])).catch(e => {
      throw e;
    });

  /* handlers */
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
            obj && updateContextMenuItems(obj);
            break;
          case OPEN_OPTIONS:
            obj && openOptionsPage();
            break;
          case PORT_HOST:
            obj.path && portHostMsg(obj.path);
            break;
          default:
        }
      }
    }
  };

  /**
   * handle disconnected port
   * @param {Object} port - runtime.Port
   * @return {void}
   */
  const handleDisconnectedPort = async port => {
    const windowId = `${port.sender.tab.windowId}`;
    const tabId = `${port.sender.tab.id}`;
    const frameUrl = port.sender.frameUrl;
    restorePorts({windowId, tabId, frameUrl});
  };

  /**
   * handle connected port
   * @param {Object} port - runtime.Port
   * @return {void}
   */
  const handlePort = async port => {
    const windowId = `${port.sender.tab.windowId}`;
    const tabId = `${port.sender.tab.id}`;
    const frameUrl = port.sender.url;
    const incognito = port.sender.tab.incognito;
    ports[windowId] = ports[windowId] || {};
    ports[windowId][tabId] = ports[windowId][tabId] || {};
    ports[windowId][tabId][frameUrl] = port;
    ports[windowId][tabId][INCOGNITO] = incognito;
    port.onMessage.addListener(handleMsg);
    port.onDisconnect.addListener(handleDisconnectedPort);
    port.postMessage({
      incognito, tabId,
      setVars: vars
    });
  };

  /**
   * handle storage changes
   * @param {Object} data - storage.StorageChange
   * @return {void}
   */
  const handleStorageChange = async data => {
    const items = Object.keys(data);
    if (items.length > 0) {
      for (let item of items) {
        const obj = data[item].newValue;
        switch (item) {
          case ICON_COLOR:
          case ICON_GRAY:
          case ICON_WHITE:
            obj.checked && (
              vars[ICON_PATH] = obj.value,
              replaceIcon()
            );
            break;
          case FORCE_REMOVE:
          case KEY_OPEN_OPTIONS:
          case KEY_EXEC_EDITOR:
            vars[item] = !!obj.checked;
            portVars({
              [item]: !!obj.checked
            });
            break;
          case KEY_ACCESS:
            vars[item] = obj.value;
            portVars({
              [item]: obj.value
            });
            break;
          case APP_MANIFEST:
            vars[item] = obj.value;
            vars[IS_EXECUTABLE] = obj.app && !!obj.app.executable;
            toggleBadge();
            portVars({
              [item]: obj.value
            });
            break;
          case APP_NAME:
            vars[item] = obj.value;
            connectHost();
            break;
          case EDITOR_NAME:
            vars[item] = obj.value;
            updateContextMenuItems();
            portVars({
              [item]: obj.value
            });
            break;
          case ENABLE_PB:
            vars[item] = !!obj.checked;
            syncUI();
            portVars({
              [item]: !!obj.checked
            });
            break;
          case EDITABLE_CONTEXT:
            vars[item] = !!obj.checked;
            createContextMenuItems();
            portVars({
              [item]: !!obj.checked
            });
            break;
          default:
        }
      }
    }
  };

  /* add listeners */
  browserAction.onClicked.addListener(openOptionsPage);
  browser.storage.onChanged.addListener(handleStorageChange);
  contextMenus.onClicked.addListener(portContextMenu);
  runtime.onMessage.addListener(handleMsg);
  runtime.onConnect.addListener(handlePort);
  tabs.onActivated.addListener(async info => {
    const windowId = `${info.windowId}`;
    const tabId = `${info.tabId}`;
    ports[windowId] && ports[windowId][tabId] ?
      createContextMenuItems(true) :
      createContextMenuItems();
  });
  tabs.onUpdated.addListener(async (id, info, tab) => {
    const status = info.status;
    const active = tab.active;
    const windowId = `${tab.windowId}`;
    const tabId = `${id}`;
    if (status === "complete" && active) {
      ports[windowId] && ports[windowId][tabId] ?
      createContextMenuItems(active) :
      createContextMenuItems();
    }
  });
  tabs.onRemoved.addListener(async (id, info) => {
    const windowId = `${info.windowId}`;
    const tabId = `${id}`;
    const incognito = ports[windowId] && ports[windowId][tabId] &&
                        !!ports[windowId][tabId][INCOGNITO];
    portMsg({
      removeTabRelatedStorage: {tabId, incognito, info}
    }).catch(logError);
    ports[windowId] && ports[windowId][tabId] &&
    Object.keys(ports[windowId][tabId]).length === 1 &&
      restorePorts({
        windowId, tabId,
        incognito: true
      }).catch(logError);
  });
  windows.onFocusChanged.addListener(syncUI);
  windows.onRemoved.addListener(windowId => {
    Promise.all([
      restorePorts({
        windowId: `${windowId}`
      }),
      checkWindowIncognito().then(isIncognito => {
        !isIncognito && portMsg({
          removePrivateTmpFiles: !isIncognito
        });
      })
    ]).catch(logError);
  });
  // NOTE: for hybrid
  hybrid.onMessage.addListener(handleMsg);

  /* startup */
  Promise.all([
    storage.get().then(setVariablesFromStorage).then(syncUI),
    fetch(NS_URI_PATH).then(async data => {
      const nsURI = await data.json();
      setStorage({nsURI});
    }),
    fetch(FILE_EXT_PATH).then(async data => {
      const fileExt = await data.json();
      fileExt && (
        vars[FILE_EXT] = fileExt,
        portMsg({fileExt})
      );
    })
  ]).catch(logError);
}
