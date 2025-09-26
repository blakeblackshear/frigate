"use strict";
exports.setFullYear = setFullYear;
var _index = require("../_lib/jalali.cjs");

/**
 *
 * @param cleanDate {Date}
 * @param args
 * @returns {number}
 */
function setFullYear(cleanDate, ...args) {
  const gd = cleanDate.getDate();
  const gm = cleanDate.getMonth() + 1;
  const gy = cleanDate.getFullYear();
  const j = (0, _index.toJalali)(gy, gm, gd);
  const [year, month = j.jm - 1, date = j.jd] = args;
  const g = (0, _index.toGregorian)(year, month + 1, date);
  return cleanDate.setFullYear(g.gy, g.gm - 1, g.gd);
}
