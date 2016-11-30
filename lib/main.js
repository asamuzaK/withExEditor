/**
 * main.js (hybrid)
 */
"use strict";
{
  /* sdk */
  const _ = require("sdk/l10n").get;
  const {basename, join} = require("sdk/fs/path");
  const {notify} = require("sdk/notifications");
  const {ns} = require("sdk/core/namespace");
  const {spawn} = require("sdk/system/child_process");
  const fs = require("sdk/io/fs");
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

  const EDITOR_PATH = "editorPath";
  const EDITOR_NAME = "editorName";
  const CMD_ARGS = "editorCmdArgs";
  const CMD_POSITION = "editorCmdPos";
  const SPAWN_SHELL = "editorShell";
  const FORCE_REMOVE = "forceRemove";
  const ID = "id";
  const IS_ENABLED = "isEnabled";
  const SYS_ENV = "sysEnv";

  /* shortcut */
  const prefs = simplePrefs.prefs;

  /* variables */
  const vars = {};

  vars[EDITOR_PATH] = "";
  vars[EDITOR_NAME] = "";
  vars[CMD_ARGS] = "";
  vars[CMD_POSITION] = false;
  vars[SPAWN_SHELL] = false;
  vars[FORCE_REMOVE] = true;
  vars[ID] = "";
  vars[IS_ENABLED] = false;
  vars[SYS_ENV] = null;

  /* RegExp */
  const reCmd = /(?:^|\s)(?:"(?:[^"\\]|\\[^"]|\\")*"|'(?:[^'\\]|\\[^']|\\')*')(?=\s|$)|(?:\\ |[^\s])+(?:"(?:[^"\\]|\\[^"]|\\")*"|'(?:[^'\\]|\\[^']|\\')*')(?:(?:\\ |[^\s])+(?:"(?:[^"\\]|\\[^"]|\\")*"|'(?:[^'\\]|\\[^']|\\')*'))*(?:\\ |[^\s])*|(?:[^"'\s\\]|\\[^\s]|\\ )+/g;

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

  /**
   * notify error
   * @param {Object} e - Error
   * @return {boolean} - false
   */
  const notifyError = e => {
    e && (
      console.error(e),
      notify({title: `${LABEL}: ${_("Error")}`, text: e.toString()})
    );
    return false;
  };

  /**
   * notify warning
   * @param {string} m - message
   * @return {boolean} - false
   */
  const notifyWarn = m => {
    m && (
      console.warn(m),
      notify({title: `${LABEL}: ${_("Warn")}`, text: m})
    );
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
   * @param {string} encoding - file encoding
   * @return {void}
   */
  const createFile = async (path, value = "", callback = null, opt = null,
                            encoding = CHAR) => {
    isString(path) &&
      fs.writeFile(path, value, encoding, e => {
        e ?
          logError(e) :
          callback && callback(path, opt);
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

  /**
   * concat arguments array
   * @param {...(string|Array)} args - arguments
   * @return {Array} - arguments array
   */
  const concatArg = (...args) => {
    /**
     * correct the argument
     * @param {string} arg - argument
     * @return {string} - argument
     */
    const correctArg = arg => {
      /^\s*(?:".*"|'.*')\s*$/.test(arg) ? (
        arg = arg.trim(),
        /^".*\\["\\].*"$/.test(arg) &&
          (arg = arg.replace(/\\"/g, "\"").replace(/\\\\/g, "\\")),
        arg = arg.replace(/^['"]/, "").replace(/["']$/, "")
      ) : (
        /^.*\\.*$/.test(arg) && (arg = arg.replace(/\\(?!\\)/g, "")),
        /".*"|'.*'/.test(arg) &&
          (arg = arg.replace(/"([^"]+)*"|'([^']+)*'/g, (m, c1, c2) => c1 || c2))
      );
      return arg;
    };

    const arr = args.map(arg => {
      isString(arg) && (arg = arg.match(reCmd));
      return Array.isArray(arg) && arg.map(correctArg) || [];
    });
    return arr && arr.length > 0 && arr.reduce((a, b) => a.concat(b)) || [];
  };

  /**
   * get system environment variables
   * @return {Object} - environment variables
   */
  const getSystemEnv = () => {
    const env = {};
    vars[SYS_ENV].forEach(v => {
      system.env[v] && (env[v] = system.env[v]);
    });
    return env;
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
    }).catch(notifyError);

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

  /* create a temporary file */
  /**
   * child process class
   */
  class ChildProcess {
    /**
     * @param {Object} arg - arguments
     */
    constructor(arg = {}) {
      this.app = arg.app || "";
      this.cmd = isString(arg.cmd) && arg.cmd || "";
      this.opt = {
        cwd: null,
        encoding: CHAR,
        env: arg.env && Object.keys(arg.env).length > 0 && arg.env || null
      };
      this.pos = !!arg.pos;
      this.shell = !!arg.shell;
    }

    /**
     * spawn process
     * @param {string} file - file path
     * @return {Object} - ChildProcess
     */
    spawn(file) {
      return Promise.all([isFile(file), isExecutable(this.app)]).then(arr => {
        let proc = null;
        if (arr.every(v => v)) {
          const argA = this.pos ?
                         this.cmd :
                         file.replace(/\\/g, "\\\\");
          const argB = this.pos ?
                         file.replace(/\\/g, "\\\\") :
                         this.cmd;
          proc = spawn(
                   this.shell ?
                     system.env.ComSpec || "/bin/sh" :
                     this.app,
                   this.shell &&
                     concatArg(
                       system.env.ComSpec && "/c" || "-c",
                       this.app.replace(/\\/g, "\\\\").replace(/\s/g, "\\ "),
                       argA,
                       argB
                     ) ||
                     concatArg(argA, argB),
                     this.opt
                   );
          proc.on("error", e => {
            notifyError(e);
          });
          proc.on("close", code => {
            code !== 0 && notifyWarn(_("ProcessExitWarn", code));
          });
          proc.stdout.on("data", data => {
            data && console.log(`stdout: ${data}`);
          });
          proc.stderr.on("data", data => {
            data && console.error(`stderr: ${data}`);
          });
        }
        return proc || notifyWarn(_("FailSpawn", vars[EDITOR_NAME] || LABEL));
      }).catch(logError);
    }
  }

  /**
   * spawn child process
   * @param {string} path - file path
   * @param {Object} data - temporary file data
   * @return {Object} - ChildProcess or notification
   */
  const spawnProcess = async (path, data) => {
    const dir = !!data.incognito && TMP_FILES_PB || TMP_FILES;
    const tabId = data.tabId;
    const host = data.host || LABEL;
    const target = path && getFileNameFromFilePath(path);
    const file = tmpStorage.get({dir, tabId, host, target});
    path && file && (
      file.path = path,
      file.uri = urls.fromFilename(path),
      tmpStorage.set({dir, tabId, host, target}, file)
    );
    return path && vars[EDITOR_PATH] &&
           (new ChildProcess({
             app: vars[EDITOR_PATH],
             cmd: vars[CMD_ARGS],
             env: getSystemEnv(),
             pos: vars[CMD_POSITION],
             shell: vars[SPAWN_SHELL]
           })).spawn(path) ||
           notifyWarn(_("FailSpawn", vars[EDITOR_NAME] || LABEL));
  };

  /**
   * create temporary file
   * @param {Object} data - temporary file data
   * @param {string} value - value
   * @return {void}
   */
  const createTmpFile = async (data, value = "") => {
    const dir = !!data.incognito && TMP_FILES_PB || TMP_FILES;
    const tabId = data.tabId;
    const host = data.host;
    const target = data.target;
    const file = data.file;
    tabId && host && target && file &&
      createDir(join(TMP_DIR, dir, tabId, host)).then(path => {
        tmpStorage.set({dir, tabId, host, target}, data);
        createFile(join(path, file), value, spawnProcess, data);
      }).catch(logError);
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
        const GET_SDK_PREFS = "getSdkPrefs";
        const GET_TMP_FILE = "getTmpFile";
        const REMOVE_PB_TMP_FILES = "removePrivateTmpFiles";
        const REMOVE_TAB_STORAGE = "removeTabRelatedStorage";
        const SET_VARS = "setVars";
        const SPAWN_PROCESS = "spawnProcess";

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
           * get sdk prefs
           * @return {Object}
           */
          const getSdkPrefs = async () => {
            const sdkStorage = simpleStorage.storage.withExEditor || {};
            const editorPath = prefs[`${PREFS}File`] || "";
            const editorName = editorPath && sdkStorage.editorName || "";
            const editorCmdArgs = prefs[`${PREFS}CmdArgs`] || "";
            const editorCmdPos = prefs[`${PREFS}CmdPos`] || false;
            const editorShell = prefs[`${PREFS}Shell`] || false;
            const accessKey = prefs[`${PREFS}AccessKey`] || "e";
            const optionsShortCut = prefs[`${PREFS}Hotkey`] || true;
            const editorShortCut = prefs[`${PREFS}ExecEditor`] || true;
            const enablePB = prefs[`${PREFS}EnablePB`] || false;
            const editableContext = prefs[`${PREFS}Context`] || false;
            const forceRemove = prefs[`${PREFS}ForceRemove`] || true;
            const sdkPrefs = {
              editorPath, editorName, editorCmdArgs, editorCmdPos, editorShell,
              accessKey, optionsShortCut, editorShortCut,
              enablePB, editableContext, forceRemove
            };
            return {sdkPrefs};
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
              resExecutable: {
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
              syncText: {
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
                    createTmpFile(obj.data, obj.value);
                    break;
                  case GET_SDK_PREFS:
                    getSdkPrefs().then(portMsg).catch(logError);
                    break;
                  case GET_TMP_FILE:
                    getTmpFileData(obj).then(getTmpFile).catch(logError);
                    break;
                  case REMOVE_PB_TMP_FILES:
                    obj && removePrivateTmpFiles();
                    break;
                  case REMOVE_TAB_STORAGE:
                    removeTabRelatedStorage(obj);
                    break;
                  case SPAWN_PROCESS:
                    spawnProcess(getFilePathFromURI(obj.uri), obj.data);
                    break;
                  case EDITOR_PATH:
                  case EDITOR_NAME:
                  case CMD_ARGS:
                  case ID:
                  case SYS_ENV:
                    vars[item] = obj;
                    break;
                  case CMD_POSITION:
                  case IS_ENABLED:
                  case SPAWN_SHELL:
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

  exports.onUnload = reason => {
    /* remove temporary files */
    removeDir(TMP_DIR, vars[FORCE_REMOVE]).catch(logError);

    /* remove sdk prefs */
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

    reason === "uninstall" &&
      removeDir(join(PREF_D, "jetpack", vars[ID]), true).catch(logError);
  };
}
