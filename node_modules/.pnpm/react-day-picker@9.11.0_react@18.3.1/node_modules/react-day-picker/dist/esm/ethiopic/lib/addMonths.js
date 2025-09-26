import { daysInMonth } from "../utils/daysInMonth.js";
import { toEthiopicDate, toGregorianDate } from "../utils/index.js";
/**
 * Adds the specified number of months to the given Ethiopian date. Handles
 * month overflow and year boundaries correctly.
 *
 * @param date - The starting gregorian date
 * @param amount - The number of months to add (can be negative)
 * @returns A new gregorian date with the months added
 */
export function addMonths(date, amount) {
    const { year, month, day } = toEthiopicDate(date);
    let newMonth = month + amount;
    const yearAdjustment = Math.floor((newMonth - 1) / 13);
    newMonth = ((newMonth - 1) % 13) + 1;
    if (newMonth < 1) {
        newMonth += 13;
    }
    const newYear = year + yearAdjustment;
    // Adjust day if it exceeds the month length
    const monthLength = daysInMonth(newMonth, newYear);
    const newDay = Math.min(day, monthLength);
    return toGregorianDate({ year: newYear, month: newMonth, day: newDay });
}
