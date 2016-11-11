/**
 * background.js
 */
"use strict";
{
  /* constants */
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

  storage.get("editorPath").then(res => {
    const items = Object.keys(res);
    let bool = false;
    for (let item of items) {
      if (item === "editorPath") {
        bool = items[item].data && items[item].data.executable || false;
        break;
      }
    }
    return bool;
  }).then(toggleButtonBadge).catch(logError);

  /**
   * open options page
   * @return {void}
   */
  const openOptions = () => {
    runtime.openOptionsPage();
  };

  browserAction.onClicked.addListener(openOptions);

  /**
   * replace icon
   * @param {Object} data - icon data
   * @return {void}
   */
  const replaceIcon = async data => {
    data && data.checked && data.value &&
      browserAction.setIcon({path: data.value});
  };

  /**
   * handle storage changes
   * @param {Object} data - StorageChange
   * @return {void}
   */
  const storageChange = async data => {
    const items = Object.keys(data);
    for (let item of items) {
      switch (item) {
        case "buttonIcon":
        case "buttonIconGray":
        case "buttonIconWhite":
          data[item].newValue.checked && replaceIcon(data[item].newValue);
          break;
        case "editorPath":
          data[item].newValue.data &&
            toggleButtonBadge(data[item].newValue.data.executable);
          break;
        default:
      }
    }
  };

  browser.storage.onChanged.addListener(storageChange);
}
