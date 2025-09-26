import { toDate } from "./toDate.js";

import { getDate as coreGetDate } from "./_core/getDate.js";

/**
 * The {@link getDate} function options.
 */

/**
 * @name getDate
 * @category Day Helpers
 * @summary Get the day of the month of the given date.
 *
 * @description
 * Get the day of the month of the given date.
 *
 * @param date - The given date
 * @param options - An object with options.
 *
 * @returns The day of month
 *
 * @example
 * // Which day of the month is 29 February 2012?
 * const result = getDate(new Date(2012, 1, 29))
 * //=> 29
 */
export function getDate(date, options) {
  return coreGetDate(toDate(date, options?.in));
}

// Fallback for modularized imports:
export default getDate;
