import { newDate as coreNewDate } from "./_core/newDate.js";
/**
 * @name newDate
 * @category Common Helpers
 * @summary Create a date object of the given params.
 *
 * @param {Number} year - the number of years
 * @param {Number} monthIndex - the number of months 0-11
 * @param {Number} date - the number of days 1-31
 * @param {Number} [hours=0] - the number of hours 0-23
 * @param {Number} [minutes=0] - the number of minutes 0-59
 * @param {Number} [seconds=0] - the number of seconds 0-59
 * @param {Number} [ms=0] - the number of milliseconds 0-999
 * @returns {Date} the new date
 */
export function newDate(
  year,
  monthIndex,
  date,
  hours = 0,
  minutes = 0,
  seconds = 0,
  ms = 0,
) {
  return coreNewDate(year, monthIndex, date, hours, minutes, seconds, ms);
}

// Fallback for modularized imports:
export default newDate;
