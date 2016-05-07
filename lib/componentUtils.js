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
