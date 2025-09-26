import { toEthiopicDate } from "../utils/index.js";
/**
 * Checks if two dates fall in the same Ethiopian year.
 *
 * @param dateLeft - The first gregorian date to compare
 * @param dateRight - The second gregorian date to compare
 * @returns True if the dates are in the same Ethiopian year
 */
export function isSameYear(dateLeft, dateRight) {
    const left = toEthiopicDate(dateLeft);
    const right = toEthiopicDate(dateRight);
    return left.year === right.year;
}
