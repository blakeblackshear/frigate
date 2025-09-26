import { type GetWeekOptions } from "date-fns";
/**
 * Get week number for Ethiopian calendar
 *
 * @param {Date} date - The original date
 * @param {GetWeekOptions} [options] - The options object
 * @returns {number} The week number
 */
export declare function getWeek(date: Date, options?: GetWeekOptions): number;
