"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setYear = setYear;
const calendarMath_js_1 = require("../utils/calendarMath.js");
const dateConversion_js_1 = require("../utils/dateConversion.js");
const serial_js_1 = require("../utils/serial.js");
const findMonthIndexByCode_js_1 = require("./findMonthIndexByCode.js");
function setYear(date, year) {
    const hebrew = (0, dateConversion_js_1.toHebrewDate)(date);
    const targetYear = year;
    const originalCode = (0, calendarMath_js_1.getMonthCode)(hebrew.year, hebrew.monthIndex);
    let targetMonthIndex = (0, findMonthIndexByCode_js_1.findMonthIndexByCode)(targetYear, originalCode);
    if (targetMonthIndex === -1) {
        if (originalCode === "adarI") {
            targetMonthIndex = (0, findMonthIndexByCode_js_1.findMonthIndexByCode)(targetYear, "adar");
        }
        else if (originalCode === "adar" && !(0, calendarMath_js_1.isHebrewLeapYear)(targetYear)) {
            targetMonthIndex = (0, findMonthIndexByCode_js_1.findMonthIndexByCode)(targetYear, "adar");
        }
        else {
            const monthsCount = (0, calendarMath_js_1.monthsInHebrewYear)(targetYear);
            targetMonthIndex = Math.min(hebrew.monthIndex, monthsCount - 1);
        }
    }
    const day = (0, serial_js_1.clampHebrewDay)(targetYear, targetMonthIndex, hebrew.day);
    return (0, dateConversion_js_1.toGregorianDate)({
        year: targetYear,
        monthIndex: targetMonthIndex,
        day,
    });
}
