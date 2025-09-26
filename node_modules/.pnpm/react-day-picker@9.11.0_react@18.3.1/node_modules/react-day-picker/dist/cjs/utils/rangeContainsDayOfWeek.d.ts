import { type DateLib } from "../classes/DateLib.js";
/**
 * Checks if a date range contains one or more specified days of the week.
 *
 * @since 9.2.2
 * @param range - The date range to check.
 * @param dayOfWeek - The day(s) of the week to check for (`0-6`, where `0` is
 *   Sunday).
 * @param dateLib - The date utility library instance.
 * @returns `true` if the range contains the specified day(s) of the week,
 *   otherwise `false`.
 * @group Utilities
 */
export declare function rangeContainsDayOfWeek(range: {
    from: Date;
    to: Date;
}, dayOfWeek: number | number[], dateLib?: DateLib): boolean;
