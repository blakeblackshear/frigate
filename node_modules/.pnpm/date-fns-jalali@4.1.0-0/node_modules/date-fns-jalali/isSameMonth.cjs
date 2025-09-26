"use strict";
exports.isSameMonth = isSameMonth;
var _index = require("./_lib/normalizeDates.cjs");

var _index2 = require("./_core/getMonth.cjs");
var _index3 = require("./_core/getFullYear.cjs");

/**
 * The {@link isSameMonth} function options.
 */

/**
 * @name isSameMonth
 * @category Month Helpers
 * @summary Are the given dates in the same month (and year)?
 *
 * @description
 * Are the given dates in the same month (and year)?
 *
 * @param laterDate - The first date to check
 * @param earlierDate - The second date to check
 * @param options - An object with options
 *
 * @returns The dates are in the same month (and year)
 *
 * @example
 * // Are 2 September 2014 and 25 September 2014 in the same month?
 * const result = isSameMonth(new Date(2014, 8, 2), new Date(2014, 8, 25))
 * //=> true
 *
 * @example
 * // Are 2 September 2014 and 25 September 2015 in the same month?
 * const result = isSameMonth(new Date(2014, 8, 2), new Date(2015, 8, 25))
 * //=> false
 */
function isSameMonth(laterDate, earlierDate, options) {
  const [laterDate_, earlierDate_] = (0, _index.normalizeDates)(
    options?.in,
    laterDate,
    earlierDate,
  );
  return (
    (0, _index3.getFullYear)(laterDate_) ===
      (0, _index3.getFullYear)(earlierDate_) &&
    (0, _index2.getMonth)(laterDate_) === (0, _index2.getMonth)(earlierDate_)
  );
}
