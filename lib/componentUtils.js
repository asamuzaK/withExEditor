/**
*	componentUtils.js
*/

(function() {
	"use strict";
	const { Cc, Ci, Cu } = require("chrome");
	const { OS, TextEncoder } = Cu.import("resource://gre/modules/osfile.jsm", {});
	const _ = require("sdk/l10n").get;
	const windowUtils = require("sdk/window/utils");
	const SELECT_FILE = _("SelectFile");

	function onError(e) {
		console.error(e);
	}
	exports.onError = onError;

	function parseDomFromString(string) {
		var domParser = Cc["@mozilla.org/xmlextras/domparser;1"].createInstance(Ci.nsIDOMParser);
		return domParser.parseFromString(string, "application/xml");
	}
	exports.parseDomFromString = parseDomFromString;

	function openFileWithApp(filePath, appPath) {
		var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile),
			process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
		file.initWithPath(filePath);
		process.init(file);
		process.runAsync([appPath], 1);
	}
	exports.openFileWithApp = openFileWithApp;

	function openFilePicker(callback) {
		var nsIFilePicker = Ci.nsIFilePicker,
			filePicker = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		filePicker.init(windowUtils.getMostRecentBrowserWindow(), SELECT_FILE, nsIFilePicker.modeOpen);
		filePicker.open(function() {
			filePicker && filePicker.file && filePicker.fileURL && callback(filePicker.file.path, filePicker.fileURL);
		});
	}
	exports.openFilePicker = openFilePicker;

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
})();
