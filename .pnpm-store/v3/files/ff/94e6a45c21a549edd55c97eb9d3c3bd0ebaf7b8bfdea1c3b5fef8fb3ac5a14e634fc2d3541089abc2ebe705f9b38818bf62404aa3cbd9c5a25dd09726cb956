import { type HebrewMonthCode } from "./constants.js";
/**
 * Calculate the modulus that always returns a positive remainder. Useful when
 * applying 19-year leap cycles.
 */
export declare function mod(value: number, divisor: number): number;
/** Determine whether a Hebrew year includes the extra Adar I month. */
export declare function isHebrewLeapYear(year: number): boolean;
/** Return the absolute day for Rosh Hashanah (cached for reuse). */
export declare function roshHashanah(year: number): number;
/** Total days in a Hebrew year, accounting for leap and year type. */
export declare function daysInHebrewYear(year: number): number;
/** Returns the number of months in the specified year (12 or 13). */
export declare function monthsInHebrewYear(year: number): number;
/** Number of days in a given Hebrew month (by index). */
export declare function daysInHebrewMonth(year: number, monthIndex: number): number;
export declare function getMonthCode(year: number, monthIndex: number): HebrewMonthCode;
