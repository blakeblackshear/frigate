"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMonths = addMonths;
const dateConversion_js_1 = require("../utils/dateConversion.js");
const serial_js_1 = require("../utils/serial.js");
function addMonths(date, amount) {
    if (amount === 0) {
        return new Date(date.getTime());
    }
    const hebrew = (0, dateConversion_js_1.toHebrewDate)(date);
    const targetIndex = (0, serial_js_1.monthsSinceEpoch)(hebrew) + amount;
    const target = (0, serial_js_1.monthIndexToHebrewDate)(targetIndex, hebrew.day);
    const day = (0, serial_js_1.clampHebrewDay)(target.year, target.monthIndex, target.day);
    return (0, dateConversion_js_1.toGregorianDate)({ ...target, day });
}
