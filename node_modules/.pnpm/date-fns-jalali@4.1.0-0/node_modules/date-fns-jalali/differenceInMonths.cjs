"use strict";
exports.differenceInMonths = differenceInMonths;
var _index = require("./_lib/normalizeDates.cjs");
var _index2 = require("./compareAsc.cjs");
var _index3 = require("./differenceInCalendarMonths.cjs");
var _index4 = require("./isLastDayOfMonth.cjs");

var _index5 = require("./_core/getMonth.cjs");
var _index6 = require("./_core/setMonth.cjs");
var _index7 = require("./_core/getDate.cjs");
var _index8 = require("./_core/setDate.cjs");

/**
 * The {@link differenceInMonths} function options.
 */

/**
 * @name differenceInMonths
 * @category Month Helpers
 * @summary Get the number of full months between the given dates.
 *
 * @param laterDate - The later date
 * @param earlierDate - The earlier date
 * @param options - An object with options
 *
 * @returns The number of full months
 *
 * @example
 * // How many full months are between 31 January 2014 and 1 September 2014?
 * const result = differenceInMonths(new Date(2014, 8, 1), new Date(2014, 0, 31))
 * //=> 7
 */
function differenceInMonths(laterDate, earlierDate, options) {
  const [laterDate_, workingLaterDate, earlierDate_] = (0,
  _index.normalizeDates)(options?.in, laterDate, laterDate, earlierDate);

  const sign = (0, _index2.compareAsc)(workingLaterDate, earlierDate_);
  const difference = Math.abs(
    (0, _index3.differenceInCalendarMonths)(workingLaterDate, earlierDate_),
  );

  if (difference < 1) return 0;

  if (
    (0, _index5.getMonth)(workingLaterDate) === 1 &&
    (0, _index7.getDate)(workingLaterDate) > 27
  )
    (0, _index8.setDate)(workingLaterDate, 30);

  (0, _index6.setMonth)(
    workingLaterDate,
    (0, _index5.getMonth)(workingLaterDate) - sign * difference,
  );

  let isLastMonthNotFull =
    (0, _index2.compareAsc)(workingLaterDate, earlierDate_) === -sign;

  if (
    (0, _index4.isLastDayOfMonth)(laterDate_) &&
    difference === 1 &&
    (0, _index2.compareAsc)(laterDate_, earlierDate_) === 1
  ) {
    isLastMonthNotFull = false;
  }

  const result = sign * (difference - +isLastMonthNotFull);
  return result === 0 ? 0 : result;
}
