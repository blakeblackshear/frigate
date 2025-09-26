import { toEthiopicDate, toGregorianDate } from "../utils/index.js";
/**
 * Start of month
 *
 * @param {Date} date - The original date
 * @returns {Date} The start of the month
 */
export function startOfMonth(date) {
    const { year, month } = toEthiopicDate(date);
    return toGregorianDate({ year, month, day: 1 });
}
