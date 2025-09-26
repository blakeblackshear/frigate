import { type DateLib } from "../classes/DateLib.js";
import type { Matcher } from "../types/index.js";
/**
 * Checks if a date range contains dates that match the given modifiers.
 *
 * @since 9.2.2
 * @param range - The date range to check.
 * @param modifiers - The modifiers to match against.
 * @param dateLib - The date utility library instance.
 * @returns `true` if the range contains matching dates, otherwise `false`.
 * @group Utilities
 */
export declare function rangeContainsModifiers(range: {
    from: Date;
    to: Date;
}, modifiers: Matcher | Matcher[], dateLib?: DateLib): boolean;
