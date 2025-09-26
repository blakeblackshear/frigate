"use strict";
exports.startOfYesterday = startOfYesterday;
var _index = require("./constructNow.cjs");

var _index2 = require("./_core/getMonth.cjs");
var _index3 = require("./_core/getDate.cjs");
var _index4 = require("./_core/getFullYear.cjs");
var _index5 = require("./_core/setFullYear.cjs");

/**
 * The {@link startOfYesterday} function options.
 */

/**
 * @name startOfYesterday
 * @category Day Helpers
 * @summary Return the start of yesterday.
 * @pure false
 *
 * @typeParam ContextDate - The `Date` type of the context function.
 *
 * @param options - An object with options
 *
 * @description
 * Return the start of yesterday.
 *
 * @returns The start of yesterday
 *
 * @example
 * // If today is 6 October 2014:
 * const result = startOfYesterday()
 * //=> Sun Oct 5 2014 00:00:00
 */
function startOfYesterday(options) {
  const now = (0, _index.constructNow)(options?.in);
  const year = (0, _index4.getFullYear)(now);
  const month = (0, _index2.getMonth)(now);
  const day = (0, _index3.getDate)(now);

  const date = (0, _index.constructNow)(options?.in);
  (0, _index5.setFullYear)(date, year, month, day - 1);
  date.setHours(0, 0, 0, 0);
  return date;
}
