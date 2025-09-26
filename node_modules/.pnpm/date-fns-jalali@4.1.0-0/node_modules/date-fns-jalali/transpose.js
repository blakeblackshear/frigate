import { constructFrom } from "./constructFrom.js";

import { getMonth as coreGetMonth } from "./_core/getMonth.js";
import { getDate as coreGetDate } from "./_core/getDate.js";
import { getFullYear as coreGetFullYear } from "./_core/getFullYear.js";
import { setFullYear as coreSetFullYear } from "./_core/setFullYear.js";

/**
 * @name transpose
 * @category Generic Helpers
 * @summary Transpose the date to the given constructor.
 *
 * @description
 * The function transposes the date to the given constructor. It helps you
 * to transpose the date in the system time zone to say `UTCDate` or any other
 * date extension.
 *
 * @typeParam InputDate - The input `Date` type derived from the passed argument.
 * @typeParam ResultDate - The result `Date` type derived from the passed constructor.
 *
 * @param date - The date to use values from
 * @param constructor - The date constructor to use
 *
 * @returns Date transposed to the given constructor
 *
 * @example
 * // Create July 10, 2022 00:00 in locale time zone
 * const date = new Date(2022, 6, 10)
 * //=> 'Sun Jul 10 2022 00:00:00 GMT+0800 (Singapore Standard Time)'
 *
 * @example
 * // Transpose the date to July 10, 2022 00:00 in UTC
 * transpose(date, UTCDate)
 * //=> 'Sun Jul 10 2022 00:00:00 GMT+0000 (Coordinated Universal Time)'
 */
export function transpose(date, constructor) {
  const date_ = isConstructor(constructor)
    ? new constructor(0)
    : constructFrom(constructor, 0);
  coreSetFullYear(
    date_,
    coreGetFullYear(date),
    coreGetMonth(date),
    coreGetDate(date),
  );
  date_.setHours(
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
  return date_;
}

function isConstructor(constructor) {
  return (
    typeof constructor === "function" &&
    constructor.prototype?.constructor === constructor
  );
}

// Fallback for modularized imports:
export default transpose;
