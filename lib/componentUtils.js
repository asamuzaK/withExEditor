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

	function onError(e) {
		throw new Error(e.operation ? e.operation : e.message);
	}
	exports.onError = onError;

	function attemptRemoveDir(path) {
		path && OS.File.removeDir(path).then(function() {}, function() {});
	}
	exports.attemptRemoveDir = attemptRemoveDir;

	function makeDirPath(path, callback) {
		path && callback && OS.File.makeDir(path).then(function() {
			callback(path);
		}, onError);
	}
	exports.makeDirPath = makeDirPath;

	function initDirPath(path, callback) {
		path && callback && OS.File.removeDir(path).then(function() {
			makeDirPath(path, callback);
		}, onError);
	}
	exports.initDirPath = initDirPath;

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

	function fileExists(path) {
		return path ? OS.File.exists(path).then(function(bool) {
			return bool;
		}, onError) : false;
	}
	exports.fileExists = fileExists;

	function fileIsExecutable(path) {
		return path ? OS.File.exists(path).then(function(bool) {
			var file;
			bool && (file = new FileUtils.File(path), bool = file.isExecutable());
			return bool;
		}, onError) : false;
	}
	exports.fileIsExecutable = fileIsExecutable;

	function openFileWithApp(filePath, appPath) {
		filePath && appPath && all([fileExists(filePath), fileIsExecutable(appPath)]).then(function(array) {
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
