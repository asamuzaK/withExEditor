/**
*	componentUtils.js
*/
(function() {
	"use strict";
	const { Cc, Ci, Cu } = require("chrome");
	const { OS, TextEncoder } = Cu.import("resource://gre/modules/osfile.jsm", {});
	const FileUtils = Cu.import("resource://gre/modules/FileUtils.jsm").FileUtils;
	const { all } = require('sdk/core/promise');
	const windowUtils = require("sdk/window/utils");

	/* error handling */
	function onError(e) {
		throw new Error(e.operation ? e.operation : e.message ? e.message : "error");
	}
	exports.onError = onError;

	/* attempt to remove Directory (and Files in the Directory) */
	function attemptRemoveDir(path) {
		path && OS.File.removeDir(path).then(function() {}, function() {});
	}
	exports.attemptRemoveDir = attemptRemoveDir;

	/* make Directory */
	function makeDirPath(path, callback) {
		path && callback && OS.File.makeDir(path).then(function() {
			callback(path);
		}, onError);
	}
	exports.makeDirPath = makeDirPath;

	/* init Directory */
	function initDirPath(path, callback) {
		path && callback && OS.File.removeDir(path).then(function() {
			makeDirPath(path, callback);
		}, onError);
	}
	exports.initDirPath = initDirPath;

	/* make / init Directory */
	function createDir(dirPath, dirName, callback) {
		var path;
		dirPath && dirName && callback && (
			path = OS.Path.join(dirPath, dirName),
			OS.File.exists(path).then(function(bool) {
				bool ? initDirPath(path, callback) : makeDirPath(path, callback);
			}, onError)
		);
	}
	exports.createDir = createDir;

	/* create File */
	function createFile(dirPath, fileName, value, callback) {
		var textEncoder, filePath, fileURI;
		dirPath && fileName && callback && (
			textEncoder = new TextEncoder(),
			filePath = OS.Path.join(dirPath, fileName),
			fileURI = OS.Path.toFileURI(filePath),
			OS.File.writeAtomic(filePath, textEncoder.encode(value ? value : ""), { tmpPath: filePath + ".tmp" }).then(function() {
				callback(filePath, fileURI);
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
