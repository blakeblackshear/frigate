"use strict";
exports.differenceInCalendarMonths = differenceInCalendarMonths;
var _index = require("./_lib/normalizeDates.cjs");

var _index2 = require("./_core/getMonth.cjs");
var _index3 = require("./_core/getFullYear.cjs");

/**
 * The {@link differenceInCalendarMonths} function options.
 */

/**
 * @name differenceInCalendarMonths
 * @category Month Helpers
 * @summary Get the number of calendar months between the given dates.
 *
 * @description
 * Get the number of calendar months between the given dates.
 *
 * @param laterDate - The later date
 * @param earlierDate - The earlier date
 * @param options - An object with options
 *
 * @returns The number of calendar months
 *
 * @example
 * // How many calendar months are between 31 January 2014 and 1 September 2014?
 * const result = differenceInCalendarMonths(
 *   new Date(2014, 8, 1),
 *   new Date(2014, 0, 31)
 * )
 * //=> 8
 */
function differenceInCalendarMonths(laterDate, earlierDate, options) {
  const [laterDate_, earlierDate_] = (0, _index.normalizeDates)(
    options?.in,
    laterDate,
    earlierDate,
  );

  const yearsDiff =
    (0, _index3.getFullYear)(laterDate_) -
    (0, _index3.getFullYear)(earlierDate_);
  const monthsDiff =
    (0, _index2.getMonth)(laterDate_) - (0, _index2.getMonth)(earlierDate_);

  return yearsDiff * 12 + monthsDiff;
}
