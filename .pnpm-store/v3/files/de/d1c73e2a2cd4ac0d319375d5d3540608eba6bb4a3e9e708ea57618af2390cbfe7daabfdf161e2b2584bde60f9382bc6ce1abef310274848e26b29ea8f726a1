"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rangeOverlaps = rangeOverlaps;
const index_js_1 = require("../classes/index.js");
const rangeIncludesDate_js_1 = require("./rangeIncludesDate.js");
/**
 * Determines if two date ranges overlap.
 *
 * @since 9.2.2
 * @param rangeLeft - The first date range.
 * @param rangeRight - The second date range.
 * @param dateLib - The date utility library instance.
 * @returns `true` if the ranges overlap, otherwise `false`.
 * @group Utilities
 */
function rangeOverlaps(rangeLeft, rangeRight, dateLib = index_js_1.defaultDateLib) {
    return ((0, rangeIncludesDate_js_1.rangeIncludesDate)(rangeLeft, rangeRight.from, false, dateLib) ||
        (0, rangeIncludesDate_js_1.rangeIncludesDate)(rangeLeft, rangeRight.to, false, dateLib) ||
        (0, rangeIncludesDate_js_1.rangeIncludesDate)(rangeRight, rangeLeft.from, false, dateLib) ||
        (0, rangeIncludesDate_js_1.rangeIncludesDate)(rangeRight, rangeLeft.to, false, dateLib));
}
