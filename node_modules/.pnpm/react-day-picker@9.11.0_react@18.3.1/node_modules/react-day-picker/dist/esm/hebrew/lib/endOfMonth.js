import { daysInHebrewMonth } from "../utils/calendarMath.js";
import { toGregorianDate, toHebrewDate } from "../utils/dateConversion.js";
export function endOfMonth(date) {
    const hebrew = toHebrewDate(date);
    const day = daysInHebrewMonth(hebrew.year, hebrew.monthIndex);
    return toGregorianDate({ ...hebrew, day });
}
