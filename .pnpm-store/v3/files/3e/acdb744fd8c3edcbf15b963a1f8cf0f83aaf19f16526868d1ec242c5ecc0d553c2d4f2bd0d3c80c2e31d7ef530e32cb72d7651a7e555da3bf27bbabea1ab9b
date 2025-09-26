"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMonth = setMonth;
const dateConversion_js_1 = require("../utils/dateConversion.js");
const serial_js_1 = require("../utils/serial.js");
function setMonth(date, month) {
    const hebrew = (0, dateConversion_js_1.toHebrewDate)(date);
    const baseIndex = (0, serial_js_1.monthsSinceEpoch)({ year: hebrew.year, monthIndex: 0 });
    const targetIndex = baseIndex + month;
    const target = (0, serial_js_1.monthIndexToHebrewDate)(targetIndex, hebrew.day);
    return (0, dateConversion_js_1.toGregorianDate)(target);
}
