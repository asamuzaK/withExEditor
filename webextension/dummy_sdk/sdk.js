/* sdk dummy */
"use strict";
{
  /**
   * log error
   * @param {Object} e - Error
   * @return {boolean} - false
   */
  const logError = e => {
    e && console.error(e);
    return false;
  };

  /**
   * is string
   * @param {*} o - object to check
   * @return {boolean}
   */
  const isString = o =>
    o && (typeof o === "string" || o instanceof String) || false;

  /**
   * check the file of given path is executable
   * @param {string} path - path
   * @return {Object}
   */
  const checkExecutable = async path => {
    const executable = isString(path) && /\.exe$/.test(path) || false;
                       // await isExecutable(path) || false;
    const name = executable && path.replace(/\..*$/, "") || "";
                 // executable && await getFileNameFromFilePath(path) || "";
    return {executable, name};
  };

  {
    const runtime = browser.runtime;

    const webExtMessage = port => {
      console.log(port.name);
      port.onMessage.addListener(async msg => {
        const items = Object.keys(msg);
        if (items.length > 0) {
          for (let item of items) {
            let res;
            switch (item) {
              case "checkExecutable":
                res = await checkExecutable(msg[item].path).catch(logError);
                port.postMessage(res);
                break;
              case "editorPath":
                console.log(item);
                break;
              default:
            }
          }
        }
      });
    };

    runtime.onConnect.addListener(webExtMessage);
  }
}
