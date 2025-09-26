"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMonth = getMonth;
const dateConversion_js_1 = require("../utils/dateConversion.js");
function getMonth(date) {
    return (0, dateConversion_js_1.toHebrewDate)(date).monthIndex;
}
