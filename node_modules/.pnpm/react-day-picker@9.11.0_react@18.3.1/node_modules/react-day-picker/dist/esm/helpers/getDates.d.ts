import type { DateLib } from "../classes/DateLib.js";
import type { DayPickerProps } from "../types/props.js";
/**
 * Returns all the dates to display in the calendar.
 *
 * This function calculates the range of dates to display based on the provided
 * display months, constraints, and calendar configuration.
 *
 * @param displayMonths The months to display in the calendar.
 * @param maxDate The maximum date to include in the range.
 * @param props The DayPicker props, including calendar configuration options.
 * @param dateLib The date library to use for date manipulation.
 * @returns An array of dates to display in the calendar.
 */
export declare function getDates(displayMonths: Date[], maxDate: Date | undefined, props: Pick<DayPickerProps, "ISOWeek" | "fixedWeeks" | "broadcastCalendar">, dateLib: DateLib): Date[];
