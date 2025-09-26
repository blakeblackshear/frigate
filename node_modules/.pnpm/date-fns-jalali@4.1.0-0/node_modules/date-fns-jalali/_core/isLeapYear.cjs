"use strict";
exports.isLeapYear = isLeapYear;
var _index = require("../_lib/jalali.cjs");

/**
 *
 * @param year {number}
 * @returns {boolean}
 */
function isLeapYear(year) {
  return (0, _index.isLeapJalaliYear)(year);
}
