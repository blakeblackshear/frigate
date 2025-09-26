import type { DateLib } from "../classes/DateLib.js";
import type { DayPickerProps, MoveFocusBy, MoveFocusDir } from "../types/index.js";
/**
 * Calculates the next date that should be focused in the calendar.
 *
 * This function determines the next focusable date based on the movement
 * direction, constraints, and calendar configuration.
 *
 * @param moveBy The unit of movement (e.g., "day", "week").
 * @param moveDir The direction of movement ("before" or "after").
 * @param refDate The reference date from which to calculate the next focusable
 *   date.
 * @param navStart The earliest date the user can navigate to.
 * @param navEnd The latest date the user can navigate to.
 * @param props The DayPicker props, including calendar configuration options.
 * @param dateLib The date library to use for date manipulation.
 * @returns The next focusable date.
 */
export declare function getFocusableDate(moveBy: MoveFocusBy, moveDir: MoveFocusDir, refDate: Date, navStart: Date | undefined, navEnd: Date | undefined, props: Pick<DayPickerProps, "ISOWeek" | "broadcastCalendar">, dateLib: DateLib): Date;
