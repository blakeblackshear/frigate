import { toJalali } from "../_lib/jalali.js";

/**
 *
 * @param cleanDate {Date}
 * @returns {number}
 */
export function getFullYear(cleanDate) {
  const gd = cleanDate.getDate();
  const gm = cleanDate.getMonth() + 1;
  const gy = cleanDate.getFullYear();
  return toJalali(gy, gm, gd).jy;
}
