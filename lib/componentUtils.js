/**
*	componentUtils.js
*/
(function() {
	"use strict";
	/* jsm, sdk */
	const { Ci, Cu } = require("chrome");
	const { OS, TextEncoder } = Cu.import("resource://gre/modules/osfile.jsm", {});
	const FileUtils = Cu.import("resource://gre/modules/FileUtils.jsm").FileUtils;
	const Services = Cu.import("resource://gre/modules/Services.jsm").Services;
	const all = require("sdk/core/promise").all;
	const spawn = require("sdk/system/child_process").spawn;

	/* for Mac OSX */
	var isOSX = /Darwin/.test(Services.appinfo.OS),
		useOpen = false;

	/* error handling */
	function onError(e) {
		Cu.reportError(e);
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
			OS.File.setPermissions(path, { unixMode: 0o777 }).then(function() {
				callback && callback(path);
			}, onError);
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
				OS.File.setPermissions(path, { unixMode: 0o777 }).then(function() {
					callback && callback(path);
				}, onError);
			}, onError)
		);
	}
	exports.createDir = createDir;

	/* create File */
	function createFile(path, mode, value, callback) {
		var textEncoder, fileURI;
		path && callback && (
			path = Array.isArray(path) ? joinPath(path) : path,
			textEncoder = new TextEncoder(),
			fileURI = OS.Path.toFileURI(path),
			OS.File.writeAtomic(path, textEncoder.encode(value ? value : ""), { tmpPath: path + ".tmp" }).then(function() {
				OS.File.setPermissions(path, { unixMode: mode ? mode : 0o600, unixHonorUmask: false }).then(function() {
					callback(path, fileURI);
				}, onError);
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
			function isAppPackage(file) {
				file.QueryInterface(Ci.nsILocalFileMac);
				return file.isPackage();
			}
			var file;
			bool && (
				file = new FileUtils.File(path),
				bool = file.isExecutable(),
				!bool && isOSX && (
					bool = isAppPackage(file),
					bool && (useOpen = true)
				)
			);
			return bool;
		}, onError) : false;
	}
	exports.fileIsExecutable = fileIsExecutable;

	/* open File with Application */
	function openFileWithApp(filePath, appPath) {
		filePath && appPath && all([fileIsFile(filePath), fileIsExecutable(appPath)]).then(function(array) {
			for(var run, app, args, process, i = 0, l = array.length; i < l; i++) {
				run = array[i];
				if(!run) {
					break;
				}
			}
			run && (
				app = useOpen ? "/usr/bin/open" : appPath,
				args = useOpen ? ["-a", appPath, "--args", filePath] : [filePath],
				process = spawn(app, args),
				process.stderr.on('data', function(data) {
					onError(data);
				})
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
	*  @returns { ?number } -1 | 0 | 1 | undefined
	*/
	function compareVersion(version) {
		return version && Services.vc.compare(Services.appinfo.version, version);
	}
	exports.compareVersion = compareVersion;
})();
