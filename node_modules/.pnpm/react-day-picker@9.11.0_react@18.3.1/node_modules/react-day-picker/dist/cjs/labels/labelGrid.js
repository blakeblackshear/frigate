"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.labelCaption = void 0;
exports.labelGrid = labelGrid;
const DateLib_js_1 = require("../classes/DateLib.js");
/**
 * Generates the ARIA label for the month grid, which is announced when entering
 * the grid.
 *
 * @defaultValue Locale-specific month/year order (e.g., "November 2022").
 * @param date - The date representing the month.
 * @param options - Optional configuration for the date formatting library.
 * @param dateLib - An optional instance of the date formatting library.
 * @returns The ARIA label for the month grid.
 * @group Labels
 * @see https://daypicker.dev/docs/translation#aria-labels
 */
function labelGrid(date, options, dateLib) {
    const lib = dateLib ?? new DateLib_js_1.DateLib(options);
    return lib.formatMonthYear(date);
}
/**
 * @ignore
 * @deprecated Use {@link labelGrid} instead.
 */
exports.labelCaption = labelGrid;
