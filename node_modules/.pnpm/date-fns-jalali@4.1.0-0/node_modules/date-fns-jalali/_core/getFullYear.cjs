"use strict";
exports.getFullYear = getFullYear;
var _index = require("../_lib/jalali.cjs");

/**
 *
 * @param cleanDate {Date}
 * @returns {number}
 */
function getFullYear(cleanDate) {
  const gd = cleanDate.getDate();
  const gm = cleanDate.getMonth() + 1;
  const gy = cleanDate.getFullYear();
  return (0, _index.toJalali)(gy, gm, gd).jy;
}
