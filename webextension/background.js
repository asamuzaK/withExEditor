/**
 * background.js
 */
"use strict";
{
  /* constants */
  const LABEL = "withExEditor";
  const ICON_PATH = "./img/icon.svg";
  const ICON_COLOR = "buttonIcon";
  const ICON_GRAY = "buttonIconGray";
  const ICON_WHITE = "buttonIconWhite";
  const WARN_MARK = "!";
  const WARN_COLOR = "#C13832";
  const WARN_EDITOR = "warnEditorNotSelected";

  const PORT_BACKGROUND = "portBackground";
  const PORT_CONTENT = "portContent";
  const KEY_COMBO = "keyCombo";
  const OPEN_OPTIONS = "openOptions";
  const TOGGLE_ENABLED = "toggleEnabled";
  const RES_SDK_PREFS = "resSdkPrefs";

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
  const i18n = browser.i18n;
  const runtime = browser.runtime;
  const storage = browser.storage.local;

  /* port to SDK */
  const port = runtime.connect({name: PORT_BACKGROUND});

  /* variables */
  let isEnabled = false;

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
   * log warning
   * @param {string} m - message
   * @return {boolean} - false
   */
  const logWarn = m => {
    m && console.warn(m);
    return false;
  };

  /**
   * open options page
   * @return {void}
   */
  const openOptionsPage = async () => {
    isEnabled && runtime.openOptionsPage();
  };

  /**
   * toggle badge
   * @param {boolean} bool - executable
   * @return {void}
   */
  const toggleBadge = async bool => {
    const text = !bool && WARN_MARK || "";
    const color = !bool && WARN_COLOR || "transparent";
    browserAction.setBadgeText({text});
    browserAction.setBadgeBackgroundColor({color});
    !bool && logWarn(`${LABEL}: ${i18n.getMessage(WARN_EDITOR)}`);
  };

  /**
   * check stored editor path is executable
   * @return {Object} - Promise
   */
  const isExecutable = () =>
    storage.get(EDITOR_PATH).then(res => {
      const items = Object.keys(res);
      let bool = false;
      if (items.length > 0) {
        for (let item of items) {
          item = res[item];
          if (item.id === EDITOR_PATH) {
            bool = item.data && item.data.executable || false;
            break;
          }
        }
      }
      return bool;
    });

  /**
   * replace icon
   * @param {Object} path - icon path
   * @return {void}
   */
  const replaceIcon = async (path = ICON_PATH) => {
    browserAction.setIcon({path});
  };

  /**
   * get selected icon from storage
   * @return {Object} - Promise
   */
  const getIconSelected = () =>
    storage.get([ICON_COLOR, ICON_GRAY, ICON_WHITE]).then(res => {
      const items = Object.keys(res);
      let path = ICON_PATH;
      if (items.length > 0) {
        for (let item of items) {
          item = res[item];
          if (item.checked) {
            path = item.value;
            break;
          }
        }
      }
      return path;
    });

  /**
   * toggle icon
   * @param {boolean} bool - enabled
   * @return {void}
   */
  const toggleIcon = async (bool = false) => {
    (isEnabled = !!bool) ?
      getIconSelected().then(replaceIcon) :
      replaceIcon(`${ICON_PATH}#off`);
  };

  /* ports collection */
  const ports = {};

  /**
   * port key combination
   * @return {void}
   */
  const portKeyCombo = async () => {
    const key = await storage.get(KEY_ACCESS).then(res => {
      const value = (res = res[KEY_ACCESS]) && res.value ?
                      res.value :
                      "e";
      return value;
    });
    const openOptions = await storage.get(KEY_OPEN_OPTIONS).then(res => {
      const value = (res = res[KEY_OPEN_OPTIONS]) ?
                      res :
                      true;
      return value;
    });
    const execEditor = await storage.get(KEY_EXEC_EDITOR).then(res => {
      const value = (res = res[KEY_EXEC_EDITOR]) ?
                      res :
                      true;
      return value;
    });
    const keyCombo = {key, openOptions, execEditor};
    ports[PORT_CONTENT] && ports[PORT_CONTENT].postMessage({keyCombo});
  };

  /**
   * handle storage changes
   * @param {Object} data - StorageChange
   * @return {void}
   */
  const storageChange = async data => {
    const items = Object.keys(data);
    for (let item of items) {
      item = data[item].newValue;
      switch (item.id) {
        case ICON_COLOR:
        case ICON_GRAY:
        case ICON_WHITE:
          item.checked && replaceIcon(item.value);
          break;
        case EDITOR_PATH:
          item.data && toggleBadge(item.data.executable);
          break;
        case KEY_ACCESS:
        case KEY_OPEN_OPTIONS:
        case KEY_EXEC_EDITOR:
          portKeyCombo();
          break;
        default:
      }
    }
  };

  /**
   * set variables from storage
   * @param {Object} res - result
   * @return {void}
   */
  const setVariablesFromStorage = async res => {
    const items = Object.keys(res);
    if (items.length > 0) {
      for (let item of items) {
        switch (item) {
          default:
            console.log(item);
        }
      }
    }
    else {
      port.postMessage({
        getSdkPrefs: res
      });
    }
  };

  /**
   * handle runtime message
   * @param {*} msg - message
   * @return {void}
   */
  const handleMsg = async msg => {
    const items = Object.keys(msg);
    console.log(`background handleMsg items: ${items}`);
    if (items.length > 0) {
      for (let item of items) {
        const obj = msg[item];
        console.log(obj);
        switch (item) {
          case KEY_COMBO:
            portKeyCombo();
            break;
          case OPEN_OPTIONS:
            obj && openOptionsPage();
            break;
          case RES_SDK_PREFS:
            setVariablesFromStorage(obj);
            break;
          case TOGGLE_ENABLED:
            toggleIcon(obj);
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
  const handleConnectedPort = async conn => {
    ports[conn.name] = conn;
    conn.onMessage.addListener(handleMsg);
  };

  /* add listeners */
  browserAction.onClicked.addListener(openOptionsPage);
  browser.storage.onChanged.addListener(storageChange);
  port.onMessage.addListener(handleMsg);
  runtime.onMessage.addListener(handleMsg);
  runtime.onConnect.addListener(handleConnectedPort);

  /* startup */
  Promise.all([
    storage.get().then(setVariablesFromStorage),
    isExecutable().then(toggleBadge),
    toggleIcon().then(replaceIcon)
  ]).catch(logError);
}
