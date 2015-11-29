/**
 * componentUtils.js
 */
(() => {
  "use strict";
  /* jsm */
  const { Cu } = require("chrome");
  const { OS, TextEncoder } = Cu.import("resource://gre/modules/osfile.jsm", {});
  const { FileUtils } = Cu.import("resource://gre/modules/FileUtils.jsm", {});
  const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

  /**
   * error handling
   * @param {Object} e - error object
   * @return {boolean} - false
   */
  const onError = e => {
    e && console.error(e);
    return false;
  };
  exports.onError = onError;

  /**
   * attempt to remove the directory (and the files in the directory)
   * @param {string} path - directory path
   * @param {?Object} option - OS.File.removeDir options
   * @return {void}
   */
  const attemptRemoveDir = (path, option = null) =>
    OS.File.removeDir(path, option).then(() => {}, e => {});
  exports.attemptRemoveDir = attemptRemoveDir;

  /**
   * create a directory
   * @param {string} path - directory path
   * @param {?Function} callback
   * @return {?Function} - callback if existed
   */
  const createDir = (path, callback = null) =>
    OS.File.makeDir(path).then(
      () => OS.File.setPermissions(path, { unixMode: 0o777 })
    ).then(
      () => callback && callback(path)
    ).catch(onError);
  exports.createDir = createDir;

  /**
   * initialize the directory
   * @param {string} path - directory path
   * @param {?Object} option - OS.File.removeDir options
   * @param {?Function} callback - error handling callback
   * @return {Function} - createDir
   */
  const initDirPath = (path, option = null, callback = null) =>
    OS.File.removeDir(path, option).then(
      () => createDir(path)
    ).catch(
      e => {
        callback && callback(e);
        onError(e);
      }
    );
  exports.initDirPath = initDirPath;

  /**
   * create a file
   * @param {string} path - file path
   * @param {string} value - values to write in the file
   * @param {?Function} callback
   * @return {?Function} - callback if exists
   */
  const createFile = (path, value = "", callback = null) =>
    OS.File.writeAtomic(
      path,
      (new TextEncoder).encode(value),
      { tmpPath: `${ path }.tmp` }
    ).then(
      () => OS.File.setPermissions(path, { unixMode: 0o666 })
    ).then(
      () => callback && callback(path, OS.Path.toFileURI(path))
    ).catch(onError);
  exports.createFile = createFile;

  /**
   * determine if the file is a file or not
   * @param {string} path - file path
   * @return {boolean}
   */
  const fileIsFile = path =>
    OS.File.exists(path).then(
      bool => bool && OS.File.stat(path)
    ).then(
      info => info && !info.isDir && !info.isSymLink
    ).catch(onError);
  exports.fileIsFile = fileIsFile;

  /**
   * determine if the file is executable or not
   * @param {string} path - file path
   * @return {boolean}
   */
  const fileIsExecutable = path =>
    OS.File.exists(path).then(
      bool => bool && (new FileUtils.File(path)).isExecutable()
    ).catch(onError);
  exports.fileIsExecutable = fileIsExecutable;

  /**
   * compare browser version
   * @param {string} v - version expression string
   * @return {?number} - -1|0|1
   */
  const compareVersion = v =>
    typeof v === "string" || v instanceof String &&
      /^\d+(?:\.\-?\d*)*(?:[a-z\d\-]*\*?|\d\+)?$/i.test(v) ?
        Services.vc.compare(Services.appinfo.version, v) : null;
  exports.compareVersion = compareVersion;
})();
