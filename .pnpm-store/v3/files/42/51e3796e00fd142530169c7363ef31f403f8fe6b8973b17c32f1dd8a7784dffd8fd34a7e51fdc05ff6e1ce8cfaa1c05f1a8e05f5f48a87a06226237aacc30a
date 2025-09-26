import { getMonthCode, isHebrewLeapYear, monthsInHebrewYear, } from "../utils/calendarMath.js";
import { toGregorianDate, toHebrewDate } from "../utils/dateConversion.js";
import { clampHebrewDay } from "../utils/serial.js";
import { findMonthIndexByCode } from "./findMonthIndexByCode.js";
export function setYear(date, year) {
    const hebrew = toHebrewDate(date);
    const targetYear = year;
    const originalCode = getMonthCode(hebrew.year, hebrew.monthIndex);
    let targetMonthIndex = findMonthIndexByCode(targetYear, originalCode);
    if (targetMonthIndex === -1) {
        if (originalCode === "adarI") {
            targetMonthIndex = findMonthIndexByCode(targetYear, "adar");
        }
        else if (originalCode === "adar" && !isHebrewLeapYear(targetYear)) {
            targetMonthIndex = findMonthIndexByCode(targetYear, "adar");
        }
        else {
            const monthsCount = monthsInHebrewYear(targetYear);
            targetMonthIndex = Math.min(hebrew.monthIndex, monthsCount - 1);
        }
    }
    const day = clampHebrewDay(targetYear, targetMonthIndex, hebrew.day);
    return toGregorianDate({
        year: targetYear,
        monthIndex: targetMonthIndex,
        day,
    });
}
