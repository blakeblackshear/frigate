import type { CalendarMonth, CalendarWeek } from "../classes/index.js";
/**
 * Returns an array of calendar weeks from an array of calendar months.
 *
 * @param months The array of calendar months.
 * @returns An array of calendar weeks.
 */
export declare function getWeeks(months: CalendarMonth[]): CalendarWeek[];
