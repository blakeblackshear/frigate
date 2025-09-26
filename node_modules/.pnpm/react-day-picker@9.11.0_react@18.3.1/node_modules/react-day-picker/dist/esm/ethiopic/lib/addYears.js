import { isEthiopicLeapYear, toEthiopicDate, toGregorianDate, } from "../utils/index.js";
/**
 * Adds the specified number of years to the given Ethiopian date. Handles leap
 * year transitions for Pagume month.
 *
 * @param date - The starting gregorian date
 * @param amount - The number of years to add (can be negative)
 * @returns A new gregorian date with the years added
 */
export function addYears(date, amount) {
    const etDate = toEthiopicDate(date);
    const day = isEthiopicLeapYear(etDate.year) &&
        etDate.month === 13 &&
        etDate.day === 6 &&
        amount % 4 !== 0
        ? 5
        : etDate.day;
    return toGregorianDate({
        month: etDate.month,
        day: day,
        year: etDate.year + amount,
    });
}
