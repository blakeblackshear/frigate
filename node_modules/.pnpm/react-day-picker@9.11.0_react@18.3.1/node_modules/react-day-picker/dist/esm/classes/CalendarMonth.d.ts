import type { CalendarWeek } from "./CalendarWeek.js";
/**
 * Represents a month in a calendar year.
 *
 * A `CalendarMonth` contains the weeks within the month and the date of the
 * month.
 */
export declare class CalendarMonth {
    constructor(month: Date, weeks: CalendarWeek[]);
    /** The date representing the first day of the month. */
    date: Date;
    /** The weeks that belong to this month. */
    weeks: CalendarWeek[];
}
