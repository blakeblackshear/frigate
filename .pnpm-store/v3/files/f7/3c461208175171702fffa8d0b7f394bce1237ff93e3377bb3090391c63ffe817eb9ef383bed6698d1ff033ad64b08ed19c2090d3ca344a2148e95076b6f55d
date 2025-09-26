/**
  Converts a Gregorian date to Jalali.
*/
export declare function toJalali(
  gy: number,
  gm: number,
  gd: number,
): {
  jy: number;
  jm: number;
  jd: number;
};
/**
  Converts a Jalali date to Gregorian.
*/
export declare function toGregorian(
  jy: number,
  jm: number,
  jd: number,
): {
  gy: number;
  gm: number;
  gd: number;
};
/**
  Is this a leap year or not?
*/
export declare function isLeapJalaliYear(jy: number): boolean;
/**
 * Is this a leap year or not?
 */
export declare function isLeapGregorianYear(gy: number): boolean;
/**
  Converts a date of the Jalali calendar to the Julian Day number.

  @param jy Jalali year (1 to ...)
  @param jm Jalali month (1 to 12)
  @param jd Jalali day (1 to 29/31)
  @return Julian Day number
*/
export declare function j2d(jy: number, jm: number, jd: number): number;
/**
  Converts the Julian Day number to a date in the Jalali calendar.

  @param julianDay Julian Day number
  @return
    jy: Jalali year (1 to ...)
    jm: Jalali month (1 to 12)
    jd: Jalali day (1 to 29/31)
*/
export declare function d2j(julianDay: number): {
  jy: number;
  jm: number;
  jd: number;
};
/**
  Calculates the Julian Day number from Gregorian or Julian
  calendar dates. This integer number corresponds to the noon of
  the date (i.e. 12 hours of Universal Time).
  The procedure was tested to be good since 1 March, -100100 (of both
  calendars) up to a few million years into the future.

  @param gy Calendar year (years BC numbered 0, -1, -2, ...)
  @param gm Calendar month (1 to 12)
  @param gd Calendar day of the month (1 to 28/29/30/31)
  @return Julian Day number
*/
export declare function g2d(gy: number, gm: number, gd: number): number;
/**
  Calculates Gregorian and Julian calendar dates from the Julian Day number
  (jdn) for the period since jdn=-34839655 (i.e. the year -100100 of both
  calendars) to some millions years ahead of the present.

  @param jdn Julian Day number
  @return
    gy: Calendar year (years BC numbered 0, -1, -2, ...)
    gm: Calendar month (1 to 12)
    gd: Calendar day of the month M (1 to 28/29/30/31)
*/
export declare function d2g(jdn: number): {
  gy: number;
  gm: number;
  gd: number;
};
/**
 * Normalize month to be in range [1, 12]
 * @param year
 * @param month
 */
export declare function normalizeMonth(
  year: number,
  month: number,
): [number, number];
