"use strict";
exports.newDate = newDate;
var _index = require("../_lib/jalali.cjs");

/**
 *
 * @param args
 * @returns {Date}
 */
function newDate(...args) {
  if (args.length > 1) {
    const [year, month, day = 1, ...rest] = args;
    const g = (0, _index.toGregorian)(year, month + 1, day);
    return new Date(...[g.gy, g.gm - 1, g.gd, ...rest]);
  }
  return new Date(...args);
}
