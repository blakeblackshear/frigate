"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setYear = setYear;
const daysInMonth_js_1 = require("../utils/daysInMonth.js");
const index_js_1 = require("../utils/index.js");
/**
 * Set year
 *
 * @param {Date} date - The original date
 * @param {number} year - The year to set
 * @returns {Date} The new date with the year set
 */
function setYear(date, year) {
    const { month, day } = (0, index_js_1.toEthiopicDate)(date);
    // Check if the day is valid in the new year (handles leap year changes)
    const maxDays = (0, daysInMonth_js_1.daysInMonth)(month, year);
    const newDay = Math.min(day, maxDays);
    return (0, index_js_1.toGregorianDate)({ year, month, day: newDay });
}
