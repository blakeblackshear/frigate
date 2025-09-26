"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getYear = getYear;
const dateConversion_js_1 = require("../utils/dateConversion.js");
function getYear(date) {
    return (0, dateConversion_js_1.toHebrewDate)(date).year;
}
