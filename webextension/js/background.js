/**
 * background.js
 */
"use strict";
{
  /* constants */
  const LABEL = "withExEditor";

  const PORT_BACKGROUND = "portBackground";
  const PORT_CONTENT = "portContent";
  const CONTEXT_TYPE = "contextType";
  const OPEN_OPTIONS = "openOptions";
  const SDK_PREFS = "sdkPrefs";

  const ICON = "./img/icon.svg";
  const ICON_COLOR = "buttonIcon";
  const ICON_GRAY = "buttonIconGray";
  const ICON_WHITE = "buttonIconWhite";
  const MODE_EDIT_TEXT = "modeEditText";
//  const MODE_MATHML = "modeViewMathML";
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
  const windows = browser.windows;

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

  /**
   * check enabled
   * @return {void}
   */
  const checkEnabled = async () => {
    const win = await windows.getCurrent();
    const isEnabled = !win.incognito || vars[ENABLE_PB];
    vars[IS_ENABLED] = isEnabled;
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
   * port message
   * @param {Object} msg - message
   * @return {void}
   */
  const portMsg = async msg => {
    if (Object.keys(msg).length > 0) {
      const items = ports[PORT_CONTENT] && Object.keys(ports[PORT_CONTENT]);
      if (items && items.length > 0) {
        for (let item of items) {
          items[item] && items[item].postMessage(msg);
        }
      }
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
    ports[PORT_CONTENT][tab.id] &&
      ports[PORT_CONTENT][tab.id].postMessage({getContent});
  };

  /* context menu */
  /* context menu items collection */
  const menus = {};

  // NOTE: no "mathml" context type, no "accesskey" feature
  /**
   * create context menu items
   * @return {void}
   */
  const createContextMenuItems = async () => {
    const items = [MODE_EDIT_TEXT, MODE_SELECTION, MODE_SOURCE];
    contextMenus.removeAll().then(async () => {
      for (let item of items) {
        switch (item) {
          case MODE_EDIT_TEXT:
            menus[item] = vars[IS_ENABLED] && await contextMenus.create({
              id: item,
              title: i18n.getMessage(item, vars[EDITOR_NAME] || LABEL),
              contexts: ["editable"]
            }) || null;
            break;
          case MODE_SELECTION:
          case MODE_SOURCE:
            menus[item] = vars[IS_ENABLED] && !vars[EDITABLE_CONTEXT] &&
              await contextMenus.create({
                id: item,
                title: i18n.getMessage(item, vars[EDITOR_NAME] || LABEL),
                contexts: [
                  item === MODE_SELECTION && "selection" || "page"
                ]
              }) || null;
            break;
          default:
        }
      }
    }).catch(logError);
  };

  // NOTE: does not update. bug?
  /**
   * update context menu items
   * @param {Object} type - context type data
   * @return {void}
   */
  const updateContextMenuItems = (type = null) => {
    const items = Object.keys(menus);
    if (items.length > 0) {
      if (type) {
        switch (type.menuItemId) {
          case MODE_EDIT_TEXT:
            menus[MODE_EDIT_TEXT] &&
              contextMenus.update(MODE_EDIT_TEXT, {
                enabled: !!type.enabled
              });
            break;
          case MODE_SOURCE:
            menus[MODE_SOURCE] &&
              contextMenus.update(MODE_SOURCE, {
                title: i18n.getMessage(type.mode || MODE_SOURCE,
                                       vars[EDITOR_NAME] || LABEL)
              });
            break;
          default:
        }
      }
      else {
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
    else {
      port.postMessage({
        getSdkPrefs: res
      });
    }
  };

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
      toggleBadge(),
      createContextMenuItems()
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
          case CONTEXT_TYPE:
            obj && updateContextMenuItems(obj[CONTEXT_TYPE]);
            break;
          case OPEN_OPTIONS:
            obj && openOptionsPage();
            break;
          case SDK_PREFS:
            setSdkPrefsToStorage(obj);
            break;
          default:
        }
      }
    }
  };

  /**
   * handle connected port
   * @param {Object} conn - runtime.Port
   * @return {void}
   */
  const handlePort = async conn => {
    const id = conn.sender.tab.id;
    ports[conn.name] = ports[conn.name] || {};
    ports[conn.name][id] = conn;
    conn.onMessage.addListener(handleMsg);
    conn.onDisconnect.addListener(() => {
      delete ports[conn.name][id];
    });
    conn.postMessage({
      setVars: vars,
      tabId: id
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
  windows.onFocusChanged.addListener(syncUI);

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
