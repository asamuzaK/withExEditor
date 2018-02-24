/**
 * migrate.js
 */
"use strict";
{
  /* api */
  const {
    commands, runtime,
    storage: {
      local: localStorage,
    },
  } = browser;

  /* constant */
  const EDITOR_EXEC = "execEditor";
  const EXT_WEBEXT = "jid1-WiAigu4HIo0Tag@jetpack";
  const KEY_ACCESS = "accessKey";
  const KEY_EDITOR = "editorShortCut";
  const KEY_OPTIONS = "optionsShortCut";
  const OPTIONS_OPEN = "openOptionsPage";

  /**
   * log error
   * @param {!Object} e - Error
   * @returns {boolean} - false
   */
  const logError = e => {
    console.error(e);
    return false;
  };

  /**
   * is string
   * @param {*} o - object to check
   * @returns {boolean} - result
   */
  const isString = o => typeof o === "string" || o instanceof String;

  /**
   * update command
   * @param {string} id - command ID
   * @param {string} value - key value
   * @retunrs {void}
   */
  const updateCmd = async (id, value) => {
    if (typeof commands.update === "function" &&
        isString(id) && isString(value)) {
      const shortcut =
        value.trim().replace(/\+([a-z])$/, (m, c) => `+${c.toUpperCase()}`);
      if (/^(?:(?:(?:Alt|Command|(?:Mac)?Ctrl)\+(?:Shift\+)?(?:[\dA-Z]|F(?:[1-9]|1[0-2])|(?:Page)?(?:Down|Up)|Left|Right|Comma|Period|Home|End|Delete|Insert|Space))|F(?:[1-9]|1[0-2]))$/.test(shortcut)) {
        await commands.update({
          shortcut,
          name: id,
        });
      } else if (shortcut === "") {
        await commands.reset(id);
      }
    }
  };

  /**
   * migrate old storage
   * @returns {Promise.<Array>} - results of each handler
   */
  const migrateStorage = async () => {
    const {id} = runtime;
    const store = await localStorage.get([
      EDITOR_EXEC,
      KEY_ACCESS,
      KEY_EDITOR,
      KEY_OPTIONS,
      OPTIONS_OPEN,
    ]);
    const func = [];
    if (id === EXT_WEBEXT) {
      const accKey = store[KEY_ACCESS] && store[KEY_ACCESS].value || "U";
      if (!store[EDITOR_EXEC]) {
        const {os} = await runtime.getPlatformInfo();
        const isMac = os === "mac";
        const ctrl = isMac && "MacCtrl" || "Ctrl";
        const enabled = !store[KEY_EDITOR] || store[KEY_EDITOR].checked;
        const value = enabled && `${ctrl}+Shift+${accKey}` || "";
        func.push(
          localStorage.set({
            [EDITOR_EXEC]: {
              value,
              id: EDITOR_EXEC,
              app: {
                executable: false,
              },
              checked: false,
            },
          }),
          updateCmd(EDITOR_EXEC, value),
        );
      }
      if (!store[OPTIONS_OPEN]) {
        const enabled = !store[KEY_OPTIONS] || store[KEY_OPTIONS].checked;
        const value = enabled && `Alt+Shift+${accKey}` || "";
        func.push(
          localStorage.set({
            [OPTIONS_OPEN]: {
              value,
              id: OPTIONS_OPEN,
              app: {
                executable: false,
              },
              checked: false,
            },
          }),
          updateCmd(OPTIONS_OPEN, value),
        );
      }
    }
    store[KEY_EDITOR] && func.push(localStorage.remove(KEY_EDITOR));
    store[KEY_OPTIONS] && func.push(localStorage.remove(KEY_OPTIONS));
    return Promise.all(func);
  };

  document.addEventListener("DOMContentLoaded", () =>
    migrateStorage().catch(logError)
  );
}
