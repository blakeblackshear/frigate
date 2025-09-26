"use strict";
exports.endOfTomorrow = endOfTomorrow;
var _index = require("./constructNow.cjs");

var _index2 = require("./_core/getMonth.cjs");
var _index3 = require("./_core/getDate.cjs");
var _index4 = require("./_core/getFullYear.cjs");
var _index5 = require("./_core/setFullYear.cjs");

/**
 * The {@link endOfTomorrow} function options.
 */

/**
 * @name endOfTomorrow
 * @category Day Helpers
 * @summary Return the end of tomorrow.
 * @pure false
 *
 * @description
 * Return the end of tomorrow.
 *
 * @typeParam DateType - The `Date` type, the function operates on. Gets inferred from passed arguments. Allows to use extensions like [`UTCDate`](https://github.com/date-fns/utc).
 * @typeParam ResultDate - The result `Date` type, it is the type returned from the context function if it is passed, or inferred from the arguments.
 *
 * @param options - The options
 * @returns The end of tomorrow
 *
 * @example
 * // If today is 6 October 2014:
 * const result = endOfTomorrow()
 * //=> Tue Oct 7 2014 23:59:59.999
 */
function endOfTomorrow(options) {
  const now = (0, _index.constructNow)(options?.in);
  const year = (0, _index4.getFullYear)(now);
  const month = (0, _index2.getMonth)(now);
  const day = (0, _index3.getDate)(now);

  const date = (0, _index.constructNow)(options?.in);
  (0, _index5.setFullYear)(date, year, month, day + 1);
  date.setHours(23, 59, 59, 999);
  return options?.in ? options.in(date) : date;
}
