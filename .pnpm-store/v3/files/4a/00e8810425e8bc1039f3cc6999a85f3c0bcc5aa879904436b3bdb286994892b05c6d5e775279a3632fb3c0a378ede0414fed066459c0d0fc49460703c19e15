"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeek = getWeek;
const date_fns_1 = require("date-fns");
const index_js_1 = require("../utils/index.js");
const startOfWeek_js_1 = require("./startOfWeek.js");
/**
 * Get week number for Ethiopian calendar
 *
 * @param {Date} date - The original date
 * @param {GetWeekOptions} [options] - The options object
 * @returns {number} The week number
 */
function getWeek(date, options) {
    const weekStartsOn = options?.weekStartsOn ?? 1; // Default to Monday (1)
    const etDate = (0, index_js_1.toEthiopicDate)(date);
    const currentWeekStart = (0, startOfWeek_js_1.startOfWeek)(date, { weekStartsOn });
    // Get the first day of the current year
    const firstDayOfYear = (0, index_js_1.toGregorianDate)({
        year: etDate.year,
        month: 1,
        day: 1,
    });
    const firstWeekStart = (0, startOfWeek_js_1.startOfWeek)(firstDayOfYear, { weekStartsOn });
    // If date is before the first week of its year
    if (date < firstWeekStart) {
        return (0, date_fns_1.getWeek)(date, { weekStartsOn, firstWeekContainsDate: 1 });
    }
    // If date falls into the first week of the NEXT Ethiopic year, return 1
    const nextYearFirstDay = (0, index_js_1.toGregorianDate)({
        year: etDate.year + 1,
        month: 1,
        day: 1,
    });
    const nextYearFirstWeekStart = (0, startOfWeek_js_1.startOfWeek)(nextYearFirstDay, {
        weekStartsOn,
    });
    if (date >= nextYearFirstWeekStart) {
        return 1;
    }
    // Calculate week number based on days since first week
    const daysSinceFirstWeek = (0, date_fns_1.differenceInDays)(currentWeekStart, firstWeekStart);
    return Math.floor(daysSinceFirstWeek / 7) + 1;
}
