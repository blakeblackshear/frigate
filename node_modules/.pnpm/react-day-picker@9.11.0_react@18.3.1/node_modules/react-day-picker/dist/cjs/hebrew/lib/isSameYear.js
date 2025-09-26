"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSameYear = isSameYear;
const dateConversion_js_1 = require("../utils/dateConversion.js");
function isSameYear(dateLeft, dateRight) {
    return (0, dateConversion_js_1.toHebrewDate)(dateLeft).year === (0, dateConversion_js_1.toHebrewDate)(dateRight).year;
}
