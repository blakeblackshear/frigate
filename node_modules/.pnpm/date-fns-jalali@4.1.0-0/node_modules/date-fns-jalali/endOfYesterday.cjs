"use strict";
exports.endOfYesterday = endOfYesterday;
var _index = require("./constructFrom.cjs");
var _index2 = require("./constructNow.cjs");

var _index3 = require("./_core/getMonth.cjs");
var _index4 = require("./_core/getDate.cjs");
var _index5 = require("./_core/getFullYear.cjs");
var _index6 = require("./_core/setFullYear.cjs");

/**
 * The {@link endOfYesterday} function options.
 */

/**
 * @name endOfYesterday
 * @category Day Helpers
 * @summary Return the end of yesterday.
 * @pure false
 *
 * @description
 * Return the end of yesterday.
 *
 * @typeParam DateType - The `Date` type, the function operates on. Gets inferred from passed arguments. Allows to use extensions like [`UTCDate`](https://github.com/date-fns/utc).
 * @typeParam ResultDate - The result `Date` type, it is the type returned from the context function if it is passed, or inferred from the arguments.
 *
 * @returns The end of yesterday
 *
 * @example
 * // If today is 6 October 2014:
 * const result = endOfYesterday()
 * //=> Sun Oct 5 2014 23:59:59.999
 */
function endOfYesterday(options) {
  const now = (0, _index2.constructNow)(options?.in);
  const date = (0, _index.constructFrom)(options?.in, 0);
  (0, _index6.setFullYear)(
    date,
    (0, _index5.getFullYear)(now),
    (0, _index3.getMonth)(now),
    (0, _index4.getDate)(now) - 1,
  );
  date.setHours(23, 59, 59, 999);
  return date;
}
