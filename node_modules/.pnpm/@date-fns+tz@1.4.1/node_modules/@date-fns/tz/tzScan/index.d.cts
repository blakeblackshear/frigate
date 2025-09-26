/**
 * Time interval.
 */
export interface TZChangeInterval {
    /** Start date. */
    start: Date;
    /** End date. */
    end: Date;
}
/**
 * Time zone change record.
 */
export interface TZChange {
    /** Date time the change occurs */
    date: Date;
    /** Offset change in minutes */
    change: number;
    /** New UTC offset in minutes */
    offset: number;
}
/**
 * The function scans the time zone for changes in the given interval.
 *
 * @param timeZone - Time zone name (IANA or UTC offset)
 * @param interval - Time interval to scan for changes
 *
 * @returns Array of time zone changes
 */
export declare function tzScan(timeZone: string, interval: TZChangeInterval): TZChange[];
//# sourceMappingURL=index.d.ts.map