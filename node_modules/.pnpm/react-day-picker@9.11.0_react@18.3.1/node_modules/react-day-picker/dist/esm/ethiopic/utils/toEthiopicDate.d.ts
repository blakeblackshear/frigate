import type { EthiopicDate } from "./EthiopicDate.js";
/**
 * Calculates the number of days between January 1, 0001 and the given date.
 *
 * @param date - A JavaScript Date object to calculate days from
 * @returns The number of days since January 1, 0001. Returns 0 if the input is
 *   not a valid Date.
 */
export declare function getDayNoGregorian(date: Date): number;
/**
 * Converts a Gregorian date to an Ethiopic date.
 *
 * @param gregorianDate - A JavaScript Date object representing the Gregorian
 *   date.
 * @returns An EthiopicDate object.
 */
export declare function toEthiopicDate(gregorianDate: Date): EthiopicDate;
