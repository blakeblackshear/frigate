"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.differenceInCalendarMonths = differenceInCalendarMonths;
const dateConversion_js_1 = require("../utils/dateConversion.js");
const serial_js_1 = require("../utils/serial.js");
function differenceInCalendarMonths(dateLeft, dateRight) {
    const left = (0, dateConversion_js_1.toHebrewDate)(dateLeft);
    const right = (0, dateConversion_js_1.toHebrewDate)(dateRight);
    return (0, serial_js_1.monthsSinceEpoch)(left) - (0, serial_js_1.monthsSinceEpoch)(right);
}
