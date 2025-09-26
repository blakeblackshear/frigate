"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSameYear = isSameYear;
const index_js_1 = require("../utils/index.js");
/**
 * Checks if two dates fall in the same Ethiopian year.
 *
 * @param dateLeft - The first gregorian date to compare
 * @param dateRight - The second gregorian date to compare
 * @returns True if the dates are in the same Ethiopian year
 */
function isSameYear(dateLeft, dateRight) {
    const left = (0, index_js_1.toEthiopicDate)(dateLeft);
    const right = (0, index_js_1.toEthiopicDate)(dateRight);
    return left.year === right.year;
}
