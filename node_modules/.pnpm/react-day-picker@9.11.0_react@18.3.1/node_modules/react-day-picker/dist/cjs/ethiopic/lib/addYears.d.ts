/**
 * Adds the specified number of years to the given Ethiopian date. Handles leap
 * year transitions for Pagume month.
 *
 * @param date - The starting gregorian date
 * @param amount - The number of years to add (can be negative)
 * @returns A new gregorian date with the years added
 */
export declare function addYears(date: Date, amount: number): Date;
