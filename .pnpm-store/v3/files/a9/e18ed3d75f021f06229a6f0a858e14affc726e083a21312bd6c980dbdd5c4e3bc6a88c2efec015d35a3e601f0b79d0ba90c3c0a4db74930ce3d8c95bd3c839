import { toEthiopicDate } from "../utils/index.js";
/**
 * Difference in calendar months
 *
 * @param {Date} dateLeft - The later date
 * @param {Date} dateRight - The earlier date
 * @returns {number} The number of calendar months between the two dates
 */
export function differenceInCalendarMonths(dateLeft, dateRight) {
    const ethiopicLeft = toEthiopicDate(dateLeft);
    const ethiopicRight = toEthiopicDate(dateRight);
    return ((ethiopicLeft.year - ethiopicRight.year) * 13 +
        (ethiopicLeft.month - ethiopicRight.month));
}
