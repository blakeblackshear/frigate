"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.longDays = exports.shortDays = exports.ethMonthsLatin = exports.ethMonths = void 0;
exports.format = format;
const index_js_1 = require("../utils/index.js");
const formatNumber_js_1 = require("./formatNumber.js");
function getEtDayName(day, short = true, localeCode = "am-ET") {
    try {
        const dtf = new Intl.DateTimeFormat(localeCode, {
            // Ethiopic calendar expects single-letter for "cccccc" -> use narrow
            weekday: short ? "narrow" : "long",
        });
        return dtf.format(day);
    }
    catch {
        const dayOfWeek = day.getDay();
        return short ? exports.shortDays[dayOfWeek] : exports.longDays[dayOfWeek];
    }
}
function getEtMonthName(m, latin = false) {
    if (m > 0 && m <= 13) {
        return latin ? exports.ethMonthsLatin[m - 1] : exports.ethMonths[m - 1];
    }
    return "";
}
function formatEthiopianDate(dateObj, formatStr, numerals, localeCode) {
    const etDate = dateObj ? (0, index_js_1.toEthiopicDate)(dateObj) : undefined;
    if (!etDate)
        return "";
    const useLatin = (localeCode?.startsWith("en") ?? false) || numerals === "latn";
    const yearTokenMatch = formatStr.match(/^(\s*)(y+)(\s*)$/);
    if (yearTokenMatch) {
        const [, leading = "", yearToken, trailing = ""] = yearTokenMatch;
        const year = etDate.year.toString();
        let formattedYear;
        if (yearToken.length === 1) {
            formattedYear = year;
        }
        else if (yearToken.length === 2) {
            formattedYear = year.slice(-2).padStart(2, "0");
        }
        else {
            formattedYear = year.padStart(yearToken.length, "0");
        }
        return `${leading}${formattedYear}${trailing}`;
    }
    switch (formatStr) {
        case "LLLL yyyy":
        case "LLLL y":
            return `${getEtMonthName(etDate.month, useLatin)} ${etDate.year}`;
        case "LLLL":
            return getEtMonthName(etDate.month, useLatin);
        case "yyyy-MM-dd":
            return `${etDate.year}-${etDate.month
                .toString()
                .padStart(2, "0")}-${etDate.day.toString().padStart(2, "0")}`;
        case "yyyy-MM":
            return `${etDate.year}-${etDate.month.toString().padStart(2, "0")}`;
        case "d":
            return etDate.day.toString();
        case "PPP":
            return ` ${getEtMonthName(etDate.month, useLatin)} ${etDate.day}, ${etDate.year}`;
        case "PPPP":
            if (!dateObj)
                return "";
            return `${getEtDayName(dateObj, false, localeCode)}, ${getEtMonthName(etDate.month, useLatin)} ${etDate.day}, ${etDate.year}`;
        case "cccc":
            return dateObj ? getEtDayName(dateObj, false, localeCode) : "";
        case "cccccc":
            return dateObj ? getEtDayName(dateObj, true, localeCode) : "";
        default:
            return `${etDate.day}/${etDate.month}/${etDate.year}`;
    }
}
/**
 * Format an Ethiopic calendar date using a subset of date-fns tokens.
 *
 * Behavior specifics for Ethiopic mode:
 *
 * - Weekday names ("cccc", "cccccc") come from `Intl.DateTimeFormat` using
 *   `options.locale?.code` (default: `am-ET`). Narrow form is a single letter.
 * - Month names ("LLLL") are Amharic by default and switch to Latin
 *   transliteration when the locale code starts with `en` or when
 *   `options.numerals === 'latn'`.
 * - Time parts such as `hh:mm a` are delegated to `Intl.DateTimeFormat` with the
 *   given locale.
 * - Digits are converted to Ethiopic (Geez) when `options.numerals === 'geez'`.
 */
function format(date, formatStr, options) {
    const extendedOptions = options;
    if (formatStr.includes("hh:mm") || formatStr.includes("a")) {
        return new Intl.DateTimeFormat(extendedOptions?.locale?.code ?? "en-US", {
            hour: "numeric",
            minute: "numeric",
            hour12: formatStr.includes("a"),
        }).format(date);
    }
    const formatted = formatEthiopianDate(date, formatStr, extendedOptions?.numerals, extendedOptions?.locale?.code ?? "am-ET");
    if (extendedOptions?.numerals && extendedOptions.numerals === "geez") {
        return formatted.replace(/\d+/g, (match) => (0, formatNumber_js_1.formatNumber)(parseInt(match, 10), "geez"));
    }
    return formatted;
}
exports.ethMonths = [
    "መስከረም",
    "ጥቅምት",
    "ህዳር",
    "ታህሳስ",
    "ጥር",
    "የካቲት",
    "መጋቢት",
    "ሚያዚያ",
    "ግንቦት",
    "ሰኔ",
    "ሐምሌ",
    "ነሀሴ",
    "ጳጉሜ",
];
exports.ethMonthsLatin = [
    "Meskerem",
    "Tikimt",
    "Hidar",
    "Tahsas",
    "Tir",
    "Yekatit",
    "Megabit",
    "Miyazya",
    "Ginbot",
    "Sene",
    "Hamle",
    "Nehase",
    "Pagumen",
];
exports.shortDays = ["እ", "ሰ", "ማ", "ረ", "ሐ", "ዓ", "ቅ"];
exports.longDays = ["እሁድ", "ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ"];
