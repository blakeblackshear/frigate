import { toDate } from "./toDate.js";

import { setMonth as coreSetMonth } from "./_core/setMonth.js";
import { setDate as coreSetDate } from "./_core/setDate.js";

/**
 * The {@link setDayOfYear} function options.
 */

/**
 * @name setDayOfYear
 * @category Day Helpers
 * @summary Set the day of the year to the given date.
 *
 * @description
 * Set the day of the year to the given date.
 *
 * @typeParam DateType - The `Date` type, the function operates on. Gets inferred from passed arguments. Allows to use extensions like [`UTCDate`](https://github.com/date-fns/utc).
 * @typeParam ResultDate - The result `Date` type, it is the type returned from the context function if it is passed, or inferred from the arguments.
 *
 * @param date - The date to be changed
 * @param dayOfYear - The day of the year of the new date
 * @param options - An object with options
 *
 * @returns The new date with the day of the year set
 *
 * @example
 * // Set the 2nd day of the year to 2 July 2014:
 * const result = setDayOfYear(new Date(2014, 6, 2), 2)
 * //=> Thu Jan 02 2014 00:00:00
 */
export function setDayOfYear(date, dayOfYear, options) {
  const date_ = toDate(date, options?.in);
  coreSetMonth(date_, 0);
  coreSetDate(date_, dayOfYear);
  return date_;
}

// Fallback for modularized imports:
export default setDayOfYear;
