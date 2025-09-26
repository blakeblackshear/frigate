"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMonth = setMonth;
const index_js_1 = require("../utils/index.js");
/**
 * Set month
 *
 * @param {Date} date - The original date
 * @param {number} month - The zero-based month index
 * @returns {Date} The new date with the month set
 */
function setMonth(date, month) {
    const { year, day } = (0, index_js_1.toEthiopicDate)(date);
    const targetMonth = month + 1; // Convert from zero-based index
    const safeDay = Math.min(day, (0, index_js_1.daysInMonth)(targetMonth, year));
    return (0, index_js_1.toGregorianDate)({ year, month: targetMonth, day: safeDay });
}
