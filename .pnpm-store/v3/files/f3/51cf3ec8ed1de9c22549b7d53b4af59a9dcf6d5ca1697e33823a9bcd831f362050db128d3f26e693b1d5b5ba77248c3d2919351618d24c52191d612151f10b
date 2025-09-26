"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eachMonthOfInterval = eachMonthOfInterval;
const index_js_1 = require("../utils/index.js");
/**
 * Each month of an interval
 *
 * @param {Object} interval - The interval object
 * @param {Date} interval.start - The start date of the interval
 * @param {Date} interval.end - The end date of the interval
 * @returns {Date[]} An array of dates representing the start of each month in
 *   the interval
 */
function eachMonthOfInterval(interval) {
    const start = (0, index_js_1.toEthiopicDate)(new Date(interval.start));
    const end = (0, index_js_1.toEthiopicDate)(new Date(interval.end));
    const dates = [];
    let currentYear = start.year;
    let currentMonth = start.month;
    while (currentYear < end.year ||
        (currentYear === end.year && currentMonth <= end.month)) {
        dates.push((0, index_js_1.toGregorianDate)({ year: currentYear, month: currentMonth, day: 1 }));
        currentMonth++;
        if (currentMonth > 13) {
            currentMonth = 1;
            currentYear++;
        }
    }
    return dates;
}
