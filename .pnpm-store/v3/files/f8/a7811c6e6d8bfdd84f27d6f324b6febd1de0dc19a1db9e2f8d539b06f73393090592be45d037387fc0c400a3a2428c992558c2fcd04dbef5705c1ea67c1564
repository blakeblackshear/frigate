import { isEthiopicLeapYear, toEthiopicDate, toGregorianDate, } from "../utils/index.js";
/**
 * End of year
 *
 * @param {Date} date - The original date
 * @returns {Date} The end of the year
 */
export function endOfYear(date) {
    const { year } = toEthiopicDate(date);
    const day = isEthiopicLeapYear(year) ? 6 : 5;
    return toGregorianDate({ year, month: 13, day });
}
