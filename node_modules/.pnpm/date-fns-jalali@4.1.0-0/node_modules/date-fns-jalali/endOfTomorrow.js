import { constructNow } from "./constructNow.js";

import { getMonth as coreGetMonth } from "./_core/getMonth.js";
import { getDate as coreGetDate } from "./_core/getDate.js";
import { getFullYear as coreGetFullYear } from "./_core/getFullYear.js";
import { setFullYear as coreSetFullYear } from "./_core/setFullYear.js";

/**
 * The {@link endOfTomorrow} function options.
 */

/**
 * @name endOfTomorrow
 * @category Day Helpers
 * @summary Return the end of tomorrow.
 * @pure false
 *
 * @description
 * Return the end of tomorrow.
 *
 * @typeParam DateType - The `Date` type, the function operates on. Gets inferred from passed arguments. Allows to use extensions like [`UTCDate`](https://github.com/date-fns/utc).
 * @typeParam ResultDate - The result `Date` type, it is the type returned from the context function if it is passed, or inferred from the arguments.
 *
 * @param options - The options
 * @returns The end of tomorrow
 *
 * @example
 * // If today is 6 October 2014:
 * const result = endOfTomorrow()
 * //=> Tue Oct 7 2014 23:59:59.999
 */
export function endOfTomorrow(options) {
  const now = constructNow(options?.in);
  const year = coreGetFullYear(now);
  const month = coreGetMonth(now);
  const day = coreGetDate(now);

  const date = constructNow(options?.in);
  coreSetFullYear(date, year, month, day + 1);
  date.setHours(23, 59, 59, 999);
  return options?.in ? options.in(date) : date;
}

// Fallback for modularized imports:
export default endOfTomorrow;
