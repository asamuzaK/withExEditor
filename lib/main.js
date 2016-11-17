/**
 * main.js (hybrid)
 */
"use strict";
{
  /* sdk */
  const _ = require("sdk/l10n").get;
  const {Item, PredicateContext, SelectorContext} = require("sdk/context-menu");
  const {PageMod} = require("sdk/page-mod");
  const {Request} = require("sdk/request");
  const {basename, join} = require("sdk/fs/path");
  const {browserWindows} = require("sdk/windows");
  const {isPrivate} = require("sdk/private-browsing");
  const {notify} = require("sdk/notifications");
  const {ns} = require("sdk/core/namespace");
  const {spawn} = require("sdk/system/child_process");
  const events = require("sdk/system/events");
  const fs = require("sdk/io/fs");
  const self = require("sdk/self");
  const simplePrefs = require("sdk/simple-prefs");
  const simpleStorage = require("sdk/simple-storage");
  const system = require("sdk/system");
  const tabs = require("sdk/tabs");
  const urls = require("sdk/url");
  const webExtension = require("sdk/webextension");

  /* data */
  const fileExt = JSON.parse(self.data.load("json/fileExt.json"));
  const nsURI = self.data.load("json/nsUri.json");
  const sysEnv = JSON.parse(self.data.load("json/sysEnv.json"));

  /* constants */
  const LABEL = "withExEditor";
  const PREFS = "WithExEditorPrefs";
  const VIEW_SOURCE = "ViewSource";
  const VIEW_MATHML = "ViewMathML";
  const VIEW_SELECTION = "ViewSelection";
  const EDIT_TEXT = "EditText";
  const ICON = "../webextension/img/icon.svg";
  const JS_CONTENT = "./js/contentScript.js";
  const JS_MENU = "./js/contextMenu.js";
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

  /* shortcut */
  const prefs = simplePrefs.prefs;

  /* variables */
  const vars = {
    isEnabled: false,
    editorPath: "",
    editorName: "",
    editorCmdArgs: "",
    editorCmdPos: false,
    editorShell: false,
    accessKey: "e",
    editorShortCut: true,
    editableContext: false,
    forceRemove: true
  };

  /* RegExp */
  const reCmd = /(?:^|\s)(?:"(?:[^"\\]|\\[^"]|\\")*"|'(?:[^'\\]|\\[^']|\\')*')(?=\s|$)|(?:\\ |[^\s])+(?:"(?:[^"\\]|\\[^"]|\\")*"|'(?:[^'\\]|\\[^']|\\')*')(?:(?:\\ |[^\s])+(?:"(?:[^"\\]|\\[^"]|\\")*"|'(?:[^'\\]|\\[^']|\\')*'))*(?:\\ |[^\s])*|(?:[^"'\s\\]|\\[^\s]|\\ )+/g;
  const reExt = /^(application|image|text)\/([\w\-\.]+)(?:\+(json|xml))?$/;
  const rePath = /^.*\/((?:[\w\-~!\$&'\(\)\*\+,;=:@]|%[0-9A-F]{2})+)(?:(?:\.(?:[\w\-~!\$&'\(\)\*\+,;=:@]|%[0-9A-F]{2})+)*(?:\?(?:[\w\-\.~!\$&'\(\)\*\+,;=:@\/\?]|%[0-9A-F]{2})*)?(?:#(?:[\w\-\.~!\$&'\(\)\*\+,;=:@\/\?]|%[0-9A-F]{2})*)?)?$/;
  const reType = /^(?:application\/(?:(?:[\w\-\.]+\+)?(?:json|xml)|(?:(?:x-)?jav|ecm)ascript)|image\/[\w\-\.]+\+xml|text\/[\w\-\.]+)$/;
  const reXml = /^(?:(?:application\/(?:[\w\-\.]+\+)?|image\/[\w\-\.]+\+)x|text\/(?:ht|x))ml$/;

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
   * is private browsing
   * @return {boolean}
   */
  const isPb = () => isPrivate(browserWindows.activeWindow);

  /**
   * is string
   * @param {*} o - object to check
   * @return {boolean}
   */
  const isString = o =>
    o && (typeof o === "string" || o instanceof String) || false;

  /**
   * is Mac
   * @return {boolean}
   */
  const isMac = () => /Darwin/i.test(system.platform);

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
   * get file name from URI path
   * @param {string} path - URI path
   * @param {string} subst - substitute file name
   * @return {string} - file name
   */
  const getFileNameFromURI = (path, subst = LABEL) => {
    const file = (new urls.URL(tabs.activeTab.url)).scheme !== "data" &&
                   isString(path) && rePath.exec(path);
    return file && file[1] || subst;
  };

  /**
   * get file extension from media type
   * @param {string} media - media type
   * @param {string} subst - substitute file extension
   * @return {string} - file extension
   */
  const getFileExtension = (media = "text/plain", subst = "txt") => {
    let ext = reExt.exec(media);
    if (ext) {
      const type = ext[1];
      const subtype = ext[2];
      const suffix = ext[3] ||
                     type === "application" && /^(?:json|xml)$/.test(subtype) &&
                       subtype;
      ext = suffix ?
              fileExt[type][suffix][subtype] || fileExt[type][suffix][suffix] :
              fileExt[type][subtype];
    }
    return `.${ext || subst}`;
  };

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
   * @param {string} encoding - file encoding
   * @return {void}
   */
  const createFile = (path, value = "", callback = null, encoding = CHAR) => {
    isString(path) &&
      fs.writeFile(path, value, encoding, e => {
        e ?
          logError(e) :
          callback && callback(path);
      });
  };

  /**
   * create Request
   * @param {string} url - URL
   * @param {string} type - media type
   * @param {string} charset - character set
   * @param {Function} callback - callback on complete
   * @param {Object|string} opt - callback option
   * @return {Object} - Request
   */
  const createRequest = (url = tabs.activeTab.url,
                         type = tabs.activeTab.contentType,
                         charset = CHAR,
                         callback = null,
                         opt = null) =>
    new Request({
      url,
      overrideMimeType: `${type}; charset=${charset}`,
      onComplete: res => callback && callback(res, opt)
    });

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
    sysEnv.forEach(v => {
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
     * @param {{dir:string, tId:string, host:string, target:string}} keys
     *        - descendant property keys
     * @return {*}
     */
    get(keys) {
      const store = internal(this).storage;
      const dir = keys && isString(keys.dir) && keys.dir;
      const tId = keys && isString(keys.tId) && keys.tId;
      const host = keys && isString(keys.host) && keys.host;
      const target = keys && isString(keys.target) && keys.target;
      return dir && tId && host && target &&
             store[dir] && store[dir][tId] && store[dir][tId][host] &&
               store[dir][tId][host][target];
    }

    /**
     * set property / value
     * @param {Object} keys - descendant property keys
     * @param {string} [keys.dir] - directory
     * @param {string} [keys.tId] - tab ID
     * @param {string} [keys.host] - host
     * @param {string} [keys.target] - target
     * @param {*} val - value
     * @return {void}
     */
    set(keys = {}, val = null) {
      const store = internal(this).storage;
      const dir = isString(keys.dir) && keys.dir;
      const tId = isString(keys.tId) && keys.tId;
      const host = isString(keys.host) && keys.host;
      const target = isString(keys.target) && keys.target;
      dir && (store[dir] = store[dir] || tId && {} || val) &&
      tId && (store[dir][tId] = store[dir][tId] || host && {} || val) &&
      host && (store[dir][tId][host] = store[dir][tId][host] ||
                                       target && {} || val) &&
      target && (store[dir][tId][host][target] = val);
    }

    /**
     * remove property
     * @param {Object} keys - descendant property keys
     * @param {string} [keys.dir] - directory
     * @param {string} [keys.tId] - tab ID
     * @param {string} [keys.host] - host
     * @param {string} [keys.target] - target
     * @return {boolean|undefined}
     */
    remove(keys = {}) {
      const store = internal(this).storage;
      const dir = isString(keys.dir) && keys.dir;
      const tId = isString(keys.tId) && keys.tId;
      const host = isString(keys.host) && keys.host;
      const target = isString(keys.target) && keys.target;
      return dir && !tId && store[dir] ?
               delete store[dir] :
             dir && tId && !host && store[dir] && store[dir][tId] ?
               delete store[dir][tId] :
             dir && tId && host && !target &&
             store[dir] && store[dir][tId] && store[dir][tId][host] ?
               delete store[dir][tId][host] :
             dir && tId && host && target && store[dir] && store[dir][tId] &&
             store[dir][tId][host] && store[dir][tId][host][target] &&
               delete store[dir][tId][host][target];
    }
  }

  /* temporary files storage */
  const storage = new TemporaryStorage();

  /**
   * remove storage data on tab close
   * @param {Object} tab - closed tab
   * @return {void}
   */
  const removeTabRelatedStorage = tab => {
    tab.removeListener("close", removeTabRelatedStorage);
    storage.remove({dir: isPb() && TMP_FILES_PB || TMP_FILES, tId: tab.id});
  };

  /**
   * remove private temporary files on last private browsing context exited
   * @return {Object} - Promise
   */
  const removePrivateTmpFiles = () =>
    removeDir(
      join(TMP_DIR, TMP_FILES_PB),
      vars.forceRemove
    ).then(createDir).then(() => {
      storage.remove({dir: TMP_FILES_PB});
      storage.set({dir: TMP_FILES_PB}, {});
    }).catch(notifyError);

  /**
   * attach temporary file data to the tab
   * @param {Object} res - Response
   * @param {string} target - target ID
   * @return {Object|undefined} - EventTarget
   */
  const attachTab = (res, target) => {
    const tab = tabs.activeTab;
    const dir = isPb() && TMP_FILES_PB || TMP_FILES;
    const tId = tab.id;
    const host = (new urls.URL(tab.url)).host || LABEL;
    const file = storage.get({dir, tId, host, target});
    file && file.path && (
      file.timestamp = (new fs.Stats(file.path)).mtime,
      storage.set({dir, tId, host, target}, file)
    );
    return res && file &&
             tab.attach({
               contentScriptFile: JS_CONTENT,
               contentScriptOptions: {
                 target: file.target,
                 value: res.text,
                 timestamp: file.timestamp,
                 namespace: file.namespace
               }
             });
  };

  /**
   * get target file from temporary files
   * @param {string} target - target ID
   * @return {Object|undefined}
   */
  const getTmpFile = target => {
    const tab = tabs.activeTab;
    const file = storage.get({
      dir: isPb() && TMP_FILES_PB || TMP_FILES,
      tId: tab.id,
      host: (new urls.URL(tab.url)).host || LABEL,
      target
    });
    return file &&
             createRequest(file.uri, file.type, CHAR, attachTab, target).get();
  };

  /* create a temporary file */
  /**
   * child process class
   */
  class ChildProcess {
    /**
     * @param {Object} arg - arguments
     * @param {string} [arg.app] - application path
     * @param {string} [arg.cmd] - command line options
     * @param {Object} [arg.env] - environment variables
     * @param {boolean} [arg.pos] - put file path after command args
     * @param {boolean} [arg.shell] - run command in a shell
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
        return proc || notifyWarn(_("FailSpawn", vars.editorName));
      }).catch(logError);
    }
  }

  /**
   * spawn child process
   * @param {string} path - file path
   * @return {Object} - ChildProcess or notification
   */
  const spawnProcess = path => {
    const tab = tabs.activeTab;
    const dir = isPb() && TMP_FILES_PB || TMP_FILES;
    const tId = tab.id;
    const host = (new urls.URL(tab.url)).host || LABEL;
    const target = path && getFileNameFromFilePath(path);
    const file = storage.get({dir, tId, host, target});
    path && file && (
      file.path = path,
      file.uri = urls.fromFilename(path),
      storage.set({dir, tId, host, target}, file)
    );
    return path && vars.editorPath &&
           tab.once("close", removeTabRelatedStorage) &&
             (new ChildProcess({
               app: vars.editorPath,
               cmd: vars.editorCmdArgs,
               env: getSystemEnv(),
               pos: vars.editorCmdPos,
               shell: vars.editorShell
             })).spawn(path) || notifyWarn(_("FailSpawn", vars.editorName));
  };

  /**
   * create temporary file
   * @param {Object} data - temporary file data
   * @param {string} [data.tId] - tab ID
   * @param {string} [data.host] - host
   * @param {string} [data.target] - target
   * @param {string} value - value
   * @return {Object|undefined} - Promise
   */
  const createTmpFile = (data = {}, value = "") => {
    const dir = isPb() && TMP_FILES_PB || TMP_FILES;
    const tId = data.tId;
    const host = data.host;
    const target = data.target;
    const file = data.file;
    return tId && host && target && file &&
             createDir(join(TMP_DIR, dir, tId, host)).then(path => {
               storage.set({dir, tId, host, target}, data);
               createFile(join(path, file), value, spawnProcess);
             }).catch(logError);
  };

  /**
   * create temporary file params from Response
   * @param {Object} res - Response
   * @return {Object|undefined}
   */
  const createTmpFileFromRes = res => {
    const tab = tabs.activeTab;
    const url = new urls.URL(tab.url);
    const target = getFileNameFromURI(url.path, "index");
    const type = tab.contentType;
    return res &&
             createTmpFile({
               mode: VIEW_SOURCE,
               tId: tab.id,
               host: url.host || LABEL,
               target, type,
               file: target + getFileExtension(type)
             }, res.text);
  };

  /**
   * get file source
   * @param {string} url - file URL
   * @param {string} type - media type
   * @param {string} charset - character set
   * @return {Object|undefined}
   */
  const getSource = (url = tabs.activeTab.url,
                     type = tabs.activeTab.contentType,
                     charset = CHAR) => {
    const uri = urls.isValidURI(url) && new urls.URL(url);
    return uri && (
             uri.scheme === "file" && spawnProcess(urls.toFilename(uri)) ||
             createRequest(uri, type, charset, createTmpFileFromRes).get()
           );
  };

  /**
   * strip HTML tags and decode HTML escaped characters
   * @param {string} v - value
   * @return {string} - converted value
   */
  const convertValue = async v => {
    while (/^\n*<(?:[^>]+:)?[^>]+?>|<\/(?:[^>]+:)?[^>]+>\n*$/.test(v)) {
      v = v.replace(/^\n*<(?:[^>]+:)?[^>]+?>/, "").
            replace(/<\/(?:[^>]+:)?[^>]+>\n*$/, "\n");
    }
    return v.replace(/<\/(?:[^>]+:)?[^>]+>\n*<!\-\-[^\-]*\-\->\n*<(?:[^>]+:)?[^>]+>/g, "\n\n").
             replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  };

  /**
   * create temporary file params by mode value
   * @param {string} res - stringified JSON
   * @return {Object|undefined}
   */
  const createTmpFileByMode = async res => {
    const obj = isString(res) && JSON.parse(res) || {};
    const mode = obj.mode;
    const charset = obj.charset;
    const tab = tabs.activeTab;
    const tId = tab.id;
    const type = tab.contentType;
    const url = new urls.URL(tab.url);
    const host = url.host || LABEL;
    let value = obj.value, target;
    switch (mode) {
      case EDIT_TEXT:
        return (target = obj.target) &&
                 createTmpFile({
                   mode, tId, host, target,
                   type: "text/plain",
                   file: `${target}.txt`,
                   namespace: obj.namespace || ""
                 }, value) ||
                 getSource(url, type, charset);
      case VIEW_SELECTION:
        return value && (target = getFileNameFromURI(url.path, "index")) ?
               reXml.test(type) ?
                 createTmpFile({
                   mode, tId, host, target,
                   type: "application/xml",
                   file: `${target}.xml`
                 }, value) :
                 (value = await convertValue(value).catch(logError)) &&
                 createTmpFile({
                   mode, tId, host, target, type,
                   file: target + getFileExtension(type)
                 }, value) :
                 getSource(url, type, charset);
      case VIEW_MATHML:
        return value && (target = getFileNameFromURI(url.path, "index")) &&
                 createTmpFile({
                   mode, tId, host, target,
                   type: "application/mathml+xml",
                   file: `${target}.mml`
                 }, value) ||
                 getSource(url, type, charset);
      default:
        return getSource(url, type, charset);
    }
  };

  /* PageMod workers */
  const pageModWorkers = [];

  /**
   * destroy PageMod workers
   * @return {void}
   */
  const destroyPageModWorkers = async () => {
    pageModWorkers.forEach(worker => {
      worker && (
        worker.port.emit("detachKeyCombo"),
        worker.destroy()
      );
    });
  };

  /**
   * create PageMod
   * @param {string} key - key
   * @return {Object} - PageMod
   */
  const createPageMod = key =>
    isString(key) && key.length === 1 &&
      new PageMod({
        include: "*",
        contentScriptFile: JS_MENU,
        contentScriptOptions: {
          key,
          altKey: false,
          ctrlKey: !isMac(),
          metaKey: isMac(),
          shiftKey: true,
          onlyEdit: vars.editableContext,
          data: nsURI
        },
        contentScriptWhen: "ready",
        attachTo: ["existing", "top"],
        onAttach: worker => {
          pageModWorkers.push(worker);
          worker.port.emit("attachKeyCombo");
          worker.port.on("syncText", res => {
            /^withExEditor[^\.].*/.test(res) && getTmpFile(res);
          });
          worker.port.on("pageContent", res => {
            vars.isEnabled && !!vars.editorPath &&
              createTmpFileByMode(res).catch(logError);
          });
          worker.on("detach", () => {
            const i = pageModWorkers.indexOf(worker);
            i >= 0 && pageModWorkers.splice(i, 1);
          });
        }
      }) || null;

  /**
   * access key class
   */
  class AccessKey {
    /**
     * @param {Object} opt - key settings
     * @param {string} [opt.key] - key string
     * @param {boolean} [opt.pageMod] - enable execute the editor directly
     */
    constructor(opt = {}) {
      this._key = isString(opt.key) && opt.key.length === 1 && opt.key || "";
      this._pageMod = opt.pageMod && createPageMod(this._key) || null;
    }

    get key() {
      return this._key;
    }

    set key(key) {
      this._key = isString(key) && key.length === 1 && key || "";
    }

    /**
     * set page mod
     * @param {boolean} enabled - pageMod enabled
     * @return {void}
     */
    setPageMod(enabled) {
      destroyPageModWorkers().then(() => {
        this._pageMod && this._pageMod.destroy();
        this._pageMod = enabled && createPageMod(this._key) || null;
      }).catch(logError);
    }
  }

  /* access key */
  const accKey = new AccessKey({
    key: vars.accessKey,
    pageMod: vars.editorShortCut
  });

  /* enable context */
  const enableContext = new PredicateContext(() =>
    vars.isEnabled && !!vars.editorPath
  );

  /* selector context */
  const selectorContext = new SelectorContext([
    "input[type=email]", "input[type=tel]", "input[type=url]",
    "input[type=search]", "input[type=text]", "textarea",
    "[contenteditable=true] svg text", "[contenteditable=true]"
  ].join(","));

  /* media type context */
  const mediaTypeContext = new PredicateContext(context =>
    reType.test(context.documentType)
  );

  /* context menu item */
//  const menu = new Item({
//    label: _(VIEW_SOURCE, vars.editorName),
//    image: self.data.url(`${ICON}#gray`),
//    contentScriptFile: JS_MENU,
//    context: [
//      enableContext,
//      vars.editableContext && selectorContext || mediaTypeContext
//    ],
//    accesskey: accKey.key || null,
//    data: nsURI,
//    onMessage: res => {
//      /^(?:View(?:MathML|S(?:ource|election))|EditText)$/.test(res) ?
//        menu.label = _(res, vars.editorName) :
//      /^withExEditor[^\.].*/.test(res) ?
//        getTmpFile(res) :
//        createTmpFileByMode(res).catch(logError);
//    }
//  });

  exports.main = () =>
    Promise.all([
      webExtension.startup().then(api => {
        /* webextensions api */
        const {browser} = api;
        const runtime = browser.runtime;

        /* constants */
        const CHECK_EXECUTABLE = "checkExecutable";
        const GET_NS_URI = "getNsURI";
        const GET_SDK_PREFS = "getSdkPrefs";
        const RES_CONTENT = "resContent";
        const SET_VARS = "setVars";

        const IS_ENABLED = "isEnabled";
        const EDITOR_PATH = "editorPath";
        const EDITOR_NAME = "editorName";
        const CMD_ARGS = "editorCmdArgs";
        const CMD_POSITION = "editorCmdPos";
        const SPAWN_SHELL = "editorShell";
        const KEY_ACCESS = "accessKey";
        const KEY_EXEC_EDITOR = "editorShortCut";
        const EDITABLE_CONTEXT = "editableContext";
        const FORCE_REMOVE = "forceRemove";

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
                executable,
                name,
                value: path
              }
            };
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
                if (item === SET_VARS) {
                  handleMsg(obj);
                  break;
                }
                switch (item) {
                  case CHECK_EXECUTABLE:
                    checkExecutable(obj.path).then(portMsg).catch(logError);
                    break;
                  case GET_NS_URI:
                    portMsg(nsURI).catch(logError);
                    break;
                  case GET_SDK_PREFS:
                    getSdkPrefs().then(portMsg).catch(logError);
                    break;
                  case IS_ENABLED:
                    prefs[item] = !!obj;
                    break;
                  case RES_CONTENT:
                    createTmpFileByMode(obj);
                    break;
                  case EDITOR_PATH:
                  case EDITOR_NAME:
                  case CMD_ARGS:
                  case KEY_ACCESS:
                    prefs[item] = obj.value;
                    break;
                  case CMD_POSITION:
                  case SPAWN_SHELL:
                  case KEY_EXEC_EDITOR:
                  case EDITABLE_CONTEXT:
                  case FORCE_REMOVE:
                    prefs[item] = !!obj.checked;
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
      createDir(join(TMP_DIR, TMP_FILES_PB)),
      () => {
        events.on("last-pb-context-exited", removePrivateTmpFiles);
      }
    ]).catch(logError);

  exports.onUnload = reason => {
    /* remove temporary files */
    removeDir(TMP_DIR, vars.forceRemove).catch(logError);

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
      removeDir(join(PREF_D, "jetpack", self.id), true).catch(logError);
  };
}
