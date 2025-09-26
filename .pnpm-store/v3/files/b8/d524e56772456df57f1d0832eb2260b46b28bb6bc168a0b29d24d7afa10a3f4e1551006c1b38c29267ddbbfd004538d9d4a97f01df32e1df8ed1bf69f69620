"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatYearCaption = void 0;
exports.formatYearDropdown = formatYearDropdown;
const DateLib_js_1 = require("../classes/DateLib.js");
/**
 * Formats the year for the dropdown option label.
 *
 * @param year The year to format.
 * @param dateLib The date library to use for formatting. Defaults to
 *   `defaultDateLib`.
 * @returns The formatted year as a string.
 * @group Formatters
 * @see https://daypicker.dev/docs/translation#custom-formatters
 */
function formatYearDropdown(year, dateLib = DateLib_js_1.defaultDateLib) {
    return dateLib.format(year, "yyyy");
}
/**
 * @private
 * @deprecated Use `formatYearDropdown` instead.
 * @group Formatters
 */
exports.formatYearCaption = formatYearDropdown;
