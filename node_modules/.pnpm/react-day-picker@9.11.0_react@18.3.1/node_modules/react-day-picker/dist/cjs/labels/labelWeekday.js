"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.labelWeekday = labelWeekday;
const DateLib_js_1 = require("../classes/DateLib.js");
/**
 * Generates the ARIA label for a weekday column header.
 *
 * @defaultValue `"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"`
 * @param date - The date representing the weekday.
 * @param options - Optional configuration for the date formatting library.
 * @param dateLib - An optional instance of the date formatting library.
 * @returns The ARIA label for the weekday column header.
 * @group Labels
 * @see https://daypicker.dev/docs/translation#aria-labels
 */
function labelWeekday(date, options, dateLib) {
    return (dateLib ?? new DateLib_js_1.DateLib(options)).format(date, "cccc");
}
