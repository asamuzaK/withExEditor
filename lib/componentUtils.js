/**
 * componentUtils.js
 */
(() => {
  "use strict";
  /* jsm */
  const { Cu } = require("chrome");
  const { OS, TextEncoder } = Cu.import("resource://gre/modules/osfile.jsm", {});

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
   * @return {Object} - Promise object, returns nothing
   */
  const attemptRemoveDir = (path, option = null) =>
    OS.File.removeDir(path, option).then(() => {}, e => {});
  exports.attemptRemoveDir = attemptRemoveDir;

  /**
   * create a directory
   * @param {string} path - directory path
   * @return {Object} - Promise object, returns path on fulfill
   */
  const createDir = path =>
    OS.File.makeDir(path, { unixMode: 0o777 }).then(() => path).catch(onError);
  exports.createDir = createDir;

  /**
   * initialize the directory
   * @param {string} path - directory path
   * @param {?Object} option - OS.File.removeDir options
   * @param {?Function} callback - error handling callback
   * @return {Object} - Promise object, returns createDir() on fulfill,
   *                    callback on reject
   */
  const initDirPath = (path, option = null, callback = null) =>
    OS.File.removeDir(path, option).then(() =>
      createDir(path)
    ).catch(e => {
      callback && callback(e);
      onError(e);
    });
  exports.initDirPath = initDirPath;

  /**
   * create a file
   * @param {string} path - file path
   * @param {string} value - values to write in the file
   * @param {?Function} callback
   * @return {Object} - Promise object, returns callback on fulfill
   */
  const createFile = (path, value = "", callback = null) =>
    OS.File.writeAtomic(
      path,
      (new TextEncoder()).encode(value),
      { tmpPath: `${ path }.tmp` }
    ).then(() =>
      OS.File.setPermissions(path, { unixMode: 0o666 })
    ).then(() =>
      callback && callback(path)
    ).catch(onError);
  exports.createFile = createFile;
})();
