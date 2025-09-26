import { toEthiopicDate } from "../utils/index.js";
/**
 * Is same month
 *
 * @param {Date} dateLeft - The first date
 * @param {Date} dateRight - The second date
 * @returns {boolean} True if the two dates are in the same month
 */
export function isSameMonth(dateLeft, dateRight) {
    const left = toEthiopicDate(dateLeft);
    const right = toEthiopicDate(dateRight);
    return left.year === right.year && left.month === right.month;
}
