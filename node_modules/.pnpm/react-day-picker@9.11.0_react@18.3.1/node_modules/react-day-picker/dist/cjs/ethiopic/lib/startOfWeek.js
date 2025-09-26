"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOfWeek = startOfWeek;
const date_fns_1 = require("date-fns");
/**
 * Start of week
 *
 * @param {Date} date - The original date
 * @param {StartOfWeekOptions} [options] - The options object
 * @returns {Date} The start of the week
 */
function startOfWeek(date, options) {
    const weekStartsOn = options?.weekStartsOn ?? 1; // Default to Monday (1)
    return (0, date_fns_1.startOfWeek)(date, { weekStartsOn: weekStartsOn });
}
