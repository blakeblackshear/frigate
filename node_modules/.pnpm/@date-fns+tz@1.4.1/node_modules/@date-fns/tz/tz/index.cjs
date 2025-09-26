"use strict";

exports.tz = void 0;
var _index = require("../date/index.cjs");
/**
 * The function creates accepts a time zone and returns a function that creates
 * a new `TZDate` instance in the time zone from the provided value. Use it to
 * provide the context for the date-fns functions, via the `in` option.
 *
 * @param timeZone - Time zone name (IANA or UTC offset)
 *
 * @returns Function that creates a new `TZDate` instance in the time zone
 */
const tz = timeZone => value => _index.TZDate.tz(timeZone, +new Date(value));
exports.tz = tz;