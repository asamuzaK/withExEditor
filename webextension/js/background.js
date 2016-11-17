/**
 * background.js
 */
"use strict";
{
  /* constants */
  const LABEL = "withExEditor";

  const PORT_BACKGROUND = "portBackground";
  const PORT_CONTENT = "portContent";
  const CONTEXT_MENU = "contextMenu";
  const KEY_COMBO = "keyCombo";
  const NS_URI = "nsURI";
  const OPEN_OPTIONS = "openOptions";
  const SDK_PREFS = "sdkPrefs";

  const ICON = "./img/icon.svg";
  const ICON_COLOR = "buttonIcon";
  const ICON_GRAY = "buttonIconGray";
  const ICON_WHITE = "buttonIconWhite";
  const MODE_EDIT_TEXT = "modeEditText";
  const MODE_EDIT_TEXT_SELECT = "modeEditTextSelect";
  const MODE_VIEW_MATHML = "modeViewMathML";
  const MODE_VIEW_SELECTION = "modeViewSelection";
  const MODE_VIEW_SOURCE = "modeViewSource";
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
    editorName: "",
    enablePB: false,
    isEnabled: false,
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
   * is string
   * @param {*} o - object to check
   * @return {boolean}
   */
  const isString = o =>
    o && (typeof o === "string" || o instanceof String) || false;

  /* classes */
  /* namespace URI class */
  class NsURI {
    constructor() {
      this._extended = false;
      this._ns = {
        html: "http://www.w3.org/1999/xhtml",
        math: "http://www.w3.org/1998/Math/MathML",
        svg: "http://www.w3.org/2000/svg",
        xmlns: "http://www.w3.org/2000/xmlns/"
      };
    }

    get extended() {
      return this._extended;
    }

    set extended(bool) {
      const items = Object.keys(this._ns);
      this._extended = items.length > NS_URI_EXTEND_VALUE && !!bool || false;
    }

    get ns() {
      return this._ns;
    }

    set ns(data) {
      const items = Object.keys(data);
      items.length > NS_URI_EXTEND_VALUE && (this._ns = data);
    }
  }

  /**
   * check enabled
   * @return {void}
   */
  const checkEnabled = async () => {
    const win = await windows.getCurrent();
    const isEnabled = !win.incognito || vars.enablePB;
    vars.isEnabled = isEnabled;
    port.postMessage({isEnabled});
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
  const replaceIcon = async (path = `${ICON}#gray`) => {
    browserAction.setIcon({path});
  };

  /**
   * toggle icon
   * @return {Object} - Promise
   */
  const toggleIcon = async () =>
    checkEnabled().then(() => {
      vars.isEnabled ?
        replaceIcon(vars.iconPath) :
        replaceIcon(`${ICON}#off`);
    });

  /**
   * toggle badge
   * @param {boolean} bool - executable
   * @return {void}
   */
  const toggleBadge = async bool => {
    const color = !bool && WARN_COLOR || "transparent";
    const text = !bool && WARN_TEXT || "";
    browserAction.setBadgeBackgroundColor({color});
    browserAction.setBadgeText({text});
  };

  /* ports */
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
                      !!res.checked :
                      true;
      return value;
    });
    const execEditor = await storage.get(KEY_EXEC_EDITOR).then(res => {
      const value = (res = res[KEY_EXEC_EDITOR]) ?
                      !!res.checked :
                      true;
      return value;
    });
    const isEnabled = vars.isEnabled;
    const keyCombo = {key, openOptions, execEditor, isEnabled};
    ports[PORT_CONTENT] && ports[PORT_CONTENT].postMessage({keyCombo});
  };

  /**
   * port variables
   * @param {Object} msg - message
   * @return {void}
   */
  const portVars = async msg => {
    const setVars = msg;
    setVars && port.postMessage({setVars});
  };

  /* namespace URI */
  const nsURI = new NsURI();

  /* context menu */
  const menu = {
    modeViewSource: contextMenus.create({
      id: MODE_VIEW_SOURCE,
      title: i18n.getMessage(MODE_VIEW_SOURCE, vars.editorName || LABEL),
      contexts: ["page"],
      onclick: () => false,
      enabled: false
    }),
    modeEditTextSelect: contextMenus.create({
      id: MODE_EDIT_TEXT_SELECT,
      title: i18n.getMessage(MODE_EDIT_TEXT, vars.editorName || LABEL),
      contexts: ["editable", "selection"],
      onclick: () => false,
      enabled: false
    }),
    modeEditText: contextMenus.create({
      id: MODE_EDIT_TEXT,
      title: i18n.getMessage(MODE_EDIT_TEXT, vars.editorName || LABEL),
      contexts: ["editable"],
      onclick: () => false,
      enabled: false
    }),
    modeViewSelection: contextMenus.create({
      id: MODE_VIEW_SELECTION,
      title: i18n.getMessage(MODE_VIEW_SELECTION, vars.editorName || LABEL),
      contexts: ["selection"],
      onclick: () => false,
      enabled: false
    })
  };

  /**
   * replace context menu items
   * @param {string} ns - namespace URI
   * @return {void}
   */
  const replaceContextMenu = async (ns = nsURI.ns.html) => {
    const items = Object.keys(menu);
    if (items.length === 0) {
      for (let item of items) {
        switch (item) {
          case MODE_VIEW_SOURCE:
            isString(ns) && ns === nsURI.ns.math ?
              contextMenus.update(item, {
                title: i18n.getMessage(MODE_VIEW_MATHML, vars.editorName),
                enabled: vars.isEnabled
              }) :
              contextMenus.update(item, {
                title: i18n.getMessage(item, vars.editorName),
                enabled: vars.isEnabled
              });
            break;
          case MODE_EDIT_TEXT_SELECT:
            contextMenus.update(item, {
              title: i18n.getMessage(MODE_EDIT_TEXT, vars.editorName),
              enabled: vars.isEnabled
            });
            break;
          default:
            contextMenus.update(item, {
              title: i18n.getMessage(item, vars.editorName),
              enabled: vars.isEnabled
            });
        }
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
      port.postMessage({
        setVars: res
      });
      for (let item of items) {
        const obj = res[item];
        switch (item) {
          case ENABLE_PB:
            vars[item] = !!obj.checked;
            toggleIcon();
            break;
          case ICON_COLOR:
          case ICON_GRAY:
          case ICON_WHITE:
            obj.checked && (
              vars.iconPath = obj.value,
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
            replaceContextMenu(obj.nsURI);
            break;
          case KEY_COMBO:
            portKeyCombo();
            break;
          case NS_URI:
            !nsURI.extended && (
              nsURI.ns = obj,
              nsURI.extended = true
            );
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
            replaceIcon(obj.value)
          );
          break;
        case EDITOR_PATH:
          obj.data && toggleBadge(obj.data.executable);
          portVars({
            editorPath: obj.value
          });
          break;
        case EDITOR_NAME:
          vars[item] = obj.value;
          replaceContextMenu();
          portVars({
            editorName: obj.value
          });
          break;
        case CMD_ARGS:
          portVars({
            editorCmdArgs: obj.value
          });
          break;
        case CMD_POSITION:
          portVars({
            editorCmdPos: !!obj.checked
          });
          break;
        case SPAWN_SHELL:
          portVars({
            editorShell: !!obj.checked
          });
          break;
        case KEY_ACCESS:
          portKeyCombo();
          portVars({
            accessKey: obj.value
          });
          break;
        case KEY_OPEN_OPTIONS:
          portKeyCombo();
          break;
        case KEY_EXEC_EDITOR:
          portKeyCombo();
          portVars({
            editorShortCut: !!obj.checked
          });
          break;
        case ENABLE_PB:
          vars[item] = !!obj.checked;
          portVars({
            enablePB: !!obj.checked
          });
          break;
        case EDITABLE_CONTEXT:
          portVars({
            editableContext: !!obj.checked
          });
          break;
        case FORCE_REMOVE:
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
    ports[conn.name] = conn;
    conn.onMessage.addListener(handleMsg);
  };

  /* add listeners */
  browserAction.onClicked.addListener(openOptionsPage);
  browser.storage.onChanged.addListener(handleStorageChange);
  port.onMessage.addListener(handleMsg);
  runtime.onMessage.addListener(handleMsg);
  runtime.onConnect.addListener(handlePort);
  windows.onFocusChanged.addListener(toggleIcon);

  /* startup */
  storage.get().then(setVariablesFromStorage).catch(logError);
}
