/**
*	componentUtils.js
*/
(function() {
	"use strict";
	const { Cc, Ci, Cu } = require("chrome");
	const { OS, TextEncoder } = Cu.import("resource://gre/modules/osfile.jsm", {});
	const FileUtils = Cu.import("resource://gre/modules/FileUtils.jsm").FileUtils;
	const Services = Cu.import("resource://gre/modules/Services.jsm").Services;
	const { all } = require('sdk/core/promise');

	var recommendMinVersion = "39.*";

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
	function attemptRemoveDir(path, option) {
		path && OS.File.removeDir(path, option ? option : null).then(function() {}, function(e) {});
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
	function initDirPath(path, option, callback) {
		path && OS.File.removeDir(path, option ? option : null).then(function() {
			makeDirPath(path);
		}, function(e) {
			callback ? callback(e) : onError(e);
		});
	}
	exports.initDirPath = initDirPath;

	/* create Directory */
	function createDir(path, callback) {
		path && (
			path = Array.isArray(path) ? joinPath(path) : path,
			callback = callback || null,
			OS.File.makeDir(path).then(function() {
				callback && callback(path);
			}, onError)
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
	*  @returns { boolean }
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
	*  @returns { boolean }
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
			for(var run, app, process, i = 0, l = array.length; i < l; i++) {
				run = array[i];
				if(!run) {
					break;
				}
			}
			run && (
				app = new FileUtils.File(appPath),
				process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess),
				process.init(app),
				process.runAsync([filePath], 1)
			);
		}, onError);
	}
	exports.openFileWithApp = openFileWithApp;

	/* get profile name from profileDir
	*  @returns { (string|boolean) }
	*/
	function getProfName() {
		var prof = OS.Path.split(OS.Constants.Path.profileDir),
			name = prof.components && /^.+\.([^\.]+)$/.exec(prof.components);
		return name ? name[1] : false;
	}
	exports.getProfName = getProfName;

	/* compare browser version
	*  @returns { Number } -1 or 0 or 1
	*/
	function compareVersion(version) {
		return Services.vc.compare(Services.appinfo.version, version ? version : recommendMinVersion);
	}
	exports.compareVersion = compareVersion;
})();
