/**
*	componentUtils.js
*/
(() => {
	"use strict";
	/* jsm, sdk */
	const { Ci, Cu } = require("chrome");
	const { OS, TextEncoder } = Cu.import("resource://gre/modules/osfile.jsm", {});
	const FileUtils = Cu.import("resource://gre/modules/FileUtils.jsm").FileUtils;
	const Services = Cu.import("resource://gre/modules/Services.jsm").Services;
	const all = require("sdk/core/promise").all;
	const execFile = require("sdk/system/child_process").execFile;

	/* for Mac OSX */
	const isOSX = /Darwin/.test(Services.appinfo.OS);
	let useOpen = false;

	/* error handling */
	function onError(e) {
		Cu.reportError(e);
	}
	exports.onError = onError;

	/* join path
	*  @returns { string }
	*/
	function joinPath(array) {
		return Array.isArray(array) && array.length > 1 ? array.reduce((pathA, pathB) => {
			return OS.Path.join(pathA, pathB);
		}) : array.toString();
	}
	exports.joinPath = joinPath;

	/* attempt to remove Directory (and Files in the Directory) */
	function attemptRemoveDir(path, option = null) {
		path && OS.File.removeDir(path, option).then(() => {}, e => {});
	}
	exports.attemptRemoveDir = attemptRemoveDir;

	/* make Directory */
	function makeDirPath(path, callback) {
		path && OS.File.makeDir(path).then(() => {
			return OS.File.setPermissions(path, { unixMode: 0o777 });
		}).then(() => {
			callback && callback(path);
		}).catch(onError);
	}
	exports.makeDirPath = makeDirPath;

	/* force init Directory */
	function initDirPath(path, option = null, callback, value = null) {
		path && OS.File.removeDir(path, option).then(() => {
			makeDirPath(path);
		}, e => {
			callback ? callback(e, value) : onError(e);
		});
	}
	exports.initDirPath = initDirPath;

	/* create Directory */
	function createDir(path, callback) {
		path && (
			path = Array.isArray(path) ? joinPath(path) : path,
			OS.File.makeDir(path).then(() => {
				return OS.File.setPermissions(path, { unixMode: 0o777 });
			}).then(() => {
				callback && callback(path);
			}).catch(onError)
		);
	}
	exports.createDir = createDir;

	/* create File */
	function createFile(path, value = "", callback) {
		let textEncoder, fileURI;
		path && callback && (
			path = Array.isArray(path) ? joinPath(path) : path,
			textEncoder = new TextEncoder(),
			fileURI = OS.Path.toFileURI(path),
			OS.File.writeAtomic(path, textEncoder.encode(value), { tmpPath: `${ path }.tmp` }).then(() => {
				return OS.File.setPermissions(path, { unixMode: 0o666 });
			}).then(() => {
				callback(path, fileURI);
			}).catch(onError)
		);
	}
	exports.createFile = createFile;

	/* File is a file or not
	*  @returns { boolean }
	*/
	function fileIsFile(path) {
		return path ? OS.File.exists(path).then(bool => {
			return bool && OS.File.stat(path);
		}).then(info => {
			return info && !info.isDir && !info.isSymLink;
		}).catch(onError) : false;
	}
	exports.fileIsFile = fileIsFile;

	/* File is executable or not
	*  @returns { boolean }
	*/
	function fileIsExecutable(path) {
		return path ? OS.File.exists(path).then(bool => {
			function isAppPackage(file) {
				file.QueryInterface(Ci.nsILocalFileMac);
				return file.isPackage();
			}
			let file;
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
	function openFileWithApp(filePath, appPath, envDisplay = "", callback) {
		filePath && appPath && all([fileIsFile(filePath), fileIsExecutable(appPath)]).then(array => {
			let run;
			for(let i of array) {
				run = i;
				if(!run) {
					break;
				}
			}
			run && execFile(
				useOpen ? "/usr/bin/open" : appPath,
				useOpen ? ["-a", appPath, "--args", filePath] : [filePath],
				envDisplay !== "" ? { env: { DISPLAY: envDisplay } } : {},
				(error, stdout, stderr) => {
					error && onError(error);
					stderr && callback && callback(new Error(stderr.toString()));
				}
			);
		}).catch(onError);
	}
	exports.openFileWithApp = openFileWithApp;

	/* get profile name from profileDir
	*  @returns { (string|boolean) }
	*/
	function getProfName() {
		let prof = OS.Path.split(OS.Constants.Path.profileDir), name = prof.components && /^.+\.([^\.]+)$/.exec(prof.components);
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
