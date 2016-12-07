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
  const PREF_D = system.pathFor("PrefD");
  const TMP_DIR = join(
    system.pathFor("TmpD"),
    LABEL,
    /^.+\.([^\.]+)$/.test(basename(PREF_D)) &&
      /^.+\.([^\.]+)$/.exec(basename(PREF_D))[1] || LABEL
  );
  const TMP_FILES = "tmpFiles";
  const TMP_FILES_PB = "tmpFilesPb";

  const FORCE_REMOVE = "forceRemove";

  /* variables */
  const vars = {
    [FORCE_REMOVE]: true
  };

  /* namespace */
  const internal = ns();

  /* error handling */
  /**
   * log error
   * @param {Object} e - Error
   * @return {boolean} - false
   */
  const logError = e => {
    e && console.error(e);
    return false;
  };

  /* utilities */
  /**
   * is string
   * @param {*} o - object to check
   * @return {boolean}
   */
  const isString = o =>
    o && (typeof o === "string" || o instanceof String) || false;

  /* file utilities */
  /**
   * get file name from native file path
   * @param {string} path - file path
   * @return {string} - file name
   */
  const getFileNameFromFilePath = path => {
    const file = isString(path) && /^([^\.]+)(?:\..+)?$/.exec(basename(path));
    return file && file[1] || LABEL;
  };

  /**
   * get file path from URI
   * @param {string} uri - URI
   * @return {string} - file path
   */
  const getFilePathFromURI = uri => urls.toFilename(uri);

  /**
   * the file is a file
   * @param {string} path - file path
   * @return {boolean}
   */
  const isFile = async path =>
    isString(path) && fs.existsSync(path) && (new fs.Stats(path)).isFile();

  /**
   * the file is executable
   * @param {string} path - file path
   * @param {number} mask - mask bit
   * @return {boolean}
   */
  const isExecutable = async (path, mask = MASK_BIT) =>
    await isFile(path).catch(e => {
      throw e;
    }) && !!((new fs.Stats(path)).mode & mask);

  /**
   * remove the directory
   * @param {string} path - directory path
   * @param {boolean} rec - recursive
   * @return {string} - path
   */
  const removeDir = async (path, rec) => {
    isString(path) && fs.existsSync(path) && fs.rmdirSync(path, !!rec);
    return path;
  };

  /**
   * create a directory
   * @param {string} path - directory path
   * @param {string|number} mode - permission
   * @return {string} - path
   */
  const createDir = async (path, mode = PERM_DIR) => {
    isString(path) && !fs.existsSync(path) && fs.mkdirSync(path, mode);
    return path;
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
    isString(path) &&
      fs.writeFile(path, value, encoding, e => {
        e ?
          logError(e) : (
            fs.chmodSync(path, mode),
            callback && callback(path, opt)
          );
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
    isString(path) &&
      fs.readFile(path, encoding, (e, data) => {
        e ?
          logError(e) :
          callback && callback(data, opt);
      });
  };

  /* handle temporary files */
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
     * @return {boolean|undefined}
     */
    remove(keys = {}) {
      const store = internal(this).storage;
      const dir = isString(keys.dir) && keys.dir;
      const tabId = isString(keys.tabId) && keys.tabId;
      const host = isString(keys.host) && keys.host;
      const target = isString(keys.target) && keys.target;
      return dir && !tabId && store[dir] ?
               delete store[dir] :
             dir && tabId && !host && store[dir] && store[dir][tabId] ?
               delete store[dir][tabId] :
             dir && tabId && host && !target &&
             store[dir] && store[dir][tabId] && store[dir][tabId][host] ?
               delete store[dir][tabId][host] :
             dir && tabId && host && target && store[dir] &&
             store[dir][tabId] && store[dir][tabId][host] &&
             store[dir][tabId][host][target] &&
               delete store[dir][tabId][host][target];
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
    const dir = !!data.incognito && TMP_FILES_PB || TMP_FILES;
    const tabId = data.tabId;
    tabId && tmpStorage.remove({dir, tabId});
  };

  /**
   * remove private temporary files
   * @return {Object} - Promise
   */
  const removePrivateTmpFiles = () =>
    removeDir(
      join(TMP_DIR, TMP_FILES_PB),
      vars[FORCE_REMOVE]
    ).then(createDir).then(() => {
      tmpStorage.remove({dir: TMP_FILES_PB});
      tmpStorage.set({dir: TMP_FILES_PB}, {});
    }).catch(logError);

  /**
   * get temporary file data from tmpStorage
   * @param {Object} data - target file data
   * @return {Object}
   */
  const getTmpFileData = async data => {
    const dir = !!data.incognito && TMP_FILES_PB || TMP_FILES;
    const tabId = data.tabId;
    const host = data.host || LABEL;
    const target = data.dataId;
    const file = tmpStorage.get({dir, tabId, host, target});
    file && file.path && (
      file.dataId = target,
      file.timestamp = (new fs.Stats(file.path)).mtime,
      tmpStorage.set({dir, tabId, host, target}, file)
    );
    return file || null;
  };

  /* temporary file */
  /**
   * store temporary file path
   * @param {string} path - temporary file path
   * @param {Ovject} data - temporary file data
   * @return {void}
   */
  const storeTmpFilePath = (path, data) => {
    const dir = !!data.incognito && TMP_FILES_PB || TMP_FILES;
    const tabId = data.tabId;
    const host = data.host || LABEL;
    const target = path && getFileNameFromFilePath(path);
    const file = tmpStorage.get({dir, tabId, host, target});
    path && file && (
      file.path = path,
      tmpStorage.set({dir, tabId, host, target}, file)
    );
  };

  /**
   * create temporary file
   * @param {Object} data - temporary file data
   * @param {string} value - value
   * @param {Function} callback - callback
   * @return {void}
   */
  const createTmpFile = async (data, value = "", callback = null) => {
    const dir = !!data.incognito && TMP_FILES_PB || TMP_FILES;
    const tabId = data.tabId;
    const host = data.host;
    const target = data.target;
    const file = data.file;
    tabId && host && target && file &&
      createDir(join(TMP_DIR, dir, tabId, host)).then(path => {
        tmpStorage.set({dir, tabId, host, target}, data);
        createFile(join(path, file), value, callback, data);
      }).catch(logError);
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
    removeDir(join(PREF_D, "jetpack", self.id), true).catch(logError);
  };

  exports.main = () =>
    Promise.all([
      webExtension.startup().then(api => {
        /* webextensions api */
        const {browser} = api;
        const runtime = browser.runtime;

        /* constants */
        const CHECK_EXECUTABLE = "checkExecutable";
        const CREATE_TMP_FILE = "createTmpFile";
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

        /**
         * port webextension
         * @param {Object} port - runtime.Port
         * @return {void}
         */
        const portWebExtension = async port => {
          /**
           * port message
           * @param {Object} msg - message
           */
          const portMsg = async msg => {
            msg && port.postMessage(msg);
          };

          /**
           * port file path
           * @param {string} path - file path
           * @return {void}
           */
          const portFilePath = async path => {
            path && portMsg({
              [PORT_FILE_PATH]: {path}
            });
          };

          /**
           * port temporary file path
           * @param {string} path - temporary file path
           * @param {Object} data - temporary file data
           * @return {void}
           */
          const portTmpFilePath = async (path, data) => {
            path && data && (
              storeTmpFilePath(path, data),
              portFilePath(path)
            );
          };

          /**
           * check the file of given path is executable
           * @param {string} path - path
           * @return {Object}
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
           * @return {void}
           */
          const portSyncText = async (res, data) => {
            res && data && portMsg({
              [SYNC_TEXT]: {
                data,
                dataId: data.dataId,
                tabId: data.tabId,
                value: res
              }
            });
          };

          /**
           * get temporary file
           * @param {Object} data - temporary file data
           * @return {void}
           */
          const getTmpFile = async data => {
            const path = data.path;
            path && readFile(path, portSyncText, data);
          };

          /**
           * port app manifest
           * @param {Object} res - Response
           * @return {void}
           */
          const portAppManifest = async res => {
            res && portMsg({
              [RES_APP_MANIFEST]: {
                value: res
              }
            });
          };

          /**
           * get app manifest
           * @param {Object} path - app manifest path
           * @return {void}
           */
          const getAppManifest = async path => {
            const bool = await isFile(path);
            bool && readFile(path, portAppManifest);
          };

          /**
           * handle port message
           * @param {*} msg - message
           * @return {void}
           */
          const handleMsg = async msg => {
            const items = Object.keys(msg);
            if (items.length > 0) {
              for (let item of items) {
                const obj = msg[item];
                switch (item) {
                  case SET_VARS:
                    handleMsg(obj);
                    break;
                  case CHECK_EXECUTABLE:
                    checkExecutable(obj.path).then(portMsg).catch(logError);
                    break;
                  case CREATE_TMP_FILE:
                    createTmpFile(obj.data, obj.value, portTmpFilePath);
                    break;
                  case GET_APP_MANIFEST:
                    getAppManifest(obj.path);
                    break;
                  case GET_FILE_PATH:
                    portFilePath(getFilePathFromURI(obj.uri));
                    break;
                  case GET_TMP_FILE:
                    getTmpFileData(obj).then(getTmpFile).catch(logError);
                    break;
                  case REMOVE_PB_TMP_FILES:
                    obj && removePrivateTmpFiles();
                    break;
                  case REMOVE_SDK_PREFS:
                    obj && removeSdkPrefs();
                    break;
                  case REMOVE_TAB_STORAGE:
                    removeTabRelatedStorage(obj);
                    break;
                  case FORCE_REMOVE:
                    vars[item] = !!obj;
                    break;
                  default:
                }
              }
            }
          };

          /* add listener */
          port.onMessage.addListener(handleMsg);
        };

        runtime.onConnect.addListener(portWebExtension);
      }),
      createDir(join(TMP_DIR, TMP_FILES)),
      createDir(join(TMP_DIR, TMP_FILES_PB))
    ]).catch(logError);

  exports.onUnload = () => {
    /* remove temporary files */
    removeDir(TMP_DIR, vars[FORCE_REMOVE]).catch(logError);
  };
}
