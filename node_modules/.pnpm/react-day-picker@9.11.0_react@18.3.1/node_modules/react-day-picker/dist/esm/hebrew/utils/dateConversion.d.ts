import { type HebrewDate } from "./constants.js";
/** Converts a Gregorian date to the corresponding Hebrew date. */
export declare function toHebrewDate(date: Date): HebrewDate;
/** Converts a Hebrew date back to the Gregorian calendar. */
export declare function toGregorianDate(hebrew: HebrewDate): Date;
