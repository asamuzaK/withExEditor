/**
 * background.js
 */
"use strict";
{
  /* shortcuts */
  const browserAction = browser.browserAction;
  const storage = browser.storage.local;
  const runtime = browser.runtime;

  /**
   * open options page
   * @return {void}
   */
  const openOptions = () => {
    runtime.openOptionsPage();
  };

  browserAction.onClicked.addListener(openOptions);
}
