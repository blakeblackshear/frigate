"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endOfYear = endOfYear;
const index_js_1 = require("../utils/index.js");
/**
 * End of year
 *
 * @param {Date} date - The original date
 * @returns {Date} The end of the year
 */
function endOfYear(date) {
    const { year } = (0, index_js_1.toEthiopicDate)(date);
    const day = (0, index_js_1.isEthiopicLeapYear)(year) ? 6 : 5;
    return (0, index_js_1.toGregorianDate)({ year, month: 13, day });
}
