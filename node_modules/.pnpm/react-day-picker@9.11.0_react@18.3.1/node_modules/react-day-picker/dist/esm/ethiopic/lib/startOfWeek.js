import { startOfWeek as startOfWeekFns, } from "date-fns";
/**
 * Start of week
 *
 * @param {Date} date - The original date
 * @param {StartOfWeekOptions} [options] - The options object
 * @returns {Date} The start of the week
 */
export function startOfWeek(date, options) {
    const weekStartsOn = options?.weekStartsOn ?? 1; // Default to Monday (1)
    return startOfWeekFns(date, { weekStartsOn: weekStartsOn });
}
