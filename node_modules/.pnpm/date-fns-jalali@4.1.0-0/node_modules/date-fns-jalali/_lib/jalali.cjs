"use strict";
exports.d2g = d2g;
exports.d2j = d2j;
exports.g2d = g2d;
exports.isLeapGregorianYear = isLeapGregorianYear;
exports.isLeapJalaliYear = isLeapJalaliYear;
exports.j2d = j2d;
exports.normalizeMonth = normalizeMonth;
exports.toGregorian = toGregorian;
exports.toJalali = toJalali;
const PERSIAN_EPOCH = 1948320;

const PERSIAN_NUM_DAYS = [
  0, 31, 62, 93, 124, 155, 186, 216, 246, 276, 306, 336,
];
// 0-based, for day-in-year

/**
  Converts a Gregorian date to Jalali.
*/
function toJalali(gy, gm, gd) {
  return d2j(g2d(gy, gm, gd));
}

/**
  Converts a Jalali date to Gregorian.
*/
function toGregorian(jy, jm, jd) {
  return d2g(j2d(jy, jm, jd));
}

/**
  Is this a leap year or not?
*/
function isLeapJalaliYear(jy) {
  if (jy === -3) {
    // to be compatible with other calculations
    return false;
  }
  const m = mod(25 * jy + 11, 33);
  return (m < 8 && m >= -1) || m <= -27;
}

/**
 * Is this a leap year or not?
 */

function isLeapGregorianYear(gy) {
  return gy % 4 == 0 && !(gy % 100 == 0 && !(gy % 400 == 0));
}

/**
  Converts a date of the Jalali calendar to the Julian Day number.

  @param jy Jalali year (1 to ...)
  @param jm Jalali month (1 to 12)
  @param jd Jalali day (1 to 29/31)
  @return Julian Day number
*/
function j2d(jy, jm, jd) {
  const [ny, nm] = normalizeMonth(jy, jm);
  jy = ny;
  jm = nm;

  const month = jm - 1;
  const year = jy;
  const day = jd;

  let julianDay = PERSIAN_EPOCH - 1 + 365 * (year - 1) + div(8 * year + 21, 33);

  if (month != 0) {
    julianDay += PERSIAN_NUM_DAYS[month];
  }

  return julianDay + day;
}

/**
  Converts the Julian Day number to a date in the Jalali calendar.

  @param julianDay Julian Day number
  @return
    jy: Jalali year (1 to ...)
    jm: Jalali month (1 to 12)
    jd: Jalali day (1 to 29/31)
*/
function d2j(julianDay) {
  if (isNaN(julianDay)) {
    return { jy: NaN, jm: NaN, jd: NaN };
  }

  let month, dayOfYear;

  const daysSinceEpoch = julianDay - PERSIAN_EPOCH;
  let year = 1 + div(33 * daysSinceEpoch + 3, 12053);

  dayOfYear = daysSinceEpoch - (365 * (year - 1) + div(8 * year + 21, 33)); // 0-based
  if (dayOfYear < 0) {
    year--;
    dayOfYear = daysSinceEpoch - (365 * (year - 1) + div(8 * year + 21, 33));
  }

  if (dayOfYear < 216) {
    // Compute 0-based month
    month = div(dayOfYear, 31);
  } else {
    month = div(dayOfYear - 6, 30);
  }
  const dayOfMonth = dayOfYear - PERSIAN_NUM_DAYS[month] + 1;
  dayOfYear++; // Make it 1-based now

  const jy = year;
  const jm = month + 1;
  const jd = dayOfMonth;
  return { jy, jm, jd };
}

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
function g2d(gy, gm, gd) {
  const [ny, nm] = normalizeMonth(gy, gm);
  gy = ny;
  gm = nm;

  return (
    div(1461 * (gy + 4800 + div(gm - 14, 12)), 4) +
    div(367 * (gm - 2 - 12 * div(gm - 14, 12)), 12) -
    div(3 * div(gy + 4900 + div(gm - 14, 12), 100), 4) +
    gd -
    32075
  );
}

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
function d2g(jdn) {
  if (isNaN(jdn)) {
    return { gy: NaN, gm: NaN, gd: NaN };
  }
  let L = jdn + 68569;
  const n = div(4 * L, 146097);

  L = L - div(146097 * n + 3, 4);
  const i = div(4000 * (L + 1), 1461001);
  L = L - div(1461 * i, 4) + 31;
  const j = div(80 * L, 2447);
  const gd = L - div(2447 * j, 80);
  L = div(j, 11);
  const gm = j + 2 - 12 * L;
  const gy = 100 * (n - 49) + i + L;

  return { gy, gm, gd };
}

/**
 * Normalize month to be in range [1, 12]
 * @param year
 * @param month
 */
function normalizeMonth(year, month) {
  month = month - 1;
  if (month < 0) {
    const old_month = month;
    month = pmod(month, 12);
    year -= div(month - old_month, 12);
  }
  if (month > 11) {
    year += div(month, 12);
    month = mod(month, 12);
  }
  return [year, month + 1];
}

/*
  Utility helper functions.
*/

function div(a, b) {
  return ~~(a / b);
}

function mod(a, b) {
  return a - ~~(a / b) * b;
}

// mod always return positive number
function pmod(a, b) {
  return mod(mod(a, b) + b, b);
}
