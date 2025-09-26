"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addYears = addYears;
const index_js_1 = require("../utils/index.js");
/**
 * Adds the specified number of years to the given Ethiopian date. Handles leap
 * year transitions for Pagume month.
 *
 * @param date - The starting gregorian date
 * @param amount - The number of years to add (can be negative)
 * @returns A new gregorian date with the years added
 */
function addYears(date, amount) {
    const etDate = (0, index_js_1.toEthiopicDate)(date);
    const day = (0, index_js_1.isEthiopicLeapYear)(etDate.year) &&
        etDate.month === 13 &&
        etDate.day === 6 &&
        amount % 4 !== 0
        ? 5
        : etDate.day;
    return (0, index_js_1.toGregorianDate)({
        month: etDate.month,
        day: day,
        year: etDate.year + amount,
    });
}
