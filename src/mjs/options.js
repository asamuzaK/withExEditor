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
  addSyncUrlsInputListener, getHostStatus, setValuesFromStorage,
} from "./options-main.js";

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
