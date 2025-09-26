"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOfMonth = startOfMonth;
const index_js_1 = require("../utils/index.js");
/**
 * Start of month
 *
 * @param {Date} date - The original date
 * @returns {Date} The start of the month
 */
function startOfMonth(date) {
    const { year, month } = (0, index_js_1.toEthiopicDate)(date);
    return (0, index_js_1.toGregorianDate)({ year, month, day: 1 });
}
