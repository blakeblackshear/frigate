"use strict";
exports.startOfTomorrow = startOfTomorrow;
var _index = require("./constructFrom.cjs");
var _index2 = require("./constructNow.cjs");

var _index3 = require("./_core/getMonth.cjs");
var _index4 = require("./_core/getDate.cjs");
var _index5 = require("./_core/getFullYear.cjs");
var _index6 = require("./_core/setFullYear.cjs");

/**
 * The {@link startOfTomorrow} function options.
 */

/**
 * @name startOfTomorrow
 * @category Day Helpers
 * @summary Return the start of tomorrow.
 * @pure false
 *
 * @typeParam ContextDate - The `Date` type of the context function.
 *
 * @param options - An object with options
 *
 * @returns The start of tomorrow
 *
 * @description
 * Return the start of tomorrow.
 *
 * @example
 * // If today is 6 October 2014:
 * const result = startOfTomorrow()
 * //=> Tue Oct 7 2014 00:00:00
 */
function startOfTomorrow(options) {
  const now = (0, _index2.constructNow)(options?.in);
  const year = (0, _index5.getFullYear)(now);
  const month = (0, _index3.getMonth)(now);
  const day = (0, _index4.getDate)(now);

  const date = (0, _index.constructFrom)(options?.in, 0);
  (0, _index6.setFullYear)(date, year, month, day + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}
