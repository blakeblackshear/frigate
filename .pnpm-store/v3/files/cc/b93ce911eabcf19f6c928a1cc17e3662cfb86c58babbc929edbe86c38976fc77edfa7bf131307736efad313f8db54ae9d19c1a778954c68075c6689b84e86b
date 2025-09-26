"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endOfMonth = endOfMonth;
const daysInMonth_js_1 = require("../utils/daysInMonth.js");
const index_js_1 = require("../utils/index.js");
/**
 * Returns the last day of the Ethiopian month for the given date.
 *
 * @param date - The gregorian date to get the end of month for
 * @returns A new gregorian date representing the last day of the Ethiopian
 *   month
 */
function endOfMonth(date) {
    const { year, month } = (0, index_js_1.toEthiopicDate)(date);
    const day = (0, daysInMonth_js_1.daysInMonth)(month, year);
    return (0, index_js_1.toGregorianDate)({ year, month, day: day });
}
