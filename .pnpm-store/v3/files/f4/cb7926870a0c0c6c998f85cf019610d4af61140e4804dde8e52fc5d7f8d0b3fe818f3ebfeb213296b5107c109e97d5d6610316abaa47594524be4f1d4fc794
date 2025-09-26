"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monthsSinceEpoch = monthsSinceEpoch;
exports.clampHebrewDay = clampHebrewDay;
exports.monthIndexToHebrewDate = monthIndexToHebrewDate;
exports.hebrewMonthNumber = hebrewMonthNumber;
const calendarMath_js_1 = require("./calendarMath.js");
const constants_js_1 = require("./constants.js");
/**
 * Count how many months have elapsed before the given Hebrew year. Needed to
 * compute serial month offsets across leap/non-leap cycles.
 */
function monthsBeforeYear(year) {
    if (year <= 1) {
        return 0;
    }
    const cycles = Math.floor((year - 1) / 19);
    let months = cycles * constants_js_1.MONTHS_PER_CYCLE;
    let currentYear = cycles * 19 + 1;
    while (currentYear < year) {
        months += (0, calendarMath_js_1.monthsInHebrewYear)(currentYear);
        currentYear += 1;
    }
    return months;
}
/** Serial index for Hebrew months since the epoch (Tishrei of year 1). */
function monthsSinceEpoch({ year, monthIndex, }) {
    return monthsBeforeYear(year) + monthIndex;
}
/**
 * Convert a serial month index back into Hebrew year/month. Supports negative
 * indices for pre-epoch dates.
 */
function hebrewFromMonthIndex(monthIndex) {
    let index = monthIndex;
    let year = 1;
    if (index >= 0) {
        const cycles = Math.floor(index / constants_js_1.MONTHS_PER_CYCLE);
        year += cycles * 19;
        index -= cycles * constants_js_1.MONTHS_PER_CYCLE;
        while (true) {
            const months = (0, calendarMath_js_1.monthsInHebrewYear)(year);
            if (index < months) {
                break;
            }
            index -= months;
            year += 1;
        }
        return { year, month: index };
    }
    // Handle negative month indices (dates before the epoch)
    while (index < 0) {
        year -= 1;
        const months = (0, calendarMath_js_1.monthsInHebrewYear)(year);
        index += months;
    }
    return { year, month: index };
}
/** Clamp a day number to the valid number of days in a month. */
function clampHebrewDay(year, monthIndex, day) {
    const maxDay = (0, calendarMath_js_1.daysInHebrewMonth)(year, monthIndex);
    return Math.min(day, maxDay);
}
/** Convert serial month index to a Hebrew date, clamping the day if needed. */
function monthIndexToHebrewDate(monthIndex, day) {
    const { year, month } = hebrewFromMonthIndex(monthIndex);
    return {
        year,
        monthIndex: month,
        day: clampHebrewDay(year, month, day),
    };
}
/** Convert zero-based month index to the user-facing 1..13 number. */
function hebrewMonthNumber(monthIndex) {
    return monthIndex + 1;
}
