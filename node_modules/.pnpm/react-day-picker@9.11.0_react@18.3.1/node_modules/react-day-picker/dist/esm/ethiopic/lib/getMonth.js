import { toEthiopicDate } from "../utils/index.js";
/**
 * Get month
 *
 * @param {Date} date - The original date
 * @returns {number} The zero-based month index
 */
export function getMonth(date) {
    const { month } = toEthiopicDate(date);
    return month - 1; // Return zero-based month index
}
