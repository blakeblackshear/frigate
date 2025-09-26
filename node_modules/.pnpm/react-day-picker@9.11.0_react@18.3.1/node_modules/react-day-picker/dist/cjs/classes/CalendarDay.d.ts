import { type DateLib } from "./DateLib.js";
/**
 * Represents a day displayed in the calendar.
 *
 * In DayPicker, a `CalendarDay` is a wrapper around a `Date` object that
 * provides additional information about the day, such as whether it belongs to
 * the displayed month.
 */
export declare class CalendarDay {
    constructor(date: Date, displayMonth: Date, dateLib?: DateLib);
    /**
     * Utility functions for manipulating dates.
     *
     * @private
     */
    readonly dateLib: DateLib;
    /**
     * Indicates whether the day does not belong to the displayed month.
     *
     * If `outside` is `true`, use `displayMonth` to determine the month to which
     * the day belongs.
     */
    readonly outside: boolean;
    /**
     * The month that is currently displayed in the calendar.
     *
     * This property is useful for determining if the day belongs to the same
     * month as the displayed month, especially when `showOutsideDays` is
     * enabled.
     */
    readonly displayMonth: Date;
    /** The date represented by this day. */
    readonly date: Date;
    /**
     * Checks if this day is equal to another `CalendarDay`, considering both the
     * date and the displayed month.
     *
     * @param day The `CalendarDay` to compare with.
     * @returns `true` if the days are equal, otherwise `false`.
     */
    isEqualTo(day: CalendarDay): boolean;
}
