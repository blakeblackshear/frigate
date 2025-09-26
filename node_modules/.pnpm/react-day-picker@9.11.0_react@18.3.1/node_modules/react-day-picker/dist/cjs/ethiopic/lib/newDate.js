"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newDate = newDate;
const index_js_1 = require("../utils/index.js");
const isEthiopicDateValid_js_1 = require("../utils/isEthiopicDateValid.js");
/**
 * Creates a new Ethiopic date
 *
 * @param {number} year - The year of the Ethiopic date
 * @param {number} monthIndex - The zero-based month index of the Ethiopic date
 * @param {number} date - The day of the month of the Ethiopic date
 * @returns {Date} The corresponding Gregorian date
 */
function newDate(year, monthIndex, date) {
    // Convert from 0-based month index to 1-based Ethiopic month
    const month = monthIndex + 1;
    if (!(0, isEthiopicDateValid_js_1.isEthiopicDateValid)({ year, month, day: date })) {
        throw new Error("Invalid Ethiopic date");
    }
    return (0, index_js_1.toGregorianDate)({
        year: year,
        month: month,
        day: date,
    });
}
