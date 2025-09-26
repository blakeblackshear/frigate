"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findMonthIndexByCode = findMonthIndexByCode;
const calendarMath_js_1 = require("../utils/calendarMath.js");
function findMonthIndexByCode(year, preferredCode) {
    const monthsCount = (0, calendarMath_js_1.monthsInHebrewYear)(year);
    for (let index = 0; index < monthsCount; index += 1) {
        if ((0, calendarMath_js_1.getMonthCode)(year, index) === preferredCode) {
            return index;
        }
    }
    return -1;
}
