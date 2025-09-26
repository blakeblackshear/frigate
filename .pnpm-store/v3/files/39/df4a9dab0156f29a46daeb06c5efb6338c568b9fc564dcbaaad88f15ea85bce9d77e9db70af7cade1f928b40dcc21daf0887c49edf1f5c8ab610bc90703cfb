"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOfMonth = startOfMonth;
const dateConversion_js_1 = require("../utils/dateConversion.js");
function startOfMonth(date) {
    const hebrew = (0, dateConversion_js_1.toHebrewDate)(date);
    return (0, dateConversion_js_1.toGregorianDate)({ ...hebrew, day: 1 });
}
