"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dateLib = exports.defaultDateLib = exports.defaultLocale = exports.DateLib = void 0;
const tz_1 = require("@date-fns/tz");
const date_fns_1 = require("date-fns");
const en_US_1 = require("date-fns/locale/en-US");
const endOfBroadcastWeek_js_1 = require("../helpers/endOfBroadcastWeek.js");
const startOfBroadcastWeek_js_1 = require("../helpers/startOfBroadcastWeek.js");
/**
 * A wrapper class around [date-fns](http://date-fns.org) that provides utility
 * methods for date manipulation and formatting.
 *
 * @since 9.2.0
 * @example
 *   const dateLib = new DateLib({ locale: es });
 *   const newDate = dateLib.addDays(new Date(), 5);
 */
class DateLib {
    /**
     * Creates an instance of `DateLib`.
     *
     * @param options Configuration options for the date library.
     * @param overrides Custom overrides for the date library functions.
     */
    constructor(options, overrides) {
        /**
         * Reference to the built-in Date constructor.
         *
         * @deprecated Use `newDate()` or `today()`.
         */
        this.Date = Date;
        /**
         * Creates a new `Date` object representing today's date.
         *
         * @since 9.5.0
         * @returns A `Date` object for today's date.
         */
        this.today = () => {
            if (this.overrides?.today) {
                return this.overrides.today();
            }
            if (this.options.timeZone) {
                return tz_1.TZDate.tz(this.options.timeZone);
            }
            return new this.Date();
        };
        /**
         * Creates a new `Date` object with the specified year, month, and day.
         *
         * @since 9.5.0
         * @param year The year.
         * @param monthIndex The month (0-11).
         * @param date The day of the month.
         * @returns A new `Date` object.
         */
        this.newDate = (year, monthIndex, date) => {
            if (this.overrides?.newDate) {
                return this.overrides.newDate(year, monthIndex, date);
            }
            if (this.options.timeZone) {
                return new tz_1.TZDate(year, monthIndex, date, this.options.timeZone);
            }
            return new Date(year, monthIndex, date);
        };
        /**
         * Adds the specified number of days to the given date.
         *
         * @param date The date to add days to.
         * @param amount The number of days to add.
         * @returns The new date with the days added.
         */
        this.addDays = (date, amount) => {
            return this.overrides?.addDays
                ? this.overrides.addDays(date, amount)
                : (0, date_fns_1.addDays)(date, amount);
        };
        /**
         * Adds the specified number of months to the given date.
         *
         * @param date The date to add months to.
         * @param amount The number of months to add.
         * @returns The new date with the months added.
         */
        this.addMonths = (date, amount) => {
            return this.overrides?.addMonths
                ? this.overrides.addMonths(date, amount)
                : (0, date_fns_1.addMonths)(date, amount);
        };
        /**
         * Adds the specified number of weeks to the given date.
         *
         * @param date The date to add weeks to.
         * @param amount The number of weeks to add.
         * @returns The new date with the weeks added.
         */
        this.addWeeks = (date, amount) => {
            return this.overrides?.addWeeks
                ? this.overrides.addWeeks(date, amount)
                : (0, date_fns_1.addWeeks)(date, amount);
        };
        /**
         * Adds the specified number of years to the given date.
         *
         * @param date The date to add years to.
         * @param amount The number of years to add.
         * @returns The new date with the years added.
         */
        this.addYears = (date, amount) => {
            return this.overrides?.addYears
                ? this.overrides.addYears(date, amount)
                : (0, date_fns_1.addYears)(date, amount);
        };
        /**
         * Returns the number of calendar days between the given dates.
         *
         * @param dateLeft The later date.
         * @param dateRight The earlier date.
         * @returns The number of calendar days between the dates.
         */
        this.differenceInCalendarDays = (dateLeft, dateRight) => {
            return this.overrides?.differenceInCalendarDays
                ? this.overrides.differenceInCalendarDays(dateLeft, dateRight)
                : (0, date_fns_1.differenceInCalendarDays)(dateLeft, dateRight);
        };
        /**
         * Returns the number of calendar months between the given dates.
         *
         * @param dateLeft The later date.
         * @param dateRight The earlier date.
         * @returns The number of calendar months between the dates.
         */
        this.differenceInCalendarMonths = (dateLeft, dateRight) => {
            return this.overrides?.differenceInCalendarMonths
                ? this.overrides.differenceInCalendarMonths(dateLeft, dateRight)
                : (0, date_fns_1.differenceInCalendarMonths)(dateLeft, dateRight);
        };
        /**
         * Returns the months between the given dates.
         *
         * @param interval The interval to get the months for.
         */
        this.eachMonthOfInterval = (interval) => {
            return this.overrides?.eachMonthOfInterval
                ? this.overrides.eachMonthOfInterval(interval)
                : (0, date_fns_1.eachMonthOfInterval)(interval);
        };
        /**
         * Returns the end of the broadcast week for the given date.
         *
         * @param date The original date.
         * @returns The end of the broadcast week.
         */
        this.endOfBroadcastWeek = (date) => {
            return this.overrides?.endOfBroadcastWeek
                ? this.overrides.endOfBroadcastWeek(date)
                : (0, endOfBroadcastWeek_js_1.endOfBroadcastWeek)(date, this);
        };
        /**
         * Returns the end of the ISO week for the given date.
         *
         * @param date The original date.
         * @returns The end of the ISO week.
         */
        this.endOfISOWeek = (date) => {
            return this.overrides?.endOfISOWeek
                ? this.overrides.endOfISOWeek(date)
                : (0, date_fns_1.endOfISOWeek)(date);
        };
        /**
         * Returns the end of the month for the given date.
         *
         * @param date The original date.
         * @returns The end of the month.
         */
        this.endOfMonth = (date) => {
            return this.overrides?.endOfMonth
                ? this.overrides.endOfMonth(date)
                : (0, date_fns_1.endOfMonth)(date);
        };
        /**
         * Returns the end of the week for the given date.
         *
         * @param date The original date.
         * @returns The end of the week.
         */
        this.endOfWeek = (date, options) => {
            return this.overrides?.endOfWeek
                ? this.overrides.endOfWeek(date, options)
                : (0, date_fns_1.endOfWeek)(date, this.options);
        };
        /**
         * Returns the end of the year for the given date.
         *
         * @param date The original date.
         * @returns The end of the year.
         */
        this.endOfYear = (date) => {
            return this.overrides?.endOfYear
                ? this.overrides.endOfYear(date)
                : (0, date_fns_1.endOfYear)(date);
        };
        /**
         * Formats the given date using the specified format string.
         *
         * @param date The date to format.
         * @param formatStr The format string.
         * @returns The formatted date string.
         */
        this.format = (date, formatStr, _options) => {
            const formatted = this.overrides?.format
                ? this.overrides.format(date, formatStr, this.options)
                : (0, date_fns_1.format)(date, formatStr, this.options);
            if (this.options.numerals && this.options.numerals !== "latn") {
                return this.replaceDigits(formatted);
            }
            return formatted;
        };
        /**
         * Returns the ISO week number for the given date.
         *
         * @param date The date to get the ISO week number for.
         * @returns The ISO week number.
         */
        this.getISOWeek = (date) => {
            return this.overrides?.getISOWeek
                ? this.overrides.getISOWeek(date)
                : (0, date_fns_1.getISOWeek)(date);
        };
        /**
         * Returns the month of the given date.
         *
         * @param date The date to get the month for.
         * @returns The month.
         */
        this.getMonth = (date, _options) => {
            return this.overrides?.getMonth
                ? this.overrides.getMonth(date, this.options)
                : (0, date_fns_1.getMonth)(date, this.options);
        };
        /**
         * Returns the year of the given date.
         *
         * @param date The date to get the year for.
         * @returns The year.
         */
        this.getYear = (date, _options) => {
            return this.overrides?.getYear
                ? this.overrides.getYear(date, this.options)
                : (0, date_fns_1.getYear)(date, this.options);
        };
        /**
         * Returns the local week number for the given date.
         *
         * @param date The date to get the week number for.
         * @returns The week number.
         */
        this.getWeek = (date, _options) => {
            return this.overrides?.getWeek
                ? this.overrides.getWeek(date, this.options)
                : (0, date_fns_1.getWeek)(date, this.options);
        };
        /**
         * Checks if the first date is after the second date.
         *
         * @param date The date to compare.
         * @param dateToCompare The date to compare with.
         * @returns True if the first date is after the second date.
         */
        this.isAfter = (date, dateToCompare) => {
            return this.overrides?.isAfter
                ? this.overrides.isAfter(date, dateToCompare)
                : (0, date_fns_1.isAfter)(date, dateToCompare);
        };
        /**
         * Checks if the first date is before the second date.
         *
         * @param date The date to compare.
         * @param dateToCompare The date to compare with.
         * @returns True if the first date is before the second date.
         */
        this.isBefore = (date, dateToCompare) => {
            return this.overrides?.isBefore
                ? this.overrides.isBefore(date, dateToCompare)
                : (0, date_fns_1.isBefore)(date, dateToCompare);
        };
        /**
         * Checks if the given value is a Date object.
         *
         * @param value The value to check.
         * @returns True if the value is a Date object.
         */
        this.isDate = (value) => {
            return this.overrides?.isDate
                ? this.overrides.isDate(value)
                : (0, date_fns_1.isDate)(value);
        };
        /**
         * Checks if the given dates are on the same day.
         *
         * @param dateLeft The first date to compare.
         * @param dateRight The second date to compare.
         * @returns True if the dates are on the same day.
         */
        this.isSameDay = (dateLeft, dateRight) => {
            return this.overrides?.isSameDay
                ? this.overrides.isSameDay(dateLeft, dateRight)
                : (0, date_fns_1.isSameDay)(dateLeft, dateRight);
        };
        /**
         * Checks if the given dates are in the same month.
         *
         * @param dateLeft The first date to compare.
         * @param dateRight The second date to compare.
         * @returns True if the dates are in the same month.
         */
        this.isSameMonth = (dateLeft, dateRight) => {
            return this.overrides?.isSameMonth
                ? this.overrides.isSameMonth(dateLeft, dateRight)
                : (0, date_fns_1.isSameMonth)(dateLeft, dateRight);
        };
        /**
         * Checks if the given dates are in the same year.
         *
         * @param dateLeft The first date to compare.
         * @param dateRight The second date to compare.
         * @returns True if the dates are in the same year.
         */
        this.isSameYear = (dateLeft, dateRight) => {
            return this.overrides?.isSameYear
                ? this.overrides.isSameYear(dateLeft, dateRight)
                : (0, date_fns_1.isSameYear)(dateLeft, dateRight);
        };
        /**
         * Returns the latest date in the given array of dates.
         *
         * @param dates The array of dates to compare.
         * @returns The latest date.
         */
        this.max = (dates) => {
            return this.overrides?.max ? this.overrides.max(dates) : (0, date_fns_1.max)(dates);
        };
        /**
         * Returns the earliest date in the given array of dates.
         *
         * @param dates The array of dates to compare.
         * @returns The earliest date.
         */
        this.min = (dates) => {
            return this.overrides?.min ? this.overrides.min(dates) : (0, date_fns_1.min)(dates);
        };
        /**
         * Sets the month of the given date.
         *
         * @param date The date to set the month on.
         * @param month The month to set (0-11).
         * @returns The new date with the month set.
         */
        this.setMonth = (date, month) => {
            return this.overrides?.setMonth
                ? this.overrides.setMonth(date, month)
                : (0, date_fns_1.setMonth)(date, month);
        };
        /**
         * Sets the year of the given date.
         *
         * @param date The date to set the year on.
         * @param year The year to set.
         * @returns The new date with the year set.
         */
        this.setYear = (date, year) => {
            return this.overrides?.setYear
                ? this.overrides.setYear(date, year)
                : (0, date_fns_1.setYear)(date, year);
        };
        /**
         * Returns the start of the broadcast week for the given date.
         *
         * @param date The original date.
         * @returns The start of the broadcast week.
         */
        this.startOfBroadcastWeek = (date, _dateLib) => {
            return this.overrides?.startOfBroadcastWeek
                ? this.overrides.startOfBroadcastWeek(date, this)
                : (0, startOfBroadcastWeek_js_1.startOfBroadcastWeek)(date, this);
        };
        /**
         * Returns the start of the day for the given date.
         *
         * @param date The original date.
         * @returns The start of the day.
         */
        this.startOfDay = (date) => {
            return this.overrides?.startOfDay
                ? this.overrides.startOfDay(date)
                : (0, date_fns_1.startOfDay)(date);
        };
        /**
         * Returns the start of the ISO week for the given date.
         *
         * @param date The original date.
         * @returns The start of the ISO week.
         */
        this.startOfISOWeek = (date) => {
            return this.overrides?.startOfISOWeek
                ? this.overrides.startOfISOWeek(date)
                : (0, date_fns_1.startOfISOWeek)(date);
        };
        /**
         * Returns the start of the month for the given date.
         *
         * @param date The original date.
         * @returns The start of the month.
         */
        this.startOfMonth = (date) => {
            return this.overrides?.startOfMonth
                ? this.overrides.startOfMonth(date)
                : (0, date_fns_1.startOfMonth)(date);
        };
        /**
         * Returns the start of the week for the given date.
         *
         * @param date The original date.
         * @returns The start of the week.
         */
        this.startOfWeek = (date, _options) => {
            return this.overrides?.startOfWeek
                ? this.overrides.startOfWeek(date, this.options)
                : (0, date_fns_1.startOfWeek)(date, this.options);
        };
        /**
         * Returns the start of the year for the given date.
         *
         * @param date The original date.
         * @returns The start of the year.
         */
        this.startOfYear = (date) => {
            return this.overrides?.startOfYear
                ? this.overrides.startOfYear(date)
                : (0, date_fns_1.startOfYear)(date);
        };
        this.options = { locale: en_US_1.enUS, ...options };
        this.overrides = overrides;
    }
    /**
     * Generates a mapping of Arabic digits (0-9) to the target numbering system
     * digits.
     *
     * @since 9.5.0
     * @returns A record mapping Arabic digits to the target numerals.
     */
    getDigitMap() {
        const { numerals = "latn" } = this.options;
        // Use Intl.NumberFormat to create a formatter with the specified numbering system
        const formatter = new Intl.NumberFormat("en-US", {
            numberingSystem: numerals,
        });
        // Map Arabic digits (0-9) to the target numerals
        const digitMap = {};
        for (let i = 0; i < 10; i++) {
            digitMap[i.toString()] = formatter.format(i);
        }
        return digitMap;
    }
    /**
     * Replaces Arabic digits in a string with the target numbering system digits.
     *
     * @since 9.5.0
     * @param input The string containing Arabic digits.
     * @returns The string with digits replaced.
     */
    replaceDigits(input) {
        const digitMap = this.getDigitMap();
        return input.replace(/\d/g, (digit) => digitMap[digit] || digit);
    }
    /**
     * Formats a number using the configured numbering system.
     *
     * @since 9.5.0
     * @param value The number to format.
     * @returns The formatted number as a string.
     */
    formatNumber(value) {
        return this.replaceDigits(value.toString());
    }
    /**
     * Returns the preferred ordering for month and year labels for the current
     * locale.
     */
    getMonthYearOrder() {
        const code = this.options.locale?.code;
        if (!code) {
            return "month-first";
        }
        return DateLib.yearFirstLocales.has(code) ? "year-first" : "month-first";
    }
    /**
     * Formats the month/year pair respecting locale conventions.
     *
     * @since 9.11.0
     */
    formatMonthYear(date) {
        const { locale, timeZone, numerals } = this.options;
        const localeCode = locale?.code;
        if (localeCode && DateLib.yearFirstLocales.has(localeCode)) {
            try {
                const intl = new Intl.DateTimeFormat(localeCode, {
                    month: "long",
                    year: "numeric",
                    timeZone,
                    numberingSystem: numerals,
                });
                const formatted = intl.format(date);
                return formatted;
            }
            catch {
                // Fallback to date-fns formatting below.
            }
        }
        const pattern = this.getMonthYearOrder() === "year-first" ? "y LLLL" : "LLLL y";
        return this.format(date, pattern);
    }
}
exports.DateLib = DateLib;
DateLib.yearFirstLocales = new Set([
    "eu",
    "hu",
    "ja",
    "ja-Hira",
    "ja-JP",
    "ko",
    "ko-KR",
    "lt",
    "lt-LT",
    "lv",
    "lv-LV",
    "mn",
    "mn-MN",
    "zh",
    "zh-CN",
    "zh-HK",
    "zh-TW",
]);
/** The default locale (English). */
var en_US_2 = require("date-fns/locale/en-US");
Object.defineProperty(exports, "defaultLocale", { enumerable: true, get: function () { return en_US_2.enUS; } });
/**
 * The default date library with English locale.
 *
 * @since 9.2.0
 */
exports.defaultDateLib = new DateLib();
/**
 * @ignore
 * @deprecated Use `defaultDateLib`.
 */
exports.dateLib = exports.defaultDateLib;
