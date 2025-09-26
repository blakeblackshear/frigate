import { constructFrom } from "./constructFrom.js";
import { isFriday } from "./isFriday.js";
import { isWeekend } from "./isWeekend.js";
import { toDate } from "./toDate.js";

import { getDate as coreGetDate } from "./_core/getDate.js";
import { setDate as coreSetDate } from "./_core/setDate.js";

/**
 * The {@link addBusinessDays} function options.
 */

/**
 * @name addBusinessDays
 * @category Day Helpers
 * @summary Add the specified number of business days (mon - fri) to the given date.
 *
 * @description
 * Add the specified number of business days (mon - fri) to the given date, ignoring weekends.
 *
 * @typeParam DateType - The `Date` type, the function operates on. Gets inferred from passed arguments. Allows to use extensions like [`UTCDate`](https://github.com/date-fns/utc).
 * @typeParam ResultDate - The result `Date` type, it is the type returned from the context function if it is passed, or inferred from the arguments.
 *
 * @param date - The date to be changed
 * @param amount - The amount of business days to be added.
 * @param options - An object with options
 *
 * @returns The new date with the business days added
 *
 * @example
 * // Add 10 business days to 1 September 2014:
 * const result = addBusinessDays(new Date(2014, 8, 1), 10)
 * //=> Mon Sep 15 2014 00:00:00 (skipped weekend days)
 */
export function addBusinessDays(date, amount, options) {
  const _date = toDate(date, options?.in);
  const startedOnWeekend = isWeekend(_date, options);

  if (isNaN(amount)) return constructFrom(options?.in, NaN);

  const hours = _date.getHours();
  const sign = amount < 0 ? -1 : 1;
  const fullWeeks = Math.trunc(amount / 6);

  coreSetDate(_date, coreGetDate(_date) + fullWeeks * 7);

  // Get remaining days not part of a full week
  let restDays = Math.abs(amount % 6);

  // Loops over remaining days
  while (restDays > 0) {
    coreSetDate(_date, coreGetDate(_date) + sign);
    if (!isWeekend(_date, options)) restDays -= 1;
  }

  // If the date is a weekend day and we reduce a dividable of
  // 5 from it, we land on a weekend date.
  // To counter this, we add days accordingly to land on the next business day
  if (startedOnWeekend && isWeekend(_date, options) && amount !== 0) {
    // If we're reducing days, we want to add days until we land on a weekday
    // If we're adding days we want to reduce days until we land on a weekday
    if (isFriday(_date, options))
      coreSetDate(_date, coreGetDate(_date) + (sign < 0 ? 1 : -2));
  }

  // Restore hours to avoid DST lag
  _date.setHours(hours);

  return _date;
}

// Fallback for modularized imports:
export default addBusinessDays;
