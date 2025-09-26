/**
 * Represents a date in the Ethiopic calendar system.
 *
 * The Ethiopic calendar has:
 *
 * - 13 months
 * - 12 months of 30 days each
 * - A 13th month (Pagume) of 5 or 6 days
 */
export interface EthiopicDate {
    /** The Ethiopic year */
    year: number;
    /** The month number (1-13) */
    month: number;
    /** The day of the month (1-30, or 1-5/6 for month 13) */
    day: number;
}
