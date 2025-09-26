import { toEthiopicDate, toGregorianDate } from "../utils/index.js";
/**
 * Start of day
 *
 * @param {Date} date - The original date
 * @returns {Date} The start of the day
 */
export function startOfDay(date) {
    const { year, month, day } = toEthiopicDate(date);
    return toGregorianDate({ year, month, day });
}
