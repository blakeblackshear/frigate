import { toGregorian, toJalali } from "../_lib/jalali.js";

/**
 *
 * @param cleanDate {Date}
 * @param args
 * @returns {number}
 */
export function setMonth(cleanDate, ...args) {
  const gd = cleanDate.getDate();
  const gm = cleanDate.getMonth() + 1;
  const gy = cleanDate.getFullYear();
  const j = toJalali(gy, gm, gd);
  const [month, date = j.jd] = args;
  const g = toGregorian(j.jy, month + 1, date);
  return cleanDate.setFullYear(g.gy, g.gm - 1, g.gd);
}
