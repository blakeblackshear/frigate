import { toGregorianDate, toHebrewDate } from "../utils/dateConversion.js";
export function startOfYear(date) {
    const hebrew = toHebrewDate(date);
    return toGregorianDate({ year: hebrew.year, monthIndex: 0, day: 1 });
}
