import type { DateLib } from "../classes/DateLib.js";
import type { DayPickerProps } from "../types/index.js";
/**
 * Returns the months to display in the calendar.
 *
 * @param firstDisplayedMonth The first month currently displayed in the
 *   calendar.
 * @param calendarEndMonth The latest month the user can navigate to.
 * @param props The DayPicker props, including `numberOfMonths`.
 * @param dateLib The date library to use for date manipulation.
 * @returns An array of dates representing the months to display.
 */
export declare function getDisplayMonths(firstDisplayedMonth: Date, calendarEndMonth: Date | undefined, props: Pick<DayPickerProps, "numberOfMonths">, dateLib: DateLib): Date[];
