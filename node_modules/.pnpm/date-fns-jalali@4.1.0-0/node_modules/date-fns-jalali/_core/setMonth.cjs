"use strict";
exports.setMonth = setMonth;
var _index = require("../_lib/jalali.cjs");

/**
 *
 * @param cleanDate {Date}
 * @param args
 * @returns {number}
 */
function setMonth(cleanDate, ...args) {
  const gd = cleanDate.getDate();
  const gm = cleanDate.getMonth() + 1;
  const gy = cleanDate.getFullYear();
  const j = (0, _index.toJalali)(gy, gm, gd);
  const [month, date = j.jd] = args;
  const g = (0, _index.toGregorian)(j.jy, month + 1, date);
  return cleanDate.setFullYear(g.gy, g.gm - 1, g.gd);
}
