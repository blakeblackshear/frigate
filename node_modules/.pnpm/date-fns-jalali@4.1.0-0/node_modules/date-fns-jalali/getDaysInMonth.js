import { constructFrom } from "./constructFrom.js";
import { toDate } from "./toDate.js";

import { getMonth as coreGetMonth } from "./_core/getMonth.js";
import { getDate as coreGetDate } from "./_core/getDate.js";
import { getFullYear as coreGetFullYear } from "./_core/getFullYear.js";
import { setFullYear as coreSetFullYear } from "./_core/setFullYear.js";

/**
 * The {@link getDaysInMonth} function options.
 */

/**
 * @name getDaysInMonth
 * @category Month Helpers
 * @summary Get the number of days in a month of the given date.
 *
 * @description
 * Get the number of days in a month of the given date, considering the context if provided.
 *
 * @param date - The given date
 * @param options - An object with options
 *
 * @returns The number of days in a month
 *
 * @example
 * // How many days are in February 2000?
 * const result = getDaysInMonth(new Date(2000, 1))
 * //=> 29
 */
export function getDaysInMonth(date, options) {
  const _date = toDate(date, options?.in);
  const year = coreGetFullYear(_date);
  const monthIndex = coreGetMonth(_date);
  const lastDayOfMonth = constructFrom(_date, 0);
  coreSetFullYear(lastDayOfMonth, year, monthIndex + 1, 0);
  lastDayOfMonth.setHours(0, 0, 0, 0);
  return coreGetDate(lastDayOfMonth);
}

// Fallback for modularized imports:
export default getDaysInMonth;
