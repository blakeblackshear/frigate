"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.differenceInCalendarMonths = differenceInCalendarMonths;
const index_js_1 = require("../utils/index.js");
/**
 * Difference in calendar months
 *
 * @param {Date} dateLeft - The later date
 * @param {Date} dateRight - The earlier date
 * @returns {number} The number of calendar months between the two dates
 */
function differenceInCalendarMonths(dateLeft, dateRight) {
    const ethiopicLeft = (0, index_js_1.toEthiopicDate)(dateLeft);
    const ethiopicRight = (0, index_js_1.toEthiopicDate)(dateRight);
    return ((ethiopicLeft.year - ethiopicRight.year) * 13 +
        (ethiopicLeft.month - ethiopicRight.month));
}
