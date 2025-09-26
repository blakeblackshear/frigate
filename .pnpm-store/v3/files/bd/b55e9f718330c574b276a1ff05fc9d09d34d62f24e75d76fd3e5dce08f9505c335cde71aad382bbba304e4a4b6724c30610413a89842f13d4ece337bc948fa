"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMonthCaption = void 0;
exports.formatCaption = formatCaption;
const DateLib_js_1 = require("../classes/DateLib.js");
/**
 * Formats the caption of the month.
 *
 * @defaultValue Locale-specific month/year order (e.g., "November 2022").
 * @param month The date representing the month.
 * @param options Configuration options for the date library.
 * @param dateLib The date library to use for formatting. If not provided, a new
 *   instance is created.
 * @returns The formatted caption as a string.
 * @group Formatters
 * @see https://daypicker.dev/docs/translation#custom-formatters
 */
function formatCaption(month, options, dateLib) {
    const lib = dateLib ?? new DateLib_js_1.DateLib(options);
    return lib.formatMonthYear(month);
}
/**
 * @private
 * @deprecated Use {@link formatCaption} instead.
 * @group Formatters
 */
exports.formatMonthCaption = formatCaption;
