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
  const windows = browser.windows;

  /* port */
  const port = runtime.connect({name: PORT_BACKGROUND});

  /* variables */
  let enablePB = false, isEnabled = false, iconPath = `${ICON_PATH}#gray`;

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
   * check enabled
   * @return {void}
   */
  const checkEnabled = async () => {
    const win = await windows.getCurrent();
    isEnabled = !win.incognito || enablePB;
    port.postMessage({isEnabled});
  };

  /**
   * open options page
   * @return {void}
   */
  const openOptionsPage = async () => {
    isEnabled && runtime.openOptionsPage();
  };

  /**
   * replace icon
   * @param {Object} path - icon path
   * @return {void}
   */
  const replaceIcon = async (path = `${ICON_PATH}#gray`) => {
    browserAction.setIcon({path});
  };

  /**
   * toggle icon
   * @return {Object} - Promise
   */
  const toggleIcon = async () =>
    checkEnabled().then(() => {
      isEnabled ?
        replaceIcon(iconPath) :
        replaceIcon(`${ICON_PATH}#off`);
    });

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
   * port SDK prefs
   * @param {Object} msg - message
   * @return {void}
   */
  const portSdkPrefs = async msg => {
    const setSdkPrefs = msg;
    setSdkPrefs && port.postMessage({setSdkPrefs});
  };

  /**
   * handle storage changes
   * @param {Object} data - StorageChange
   * @return {void}
   */
  const storageChange = async data => {
    const items = Object.keys(data);
    for (let item of items) {
      const obj = data[item].newValue;
      switch (item) {
        case ICON_COLOR:
        case ICON_GRAY:
        case ICON_WHITE:
          obj.checked && (
            iconPath = obj.value,
            replaceIcon(iconPath)
          );
          break;
        case EDITOR_PATH:
          obj.data && toggleBadge(obj.data.executable);
          portSdkPrefs({
            editorPath: obj.value
          });
          break;
        case EDITOR_NAME:
          portSdkPrefs({
            editorName: obj.value
          });
          break;
        case CMD_ARGS:
          portSdkPrefs({
            editorCmdArgs: obj.value
          });
          break;
        case CMD_POSITION:
          portSdkPrefs({
            editorCmdPos: !!obj.checked
          });
          break;
        case SPAWN_SHELL:
          portSdkPrefs({
            editorShell: !!obj.checked
          });
          break;
        case KEY_ACCESS:
          portKeyCombo();
          portSdkPrefs({
            accessKey: obj.value
          });
          break;
        case KEY_OPEN_OPTIONS:
          portKeyCombo();
          break;
        case KEY_EXEC_EDITOR:
          portKeyCombo();
          portSdkPrefs({
            editorShortCut: !!obj.checked
          });
          break;
        case ENABLE_PB:
          enablePB = !!obj.checked;
          portSdkPrefs({enablePB});
          break;
        case EDITABLE_CONTEXT:
          portSdkPrefs({
            editableContext: !!obj.checked
          });
          break;
        case FORCE_REMOVE:
          portSdkPrefs({
            forceRemove: !!obj.checked
          });
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
      port.postMessage({
        setSdkPrefs: res
      });
      for (let item of items) {
        const obj = res[item];
        switch (item) {
          case ENABLE_PB:
            enablePB = !!obj.checked;
            toggleIcon();
            break;
          case ICON_COLOR:
          case ICON_GRAY:
          case ICON_WHITE:
            obj.checked && (
              iconPath = obj.value,
              replaceIcon(obj.value)
            );
            break;
          case EDITOR_PATH:
            toggleBadge(obj.data.executable);
            break;
          default:
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
          case KEY_COMBO:
            portKeyCombo();
            break;
          case OPEN_OPTIONS:
            obj && openOptionsPage();
            break;
          case RES_SDK_PREFS:
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
  browser.windows.onFocusChanged.addListener(toggleIcon);

  /* startup */
  storage.get().then(setVariablesFromStorage).catch(logError);
}
