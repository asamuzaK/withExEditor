/**
 * main.js (hybrid)
 */
"use strict";
{
  /* sdk */
  const {basename, join} = require("sdk/fs/path");
  const {ns} = require("sdk/core/namespace");
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
  const DIR_TMP = join(
    system.pathFor("TmpD"),
    LABEL,
    /^.+\.([^.]+)$/.test(basename(DIR_PREF)) &&
      /^.+\.([^.]+)$/.exec(basename(DIR_PREF))[1] || LABEL
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
  const REMOVE_TAB_STORAGE = "removeTabRelatedStorage";
  const RES_APP_MANIFEST = "resAppManifest";
  const RES_EXECUTABLE = "resExecutable";
  const SET_VARS = "setVars";
  const SYNC_TEXT = "syncText";

  /* variables */
  const vars = {
    [FORCE_REMOVE]: true
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
   * @return {boolean} - result
   */
  const isString = o =>
    o && (typeof o === "string" || o instanceof String) || false;

  /**
   * get file name from native file path
   * @param {string} path - file path
   * @return {string} - file name
   */
  const getFileNameFromFilePath = async path => {
    const file = isString(path) && /^([^.]+)(?:\..+)?$/.exec(basename(path));
    return file && file[1] || LABEL;
  };

  /**
   * convert URI to native file path
   * @param {string} uri - URI
   * @return {?string} - file path
   */
  const convUriToFilePath = async uri =>
    isString(uri) && urls.toFilename(uri) || null;

  /**
   * the file is a file
   * @param {string} path - file path
   * @return {boolean} - result
   */
  const isFile = async path =>
    isString(path) && fs.existsSync(path) && (new fs.Stats(path)).isFile();

  /**
   * the file is executable
   * @param {string} path - file path
   * @param {number} mask - mask bit
   * @return {Object} - Promise.<boolean>
   */
  const isExecutable = async (path, mask = MASK_BIT) =>
    isFile(path).then(bool => bool && !!((new fs.Stats(path)).mode & mask));

  /**
   * remove the directory
   * @param {string} path - directory path
   * @param {boolean} rec - recursive
   * @return {void}
   */
  const removeDir = async (path, rec) => {
    isString(path) && fs.existsSync(path) && fs.rmdirSync(path, !!rec);
  };

  /**
   * create a directory
   * @param {string} path - directory path
   * @param {string|number} mode - permission
   * @return {void}
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
   * @return {void}
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
   * @return {void}
   */
  const readFile = async (path, callback = null, opt = null,
                          encoding = CHAR) => {
    isString(path) && fs.readFile(path, encoding, (e, data) => {
      e ?
        logError(e) :
        callback && callback(data, opt);
    });
  };

  /* handle temporary files */
  /* namespace */
  const internal = ns();

  /**
   * temporary files storage class
   */
  class TemporaryStorage {
    /**
     * @private
     */
    constructor() {
      internal(this).storage = {tmpFiles: {}, tmpFilesPb: {}};
    }

    /**
     * get target property value
     * @param {Object} keys - descendant property keys
     * @return {*}
     */
    get(keys) {
      const store = internal(this).storage;
      const dir = keys && isString(keys.dir) && keys.dir;
      const tabId = keys && isString(keys.tabId) && keys.tabId;
      const host = keys && isString(keys.host) && keys.host;
      const target = keys && isString(keys.target) && keys.target;
      return dir && tabId && host && target &&
             store[dir] && store[dir][tabId] && store[dir][tabId][host] &&
               store[dir][tabId][host][target];
    }

    /**
     * set property / value
     * @param {Object} keys - descendant property keys
     * @param {*} val - value
     * @return {void}
     */
    set(keys = {}, val = null) {
      const store = internal(this).storage;
      const dir = isString(keys.dir) && keys.dir;
      const tabId = isString(keys.tabId) && keys.tabId;
      const host = isString(keys.host) && keys.host;
      const target = isString(keys.target) && keys.target;
      dir && (store[dir] = store[dir] || tabId && {} || val) &&
      tabId && (store[dir][tabId] = store[dir][tabId] || host && {} || val) &&
      host && (store[dir][tabId][host] = store[dir][tabId][host] ||
                                         target && {} || val) &&
      target && (store[dir][tabId][host][target] = val);
    }

    /**
     * remove property
     * @param {Object} keys - descendant property keys
     * @return {boolean} - result
     */
    remove(keys = {}) {
      const store = internal(this).storage;
      const dir = isString(keys.dir) && keys.dir;
      const tabId = isString(keys.tabId) && keys.tabId;
      const host = isString(keys.host) && keys.host;
      const target = isString(keys.target) && keys.target;
      let bool;
      if (dir && store[dir]) {
        if (tabId && host && target &&
            store[dir][tabId] && store[dir][tabId][host]) {
          bool = delete store[dir][tabId][host][target];
        }
        else if (tabId && host && store[dir][tabId]) {
          bool = delete store[dir][tabId][host];
        }
        else if (tabId) {
          bool = delete store[dir][tabId];
        }
        else {
          bool = delete store[dir];
        }
      }
      return bool || false;
    }
  }

  /* temporary files storage */
  const tmpStorage = new TemporaryStorage();

  /**
   * remove tmpStorage data on tab close
   * @param {Object} data - closed tab data
   * @return {void}
   */
  const removeTabRelatedStorage = async data => {
    if (data) {
      const dir = !!data.incognito && TMP_FILES_PB || TMP_FILES;
      const tabId = data.tabId;
      tabId && tmpStorage.remove({dir, tabId});
    }
  };

  /**
   * remove private temporary files
   * @return {Object} - Promise.<void>
   */
  const removePrivateTmpFiles = () =>
    removeDir(DIR_TMP_FILES_PB, vars[FORCE_REMOVE]).then(() =>
      createDir(DIR_TMP_FILES_PB)
    ).then(() => {
      tmpStorage.remove({dir: TMP_FILES_PB});
      tmpStorage.set({dir: TMP_FILES_PB}, {});
    });

  /**
   * get temporary file data from tmpStorage
   * @param {Object} data - target file data
   * @return {Object} - temporary file data
   */
  const getTmpFileData = async data => {
    let file;
    if (data) {
      const dir = !!data.incognito && TMP_FILES_PB || TMP_FILES;
      const tabId = data.tabId;
      const host = data.host || LABEL;
      const target = data.dataId;
      file = tmpStorage.get({dir, tabId, host, target});
      file && file.path && (
        file.dataId = target,
        file.timestamp = (new fs.Stats(file.path)).mtime,
        tmpStorage.set({dir, tabId, host, target}, file)
      );
    }
    return file || null;
  };

  /**
   * store temporary file path
   * @param {string} path - temporary file path
   * @param {Ovject} data - temporary file data
   * @return {void}
   */
  const storeTmpFilePath = async (path, data) => {
    if (path && data) {
      const dir = !!data.incognito && TMP_FILES_PB || TMP_FILES;
      const tabId = data.tabId;
      const host = data.host || LABEL;
      const target = await getFileNameFromFilePath(path);
      dir && tabId && host && target && (
        data.path = path,
        tmpStorage.set({dir, tabId, host, target}, data)
      );
    }
  };

  /**
   * create temporary file
   * @param {Object} data - temporary file data
   * @param {string} value - value
   * @param {Function} callback - callback
   * @return {Object} - ?Promise
   */
  const createTmpFile = async (data, value = "", callback = null) => {
    let fileName, path;
    if (data) {
      const dir = !!data.incognito && TMP_FILES_PB || TMP_FILES;
      const tabId = data.tabId;
      const host = data.host;
      fileName = data.fileName;
      path = join(DIR_TMP, dir, tabId, host);
    }
    return fileName && path && createDir(path).then(() =>
      createFile(join(path, fileName), value, callback, data)
    ) || null;
  };

  /**
   * remove sdk prefs and storage
   * @return {void}
   */
  const removeSdkPrefs = async () => {
    /* remove sdk prefs */
    const prefs = simplePrefs.prefs;
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
      /* webextensions */
      const {browser} = api;
      const runtime = browser.runtime;

      /**
       * port webextension
       * @param {Object} port - runtime.Port
       * @return {void}
       */
      const portWebExtension = async port => {
        /**
         * port message
         * @param {*} msg - message
         * @return {void}
         */
        const portMsg = async msg => {
          msg && port.postMessage(msg);
        };

        /**
         * port file path
         * @param {string} path - file path
         * @return {Object} - ?Promise
         */
        const portFilePath = async path =>
          path && portMsg({
            [PORT_FILE_PATH]: {path}
          }) || null;

        /**
         * port temporary file path
         * @param {string} path - temporary file path
         * @param {Object} data - temporary file data
         * @return {Object} - ?Promise
         */
        const portTmpFilePath = async (path, data) =>
          path && data && storeTmpFilePath(path, data).then(() =>
            portFilePath(path)
          ).catch(logError) || null;

        /**
         * check the file of given path is executable
         * @param {string} path - path
         * @return {Object} - result data
         */
        const checkExecutable = async path => {
          const executable = await isExecutable(path) || false;
          const name = executable &&
                       await getFileNameFromFilePath(path) || "";
          return {
            [RES_EXECUTABLE]: {
              executable, name,
              value: path
            }
          };
        };

        /**
         * port sync text
         * @param {Object} res - Response
         * @param {Object} data - file data
         * @return {Object} - ?Promise
         */
        const portSyncText = async (res, data) =>
          res && data && portMsg({
            [SYNC_TEXT]: {
              data,
              dataId: data.dataId,
              tabId: data.tabId,
              value: res
            }
          }).catch(logError) || null;

        /**
         * get temporary file
         * @param {Object} data - temporary file data
         * @return {Object} - ?Promise
         */
        const getTmpFile = async data => {
          const path = data && data.path;
          return path && readFile(path, portSyncText, data) || null;
        };

        /**
         * port app manifest
         * @param {Object} res - Response
         * @return {Object} - ?Promise
         */
        const portAppManifest = async res =>
          res && portMsg({
            [RES_APP_MANIFEST]: {
              value: res
            }
          }).catch(logError) || null;

        /**
         * get app manifest
         * @param {string} path - app manifest path
         * @return {Object} - ?Promise
         */
        const getAppManifest = async path =>
          await isFile(path) && readFile(path, portAppManifest) || null;

        /**
         * handle port message
         * @param {*} msg - message
         * @return {void}
         */
        const handleMsg = async msg => {
          const items = msg && Object.keys(msg);
          if (items && items.length > 0) {
            for (const item of items) {
              const obj = msg[item];
              switch (item) {
                case SET_VARS:
                  handleMsg(obj).catch(logError);
                  break;
                case CHECK_EXECUTABLE:
                  checkExecutable(obj.path).then(portMsg).catch(logError);
                  break;
                case CREATE_TMP_FILE:
                  createTmpFile(
                    obj.data, obj.value, portTmpFilePath
                  ).catch(logError);
                  break;
                case GET_APP_MANIFEST:
                  getAppManifest(obj.path).catch(logError);
                  break;
                case GET_FILE_PATH:
                  convUriToFilePath(obj.uri).then(portFilePath).catch(logError);
                  break;
                case GET_TMP_FILE:
                  getTmpFileData(obj).then(getTmpFile).catch(logError);
                  break;
                case REMOVE_PB_TMP_FILES:
                  obj && removePrivateTmpFiles().catch(logError);
                  break;
                case REMOVE_SDK_PREFS:
                  obj && removeSdkPrefs().catch(logError);
                  break;
                case REMOVE_TAB_STORAGE:
                  removeTabRelatedStorage(obj).catch(logError);
                  break;
                case FORCE_REMOVE:
                  vars[item] = !!obj;
                  break;
                default:
              }
            }
          }
        };

        /* listener */
        port.onMessage.addListener(handleMsg);
      };

      /* listener */
      runtime.onConnect.addListener(portWebExtension);
    }),
    createDir(DIR_TMP_FILES),
    createDir(DIR_TMP_FILES_PB)
  ]).catch(logError);

  exports.onUnload = () => {
    /* remove temporary files */
    removeDir(DIR_TMP, vars[FORCE_REMOVE]).catch(logError);
  };
}
