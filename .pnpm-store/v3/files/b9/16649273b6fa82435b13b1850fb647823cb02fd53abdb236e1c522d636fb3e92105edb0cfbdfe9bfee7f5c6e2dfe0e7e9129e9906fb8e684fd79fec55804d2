"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOfDay = startOfDay;
const index_js_1 = require("../utils/index.js");
/**
 * Start of day
 *
 * @param {Date} date - The original date
 * @returns {Date} The start of the day
 */
function startOfDay(date) {
    const { year, month, day } = (0, index_js_1.toEthiopicDate)(date);
    return (0, index_js_1.toGregorianDate)({ year, month, day });
}
