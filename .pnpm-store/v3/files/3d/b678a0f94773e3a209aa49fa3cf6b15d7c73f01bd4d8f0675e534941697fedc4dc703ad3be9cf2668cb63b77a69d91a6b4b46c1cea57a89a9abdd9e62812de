import { daysInHebrewMonth, monthsInHebrewYear, roshHashanah, } from "./calendarMath.js";
import { GREGORIAN_EPOCH, MS_PER_DAY } from "./constants.js";
/** Convert a Gregorian date to an absolute day number from the epoch. */
function dateToAbsolute(date) {
    const normalized = new Date(0);
    normalized.setUTCFullYear(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    normalized.setUTCHours(0, 0, 0, 0);
    return Math.floor((normalized.getTime() - GREGORIAN_EPOCH) / MS_PER_DAY) + 1;
}
/** Convert an absolute day number back to a Gregorian date. */
function absoluteToDate(absolute) {
    const utc = new Date(GREGORIAN_EPOCH + (absolute - 1) * MS_PER_DAY);
    const result = new Date(0);
    result.setFullYear(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
    result.setHours(0, 0, 0, 0);
    return result;
}
/** Convert a Hebrew date to an absolute day number so it can be compared. */
function absoluteFromHebrew({ year, monthIndex, day }) {
    let days = day - 1;
    for (let index = 0; index < monthIndex; index += 1) {
        days += daysInHebrewMonth(year, index);
    }
    return roshHashanah(year) + days;
}
/** Convert an absolute day number to the equivalent Hebrew date. */
function hebrewFromAbsolute(absolute) {
    const date = new Date(GREGORIAN_EPOCH + (absolute - 1) * MS_PER_DAY);
    let year = date.getUTCFullYear() + 3760;
    if (date.getUTCMonth() >= 8) {
        year += 1;
    }
    while (absolute >= roshHashanah(year + 1)) {
        year += 1;
    }
    while (absolute < roshHashanah(year)) {
        year -= 1;
    }
    let dayOfYear = absolute - roshHashanah(year);
    const monthCount = monthsInHebrewYear(year);
    let monthIndex = 0;
    while (monthIndex < monthCount) {
        const monthDays = daysInHebrewMonth(year, monthIndex);
        if (dayOfYear < monthDays) {
            break;
        }
        dayOfYear -= monthDays;
        monthIndex += 1;
    }
    return {
        year,
        monthIndex,
        day: dayOfYear + 1,
    };
}
/** Converts a Gregorian date to the corresponding Hebrew date. */
export function toHebrewDate(date) {
    return hebrewFromAbsolute(dateToAbsolute(date));
}
/** Converts a Hebrew date back to the Gregorian calendar. */
export function toGregorianDate(hebrew) {
    return absoluteToDate(absoluteFromHebrew(hebrew));
}
