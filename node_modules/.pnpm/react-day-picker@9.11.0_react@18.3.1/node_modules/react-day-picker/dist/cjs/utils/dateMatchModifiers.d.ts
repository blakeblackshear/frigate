import { type DateLib } from "../classes/DateLib.js";
import type { Matcher } from "../types/index.js";
/**
 * Checks if a given date matches at least one of the specified {@link Matcher}.
 *
 * @param date - The date to check.
 * @param matchers - The matchers to check against.
 * @param dateLib - The date utility library instance.
 * @returns `true` if the date matches any of the matchers, otherwise `false`.
 * @group Utilities
 */
export declare function dateMatchModifiers(date: Date, matchers: Matcher | Matcher[], dateLib?: DateLib): boolean;
/**
 * @private
 * @deprecated Use {@link dateMatchModifiers} instead.
 */
export declare const isMatch: typeof dateMatchModifiers;
