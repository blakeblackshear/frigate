"use strict";
exports.getDate = getDate;
var _index = require("../_lib/jalali.cjs");

/**
 *
 * @param cleanDate {Date}
 * @returns {number}
 */
function getDate(cleanDate) {
  const gd = cleanDate.getDate();
  const gm = cleanDate.getMonth() + 1;
  const gy = cleanDate.getFullYear();
  return (0, _index.toJalali)(gy, gm, gd).jd;
}
