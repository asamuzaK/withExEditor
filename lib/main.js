/**
 * main.js (hybrid)
 */
"use strict";
{
  /* sdk */
  const {basename, join} = require("sdk/fs/path");
  const fs = require("sdk/io/fs");
  const self = require("sdk/self");
  const simplePrefs = require("sdk/simple-prefs");
  const simpleStorage = require("sdk/simple-storage");
  const system = require("sdk/system");
  const urls = require("sdk/url");
  const webExtension = require("sdk/webextension");

  /* constants */
  const LABEL = "withExEditor";
  const PREFS = "WithExEditorPrefs";
  const CHAR = "UTF-8";
  const MASK_BIT = 0o111;
  const PERM_FILE = 0o666;
  const PERM_DIR = 0o777;
  const TMP_FILES = "tmpFiles";
  const TMP_FILES_PB = "tmpFilesPb";
  const DIR_PREF = system.pathFor("PrefD");
  const PREF_LABEL = /^.+\.([^.]+)$/.exec(basename(DIR_PREF));
  const DIR_TMP = join(
    system.pathFor("TmpD"),
    LABEL,
    PREF_LABEL && PREF_LABEL[1] || LABEL
  );
  const DIR_TMP_FILES = join(DIR_TMP, TMP_FILES);
  const DIR_TMP_FILES_PB = join(DIR_TMP, TMP_FILES_PB);

  const CHECK_EXECUTABLE = "checkExecutable";
  const CREATE_TMP_FILE = "createTmpFile";
  const FORCE_REMOVE = "forceRemove";
  const GET_APP_MANIFEST = "getAppManifest";
  const GET_FILE_PATH = "getFilePath";
  const GET_TMP_FILE = "getTmpFile";
  const PORT_FILE_PATH = "portFilePath";
  const REMOVE_PB_TMP_FILES = "removePrivateTmpFiles";
  const REMOVE_SDK_PREFS = "removeSdkPrefs";
  const RES_APP_MANIFEST = "resAppManifest";
  const RES_EXECUTABLE = "resExecutable";
  const SET_VARS = "setVars";
  const SYNC_TEXT = "syncText";

  /* variables */
  const vars = {
    [FORCE_REMOVE]: true,
  };

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
  const isString = o =>
    o && (typeof o === "string" || o instanceof String) || false;

  /**
   * get file name from native file path
   * @param {string} path - file path
   * @returns {string} - file name
   */
  const getFileNameFromFilePath = async path => {
    const name = isString(path) && /^([^.]+)(?:\..+)?$/.exec(basename(path));
    return name && name[1] || LABEL;
  };

  /**
   * convert URI to native file path
   * @param {string} uri - URI
   * @returns {?string} - file path
   */
  const convUriToFilePath = async uri =>
    isString(uri) && urls.toFilename(uri) || null;

  /**
   * the file is a file
   * @param {string} path - file path
   * @returns {boolean} - result
   */
  const isFile = async path =>
    isString(path) && fs.existsSync(path) && (new fs.Stats(path)).isFile();

  /**
   * the file is executable
   * @param {string} path - file path
   * @param {number} mask - mask bit
   * @returns {Object} - Promise.<boolean> - result
   */
  const isExecutable = async (path, mask = MASK_BIT) =>
    isFile(path).then(bool => bool && !!((new fs.Stats(path)).mode & mask));

  /**
   * remove the directory
   * @param {string} path - directory path
   * @param {boolean} rec - recursive
   * @returns {void}
   */
  const removeDir = async (path, rec) => {
    isString(path) && fs.existsSync(path) && fs.rmdirSync(path, !!rec);
  };

  /**
   * create a directory
   * @param {string} path - directory path
   * @param {string|number} mode - permission
   * @returns {void}
   */
  const createDir = async (path, mode = PERM_DIR) => {
    isString(path) && !fs.existsSync(path) && fs.mkdirSync(path, mode);
  };

  /**
   * create a file
   * @param {string} path - file path
   * @param {string} value - value to write
   * @param {Function} callback - callback when write completes
   * @param {Object} opt - callback option
   * @param {number|string} mode - file permission
   * @param {string} encoding - file encoding
   * @returns {void}
   */
  const createFile = async (path, value = "", callback = null, opt = null,
                            mode = PERM_FILE, encoding = CHAR) => {
    isString(path) && fs.writeFile(path, value, encoding, e => {
      e ?
        logError(e) :
        (fs.chmodSync(path, mode), callback && callback(path, opt));
    });
  };

  /**
   * read a file
   * @param {string} path - file path
   * @param {Function} callback - callback when read completes
   * @param {Object} opt - callback option
   * @param {string} encoding - file encoding
   * @returns {void}
   */
  const readFile = async (path, callback = null, opt = null,
                          encoding = CHAR) => {
    isString(path) && fs.readFile(path, encoding, (e, value) => {
      e ?
        logError(e) :
        callback && callback(value, opt);
    });
  };

  /**
   * get file timestamp
   * @param {string} path - file path
   * @returns {number} - timestamp
   */
  const getFileTimestamp = async path =>
    isString(path) && (new fs.Stats(path)).mtime || 0;

  /**
   * remove private temporary files
   * @returns {Object} - Promise.<void>
   */
  const removePrivateTmpFiles = () =>
    removeDir(DIR_TMP_FILES_PB, vars[FORCE_REMOVE]).then(() =>
      createDir(DIR_TMP_FILES_PB)
    );

  /**
   * create temporary file
   * @param {Object} data - temporary file data
   * @param {string} value - value
   * @param {Function} callback - callback
   * @returns {Object} - ?Promise.<void>
   */
  const createTmpFile = async (data = {}, value = "", callback = null) => {
    const {dir, fileName, host, tabId, windowId} = data;
    const path = dir && windowId && tabId && host &&
                   join(DIR_TMP, dir, windowId, tabId, host);
    return path && fileName && createDir(path).then(() =>
      createFile(join(path, fileName), value, callback, data)
    ) || null;
  };

  /* clean up sdk settings */
  /**
   * remove sdk prefs and storage
   * @returns {void}
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

  exports.main = () => Promise.all([
    webExtension.startup().then(api => {
      /* api */
      const {browser} = api;
      const {runtime} = browser;

      /**
       * port webextension
       * @param {Object} port - runtime.Port
       * @returns {void}
       */
      const portWebExtension = async port => {
        /**
         * port message
         * @param {*} msg - message
         * @returns {void}
         */
        const portMsg = async msg => {
          msg && port.postMessage(msg);
        };

        /**
         * port file path
         * @param {string} path - file path
         * @param {Object} data - file data
         * @returns {Object} - ?Promise.<void>
         */
        const portFilePath = async (path, data) =>
          path && data && portMsg({
            [PORT_FILE_PATH]: {path, data},
          }) || null;

        /**
         * port sync text
         * @param {Object} value - text
         * @param {Object} data - file data
         * @returns {Object} - ?Promise.<void>
         */
        const portSyncText = async (value, data) => {
          let msg;
          if (value && data) {
            const {dataId, tabId} = data;
            msg = {
              [SYNC_TEXT]: {data, dataId, tabId, value},
            };
          }
          return msg && portMsg(msg).catch(logError) || null;
        };

        /**
         * get temporary file
         * @param {Object} data - temporary file data
         * @returns {Object} - ?Promise.<void>
         */
        const getTmpFile = async (data = {}) => {
          const {path} = data;
          return path && readFile(path, portSyncText, data) || null;
        };

        /**
         * append file timestamp
         * @param {Object} data - temporary file data
         * @returns {Object} - temporary file data
         */
        const appendTimestamp = async (data = {}) => {
          const {path} = data;
          data.timestamp = path && await getFileTimestamp(path) || 0;
          return data;
        };

        /**
         * port app manifest
         * @param {Object} res - Response
         * @returns {Object} - ?Promise.<void>
         */
        const portAppManifest = async res =>
          res && portMsg({
            [RES_APP_MANIFEST]: {
              value: res,
            },
          }).catch(logError) || null;

        /**
         * get app manifest
         * @param {string} path - app manifest path
         * @returns {Object} - ?Promise.<void>
         */
        const getAppManifest = async path =>
          await isFile(path) && readFile(path, portAppManifest) || null;

        /**
         * check the file of given path is executable
         * @param {string} path - path
         * @returns {Object} - result data
         */
        const checkExecutable = async path => {
          const executable = await isExecutable(path) || false;
          const name = executable &&
                       await getFileNameFromFilePath(path) || "";
          return {
            [RES_EXECUTABLE]: {
              executable, name,
              value: path,
            },
          };
        };

        /**
         * handle port message
         * @param {*} msg - message
         * @returns {Object} - Promise.<Array<*>>
         */
        const handleMsg = async msg => {
          const func = [];
          const items = msg && Object.keys(msg);
          if (items && items.length) {
            for (const item of items) {
              const obj = msg[item];
              switch (item) {
                case SET_VARS:
                  func.push(handleMsg(obj));
                  break;
                case CHECK_EXECUTABLE:
                  func.push(checkExecutable(obj.path).then(portMsg));
                  break;
                case CREATE_TMP_FILE:
                  func.push(createTmpFile(obj.data, obj.value, portFilePath));
                  break;
                case GET_APP_MANIFEST:
                  func.push(getAppManifest(obj.path));
                  break;
                case GET_FILE_PATH:
                  func.push(convUriToFilePath(obj.uri).then(portFilePath));
                  break;
                case GET_TMP_FILE:
                  func.push(appendTimestamp(obj).then(getTmpFile));
                  break;
                case REMOVE_PB_TMP_FILES:
                  obj && func.push(removePrivateTmpFiles());
                  break;
                case REMOVE_SDK_PREFS:
                  obj && func.push(removeSdkPrefs());
                  break;
                case FORCE_REMOVE:
                  vars[item] = !!obj;
                  break;
                default:
              }
            }
          }
          return Promise.all(func);
        };

        /* listener */
        port.onMessage.addListener(msg => handleMsg(msg).catch(logError));
      };

      /* listener */
      runtime.onConnect.addListener(port =>
        portWebExtension(port).catch(logError)
      );
    }),
    createDir(DIR_TMP_FILES),
    createDir(DIR_TMP_FILES_PB),
  ]).catch(logError);

  exports.onUnload = () => {
    /* remove temporary files */
    removeDir(DIR_TMP, vars[FORCE_REMOVE]).catch(logError);
  };
}
