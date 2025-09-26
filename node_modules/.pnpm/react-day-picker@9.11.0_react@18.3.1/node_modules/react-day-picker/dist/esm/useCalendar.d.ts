import type { CalendarDay, CalendarMonth, CalendarWeek, DateLib } from "./classes/index.js";
import type { DayPickerProps } from "./types/props.js";
/**
 * Return the calendar object to work with the calendar in custom components.
 *
 * @see https://daypicker.dev/guides/custom-components
 */
export interface Calendar {
    /**
     * All the days displayed in the calendar. As opposite from
     * {@link CalendarContext.dates}, it may return duplicated dates when shown
     * outside the month.
     */
    days: CalendarDay[];
    /** The months displayed in the calendar. */
    weeks: CalendarWeek[];
    /** The months displayed in the calendar. */
    months: CalendarMonth[];
    /** The next month to display. */
    nextMonth: Date | undefined;
    /** The previous month to display. */
    previousMonth: Date | undefined;
    /**
     * The month where the navigation starts. `undefined` if the calendar can be
     * navigated indefinitely to the past.
     */
    navStart: Date | undefined;
    /**
     * The month where the navigation ends. `undefined` if the calendar can be
     * navigated indefinitely to the past.
     */
    navEnd: Date | undefined;
    /** Navigate to the specified month. Will fire the `onMonthChange` callback. */
    goToMonth: (month: Date) => void;
    /**
     * Navigate to the specified date. If the second parameter (refDate) is
     * provided and the date is before the refDate, then the month is set to one
     * month before the date.
     *
     * @param day - The date to navigate to.
     * @param dateToCompare - Optional. If `date` is before `dateToCompare`, the
     *   month is set to one month before the date.
     */
    goToDay: (day: CalendarDay) => void;
}
/**
 * Provides the calendar object to work with the calendar in custom components.
 *
 * @private
 * @param props - The DayPicker props related to calendar configuration.
 * @param dateLib - The date utility library instance.
 * @returns The calendar object containing displayed days, weeks, months, and
 *   navigation methods.
 */
export declare function useCalendar(props: Pick<DayPickerProps, "captionLayout" | "endMonth" | "startMonth" | "today" | "fixedWeeks" | "ISOWeek" | "numberOfMonths" | "disableNavigation" | "onMonthChange" | "month" | "defaultMonth" | "timeZone" | "broadcastCalendar" | "fromMonth" | "fromYear" | "toMonth" | "toYear">, dateLib: DateLib): Calendar;
