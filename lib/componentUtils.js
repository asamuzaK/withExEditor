/**
* componentUtils.js
*/
(() => {
  "use strict";
  /* jsm */
  const { Cu } = require("chrome");
  const { OS, TextEncoder } = Cu.import("resource://gre/modules/osfile.jsm", {});
  const FileUtils = Cu.import("resource://gre/modules/FileUtils.jsm").FileUtils;
  const Services = Cu.import("resource://gre/modules/Services.jsm").Services;

  /* error handling */
  const onError = e => {
    e && console.error(e);
    return;
  };
  exports.onError = onError;

  /**
  * join path
  * @param {Array} path - array of paths
  * @return {string} - joined path
  */
  const joinPath = (path = [""]) =>
    Array.isArray(path) && path.length > 1 ?
      path.reduce((pathA, pathB) => OS.Path.join(pathA, pathB)) :
      path.toString();
  exports.joinPath = joinPath;

  /**
  * attempt to remove the directory (and the files in the directory)
  * @param {string|Array} path - directory path or array of paths
  * @param {?Object} option - OS.File.removeDir options
  * @return {void}
  */
  const attemptRemoveDir = (path, option = null) => {
    path && (
      Array.isArray(path) && (path = joinPath(path)),
      OS.File.removeDir(path, option).then(() => {}, e => {})
    );
  };
  exports.attemptRemoveDir = attemptRemoveDir;

  /**
  * create a directory
  * @param {string|Array} path - directory path or array of paths
  * @param {?Function} callback
  * @return {?Function} - callback if existed
  */
  const createDir = (path, callback = null) => {
    path && (
      Array.isArray(path) && (path = joinPath(path)),
      OS.File.makeDir(path).then(
        () => OS.File.setPermissions(path, { unixMode: 0o777 })
      ).then(
        () => callback && callback(path)
      ).catch(onError)
    );
  };
  exports.createDir = createDir;

  /**
  * initialize the directory
  * @param {string|Array} path - directory path or array of paths
  * @param {?Object} option - OS.File.removeDir options
  * @param {?Function} callback - error handling callback
  * @return {Function} - createDir
  */
  const initDirPath = (path, option = null, callback = null) => {
    path && (
      Array.isArray(path) && (path = joinPath(path)),
      OS.File.removeDir(path, option).then(
        () => createDir(path)
      ).catch(
        e => {
          callback && callback(e);
          onError(e);
        }
      )
    );
  };
  exports.initDirPath = initDirPath;

  /**
  * create a file
  * @param {string|Array} path - file path or array of paths
  * @param {string} value - values to write in the file
  * @param {?Function} callback
  * @return {?Function} - callback if exists
  */
  const createFile = (path, value = "", callback = null) => {
    path && (
      Array.isArray(path) && (path = joinPath(path)),
      OS.File.writeAtomic(
        path,
        new TextEncoder().encode(value),
        { tmpPath: `${ path }.tmp` }
      ).then(
        () => OS.File.setPermissions(path, { unixMode: 0o666 })
      ).then(
        () => callback && callback(path, OS.Path.toFileURI(path))
      ).catch(onError)
    );
  };
  exports.createFile = createFile;

  /**
  * determine if the file is a file or not
  * @param {string} path - file path
  * @return {boolean}
  */
  const fileIsFile = path =>
    path ? OS.File.exists(path).then(
      bool => bool && OS.File.stat(path)
    ).then(
      info => info && !info.isDir && !info.isSymLink
    ).catch(onError) : false;
  exports.fileIsFile = fileIsFile;

  /**
  * determine if the file is executable or not
  * @param {string} path - file path
  * @return {boolean}
  */
  const fileIsExecutable = path =>
    path ? OS.File.exists(path).then(
      bool => bool && new FileUtils.File(path).isExecutable()
    ).catch(onError) : false;
  exports.fileIsExecutable = fileIsExecutable;

  /**
  * get profile name from the profile directory
  * @return {?string} - profile name
  */
  const getProfName = () => {
    let prof = OS.Path.split(OS.Constants.Path.profileDir);
    return prof && prof.components && (
      prof = /^.+\.([^\.]+)$/.exec(prof.components)
    ) ? prof[1] : null;
  };
  exports.getProfName = getProfName;

  /**
  * compare browser version
  * @param {string} v - version number string
  * @return {?number} - -1|0|1
  */
  const compareVersion = (v = null) =>
    v && Services.vc.compare(Services.appinfo.version, v);
  exports.compareVersion = compareVersion;
})();
