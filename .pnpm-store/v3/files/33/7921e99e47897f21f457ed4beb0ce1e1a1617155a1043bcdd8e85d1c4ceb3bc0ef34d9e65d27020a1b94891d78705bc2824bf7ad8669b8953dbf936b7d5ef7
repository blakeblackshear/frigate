"use strict";
exports.getDaysInMonth = getDaysInMonth;
var _index = require("./constructFrom.cjs");
var _index2 = require("./toDate.cjs");

var _index3 = require("./_core/getMonth.cjs");
var _index4 = require("./_core/getDate.cjs");
var _index5 = require("./_core/getFullYear.cjs");
var _index6 = require("./_core/setFullYear.cjs");

/**
 * The {@link getDaysInMonth} function options.
 */

/**
 * @name getDaysInMonth
 * @category Month Helpers
 * @summary Get the number of days in a month of the given date.
 *
 * @description
 * Get the number of days in a month of the given date, considering the context if provided.
 *
 * @param date - The given date
 * @param options - An object with options
 *
 * @returns The number of days in a month
 *
 * @example
 * // How many days are in February 2000?
 * const result = getDaysInMonth(new Date(2000, 1))
 * //=> 29
 */
function getDaysInMonth(date, options) {
  const _date = (0, _index2.toDate)(date, options?.in);
  const year = (0, _index5.getFullYear)(_date);
  const monthIndex = (0, _index3.getMonth)(_date);
  const lastDayOfMonth = (0, _index.constructFrom)(_date, 0);
  (0, _index6.setFullYear)(lastDayOfMonth, year, monthIndex + 1, 0);
  lastDayOfMonth.setHours(0, 0, 0, 0);
  return (0, _index4.getDate)(lastDayOfMonth);
}
