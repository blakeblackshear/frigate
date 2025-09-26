import type { DateLib } from "../classes/DateLib.js";
import type { DayPickerProps } from "../types/index.js";
/**
 * Returns the start and end months for calendar navigation.
 *
 * @param props The DayPicker props, including navigation and layout options.
 * @param dateLib The date library to use for date manipulation.
 * @returns A tuple containing the start and end months for navigation.
 */
export declare function getNavMonths(props: Pick<DayPickerProps, "captionLayout" | "endMonth" | "startMonth" | "today" | "timeZone" | "fromMonth" | "fromYear" | "toMonth" | "toYear">, dateLib: DateLib): [start: Date | undefined, end: Date | undefined];
