import { toEthiopicDate, toGregorianDate } from "../utils/index.js";
/**
 * Start of year
 *
 * @param {Date} date - The original date
 * @returns {Date} The start of the year
 */
export function startOfYear(date) {
    const { year } = toEthiopicDate(date);
    return toGregorianDate({ year, month: 1, day: 1 });
}
