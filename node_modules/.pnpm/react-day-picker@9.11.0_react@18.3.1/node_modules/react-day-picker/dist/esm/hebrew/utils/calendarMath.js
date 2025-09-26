import { HEBREW_EPOCH, MONTH_SEQUENCE_COMMON, MONTH_SEQUENCE_LEAP, } from "./constants.js";
const roshHashanahCache = new Map();
const yearLengthCache = new Map();
/**
 * Calculate the modulus that always returns a positive remainder. Useful when
 * applying 19-year leap cycles.
 */
export function mod(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
}
/** Determine whether a Hebrew year includes the extra Adar I month. */
export function isHebrewLeapYear(year) {
    return mod(7 * year + 1, 19) < 7;
}
/** Count lunar months elapsed since the epoch up to the start of a year. */
function monthsElapsed(year) {
    return Math.floor((235 * year - 234) / 19);
}
/** Compute the absolute day (relative to epoch) for the new year. */
function hebrewCalendarElapsedDays(year) {
    const months = monthsElapsed(year);
    const parts = 204 + 793 * mod(months, 1080);
    const hours = 5 + 12 * months + 793 * Math.floor(months / 1080);
    const day = 1 + 29 * months + Math.floor(hours / 24);
    const partsRemain = mod(hours, 24) * 1080 + parts;
    let roshHashanah = day;
    const leapYear = isHebrewLeapYear(year);
    const lastYearLeap = isHebrewLeapYear(year - 1);
    if (partsRemain >= 19440 ||
        (mod(roshHashanah, 7) === 2 && partsRemain >= 9924 && !leapYear) ||
        (mod(roshHashanah, 7) === 1 && partsRemain >= 16789 && lastYearLeap)) {
        roshHashanah += 1;
    }
    const weekday = mod(roshHashanah, 7);
    if (weekday === 0 || weekday === 3 || weekday === 5) {
        roshHashanah += 1;
    }
    return roshHashanah;
}
/** Return the absolute day for Rosh Hashanah (cached for reuse). */
export function roshHashanah(year) {
    const cached = roshHashanahCache.get(year);
    if (cached !== undefined) {
        return cached;
    }
    const value = HEBREW_EPOCH + hebrewCalendarElapsedDays(year);
    roshHashanahCache.set(year, value);
    return value;
}
/** Total days in a Hebrew year, accounting for leap and year type. */
export function daysInHebrewYear(year) {
    const cached = yearLengthCache.get(year);
    if (cached !== undefined) {
        return cached;
    }
    const days = roshHashanah(year + 1) - roshHashanah(year);
    yearLengthCache.set(year, days);
    return days;
}
/** Classify a year as deficient, regular, or complete. */
function yearType(year) {
    const days = daysInHebrewYear(year);
    const leap = isHebrewLeapYear(year);
    if (leap) {
        if (days === 383)
            return "deficient";
        if (days === 384)
            return "regular";
        return "complete";
    }
    if (days === 353)
        return "deficient";
    if (days === 354)
        return "regular";
    return "complete";
}
/** Get the sequence of month codes for a year, inserting Adar I as needed. */
function monthSequence(year) {
    return isHebrewLeapYear(year) ? MONTH_SEQUENCE_LEAP : MONTH_SEQUENCE_COMMON;
}
/** Retrieve the canonical month code for a year and month index. */
function monthCode(year, monthIndex) {
    const sequence = monthSequence(year);
    if (monthIndex < 0 || monthIndex >= sequence.length) {
        throw new RangeError(`Invalid month index ${monthIndex} for year ${year}`);
    }
    return sequence[monthIndex];
}
/** Returns the number of months in the specified year (12 or 13). */
export function monthsInHebrewYear(year) {
    return monthSequence(year).length;
}
/** Number of days in a given Hebrew month (by index). */
export function daysInHebrewMonth(year, monthIndex) {
    const code = monthCode(year, monthIndex);
    const type = yearType(year);
    switch (code) {
        case "tishrei":
            return 30;
        case "cheshvan":
            return type === "complete" ? 30 : 29;
        case "kislev":
            return type === "deficient" ? 29 : 30;
        case "tevet":
            return 29;
        case "shevat":
            return 30;
        case "adarI":
            return 30;
        case "adar":
            return 29;
        case "nisan":
            return 30;
        case "iyar":
            return 29;
        case "sivan":
            return 30;
        case "tamuz":
            return 29;
        case "av":
            return 30;
        case "elul":
            return 29;
        default:
            return 0;
    }
}
export function getMonthCode(year, monthIndex) {
    return monthCode(year, monthIndex);
}
