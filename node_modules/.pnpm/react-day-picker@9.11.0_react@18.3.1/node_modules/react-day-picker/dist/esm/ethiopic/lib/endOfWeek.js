import { endOfWeek as endOfWeekFns } from "date-fns";
/**
 * End of week
 *
 * @param {Date} date - The original date
 * @param {EndOfWeekOptions} [options] - The options object
 * @returns {Date} The end of the week
 */
export function endOfWeek(date, options) {
    const weekStartsOn = options?.weekStartsOn ?? 0; // Default to Monday (1)
    const endOfWeek = endOfWeekFns(date, { weekStartsOn });
    return endOfWeek;
}
