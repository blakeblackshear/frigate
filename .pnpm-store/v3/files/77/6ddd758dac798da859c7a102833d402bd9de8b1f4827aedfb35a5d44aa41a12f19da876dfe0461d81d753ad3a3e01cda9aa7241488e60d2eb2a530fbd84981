"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSameMonth = isSameMonth;
const dateConversion_js_1 = require("../utils/dateConversion.js");
function isSameMonth(dateLeft, dateRight) {
    const left = (0, dateConversion_js_1.toHebrewDate)(dateLeft);
    const right = (0, dateConversion_js_1.toHebrewDate)(dateRight);
    return left.year === right.year && left.monthIndex === right.monthIndex;
}
