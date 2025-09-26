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
export declare function newDate(
  year: number,
  monthIndex: number,
  date: number,
  hours?: number,
  minutes?: number,
  seconds?: number,
  ms?: number,
): Date;
