"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endOfMonth = endOfMonth;
const calendarMath_js_1 = require("../utils/calendarMath.js");
const dateConversion_js_1 = require("../utils/dateConversion.js");
function endOfMonth(date) {
    const hebrew = (0, dateConversion_js_1.toHebrewDate)(date);
    const day = (0, calendarMath_js_1.daysInHebrewMonth)(hebrew.year, hebrew.monthIndex);
    return (0, dateConversion_js_1.toGregorianDate)({ ...hebrew, day });
}
