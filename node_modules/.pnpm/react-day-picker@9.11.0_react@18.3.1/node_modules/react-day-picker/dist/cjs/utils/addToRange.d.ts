import { type DateLib } from "../classes/DateLib.js";
import type { DateRange } from "../types/index.js";
/**
 * Adds a date to an existing range, considering constraints like minimum and
 * maximum range size.
 *
 * @param date - The date to add to the range.
 * @param initialRange - The initial range to which the date will be added.
 * @param min - The minimum number of days in the range.
 * @param max - The maximum number of days in the range.
 * @param required - Whether the range must always include at least one date.
 * @param dateLib - The date utility library instance.
 * @returns The updated date range, or `undefined` if the range is cleared.
 * @group Utilities
 */
export declare function addToRange(date: Date, initialRange: DateRange | undefined, min?: number, max?: number, required?: boolean, dateLib?: DateLib): DateRange | undefined;
