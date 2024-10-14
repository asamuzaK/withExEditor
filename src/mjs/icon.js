/**
 * icon.js
 */

/* shared */
import { isString } from './common.js';

/* api */
const { browserAction: action } = browser;

/* variables */
export const icon = new Map();

/**
 * set icon badge
 * @param {object} opt - option
 * @returns {Promise.<Array>} - result of each handler
 */
export const setIconBadge = async (opt = {}) => {
  const { color, text } = opt;
  const func = [];
  if (color &&
      (isString(color) ||
       (Array.isArray(color) &&
        color.every(i => Number.isInteger(i) && i >= 0 && i <= 255))) &&
      isString(text)) {
    func.push(
      action.setBadgeBackgroundColor({ color }),
      action.setBadgeText({ text })
    );
    if (text && typeof action.setBadgeTextColor === 'function') {
      func.push(action.setBadgeTextColor({ color: 'white' }));
    }
  }
  return Promise.all(func);
};
