/**
 * content-loader.js
 */

/* shared */
import {
  handleBeforeContextMenu, handleKeyDown, handleReadyState, runtimeOnMsg,
  startup
} from './content-main.js';

/* api */
const { runtime } = browser;

/* listeners */
runtime.onMessage.addListener(runtimeOnMsg);
window.addEventListener('mousedown', handleBeforeContextMenu, true);
window.addEventListener('keydown', handleKeyDown, true);

/* startup */
if (document.readyState === 'complete') {
  startup();
} else {
  document.addEventListener('readystatechange', handleReadyState);
}
