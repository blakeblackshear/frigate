import type { Interval } from "date-fns";
/**
 * Each month of an interval
 *
 * @param {Object} interval - The interval object
 * @param {Date} interval.start - The start date of the interval
 * @param {Date} interval.end - The end date of the interval
 * @returns {Date[]} An array of dates representing the start of each month in
 *   the interval
 */
export declare function eachMonthOfInterval(interval: Interval): Date[];
