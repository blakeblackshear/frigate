"use strict";

exports.constructFromSymbol = void 0;
/**
 * The symbol to access the `TZDate`'s function to construct a new instance from
 * the provided value. It helps date-fns to inherit the time zone.
 */
const constructFromSymbol = exports.constructFromSymbol = Symbol.for("constructDateFrom");