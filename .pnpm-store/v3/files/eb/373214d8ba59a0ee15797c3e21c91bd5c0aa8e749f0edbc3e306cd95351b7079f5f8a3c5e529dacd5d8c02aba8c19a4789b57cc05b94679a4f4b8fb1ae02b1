import { type HebrewDate } from "./constants.js";
/** Serial index for Hebrew months since the epoch (Tishrei of year 1). */
export declare function monthsSinceEpoch({ year, monthIndex, }: Pick<HebrewDate, "year" | "monthIndex">): number;
/** Clamp a day number to the valid number of days in a month. */
export declare function clampHebrewDay(year: number, monthIndex: number, day: number): number;
/** Convert serial month index to a Hebrew date, clamping the day if needed. */
export declare function monthIndexToHebrewDate(monthIndex: number, day: number): HebrewDate;
/** Convert zero-based month index to the user-facing 1..13 number. */
export declare function hebrewMonthNumber(monthIndex: number): number;
