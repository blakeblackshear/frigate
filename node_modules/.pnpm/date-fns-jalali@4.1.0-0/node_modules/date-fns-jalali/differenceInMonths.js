import { normalizeDates } from "./_lib/normalizeDates.js";
import { compareAsc } from "./compareAsc.js";
import { differenceInCalendarMonths } from "./differenceInCalendarMonths.js";
import { isLastDayOfMonth } from "./isLastDayOfMonth.js";

import { getMonth as coreGetMonth } from "./_core/getMonth.js";
import { setMonth as coreSetMonth } from "./_core/setMonth.js";
import { getDate as coreGetDate } from "./_core/getDate.js";
import { setDate as coreSetDate } from "./_core/setDate.js";

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
export function differenceInMonths(laterDate, earlierDate, options) {
  const [laterDate_, workingLaterDate, earlierDate_] = normalizeDates(
    options?.in,
    laterDate,
    laterDate,
    earlierDate,
  );

  const sign = compareAsc(workingLaterDate, earlierDate_);
  const difference = Math.abs(
    differenceInCalendarMonths(workingLaterDate, earlierDate_),
  );

  if (difference < 1) return 0;

  if (
    coreGetMonth(workingLaterDate) === 1 &&
    coreGetDate(workingLaterDate) > 27
  )
    coreSetDate(workingLaterDate, 30);

  coreSetMonth(
    workingLaterDate,
    coreGetMonth(workingLaterDate) - sign * difference,
  );

  let isLastMonthNotFull = compareAsc(workingLaterDate, earlierDate_) === -sign;

  if (
    isLastDayOfMonth(laterDate_) &&
    difference === 1 &&
    compareAsc(laterDate_, earlierDate_) === 1
  ) {
    isLastMonthNotFull = false;
  }

  const result = sign * (difference - +isLastMonthNotFull);
  return result === 0 ? 0 : result;
}

// Fallback for modularized imports:
export default differenceInMonths;
