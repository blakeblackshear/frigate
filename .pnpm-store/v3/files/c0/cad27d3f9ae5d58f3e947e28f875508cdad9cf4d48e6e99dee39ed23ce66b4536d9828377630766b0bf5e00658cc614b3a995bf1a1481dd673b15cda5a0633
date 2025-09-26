import { isEthiopicLeapYear } from "./isEthiopicLeapYear.js";
/**
 * Returns the number of days in the specified month of the Ethiopic calendar.
 *
 * In the Ethiopic calendar:
 *
 * - Months 1-12 have 30 days each
 * - Month 13 (Pagume) has 5 days in regular years, 6 days in leap years
 *
 * @param month - The month number (1-13)
 * @param year - The Ethiopic year
 * @returns The number of days in the specified month
 */
export function daysInMonth(month, year) {
    if (month === 13) {
        return isEthiopicLeapYear(year) ? 6 : 5;
    }
    return 30;
}
