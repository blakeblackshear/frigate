"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSameMonth = isSameMonth;
const index_js_1 = require("../utils/index.js");
/**
 * Is same month
 *
 * @param {Date} dateLeft - The first date
 * @param {Date} dateRight - The second date
 * @returns {boolean} True if the two dates are in the same month
 */
function isSameMonth(dateLeft, dateRight) {
    const left = (0, index_js_1.toEthiopicDate)(dateLeft);
    const right = (0, index_js_1.toEthiopicDate)(dateRight);
    return left.year === right.year && left.month === right.month;
}
