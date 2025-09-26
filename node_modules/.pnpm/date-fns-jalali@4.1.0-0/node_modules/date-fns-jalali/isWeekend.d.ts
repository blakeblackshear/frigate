import type { ContextOptions, DateArg } from "./types.js";
/**
 * The {@link isWeekend} function options.
 */
export interface IsWeekendOptions extends ContextOptions<Date> {}
/**
 * @name isWeekend
 * @category Weekday Helpers
 * @summary Does the given date fall on a weekend?
 *
 * @description
 * Does the given date fall on a weekend? A weekend is Friday (`5`).
 *
 * @param date - The date to check
 * @param options - An object with options
 *
 * @returns The date falls on a weekend
 *
 * @example
 * // Does 5 October 2014 fall on a weekend?
 * const result = isWeekend(new Date(2014, 9, 5))
 * //=> true
 */
export declare function isWeekend(
  date: DateArg<Date> & {},
  options?: IsWeekendOptions | undefined,
): boolean;
