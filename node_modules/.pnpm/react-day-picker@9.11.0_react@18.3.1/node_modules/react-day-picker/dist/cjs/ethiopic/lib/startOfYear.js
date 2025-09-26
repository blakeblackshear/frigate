"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOfYear = startOfYear;
const index_js_1 = require("../utils/index.js");
/**
 * Start of year
 *
 * @param {Date} date - The original date
 * @returns {Date} The start of the year
 */
function startOfYear(date) {
    const { year } = (0, index_js_1.toEthiopicDate)(date);
    return (0, index_js_1.toGregorianDate)({ year, month: 1, day: 1 });
}
