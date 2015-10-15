/**
*	componentUtils.js
*/
(() => {
	"use strict";
	/* jsm */
	const { Cu } = require("chrome");
	const { OS, TextEncoder } = Cu.import("resource://gre/modules/osfile.jsm", {});
	const FileUtils = Cu.import("resource://gre/modules/FileUtils.jsm").FileUtils;
	const Services = Cu.import("resource://gre/modules/Services.jsm").Services;

	/* error handling */
	const onError = e => e && console.error(e);
	exports.onError = onError;

	/**
	*	join path
	*	@param {Array} array - array of pathes to join
	*	@returns {string} - joined path
	*/
	const joinPath = (array = [""]) =>
		Array.isArray(array) && array.length > 1 ? array.reduce(
			(pathA, pathB) => OS.Path.join(pathA, pathB)
		) : array.toString();
	exports.joinPath = joinPath;

	/**
	*	attempt to remove the directory (and the files in the directory)
	*	@param {string} path - directory path
	*	@param {?Object} option - OS.File.removeDir() options
	*	@returns {void}
	*/
	const attemptRemoveDir = (path, option = null) =>
		path && OS.File.removeDir(path, option).then(() => {}, e => {});
	exports.attemptRemoveDir = attemptRemoveDir;

	/**
	*	make a directory
	*	@param {string} path - directory path
	*	@param {?Function} callback
	*	@returns {?Function} - callback if exsisted
	*/
	const makeDirPath = (path, callback = null) =>
		path && OS.File.makeDir(path).then(
			() => OS.File.setPermissions(path, { unixMode: 0o777 })
		).then(
			() => callback && callback(path)
		).catch(onError);
	exports.makeDirPath = makeDirPath;

	/**
	*	initialize the directory
	*	@param {string} path - directory path
	*	@param {?Object} option - OS.File.removeDir() options
	*	@param {?Function} callback - error handling callback
	*	@returns {Function} - makeDirPath()
	*/
	const initDirPath = (path, option = null, callback = null) =>
		path && OS.File.removeDir(path, option).then(
			() => makeDirPath(path)
		).catch(
			e => {
				callback && callback(e);
				onError(e);
			}
		);
	exports.initDirPath = initDirPath;

	/**
	*	create a directory
	*	@param {string} path - directory path
	*	@param {?Function} callback
	*	@returns {?Function} - callback if exsists
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
	*	create a file
	*	@param {string} path - file path
	*	@param {string} value - values to write in the file
	*	@param {?Function} callback
	*	@returns {?Function} - callback if exsists
	*/
	const createFile = (path, value = "", callback = null) => {
		path && callback && (
			Array.isArray(path) && (path = joinPath(path)),
			OS.File.writeAtomic(
				path,
				new TextEncoder().encode(value),
				{ tmpPath: `${ path }.tmp` }
			).then(
				() => OS.File.setPermissions(path, { unixMode: 0o666 })
			).then(
				() => callback(path, OS.Path.toFileURI(path))
			).catch(onError)
		);
	};
	exports.createFile = createFile;

	/**
	*	determine if it is a file or not
	*	@param {string} path - file path
	*	@returns {boolean}
	*/
	const fileIsFile = path =>
		path ? OS.File.exists(path).then(
			bool => bool && OS.File.stat(path)
		).then(
			info => info && !info.isDir && !info.isSymLink
		).catch(onError) : false;
	exports.fileIsFile = fileIsFile;

	/**
	*	determine if a file is executable or not
	*	@param {string} path - file path
	*	@returns {boolean}
	*/
	const fileIsExecutable = path =>
		path ? OS.File.exists(path).then(
			bool => bool && new FileUtils.File(path).isExecutable()
		).catch(onError) : false;
	exports.fileIsExecutable = fileIsExecutable;

	/**
	*	get profile name from the profile directory
	*	@returns {string|boolean} - profile name or false
	*/
	const getProfName = () => {
		const prof = OS.Path.split(OS.Constants.Path.profileDir);
		const name = prof.components && /^.+\.([^\.]+)$/.exec(prof.components);
		return name ? name[1] : false;
	};
	exports.getProfName = getProfName;

	/**
	*	compare browser version
	*	@param {string} v - version number string
	*	@returns {?number} - -1|0|1
	*/
	const compareVersion = (v = null) => v && Services.vc.compare(Services.appinfo.version, v);
	exports.compareVersion = compareVersion;
})();
