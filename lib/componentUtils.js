/**
*	componentUtils.js
*/
(() => {
	"use strict";
	/* jsm, sdk */
	const { Cu } = require("chrome");
	const { OS, TextEncoder } = Cu.import("resource://gre/modules/osfile.jsm", {});
	const FileUtils = Cu.import("resource://gre/modules/FileUtils.jsm").FileUtils;
	const Services = Cu.import("resource://gre/modules/Services.jsm").Services;
	const all = require("sdk/core/promise").all;
	const execFile = require("sdk/system/child_process").execFile;

	/* error handling */
	const onError = e => {
		e && console.error(e);
	}
	exports.onError = onError;

	/* join path
	*  @returns { string }
	*/
	const joinPath = (array = [""]) => {
		return Array.isArray(array) && array.length > 1 ? array.reduce((pathA, pathB) => {
			return OS.Path.join(pathA, pathB);
		}) : array.toString();
	}
	exports.joinPath = joinPath;

	/* attempt to remove Directory (and Files in the Directory) */
	const attemptRemoveDir = (path, option = null) => {
		path && OS.File.removeDir(path, option).then(() => {}, e => {});
	}
	exports.attemptRemoveDir = attemptRemoveDir;

	/* make Directory */
	const makeDirPath = (path, callback = null) => {
		path && OS.File.makeDir(path).then(() => {
			return OS.File.setPermissions(path, { unixMode: 0o777 });
		}).then(() => {
			callback && callback(path);
		}).catch(onError);
	}
	exports.makeDirPath = makeDirPath;

	/* force init Directory */
	const initDirPath = (path, option = null, callback = null) => {
		path && OS.File.removeDir(path, option).then(() => {
			makeDirPath(path);
		}, e => {
			callback && callback(e);
			onError(e);
		});
	}
	exports.initDirPath = initDirPath;

	/* create Directory */
	const createDir = (path, callback = null) => {
		path && (
			Array.isArray(path) && (path = joinPath(path)),
			OS.File.makeDir(path).then(() => {
				return OS.File.setPermissions(path, { unixMode: 0o777 });
			}).then(() => {
				callback && callback(path);
			}).catch(onError)
		);
	}
	exports.createDir = createDir;

	/* create File */
	const createFile = (path, value = "", callback = null) => {
		path && callback && (
			Array.isArray(path) && (path = joinPath(path)),
			OS.File.writeAtomic(path, new TextEncoder().encode(value), { tmpPath: `${ path }.tmp` }).then(() => {
				return OS.File.setPermissions(path, { unixMode: 0o666 });
			}).then(() => {
				callback(path, OS.Path.toFileURI(path));
			}).catch(onError)
		);
	}
	exports.createFile = createFile;

	/* File is a file or not
	*  @returns { boolean }
	*/
	const fileIsFile = path => {
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
	const fileIsExecutable = path => {
		return path ? OS.File.exists(path).then(bool => {
			return bool && new FileUtils.File(path).isExecutable();
		}, onError) : false;
	}
	exports.fileIsExecutable = fileIsExecutable;

	/* open File with Application */
	const openFileWithApp = (filePath, appPath, cmdArgs = "", envDisplay = "", callback = null) => {
		filePath && appPath && all([fileIsFile(filePath), fileIsExecutable(appPath)]).then(array => {
			let run;
			for(let i of array) {
				run = i;
				if(!run) {
					break;
				}
			}
			run && execFile(
				appPath,
				cmdArgs && /\S+/.test(cmdArgs) ? [filePath].concat(cmdArgs.match(/"[^"]?(?:(?:[^"]|\\"[^"]?(?:[^"]*[^"\s])?\\")*[^"\s])?"|[^"\s]+/g)) : [filePath],
				envDisplay !== "" ? { env: { DISPLAY: envDisplay } } : {},
				(error, stdout, stderr) => {
					error && (
						callback && callback(error),
						onError(error)
					);
				}
			);
		}).catch(onError);
	}
	exports.openFileWithApp = openFileWithApp;

	/* get profile name from profileDir
	*  @returns { (string|boolean) }
	*/
	const getProfName = () => {
		const prof = OS.Path.split(OS.Constants.Path.profileDir);
		const name = prof.components && /^.+\.([^\.]+)$/.exec(prof.components);
		return name ? name[1] : false;
	}
	exports.getProfName = getProfName;

	/* compare browser version
	*  @returns { ?number } -1 | 0 | 1 | undefined
	*/
	const compareVersion = version => {
		return version && Services.vc.compare(Services.appinfo.version, version);
	}
	exports.compareVersion = compareVersion;
})();
