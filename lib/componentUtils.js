/**
*	componentUtils.js
*/
(function() {
	"use strict";
	const { Cc, Ci, Cu } = require("chrome");
	const { OS, TextEncoder } = Cu.import("resource://gre/modules/osfile.jsm", {});
	const FileUtils = Cu.import("resource://gre/modules/FileUtils.jsm").FileUtils;
	const { all } = require('sdk/core/promise');

	/* error handling */
	function onError(e) {
		throw new Error(e.operation ? e.operation : e.message ? e.message : "error");
	}
	exports.onError = onError;

	/* join path */
	function joinPath(array) {
		var path;
		if(Array.isArray(array) && array.length > 1) {
			for(var i = 0, l = array.length; i < l - 1; i++) {
				path = path ? OS.Path.join(path, array[i + 1]) : OS.Path.join(array[i], array[i + 1]);
			}
		}
		return path ? path : array.toString();
	}
	exports.joinPath = joinPath;

	/* attempt to remove Directory (and Files in the Directory) */
	function attemptRemoveDir(path) {
		path && OS.File.removeDir(path, { ignorePermissions: true }).then(function() {}, function(e) {});
	}
	exports.attemptRemoveDir = attemptRemoveDir;

	/* make Directory */
	function makeDirPath(path, callback) {
		path && OS.File.makeDir(path).then(function() {
			callback && callback(path);
		}, onError);
	}
	exports.makeDirPath = makeDirPath;

	/* force init Directory */
	function forceInitDirPath(path, bool, callback) {
		path && OS.File.removeDir(path, { ignorePermissions: true }).then(function() {
			makeDirPath(path);
		}, function(e) {
			bool && callback ? callback(e) : onError(e);
		});
	}
	exports.forceInitDirPath = forceInitDirPath;

	/* init Directory */
	function initDirPath(path, callback) {
		path && OS.File.removeDir(path).then(function() {
			makeDirPath(path, callback ? callback : null);
		}, onError);
	}
	exports.initDirPath = initDirPath;

	/* create Directory (make or init Directory) */
	function createDir(path, callback) {
		path && (
			path = Array.isArray(path) ? joinPath(path) : path,
			callback = callback || null,
			OS.File.makeDir(path, { ignoreExisting: false, }).then(function() {
				callback && callback(path);
			}, function(e) {
				e.becauseExists ? initDirPath(path, callback) : onError(e);
			})
		);
	}
	exports.createDir = createDir;

	/* create File */
	function createFile(path, value, callback) {
		var textEncoder, fileURI;
		path && callback && (
			path = Array.isArray(path) ? joinPath(path) : path,
			textEncoder = new TextEncoder(),
			fileURI = OS.Path.toFileURI(path),
			OS.File.writeAtomic(path, textEncoder.encode(value ? value : ""), { tmpPath: path + ".tmp" }).then(function() {
				callback(path, fileURI);
			}, onError)
		);
	}
	exports.createFile = createFile;

	/* File is a file or not
	*  @ret { boolean }
	*/
	function fileIsFile(path) {
		return path ? OS.File.exists(path).then(function(bool) {
			return bool ? OS.File.stat(path).then(function(info) {
				return (!info.isDir && !info.isSymLink);
			}, onError) : false;
		}, onError) : false;
	}
	exports.fileIsFile = fileIsFile;

	/* File is executable or not
	*  @ret { boolean }
	*/
	function fileIsExecutable(path) {
		return path ? OS.File.exists(path).then(function(bool) {
			var file;
			bool && (
				file = new FileUtils.File(path),
				bool = file.isExecutable()
			);
			return bool;
		}, onError) : false;
	}
	exports.fileIsExecutable = fileIsExecutable;

	/* open File with Application */
	function openFileWithApp(filePath, appPath) {
		filePath && appPath && all([fileIsFile(filePath), fileIsExecutable(appPath)]).then(function(array) {
			for(var run, file, process, i = 0, l = array.length; i < l; i++) {
				run = array[i];
				if(!run) {
					break;
				}
			}
			run && (
				file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile),
				process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess),
				file.initWithPath(filePath),
				process.init(file),
				process.runAsync([appPath], 1)
			);
		}, onError);
	}
	exports.openFileWithApp = openFileWithApp;
})();
