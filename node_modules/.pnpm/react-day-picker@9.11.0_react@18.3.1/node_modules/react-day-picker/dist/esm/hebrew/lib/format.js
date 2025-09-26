import { getMonthCode } from "../utils/calendarMath.js";
import { toHebrewDate } from "../utils/dateConversion.js";
import { hebrewMonthNumber } from "../utils/serial.js";
const fallbackMonthNames = {
    tishrei: { en: "Tishrei", he: "תשרי" },
    cheshvan: { en: "Cheshvan", he: "חשוון" },
    kislev: { en: "Kislev", he: "כסלו" },
    tevet: { en: "Tevet", he: "טבת" },
    shevat: { en: "Shevat", he: "שבט" },
    adarI: { en: "Adar I", he: "אדר א׳" },
    adar: { en: "Adar", he: "אדר" },
    nisan: { en: "Nisan", he: "ניסן" },
    iyar: { en: "Iyar", he: "אייר" },
    sivan: { en: "Sivan", he: "סיוון" },
    tamuz: { en: "Tammuz", he: "תמוז" },
    av: { en: "Av", he: "אב" },
    elul: { en: "Elul", he: "אלול" },
};
const fallbackWeekdayNames = {
    long: {
        en: [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
        ],
        he: [
            "יום ראשון",
            "יום שני",
            "יום שלישי",
            "יום רביעי",
            "יום חמישי",
            "יום שישי",
            "שבת",
        ],
    },
    narrow: {
        en: ["S", "M", "T", "W", "T", "F", "S"],
        he: ["א", "ב", "ג", "ד", "ה", "ו", "ש"],
    },
};
const getLocaleCode = (options) => {
    return options?.locale?.code ?? "he";
};
const getMonthCodeForDate = (date) => {
    const hebrew = toHebrewDate(date);
    return getMonthCode(hebrew.year, hebrew.monthIndex);
};
const formatMonthName = (date, localeCode) => {
    try {
        return new Intl.DateTimeFormat(localeCode, {
            month: "long",
            calendar: "hebrew",
        }).format(date);
    }
    catch {
        const code = getMonthCodeForDate(date);
        const isHebrew = localeCode.startsWith("he");
        return isHebrew ? fallbackMonthNames[code].he : fallbackMonthNames[code].en;
    }
};
const formatWeekdayName = (date, localeCode, width) => {
    try {
        return new Intl.DateTimeFormat(localeCode, {
            weekday: width,
            calendar: "hebrew",
        }).format(date);
    }
    catch {
        const index = date.getDay();
        const isHebrew = localeCode.startsWith("he");
        return isHebrew
            ? fallbackWeekdayNames[width].he[index]
            : fallbackWeekdayNames[width].en[index];
    }
};
const formatDateStyle = (date, localeCode, style) => {
    try {
        return new Intl.DateTimeFormat(localeCode, {
            dateStyle: style,
            calendar: "hebrew",
        }).format(date);
    }
    catch {
        const hebrew = toHebrewDate(date);
        const month = formatMonthName(date, localeCode);
        if (style === "full") {
            const weekday = formatWeekdayName(date, localeCode, "long");
            return `${weekday}, ${month} ${hebrew.day}, ${hebrew.year}`;
        }
        return `${month} ${hebrew.day}, ${hebrew.year}`;
    }
};
const formatNumber = (value) => {
    return value.toString();
};
const buildTimeFormat = (date, localeCode, formatStr) => {
    const hour12 = formatStr.includes("a");
    return new Intl.DateTimeFormat(localeCode, {
        hour: "numeric",
        minute: "numeric",
        hour12,
    }).format(date);
};
/** Hebrew calendar formatting override. */
export function format(date, formatStr, options) {
    const extendedOptions = options;
    const localeCode = getLocaleCode(extendedOptions);
    const hebrew = toHebrewDate(date);
    const monthNumber = hebrewMonthNumber(hebrew.monthIndex);
    switch (formatStr) {
        case "LLLL y":
        case "LLLL yyyy":
            return `${formatMonthName(date, localeCode)} ${formatNumber(hebrew.year)}`;
        case "LLLL":
            return formatMonthName(date, localeCode);
        case "PPP":
            return formatDateStyle(date, localeCode, "long");
        case "PPPP":
            return formatDateStyle(date, localeCode, "full");
        case "cccc":
            return formatWeekdayName(date, localeCode, "long");
        case "cccccc":
            return formatWeekdayName(date, localeCode, "narrow");
        case "yyyy":
        case "y":
            return formatNumber(hebrew.year);
        case "yyyy-MM":
            return `${formatNumber(hebrew.year)}-${formatNumber(monthNumber).padStart(2, "0")}`;
        case "yyyy-MM-dd":
            return `${formatNumber(hebrew.year)}-${formatNumber(monthNumber).padStart(2, "0")}-${formatNumber(hebrew.day).padStart(2, "0")}`;
        case "MM":
            return formatNumber(monthNumber).padStart(2, "0");
        case "M":
            return formatNumber(monthNumber);
        case "dd":
            return formatNumber(hebrew.day).padStart(2, "0");
        case "d":
            return formatNumber(hebrew.day);
        default:
            if (/[Hh]/.test(formatStr) && /m/.test(formatStr)) {
                return buildTimeFormat(date, localeCode, formatStr);
            }
            return `${formatNumber(hebrew.day)}/${formatNumber(monthNumber)}/${formatNumber(hebrew.year)}`;
    }
}
