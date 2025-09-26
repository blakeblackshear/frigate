"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endOfWeek = endOfWeek;
const date_fns_1 = require("date-fns");
/**
 * End of week
 *
 * @param {Date} date - The original date
 * @param {EndOfWeekOptions} [options] - The options object
 * @returns {Date} The end of the week
 */
function endOfWeek(date, options) {
    const weekStartsOn = options?.weekStartsOn ?? 0; // Default to Monday (1)
    const endOfWeek = (0, date_fns_1.endOfWeek)(date, { weekStartsOn });
    return endOfWeek;
}
