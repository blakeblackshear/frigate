/**
 * Determines if two date ranges overlap.
 *
 * @since 9.2.2
 * @param rangeLeft - The first date range.
 * @param rangeRight - The second date range.
 * @param dateLib - The date utility library instance.
 * @returns `true` if the ranges overlap, otherwise `false`.
 * @group Utilities
 */
export declare function rangeOverlaps(rangeLeft: {
    from: Date;
    to: Date;
}, rangeRight: {
    from: Date;
    to: Date;
}, dateLib?: import("../classes/DateLib.js").DateLib): boolean;
