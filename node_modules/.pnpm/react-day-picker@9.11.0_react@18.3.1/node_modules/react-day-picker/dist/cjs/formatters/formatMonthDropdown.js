"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMonthDropdown = formatMonthDropdown;
const DateLib_js_1 = require("../classes/DateLib.js");
/**
 * Formats the month for the dropdown option label.
 *
 * @defaultValue The localized full month name.
 * @param month The date representing the month.
 * @param dateLib The date library to use for formatting. Defaults to
 *   `defaultDateLib`.
 * @returns The formatted month name as a string.
 * @group Formatters
 * @see https://daypicker.dev/docs/translation#custom-formatters
 */
function formatMonthDropdown(month, dateLib = DateLib_js_1.defaultDateLib) {
    return dateLib.format(month, "LLLL");
}
