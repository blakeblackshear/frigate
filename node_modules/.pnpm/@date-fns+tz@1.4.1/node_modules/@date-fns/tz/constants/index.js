/**
 * The symbol to access the `TZDate`'s function to construct a new instance from
 * the provided value. It helps date-fns to inherit the time zone.
 */
export const constructFromSymbol = Symbol.for("constructDateFrom");