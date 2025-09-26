"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eachMonthOfInterval = eachMonthOfInterval;
const date_fns_1 = require("date-fns");
const dateConversion_js_1 = require("../utils/dateConversion.js");
const serial_js_1 = require("../utils/serial.js");
function eachMonthOfInterval(interval) {
    const startDate = (0, date_fns_1.toDate)(interval.start);
    const endDate = (0, date_fns_1.toDate)(interval.end);
    if (endDate.getTime() < startDate.getTime()) {
        return [];
    }
    const startHebrew = (0, dateConversion_js_1.toHebrewDate)(startDate);
    const endHebrew = (0, dateConversion_js_1.toHebrewDate)(endDate);
    const startIndex = (0, serial_js_1.monthsSinceEpoch)(startHebrew);
    const endIndex = (0, serial_js_1.monthsSinceEpoch)(endHebrew);
    const months = [];
    for (let index = startIndex; index <= endIndex; index += 1) {
        const hebrew = (0, serial_js_1.monthIndexToHebrewDate)(index, 1);
        months.push((0, dateConversion_js_1.toGregorianDate)(hebrew));
    }
    return months;
}
