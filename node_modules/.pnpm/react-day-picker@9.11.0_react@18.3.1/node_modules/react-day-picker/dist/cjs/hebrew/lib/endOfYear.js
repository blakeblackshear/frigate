"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endOfYear = endOfYear;
const calendarMath_js_1 = require("../utils/calendarMath.js");
const dateConversion_js_1 = require("../utils/dateConversion.js");
function endOfYear(date) {
    const hebrew = (0, dateConversion_js_1.toHebrewDate)(date);
    const lastMonth = (0, calendarMath_js_1.monthsInHebrewYear)(hebrew.year) - 1;
    const day = (0, calendarMath_js_1.daysInHebrewMonth)(hebrew.year, lastMonth);
    return (0, dateConversion_js_1.toGregorianDate)({ year: hebrew.year, monthIndex: lastMonth, day });
}
