/**
 * background.js
 */
"use strict";
{
  /* constants */
  const ACCESS_KEY = "accessKey";
  const EDITOR_PATH = "editorPath";
//  const EDITOR_NAME = "editorName";
  const EXEC_EDITOR_KEY = "editorShortcut";
  const KEY_COMBO = "keyCombo";
  const ICON_COLOR = "buttonIcon";
  const ICON_GRAY = "buttonIconGray";
  const ICON_WHITE = "buttonIconWhite";
  const OPEN_OPTIONS = "openOptions";
  const OPEN_OPTIONS_KEY = "optionsShortCut";
//  const PORT_BACKGROUND = "portBackground";
  const PORT_KBD = "portKbdEvent";
  const WARN_MARK = "!";
  const WARN_COLOR = "#C13832";

  /* shortcuts */
  const browserAction = browser.browserAction;
  const runtime = browser.runtime;
  const storage = browser.storage.local;

  /**
   * log error
   * @param {Object} e - Error
   * @return {boolean} - false
   */
  const logError = e => {
    e && console.error(e);
    return false;
  };

  /* connect to SDK */
  //const port = runtime.connect({name: PORT_BACKGROUND});

  /**
   * toggle button badge
   * @param {boolean} bool - boolean
   * @return {void}
   */
  const toggleButtonBadge = async bool => {
    const text = !bool && WARN_MARK || "";
    const color = !bool && WARN_COLOR || "transparent";
    browserAction.setBadgeText({text});
    browserAction.setBadgeBackgroundColor({color});
  };

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
  }).then(toggleButtonBadge).catch(logError);

  /**
   * replace icon
   * @param {Object} data - icon data
   * @return {void}
   */
  const replaceIcon = async data => {
    data && data.checked && data.value &&
      browserAction.setIcon({path: data.value});
  };

  storage.get([ICON_COLOR, ICON_GRAY, ICON_WHITE]).then(res => {
    const items = Object.keys(res);
    if (items.length > 0) {
      for (let item of items) {
        item = res[item];
        if (item.checked) {
          replaceIcon(item);
          break;
        }
      }
    }
  }).catch(logError);

  /**
   * open options page
   * @return {void}
   */
  const openOptionsPage = () => {
    runtime.openOptionsPage();
  };

  browserAction.onClicked.addListener(openOptionsPage);

  /* ports collection */
  const ports = {};

  /**
   * create key combination
   * @return {void}
   */
  const createKeyCombo = async () => {
    const key = await storage.get(ACCESS_KEY).then(res => {
      const value = (res = res[ACCESS_KEY]) && res.value ?
                      res.value :
                      "e";
      return value;
    });
    const openOptions = await storage.get(OPEN_OPTIONS_KEY).then(res => {
      const value = (res = res[OPEN_OPTIONS_KEY]) ?
                      res :
                      true;
      return value;
    });
    const execEditor = await storage.get(EXEC_EDITOR_KEY).then(res => {
      const value = (res = res[EXEC_EDITOR_KEY]) ?
              res :
              true;
      return value;
    });
    console.log(`post message to ${ports[PORT_KBD].name}`);
    ports[PORT_KBD] && ports[PORT_KBD].postMessage({
      keyCombo: {
        key, openOptions, execEditor
      }
    });
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
          item.checked && replaceIcon(item);
          break;
        case EDITOR_PATH:
          item.data && toggleButtonBadge(item.data.executable);
          break;
        case ACCESS_KEY:
        case EXEC_EDITOR_KEY:
        case OPEN_OPTIONS_KEY:
          createKeyCombo();
          break;
        default:
      }
    }
  };

  browser.storage.onChanged.addListener(storageChange);

  /**
   * handle runtime message
   * @param {*} msg - message
   * @return {void}
   */
  const handleMsg = async msg => {
    const items = Object.keys(msg);
    if (items.length > 0) {
      for (let item of items) {
        switch (item) {
          case KEY_COMBO:
            createKeyCombo();
            break;
          case OPEN_OPTIONS:
            msg[item] && openOptionsPage();
            break;
          default:
        }
      }
    }
  };

  runtime.onMessage.addListener(handleMsg);

  runtime.onConnect.addListener(port => {
    console.log(`port connected: ${port.name}`);
    ports[port.name] = port;
    port.onMessage.addListener(handleMsg);
  });
}
