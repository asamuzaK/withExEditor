/**
 * background.js
 */
"use strict";
{
  /* constants */
  const LABEL = "withExEditor";

  const PORT_BACKGROUND = "portBackground";
  const PORT_CONTENT = "portContent";
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
  const NS_URI_EXTEND_VALUE = 4;
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
  const vars = {
    editorPath: "",
    editorName: "",
    editorCmdArgs: "",
    editorCmdPos: false,
    editorShell: false,
    accessKey: "e",
    optionsShortCut: true,
    editorShortCut: true,
    enablePB: false,
    editableContext: false,
    forceRemove: true,
    isEnabled: false,
    isExecutable: false,
    iconPath: `${ICON}#gray`
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
   * check enabled
   * @return {void}
   */
  const checkEnabled = async () => {
    const win = await windows.getCurrent();
    const isEnabled = !win.incognito || vars.enablePB;
    vars.isEnabled = isEnabled;
  };

  /**
   * open options page
   * @return {void}
   */
  const openOptionsPage = async () => {
    vars.isEnabled && runtime.openOptionsPage();
  };

  /* icon */
  /**
   * replace icon
   * @param {Object} path - icon path
   * @return {void}
   */
  const replaceIcon = async (path = vars.iconPath) => {
    browserAction.setIcon({path});
  };

  /**
   * toggle icon
   * @return {void}
   */
  const toggleIcon = async () => {
    vars.isEnabled ?
      replaceIcon() :
      replaceIcon(`${ICON}#off`);
  };

  /**
   * toggle badge
   * @param {boolean} bool - executable
   * @return {void}
   */
  const toggleBadge = async (bool = vars.isExecutable) => {
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

  /* namespace URI */
  const nsURI = new NsURI();

  /**
   * create context menu items
   * @return {void}
   */
  const createContextMenuItems = async () => {
    const items = [MODE_EDIT_TEXT, MODE_SELECTION, MODE_SOURCE];
    contextMenus.removeAll();
    if (vars.isEnabled) {
      for (let item of items) {
        switch (item) {
          case MODE_EDIT_TEXT:
            menus[item] = await contextMenus.create({
              id: item,
              title: i18n.getMessage(item, vars.editorName || LABEL),
              contexts: ["editable"]
            }) || null;
            break;
          case MODE_SELECTION:
          case MODE_SOURCE:
            !vars.editableContext && (
              menus[item] = await contextMenus.create({
                id: item,
                title: i18n.getMessage(item, vars.editorName || LABEL),
                contexts: [
                  item === MODE_SELECTION && "selection" || "page"
                ]
              }) || null
            );
            break;
          default:
        }
      }
    }
  };

  /**
   * update context menu items
   * @return {void}
   */
  const updateContextMenuItems = async () => {
    const items = Object.keys(menus);
    if (items.length > 0) {
      for (let item of items) {
        items[item] &&
          contextMenus.update(item, {
            title: i18n.getMessage(item, vars.editorName || LABEL),
          });
      }
    }
  };

  /* storage */
  /**
   * set variables from storage
   * @param {Object} res - result
   * @return {void}
   */
  const setVariablesFromStorage = async res => {
    const items = Object.keys(res);
    if (items.length > 0) {
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
              vars.iconPath = obj.value
            );
            break;
          case EDITOR_NAME:
            vars[item] = obj.value;
            break;
          case EDITOR_PATH:
            vars[item] = obj.value;
            vars.isExecutable = obj.data && !!obj.data.executable;
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
   * set pref storage
   * @param {Object} pref - pref
   * @return {void}
   */
  const setPrefStorage = async pref => {
    pref && storage.set(pref);
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
        createPrefObj(item, res[item]).then(setPrefStorage).catch(logError);
      }
    }
  };

  /* UI */
  /**
   * synchronize UI components
   * @return {Object} - Promise
   */
  const syncUI = async () =>
    checkEnabled().then(() => Promise.all([
      portMsg({
        isEnabled: vars.isEnabled
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
   * handle storage changes
   * @param {Object} data - storage.StorageChange
   * @return {void}
   */
  const handleStorageChange = async data => {
    const items = Object.keys(data);
    for (let item of items) {
      const obj = data[item].newValue;
      switch (item) {
        case ICON_COLOR:
        case ICON_GRAY:
        case ICON_WHITE:
          obj.checked && (
            vars.iconPath = obj.value,
            replaceIcon()
          );
          break;
        case EDITOR_PATH:
          vars.editorPath = obj.value;
          vars.isExecutable = obj.data && !!obj.data.executable;
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
      setVars: vars
    });
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
  storage.get().then(setVariablesFromStorage).then(syncUI).catch(logError);
}
