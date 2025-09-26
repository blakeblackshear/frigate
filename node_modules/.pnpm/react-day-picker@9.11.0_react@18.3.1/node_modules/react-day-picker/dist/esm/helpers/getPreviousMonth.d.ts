import type { DateLib } from "../classes/DateLib.js";
import type { DayPickerProps } from "../types/index.js";
/**
 * Returns the previous month the user can navigate to, based on the given
 * options.
 *
 * The previous month is not always the previous calendar month:
 *
 * - If it is before the `calendarStartMonth`, it returns `undefined`.
 * - If paged navigation is enabled, it skips back by the number of displayed
 *   months.
 *
 * @param firstDisplayedMonth The first month currently displayed in the
 *   calendar.
 * @param calendarStartMonth The earliest month the user can navigate to.
 * @param options Navigation options, including `numberOfMonths` and
 *   `pagedNavigation`.
 * @param dateLib The date library to use for date manipulation.
 * @returns The previous month, or `undefined` if navigation is not possible.
 */
export declare function getPreviousMonth(firstDisplayedMonth: Date, calendarStartMonth: Date | undefined, options: Pick<DayPickerProps, "numberOfMonths" | "pagedNavigation" | "disableNavigation">, dateLib: DateLib): Date | undefined;
