/**
 * common.js
 */

/* constants */
const TYPE_FROM = 8;
const TYPE_TO = -1;

/**
 * log error
 *
 * @param {!object} e - Error
 * @returns {boolean} - false
 */
export const logErr = e => {
  if (e?.message) {
    console.error(e.message);
  } else {
    console.error(e);
  }
  return false;
};

/**
 * throw error
 *
 * @param {!object} e - Error
 * @throws
 */
export const throwErr = e => {
  logErr(e);
  throw e;
};

/**
 * log warn
 *
 * @param {*} msg - message
 * @returns {boolean} - false
 */
export const logWarn = msg => {
  if (msg) {
    console.warn(msg);
  }
  return false;
};

/**
 * log message
 *
 * @param {*} msg - message
 * @returns {object} - message
 */
export const logMsg = msg => {
  if (msg) {
    console.log(msg);
  }
  return msg;
};

/**
 * get type
 *
 * @param {*} o - object to check
 * @returns {string} - type of object
 */
export const getType = o =>
  Object.prototype.toString.call(o).slice(TYPE_FROM, TYPE_TO);

/**
 * is string
 *
 * @param {*} o - object to check
 * @returns {boolean} - result
 */
export const isString = o => typeof o === 'string' || o instanceof String;

/**
 * is object, and not an empty object
 *
 * @param {*} o - object to check;
 * @returns {boolean} - result
 */
export const isObjectNotEmpty = o => {
  const items = /Object/i.test(getType(o)) && Object.keys(o);
  return !!(items?.length);
};

/**
 * sleep
 *
 * @param {number} msec - milisec
 * @param {boolean} doReject - reject instead of resolve
 * @returns {?Function} - resolve / reject
 */
export const sleep = (msec = 0, doReject = false) => {
  let func;
  if (Number.isInteger(msec) && msec >= 0) {
    func = new Promise((resolve, reject) => {
      if (doReject) {
        setTimeout(reject, msec);
      } else {
        setTimeout(resolve, msec);
      }
    });
  }
  return func || null;
};
