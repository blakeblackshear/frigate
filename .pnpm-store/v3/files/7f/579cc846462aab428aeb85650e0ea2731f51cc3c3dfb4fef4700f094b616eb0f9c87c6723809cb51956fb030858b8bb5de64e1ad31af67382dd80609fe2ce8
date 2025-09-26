import type { DateLib } from "../classes/DateLib.js";
import { CalendarDay } from "../classes/index.js";
import type { DayPickerProps, MoveFocusBy, MoveFocusDir } from "../types/index.js";
/**
 * Determines the next focusable day in the calendar.
 *
 * This function recursively calculates the next focusable day based on the
 * movement direction and modifiers applied to the days.
 *
 * @param moveBy The unit of movement (e.g., "day", "week").
 * @param moveDir The direction of movement ("before" or "after").
 * @param refDay The currently focused day.
 * @param calendarStartMonth The earliest month the user can navigate to.
 * @param calendarEndMonth The latest month the user can navigate to.
 * @param props The DayPicker props, including modifiers and configuration
 *   options.
 * @param dateLib The date library to use for date manipulation.
 * @param attempt The current recursion attempt (used to limit recursion depth).
 * @returns The next focusable day, or `undefined` if no focusable day is found.
 */
export declare function getNextFocus(moveBy: MoveFocusBy, moveDir: MoveFocusDir, refDay: CalendarDay, calendarStartMonth: Date | undefined, calendarEndMonth: Date | undefined, props: Pick<DayPickerProps, "disabled" | "hidden" | "modifiers" | "ISOWeek" | "timeZone">, dateLib: DateLib, attempt?: number): CalendarDay | undefined;
