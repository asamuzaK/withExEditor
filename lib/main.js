/**
 * main.js (hybrid)
 */
"use strict";
{
  /* sdk */
  const {join} = require("sdk/fs/path");
  const fs = require("sdk/io/fs");
  const self = require("sdk/self");
  const simplePrefs = require("sdk/simple-prefs");
  const simpleStorage = require("sdk/simple-storage");
  const system = require("sdk/system");
  const webExtension = require("sdk/webextension");

  /* constants */
  const DIR_PREF = system.pathFor("PrefD");
  const PREFS = "WithExEditorPrefs";
  const SDK_PREFS_REMOVE = "removeSdkPrefs";

  /**
   * log error
   * @param {!Object} e - Error
   * @returns {boolean} - false
   */
  const logError = e => {
    console.error(e);
    return false;
  };

  /**
   * is string
   * @param {*} o - object to check
   * @returns {boolean} - result
   */
  const isString = o => typeof o === "string" || o instanceof String;

  /**
   * remove the directory
   * @param {string} path - directory path
   * @param {boolean} rec - recursive
   * @returns {Object} - Promise.<void>
   */
  const removeDir = async (path, rec) => {
    isString(path) && fs.existsSync(path) && fs.rmdirSync(path, !!rec);
  };

  /* clean up sdk settings */
  /**
   * remove sdk prefs and storage
   * @returns {Object} - Promise.<void>
   */
  const removeSdkPrefs = async () => {
    /* remove sdk prefs */
    const {prefs} = simplePrefs;
    delete prefs[`${PREFS}File`];
    delete prefs[`${PREFS}Path`];
    delete prefs[`${PREFS}CmdArgs`];
    delete prefs[`${PREFS}CmdPos`];
    delete prefs[`${PREFS}Shell`];
    delete prefs[`${PREFS}AccessKey`];
    delete prefs[`${PREFS}Hotkey`];
    delete prefs[`${PREFS}ExecEditor`];
    delete prefs[`${PREFS}EnablePB`];
    delete prefs[`${PREFS}Context`];
    delete prefs[`${PREFS}ForceRemove`];
    delete prefs[`${PREFS}Panel`];
    delete simpleStorage.storage.withExEditor;

    /* remove jetpack storage */
    removeDir(join(DIR_PREF, "jetpack", self.id), true).catch(logError);
  };

  exports.main = () => webExtension.startup().then(api => {
    /* api */
    const {browser} = api;
    const {runtime} = browser;

    /**
     * port webextension
     * @param {Object} port - runtime.Port
     * @returns {Object} - Promise.<void>
     */
    const portWebExtension = async port => {
      /**
       * handle port message
       * @param {*} msg - message
       * @returns {Object} - Promise.<?AsyncFunction>
       */
      const handleMsg = async msg => {
        let func;
        const items = msg && Object.keys(msg);
        if (items && items.length) {
          for (const item of items) {
            const obj = msg[item];
            if (item === SDK_PREFS_REMOVE) {
              obj && (func = removeSdkPrefs());
              break;
            }
          }
        }
        return func || null;
      };

      /* listener */
      port.onMessage.addListener(msg => handleMsg(msg).catch(logError));
    };

    /* listener */
    runtime.onConnect.addListener(port =>
      portWebExtension(port).catch(logError)
    );
  }).catch(logError);
}
