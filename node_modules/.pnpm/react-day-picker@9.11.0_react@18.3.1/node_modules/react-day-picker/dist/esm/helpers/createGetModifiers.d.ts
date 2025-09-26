import type { CalendarDay, DateLib } from "../classes/index.js";
import type { DayPickerProps, Modifiers } from "../types/index.js";
/**
 * Creates a function to retrieve the modifiers for a given day.
 *
 * This function calculates both internal and custom modifiers for each day
 * based on the provided calendar days and DayPicker props.
 *
 * @private
 * @param days The array of `CalendarDay` objects to process.
 * @param props The DayPicker props, including modifiers and configuration
 *   options.
 * @param dateLib The date library to use for date manipulation.
 * @returns A function that retrieves the modifiers for a given `CalendarDay`.
 */
export declare function createGetModifiers(days: CalendarDay[], props: DayPickerProps, navStart: Date | undefined, navEnd: Date | undefined, dateLib: DateLib): (day: CalendarDay) => Modifiers;
