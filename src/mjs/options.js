/**
 * options.js
 */

/* shared */
import { throwErr } from './common.js';
import { showToolbarIconOptions } from './compat.js';
import { localizeHtml } from './localize.js';
import {
  addFormSubmitListener, addInputChangeListener, addSyncUrlsInputListener,
  getEditorConfig, getHostStatus, handleMsg, setValuesFromStorage
} from './options-main.js';

/* api */
const { runtime } = browser;

/* listener */
runtime.onMessage.addListener((msg, sender) =>
  handleMsg(msg, sender).catch(throwErr)
);

/* startup */
document.addEventListener('DOMContentLoaded', () => Promise.all([
  localizeHtml(),
  setValuesFromStorage(),
  addInputChangeListener(),
  addSyncUrlsInputListener(),
  addFormSubmitListener(),
  getHostStatus(),
  getEditorConfig(),
  showToolbarIconOptions()
]).catch(throwErr));
