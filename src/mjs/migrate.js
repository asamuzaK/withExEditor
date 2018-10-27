/**
 * migrate.js
 */

import {
  getStorage, removeStorage, setStorage, updateCommand,
} from "./browser.js";

/* api */
const {runtime} = browser;

/* constants */
import {EDITOR_EXEC, OPTIONS_OPEN, WEBEXT_ID} from "./constant.js";
const KEY_ACCESS = "accessKey";
const KEY_EDITOR = "editorShortCut";
const KEY_OPTIONS = "optionsShortCut";

/**
 * migrate old storage
 * @returns {Promise.<Array>} - results of each handler
 */
export const migrateStorage = async () => {
  const {id} = runtime;
  const store = await getStorage([
    EDITOR_EXEC,
    KEY_ACCESS,
    KEY_EDITOR,
    KEY_OPTIONS,
    OPTIONS_OPEN,
  ]);
  const func = [];
  if (id === WEBEXT_ID) {
    const accKey = store[KEY_ACCESS] && store[KEY_ACCESS].value || "U";
    if (!store[EDITOR_EXEC]) {
      const {os} = await runtime.getPlatformInfo();
      const isMac = os === "mac";
      const ctrl = isMac && "MacCtrl" || "Ctrl";
      const enabled = !store[KEY_EDITOR] || store[KEY_EDITOR].checked;
      const value = enabled && `${ctrl}+Shift+${accKey}` || "";
      func.push(
        setStorage({
          [EDITOR_EXEC]: {
            value,
            id: EDITOR_EXEC,
            app: {
              executable: false,
            },
            checked: false,
          },
        }),
        updateCommand(EDITOR_EXEC, value),
      );
    }
    if (!store[OPTIONS_OPEN]) {
      const enabled = !store[KEY_OPTIONS] || store[KEY_OPTIONS].checked;
      const value = enabled && `Alt+Shift+${accKey}` || "";
      func.push(
        setStorage({
          [OPTIONS_OPEN]: {
            value,
            id: OPTIONS_OPEN,
            app: {
              executable: false,
            },
            checked: false,
          },
        }),
        updateCommand(OPTIONS_OPEN, value),
      );
    }
  }
  if (store[KEY_ACCESS]) {
    func.push(removeStorage(KEY_ACCESS));
  }
  if (store[KEY_EDITOR]) {
    func.push(removeStorage(KEY_EDITOR));
  }
  if (store[KEY_OPTIONS]) {
    func.push(removeStorage(KEY_OPTIONS));
  }
  return Promise.all(func);
};
