import { getMonth as coreGetMonth } from "./_core/getMonth.js";
import { getDate as coreGetDate } from "./_core/getDate.js";
import { getFullYear as coreGetFullYear } from "./_core/getFullYear.js";
import { newDate as coreNewDate } from "./_core/newDate.js";
/**
 * @name isExists
 * @category Common Helpers
 * @summary Is the given date exists?
 *
 * @description
 * Checks if the given arguments convert to an existing date.
 *
 * @param year - The year of the date to check
 * @param month - The month of the date to check
 * @param day - The day of the date to check
 *
 * @returns `true` if the date exists
 *
 * @example
 * // For the valid date:
 * const result = isExists(2018, 0, 31)
 * //=> true
 *
 * @example
 * // For the invalid date:
 * const result = isExists(2018, 1, 31)
 * //=> false
 */
export function isExists(year, month, day) {
  const date = coreNewDate(year, month, day);
  return (
    coreGetFullYear(date) === year &&
    coreGetMonth(date) === month &&
    coreGetDate(date) === day
  );
}

// Fallback for modularized imports:
export default isExists;
