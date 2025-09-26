import type { FormatOptions as DateFnsFormatOptions, EndOfWeekOptions, GetMonthOptions, GetWeekOptions, GetYearOptions, Interval, StartOfWeekOptions } from "date-fns";
import type { Locale } from "date-fns/locale";
import type { Numerals } from "../types/shared.js";
export type { Month as DateFnsMonth } from "date-fns";
export type { Locale } from "date-fns/locale";
/**
 * @ignore
 * @deprecated Use {@link DateLibOptions} instead.
 */
export type FormatOptions = DateLibOptions;
/**
 * @ignore
 * @deprecated Use {@link DateLibOptions} instead.
 */
export type LabelOptions = DateLibOptions;
/** Indicates the preferred ordering of month and year for localized labels. */
export type MonthYearOrder = "month-first" | "year-first";
/**
 * The options for the `DateLib` class.
 *
 * Extends `date-fns` [format](https://date-fns.org/docs/format),
 * [startOfWeek](https://date-fns.org/docs/startOfWeek) and
 * [endOfWeek](https://date-fns.org/docs/endOfWeek) options.
 *
 * @since 9.2.0
 */
export interface DateLibOptions extends DateFnsFormatOptions, StartOfWeekOptions, EndOfWeekOptions {
    /** A constructor for the `Date` object. */
    Date?: typeof Date;
    /** A locale to use for formatting dates. */
    locale?: Locale;
    /**
     * A time zone to use for dates.
     *
     * @since 9.5.0
     */
    timeZone?: string;
    /**
     * The numbering system to use for formatting numbers.
     *
     * @since 9.5.0
     */
    numerals?: Numerals;
}
/**
 * A wrapper class around [date-fns](http://date-fns.org) that provides utility
 * methods for date manipulation and formatting.
 *
 * @since 9.2.0
 * @example
 *   const dateLib = new DateLib({ locale: es });
 *   const newDate = dateLib.addDays(new Date(), 5);
 */
export declare class DateLib {
    /** The options for configuring the date library. */
    readonly options: DateLibOptions;
    /** Overrides for the default date library functions. */
    readonly overrides?: Partial<typeof DateLib.prototype>;
    /**
     * Creates an instance of `DateLib`.
     *
     * @param options Configuration options for the date library.
     * @param overrides Custom overrides for the date library functions.
     */
    constructor(options?: DateLibOptions, overrides?: Partial<typeof DateLib.prototype>);
    /**
     * Generates a mapping of Arabic digits (0-9) to the target numbering system
     * digits.
     *
     * @since 9.5.0
     * @returns A record mapping Arabic digits to the target numerals.
     */
    private getDigitMap;
    /**
     * Replaces Arabic digits in a string with the target numbering system digits.
     *
     * @since 9.5.0
     * @param input The string containing Arabic digits.
     * @returns The string with digits replaced.
     */
    private replaceDigits;
    /**
     * Formats a number using the configured numbering system.
     *
     * @since 9.5.0
     * @param value The number to format.
     * @returns The formatted number as a string.
     */
    formatNumber(value: number | string): string;
    /**
     * Returns the preferred ordering for month and year labels for the current
     * locale.
     */
    getMonthYearOrder(): MonthYearOrder;
    /**
     * Formats the month/year pair respecting locale conventions.
     *
     * @since 9.11.0
     */
    formatMonthYear(date: Date): string;
    private static readonly yearFirstLocales;
    /**
     * Reference to the built-in Date constructor.
     *
     * @deprecated Use `newDate()` or `today()`.
     */
    Date: typeof Date;
    /**
     * Creates a new `Date` object representing today's date.
     *
     * @since 9.5.0
     * @returns A `Date` object for today's date.
     */
    today: () => Date;
    /**
     * Creates a new `Date` object with the specified year, month, and day.
     *
     * @since 9.5.0
     * @param year The year.
     * @param monthIndex The month (0-11).
     * @param date The day of the month.
     * @returns A new `Date` object.
     */
    newDate: (year: number, monthIndex: number, date: number) => Date;
    /**
     * Adds the specified number of days to the given date.
     *
     * @param date The date to add days to.
     * @param amount The number of days to add.
     * @returns The new date with the days added.
     */
    addDays: (date: Date, amount: number) => Date;
    /**
     * Adds the specified number of months to the given date.
     *
     * @param date The date to add months to.
     * @param amount The number of months to add.
     * @returns The new date with the months added.
     */
    addMonths: (date: Date, amount: number) => Date;
    /**
     * Adds the specified number of weeks to the given date.
     *
     * @param date The date to add weeks to.
     * @param amount The number of weeks to add.
     * @returns The new date with the weeks added.
     */
    addWeeks: (date: Date, amount: number) => Date;
    /**
     * Adds the specified number of years to the given date.
     *
     * @param date The date to add years to.
     * @param amount The number of years to add.
     * @returns The new date with the years added.
     */
    addYears: (date: Date, amount: number) => Date;
    /**
     * Returns the number of calendar days between the given dates.
     *
     * @param dateLeft The later date.
     * @param dateRight The earlier date.
     * @returns The number of calendar days between the dates.
     */
    differenceInCalendarDays: (dateLeft: Date, dateRight: Date) => number;
    /**
     * Returns the number of calendar months between the given dates.
     *
     * @param dateLeft The later date.
     * @param dateRight The earlier date.
     * @returns The number of calendar months between the dates.
     */
    differenceInCalendarMonths: (dateLeft: Date, dateRight: Date) => number;
    /**
     * Returns the months between the given dates.
     *
     * @param interval The interval to get the months for.
     */
    eachMonthOfInterval: (interval: Interval) => Date[];
    /**
     * Returns the end of the broadcast week for the given date.
     *
     * @param date The original date.
     * @returns The end of the broadcast week.
     */
    endOfBroadcastWeek: (date: Date) => Date;
    /**
     * Returns the end of the ISO week for the given date.
     *
     * @param date The original date.
     * @returns The end of the ISO week.
     */
    endOfISOWeek: (date: Date) => Date;
    /**
     * Returns the end of the month for the given date.
     *
     * @param date The original date.
     * @returns The end of the month.
     */
    endOfMonth: (date: Date) => Date;
    /**
     * Returns the end of the week for the given date.
     *
     * @param date The original date.
     * @returns The end of the week.
     */
    endOfWeek: (date: Date, options?: EndOfWeekOptions<Date>) => Date;
    /**
     * Returns the end of the year for the given date.
     *
     * @param date The original date.
     * @returns The end of the year.
     */
    endOfYear: (date: Date) => Date;
    /**
     * Formats the given date using the specified format string.
     *
     * @param date The date to format.
     * @param formatStr The format string.
     * @returns The formatted date string.
     */
    format: (date: Date, formatStr: string, _options?: DateFnsFormatOptions) => string;
    /**
     * Returns the ISO week number for the given date.
     *
     * @param date The date to get the ISO week number for.
     * @returns The ISO week number.
     */
    getISOWeek: (date: Date) => number;
    /**
     * Returns the month of the given date.
     *
     * @param date The date to get the month for.
     * @returns The month.
     */
    getMonth: (date: Date, _options?: GetMonthOptions) => number;
    /**
     * Returns the year of the given date.
     *
     * @param date The date to get the year for.
     * @returns The year.
     */
    getYear: (date: Date, _options?: GetYearOptions) => number;
    /**
     * Returns the local week number for the given date.
     *
     * @param date The date to get the week number for.
     * @returns The week number.
     */
    getWeek: (date: Date, _options?: GetWeekOptions) => number;
    /**
     * Checks if the first date is after the second date.
     *
     * @param date The date to compare.
     * @param dateToCompare The date to compare with.
     * @returns True if the first date is after the second date.
     */
    isAfter: (date: Date, dateToCompare: Date) => boolean;
    /**
     * Checks if the first date is before the second date.
     *
     * @param date The date to compare.
     * @param dateToCompare The date to compare with.
     * @returns True if the first date is before the second date.
     */
    isBefore: (date: Date, dateToCompare: Date) => boolean;
    /**
     * Checks if the given value is a Date object.
     *
     * @param value The value to check.
     * @returns True if the value is a Date object.
     */
    isDate: (value: unknown) => value is Date;
    /**
     * Checks if the given dates are on the same day.
     *
     * @param dateLeft The first date to compare.
     * @param dateRight The second date to compare.
     * @returns True if the dates are on the same day.
     */
    isSameDay: (dateLeft: Date, dateRight: Date) => boolean;
    /**
     * Checks if the given dates are in the same month.
     *
     * @param dateLeft The first date to compare.
     * @param dateRight The second date to compare.
     * @returns True if the dates are in the same month.
     */
    isSameMonth: (dateLeft: Date, dateRight: Date) => boolean;
    /**
     * Checks if the given dates are in the same year.
     *
     * @param dateLeft The first date to compare.
     * @param dateRight The second date to compare.
     * @returns True if the dates are in the same year.
     */
    isSameYear: (dateLeft: Date, dateRight: Date) => boolean;
    /**
     * Returns the latest date in the given array of dates.
     *
     * @param dates The array of dates to compare.
     * @returns The latest date.
     */
    max: (dates: Date[]) => Date;
    /**
     * Returns the earliest date in the given array of dates.
     *
     * @param dates The array of dates to compare.
     * @returns The earliest date.
     */
    min: (dates: Date[]) => Date;
    /**
     * Sets the month of the given date.
     *
     * @param date The date to set the month on.
     * @param month The month to set (0-11).
     * @returns The new date with the month set.
     */
    setMonth: (date: Date, month: number) => Date;
    /**
     * Sets the year of the given date.
     *
     * @param date The date to set the year on.
     * @param year The year to set.
     * @returns The new date with the year set.
     */
    setYear: (date: Date, year: number) => Date;
    /**
     * Returns the start of the broadcast week for the given date.
     *
     * @param date The original date.
     * @returns The start of the broadcast week.
     */
    startOfBroadcastWeek: (date: Date, _dateLib: DateLib) => Date;
    /**
     * Returns the start of the day for the given date.
     *
     * @param date The original date.
     * @returns The start of the day.
     */
    startOfDay: (date: Date) => Date;
    /**
     * Returns the start of the ISO week for the given date.
     *
     * @param date The original date.
     * @returns The start of the ISO week.
     */
    startOfISOWeek: (date: Date) => Date;
    /**
     * Returns the start of the month for the given date.
     *
     * @param date The original date.
     * @returns The start of the month.
     */
    startOfMonth: (date: Date) => Date;
    /**
     * Returns the start of the week for the given date.
     *
     * @param date The original date.
     * @returns The start of the week.
     */
    startOfWeek: (date: Date, _options?: StartOfWeekOptions) => Date;
    /**
     * Returns the start of the year for the given date.
     *
     * @param date The original date.
     * @returns The start of the year.
     */
    startOfYear: (date: Date) => Date;
}
/** The default locale (English). */
export { enUS as defaultLocale } from "date-fns/locale/en-US";
/**
 * The default date library with English locale.
 *
 * @since 9.2.0
 */
export declare const defaultDateLib: DateLib;
/**
 * @ignore
 * @deprecated Use `defaultDateLib`.
 */
export declare const dateLib: DateLib;
