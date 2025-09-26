import { toGregorianDate } from "../utils/index.js";
import { isEthiopicDateValid } from "../utils/isEthiopicDateValid.js";
/**
 * Creates a new Ethiopic date
 *
 * @param {number} year - The year of the Ethiopic date
 * @param {number} monthIndex - The zero-based month index of the Ethiopic date
 * @param {number} date - The day of the month of the Ethiopic date
 * @returns {Date} The corresponding Gregorian date
 */
export function newDate(year, monthIndex, date) {
    // Convert from 0-based month index to 1-based Ethiopic month
    const month = monthIndex + 1;
    if (!isEthiopicDateValid({ year, month, day: date })) {
        throw new Error("Invalid Ethiopic date");
    }
    return toGregorianDate({
        year: year,
        month: month,
        day: date,
    });
}
