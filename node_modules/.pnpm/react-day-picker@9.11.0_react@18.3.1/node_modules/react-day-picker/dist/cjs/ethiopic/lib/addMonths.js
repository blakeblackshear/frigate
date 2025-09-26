"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMonths = addMonths;
const daysInMonth_js_1 = require("../utils/daysInMonth.js");
const index_js_1 = require("../utils/index.js");
/**
 * Adds the specified number of months to the given Ethiopian date. Handles
 * month overflow and year boundaries correctly.
 *
 * @param date - The starting gregorian date
 * @param amount - The number of months to add (can be negative)
 * @returns A new gregorian date with the months added
 */
function addMonths(date, amount) {
    const { year, month, day } = (0, index_js_1.toEthiopicDate)(date);
    let newMonth = month + amount;
    const yearAdjustment = Math.floor((newMonth - 1) / 13);
    newMonth = ((newMonth - 1) % 13) + 1;
    if (newMonth < 1) {
        newMonth += 13;
    }
    const newYear = year + yearAdjustment;
    // Adjust day if it exceeds the month length
    const monthLength = (0, daysInMonth_js_1.daysInMonth)(newMonth, newYear);
    const newDay = Math.min(day, monthLength);
    return (0, index_js_1.toGregorianDate)({ year: newYear, month: newMonth, day: newDay });
}
