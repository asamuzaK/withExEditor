/**
 * options.js
 */

import {
  throwErr,
} from "./common.js";
import {
  localizeHtml,
} from "./localize.js";
import {
  disableIncompatibleInputs, addListenerToCmdInputs,
} from "./compat.js";
import {
  addFormSubmitListener, addInputChangeListener, addReloadExtensionListener,
  addSyncUrlsInputListener, getHostStatus, handleMsg, port,
  setValuesFromStorage,
} from "./options-main.js";

/* listener */
port.onMessage.addListener(msg => handleMsg(msg).catch(throwErr));

/* startup */
Promise.all([
  localizeHtml(),
  setValuesFromStorage(),
  addInputChangeListener(),
  addSyncUrlsInputListener(),
  addReloadExtensionListener(),
  addFormSubmitListener(),
  getHostStatus(),
  disableIncompatibleInputs(),
  addListenerToCmdInputs(),
]).catch(throwErr);
