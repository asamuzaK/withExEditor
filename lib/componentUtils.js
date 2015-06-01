/**
*	componentUtils.js
*/

(function() {
	"use strict";
	const { Cc, Ci, Cu } = require("chrome");
	const { OS, TextEncoder } = Cu.import("resource://gre/modules/osfile.jsm", {});
	const { all } = require('sdk/core/promise');
	const windowUtils = require("sdk/window/utils");

	function onError(e) {
		throw new Error(e.operation ? e.operation : e.message);
	}
	exports.onError = onError;

	function makeDirPath(path, callback) {
		OS.File.makeDir(path).then(function() {
			callback(path);
		}, onError);
	}
	exports.makeDirPath = makeDirPath;

	function initDirPath(path, callback) {
		OS.File.removeDir(path).then(function() {
			makeDirPath(path, callback);
		}, onError);
	}
	exports.initDirPath = initDirPath;

	function createDir(dirPath, dirName, callback) {
		var path = OS.Path.join(dirPath, dirName);
		OS.File.exists(path).then(function(bool) {
			bool ? initDirPath(path, callback) : makeDirPath(path, callback);
		}, onError);
	}
	exports.createDir = createDir;

	function createFile(dirPath, fileName, value, callback) {
		var textEncoder = new TextEncoder(),
			filePath = OS.Path.join(dirPath, fileName),
			fileURI = OS.Path.toFileURI(filePath);
		OS.File.writeAtomic(filePath, textEncoder.encode(value), { tmpPath: filePath + ".tmp" }).then(function() {
			callback(filePath, fileURI);
		}, onError);
	}
	exports.createFile = createFile;

	function openFileWithApp(filePath, appPath) {
		var fileExists = function(path) {
			return OS.File.exists(path).then(function(res) {
				return res;
			}, onError);
		};
		all([fileExists(filePath), fileExists(appPath)]).then(function(res) {
			var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile),
				process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
			file.initWithPath(filePath);
			process.init(file);
			process.runAsync([appPath], 1);
		}, onError);
	}
	exports.openFileWithApp = openFileWithApp;

	function parseDomFromString(string) {
		var domParser = Cc["@mozilla.org/xmlextras/domparser;1"].createInstance(Ci.nsIDOMParser);
		return domParser.parseFromString(string, "application/xml");
	}
	exports.parseDomFromString = parseDomFromString;
})();
