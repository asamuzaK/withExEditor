/**
 * content.js
 */
/* eslint-disable no-unsanitized/method */

'use strict';
/* api */
const { runtime } = browser;

const baseUrl = runtime.getURL('./mjs/');
import(`${baseUrl}content-loader.js`).catch(e => {
  throw e;
});
