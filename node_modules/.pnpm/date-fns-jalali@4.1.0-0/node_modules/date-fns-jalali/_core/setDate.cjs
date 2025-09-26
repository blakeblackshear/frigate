"use strict";
exports.setDate = setDate;
var _index = require("../_lib/jalali.cjs");

/**
 *
 * @param cleanDate {Date}
 * @param args
 * @returns {number}
 */
function setDate(cleanDate, ...args) {
  const gd = cleanDate.getDate();
  const gm = cleanDate.getMonth() + 1;
  const gy = cleanDate.getFullYear();
  const j = (0, _index.toJalali)(gy, gm, gd);
  const [date] = args;
  const g = (0, _index.toGregorian)(j.jy, j.jm, date);
  return cleanDate.setFullYear(g.gy, g.gm - 1, g.gd);
}
