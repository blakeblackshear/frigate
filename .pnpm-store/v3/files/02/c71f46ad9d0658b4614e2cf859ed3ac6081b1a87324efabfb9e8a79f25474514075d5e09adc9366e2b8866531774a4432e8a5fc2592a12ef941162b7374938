import { setMonth } from "./setMonth.js";
import { toDate } from "./toDate.js";

import { getMonth as coreGetMonth } from "./_core/getMonth.js";

/**
 * The {@link setQuarter} function options.
 */

/**
 * @name setQuarter
 * @category Quarter Helpers
 * @summary Set the year quarter to the given date.
 *
 * @description
 * Set the year quarter to the given date.
 *
 * @typeParam DateType - The `Date` type, the function operates on. Gets inferred from passed arguments. Allows to use extensions like [`UTCDate`](https://github.com/date-fns/utc).
 * @typeParam ResultDate - The result `Date` type, it is the type returned from the context function if it is passed, or inferred from the arguments.
 *
 * @param date - The date to be changed
 * @param quarter - The quarter of the new date
 * @param options - The options
 *
 * @returns The new date with the quarter set
 *
 * @example
 * // Set the 2nd quarter to 2 July 2014:
 * const result = setQuarter(new Date(2014, 6, 2), 2)
 * //=> Wed Apr 02 2014 00:00:00
 */
export function setQuarter(date, quarter, options) {
  const date_ = toDate(date, options?.in);
  const oldQuarter = Math.trunc(coreGetMonth(date_) / 3) + 1;
  const diff = quarter - oldQuarter;
  return setMonth(date_, coreGetMonth(date_) + diff * 3);
}

// Fallback for modularized imports:
export default setQuarter;
