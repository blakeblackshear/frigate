"use strict";
exports.isExists = isExists;
var _index = require("./_core/getMonth.cjs");
var _index2 = require("./_core/getDate.cjs");
var _index3 = require("./_core/getFullYear.cjs");
var _index4 = require("./_core/newDate.cjs");
/**
 * @name isExists
 * @category Common Helpers
 * @summary Is the given date exists?
 *
 * @description
 * Checks if the given arguments convert to an existing date.
 *
 * @param year - The year of the date to check
 * @param month - The month of the date to check
 * @param day - The day of the date to check
 *
 * @returns `true` if the date exists
 *
 * @example
 * // For the valid date:
 * const result = isExists(2018, 0, 31)
 * //=> true
 *
 * @example
 * // For the invalid date:
 * const result = isExists(2018, 1, 31)
 * //=> false
 */
function isExists(year, month, day) {
  const date = (0, _index4.newDate)(year, month, day);
  return (
    (0, _index3.getFullYear)(date) === year &&
    (0, _index.getMonth)(date) === month &&
    (0, _index2.getDate)(date) === day
  );
}
