"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOfYear = startOfYear;
const dateConversion_js_1 = require("../utils/dateConversion.js");
function startOfYear(date) {
    const hebrew = (0, dateConversion_js_1.toHebrewDate)(date);
    return (0, dateConversion_js_1.toGregorianDate)({ year: hebrew.year, monthIndex: 0, day: 1 });
}
