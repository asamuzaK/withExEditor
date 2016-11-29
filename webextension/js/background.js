/**
 * background.js
 */
"use strict";
{
  /* constants */
  const LABEL = "withExEditor";

  const PORT_BACKGROUND = "portBackground";
  const CONTEXT_MENU = "contextMenu";
  const OPEN_OPTIONS = "openOptions";
  const SDK_PREFS = "sdkPrefs";

  const ICON = "./img/icon.svg";
  const ICON_COLOR = "buttonIcon";
  const ICON_GRAY = "buttonIconGray";
  const ICON_WHITE = "buttonIconWhite";
  const MODE_EDIT_TEXT = "modeEditText";
  const MODE_SELECTION = "modeViewSelection";
  const MODE_SOURCE = "modeViewSource";
  const NS_URI_PATH = "../data/nsUri.json";
  const WARN_COLOR = "#C13832";
  const WARN_TEXT = "!";

  const EDITOR_PATH = "editorPath";
  const EDITOR_NAME = "editorName";
  const CMD_ARGS = "editorCmdArgs";
  const CMD_POSITION = "editorCmdPos";
  const SPAWN_SHELL = "editorShell";
  const KEY_ACCESS = "accessKey";
  const KEY_OPEN_OPTIONS = "optionsShortCut";
  const KEY_EXEC_EDITOR = "editorShortCut";
  const ENABLE_PB = "enablePB";
  const EDITABLE_CONTEXT = "editableContext";
  const FORCE_REMOVE = "forceRemove";
  const ID = "id";
  const IS_ENABLED = "isEnabled";
  const IS_EXECUTABLE = "isExecutable";
  const ICON_PATH = "iconPath";
  const FILE_EXT = "fileExt";
  const FILE_EXT_PATH = "../data/fileExt.json";
  const SYS_ENV = "sysEnv";
  const SYS_ENV_PATH = "../data/sysEnv.json";

  /* shortcuts */
  const browserAction = browser.browserAction;
  const contextMenus = browser.contextMenus;
  const i18n = browser.i18n;
  const runtime = browser.runtime;
  const storage = browser.storage.local;
  const tabs = browser.tabs;
  const windows = browser.windows;

  // NOTE: for hybrid
  /* port */
  const port = runtime.connect({name: PORT_BACKGROUND});

  /* variables */
  const vars = {};

  vars[EDITOR_PATH] = "";
  vars[EDITOR_NAME] = "";
  vars[CMD_ARGS] = "";
  vars[CMD_POSITION] = false;
  vars[SPAWN_SHELL] = false;
  vars[KEY_ACCESS] = "e";
  vars[KEY_OPEN_OPTIONS] = true;
  vars[KEY_EXEC_EDITOR] = true;
  vars[ENABLE_PB] = false;
  vars[EDITABLE_CONTEXT] = false;
  vars[FORCE_REMOVE] = true;
  vars[ID] = runtime.id;
  vars[IS_ENABLED] = false;
  vars[IS_EXECUTABLE] = false;
  vars[ICON_PATH] = `${ICON}#gray`;
  vars[FILE_EXT] = null;
  vars[SYS_ENV] = null;

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

  /* ports */
  /* ports collection */
  const ports = {};

  /**
   * restore ports collection
   * @param {Object} data - disconnected port data
   * @return {void}
   */
  const restorePorts = async data => {
    const windowId = (data.windowId === windows.WINDOW_ID_NONE ||
                      data.windowId === 0) &&
                     `${data.windowId}` ||
                     data.windowId;
    const tabId = (data.tabId === tabs.TAB_ID_NONE || data.tabId === 0) &&
                  `${data.tabId}` ||
                  data.tabId;
    const frameUrl = data.frameUrl === 0 && `${data.frameUrl}` || data.frameUrl;
    frameUrl ?
      windowId && tabId && ports[windowId] && ports[windowId][tabId] && (
        delete ports[windowId][tabId][frameUrl],
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
   * @param {Object} msg - message
   * @return {void}
   */
  const portMsg = async msg => {
    if (Object.keys(msg).length > 0) {
      const windowIds = Object.keys(ports);
      if (windowIds.length > 0) {
        for (let windowId of windowIds) {
          const tabIds = ports[windowId] && Object.keys(ports[windowId]);
          if (tabIds && tabIds.length > 0) {
            for (let tabId of tabIds) {
              const frameUrls = ports[windowId][tabId] &&
                                  Object.keys(ports[windowId][tabId]);
              if (frameUrls && frameUrls.length > 0) {
                for (let frameUrl of frameUrls) {
                  const conn = ports[windowId][tabId][frameUrl];
                  conn && conn.postMessage(msg);
                }
              }
            }
          }
        }
      }
      // NOTE: for hybrid
      port.postMessage(msg);
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
    const windowId = (tab.windowId === windows.WINDOW_ID_NONE ||
                      tab.windowId === 0) &&
                     `${tab.windowId}` || tab.windowId;
    const tabId = (tab.id === tabs.TAB_ID_NONE || tab.id === 0) &&
                  `${tab.id}` || tab.id;
    const frameUrl = info.frameUrl;
    ports[windowId] && ports[windowId][tabId] &&
    ports[windowId][tabId][frameUrl] &&
      ports[windowId][tabId][frameUrl].postMessage({getContent});
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
  const createContextMenuItems = async (enable = false) => {
    const items = [MODE_EDIT_TEXT, MODE_SELECTION, MODE_SOURCE];
    return contextMenus.removeAll().then(async () => {
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
  };

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
          case EDITOR_NAME:
            vars[item] = obj.value;
            break;
          case EDITOR_PATH:
            vars[item] = obj.value;
            vars[IS_EXECUTABLE] = obj.data && !!obj.data.executable;
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
    // NOTE: for hybrid
    else {
      port.postMessage({
        getSdkPrefs: res
      });
    }
  };

  // NOTE: for hybrid
  /**
   * create pref object
   * @param {Object} item - item
   * @param {string|boolean} value - value
   * @return {Object}
   */
  const createPrefObj = async (item, value) => {
    let pref = null;
    switch (item) {
      case EDITOR_PATH:
      case EDITOR_NAME:
      case CMD_ARGS:
      case KEY_ACCESS:
        item === EDITOR_NAME && (vars[item] = value);
        pref = {};
        pref[item] = {
          id: item,
          value: value || "",
          checked: false,
          data: {
            executable: value && item === EDITOR_PATH || false
          }
        };
        break;
      case CMD_POSITION:
      case SPAWN_SHELL:
      case KEY_OPEN_OPTIONS:
      case KEY_EXEC_EDITOR:
      case ENABLE_PB:
      case EDITABLE_CONTEXT:
      case FORCE_REMOVE:
        pref = {};
        pref[item] = {
          id: item,
          value: "",
          checked: !!value,
          data: {
            executable: false
          }
        };
        break;
      default:
    }
    return pref;
  };

  /**
   * set SDK prefs to storage
   * @param {Object} res - result
   * @return {void}
   */
  const setSdkPrefsToStorage = async res => {
    const items = Object.keys(res);
    if (items.length > 0) {
      for (let item of items) {
        createPrefObj(item, res[item]).then(setStorage).catch(logError);
      }
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
    ]));

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
          // NOTE: for hybrid
          case SDK_PREFS:
            setSdkPrefsToStorage(obj);
            break;
          default:
        }
      }
    }
  };

  /**
   * handle disconnected port
   * @param {Object} conn - runtime.Port
   * @return {void}
   */
  const handleDisconnectedPort = async conn => {
    const windowId = conn.sender.tab.windowId;
    const tabId = conn.sender.tab.id;
    const frameUrl = conn.sender.frameUrl;
    restorePorts({windowId, tabId, frameUrl});
  };

  /**
   * handle connected port
   * @param {Object} conn - runtime.Port
   * @return {void}
   */
  const handlePort = async conn => {
    const windowId = conn.sender.tab.windowId;
    const tabId = conn.sender.tab.id;
    const frameUrl = conn.sender.url;
    ports[windowId] = ports[windowId] || {};
    ports[windowId][tabId] = ports[windowId][tabId] || {};
    ports[windowId][tabId][frameUrl] = conn;
    conn.onMessage.addListener(handleMsg);
    conn.onDisconnect.addListener(handleDisconnectedPort);
    conn.postMessage({
      tabId,
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
          case EDITOR_PATH:
            vars[EDITOR_PATH] = obj.value;
            vars[IS_EXECUTABLE] = obj.data && !!obj.data.executable;
            toggleBadge();
            portVars({
              editorPath: obj.value
            });
            break;
          case EDITOR_NAME:
            vars[item] = obj.value;
            updateContextMenuItems();
            portVars({
              editorName: obj.value
            });
            break;
          case CMD_ARGS:
            vars[item] = obj.value;
            portVars({
              editorCmdArgs: obj.value
            });
            break;
          case CMD_POSITION:
            vars[item] = !!obj.checked;
            portVars({
              editorCmdPos: !!obj.checked
            });
            break;
          case SPAWN_SHELL:
            vars[item] = !!obj.checked;
            portVars({
              editorShell: !!obj.checked
            });
            break;
          case KEY_ACCESS:
            vars[item] = obj.value;
            portVars({
              accessKey: obj.value
            });
            break;
          case KEY_OPEN_OPTIONS:
            vars[item] = !!obj.checked;
            portVars({
              optionsShortCut: !!obj.checked
            });
            break;
          case KEY_EXEC_EDITOR:
            vars[item] = !!obj.checked;
            portVars({
              editorShortCut: !!obj.checked
            });
            break;
          case ENABLE_PB:
            vars[item] = !!obj.checked;
            syncUI();
            portVars({
              enablePB: !!obj.checked
            });
            break;
          case EDITABLE_CONTEXT:
            vars[item] = !!obj.checked;
            createContextMenuItems();
            portVars({
              editableContext: !!obj.checked
            });
            break;
          case FORCE_REMOVE:
            vars[item] = !!obj.checked;
            portVars({
              forceRemove: !!obj.checked
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
  port.onMessage.addListener(handleMsg);
  runtime.onMessage.addListener(handleMsg);
  runtime.onConnect.addListener(handlePort);
  tabs.onActivated.addListener(async info => {
    const windowId = info.windowId;
    const tabId = info.tabId;
    ports[windowId] && ports[windowId][tabId] ?
      createContextMenuItems(true) :
      createContextMenuItems();
  });
  tabs.onUpdated.addListener(async (tabId, info, tab) => {
    const status = info.status;
    const active = tab.active;
    const windowId = tab.windowId;
    if (status === "complete" && active) {
      ports[windowId] && ports[windowId][tabId] ?
      createContextMenuItems(active) :
      createContextMenuItems();
    }
  });
  windows.onFocusChanged.addListener(syncUI);
  windows.onRemoved.addListener(windowId => {
    Promise.all([
      restorePorts({windowId}),
      checkWindowIncognito().then(isIncognito => {
        !isIncognito && portMsg({
          removePrivateTmpFiles: !isIncognito
        });
      })
    ]).catch(logError);
  });

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
    }),
    fetch(SYS_ENV_PATH).then(async data => {
      const sysEnv = await data.json();
      sysEnv && (
        vars[SYS_ENV] = sysEnv,
        portMsg({sysEnv})
      );
    })
  ]).catch(logError);
}
