/**
 * migrate.js
 */

import {
  getAllStorage, removeStorage, updateCommand,
} from "./browser.js";

/* constants */
import {EDITOR_EXEC, OPTIONS_OPEN} from "./constant.js";
const ENABLE_PB = "enablePB";
const KEY_ACCESS = "accessKey";
const KEY_EDITOR = "editorShortCut";
const KEY_OPTIONS = "optionsShortCut";

/**
 * migrate old storage
 * @returns {Promise.<Array>} - results of each handler
 */
export const migrateStorage = async () => {
  const store = await getAllStorage();
  const func = [];
  if (store[EDITOR_EXEC]) {
    const {value} = store[EDITOR_EXEC];
    await updateCommand(EDITOR_EXEC, value);
    func.push(removeStorage(EDITOR_EXEC));
  }
  if (store[OPTIONS_OPEN]) {
    const {value} = store[OPTIONS_OPEN];
    await updateCommand(OPTIONS_OPEN, value);
    func.push(removeStorage(OPTIONS_OPEN));
  }
  if (store[ENABLE_PB]) {
    func.push(removeStorage(ENABLE_PB));
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
