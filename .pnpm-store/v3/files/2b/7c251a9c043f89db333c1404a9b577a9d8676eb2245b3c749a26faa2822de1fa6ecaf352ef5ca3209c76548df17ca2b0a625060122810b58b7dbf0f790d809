"use strict";
exports.setMonth = setMonth;
var _index = require("./constructFrom.cjs");
var _index2 = require("./getDaysInMonth.cjs");
var _index3 = require("./toDate.cjs");

var _index4 = require("./_core/setMonth.cjs");
var _index5 = require("./_core/getDate.cjs");
var _index6 = require("./_core/getFullYear.cjs");
var _index7 = require("./_core/setFullYear.cjs");

/**
 * The {@link setMonth} function options.
 */

/**
 * @name setMonth
 * @category Month Helpers
 * @summary Set the month to the given date.
 *
 * @description
 * Set the month to the given date.
 *
 * @typeParam DateType - The `Date` type, the function operates on. Gets inferred from passed arguments. Allows to use extensions like [`UTCDate`](https://github.com/date-fns/utc).
 * @typeParam ResultDate - The result `Date` type, it is the type returned from the context function if it is passed, or inferred from the arguments.
 *
 * @param date - The date to be changed
 * @param month - The month index to set (0-11)
 * @param options - The options
 *
 * @returns The new date with the month set
 *
 * @example
 * // Set February to 1 September 2014:
 * const result = setMonth(new Date(2014, 8, 1), 1)
 * //=> Sat Feb 01 2014 00:00:00
 */
function setMonth(date, month, options) {
  const _date = (0, _index3.toDate)(date, options?.in);
  const year = (0, _index6.getFullYear)(_date);
  const day = (0, _index5.getDate)(_date);

  const midMonth = (0, _index.constructFrom)(options?.in || date, 0);
  (0, _index7.setFullYear)(midMonth, year, month, 15);
  midMonth.setHours(0, 0, 0, 0);
  const daysInMonth = (0, _index2.getDaysInMonth)(midMonth);

  // Set the earlier date, allows to wrap Jan 31 to Feb 28
  (0, _index4.setMonth)(_date, month, Math.min(day, daysInMonth));
  return _date;
}
