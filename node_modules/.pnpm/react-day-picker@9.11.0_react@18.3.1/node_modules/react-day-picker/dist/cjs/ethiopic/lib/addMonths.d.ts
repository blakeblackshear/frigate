/**
 * Adds the specified number of months to the given Ethiopian date. Handles
 * month overflow and year boundaries correctly.
 *
 * @param date - The starting gregorian date
 * @param amount - The number of months to add (can be negative)
 * @returns A new gregorian date with the months added
 */
export declare function addMonths(date: Date, amount: number): Date;
