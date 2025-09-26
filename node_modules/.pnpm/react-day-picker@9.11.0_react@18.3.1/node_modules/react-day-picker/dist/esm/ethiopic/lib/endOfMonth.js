import { daysInMonth } from "../utils/daysInMonth.js";
import { toEthiopicDate, toGregorianDate } from "../utils/index.js";
/**
 * Returns the last day of the Ethiopian month for the given date.
 *
 * @param date - The gregorian date to get the end of month for
 * @returns A new gregorian date representing the last day of the Ethiopian
 *   month
 */
export function endOfMonth(date) {
    const { year, month } = toEthiopicDate(date);
    const day = daysInMonth(month, year);
    return toGregorianDate({ year, month, day: day });
}
