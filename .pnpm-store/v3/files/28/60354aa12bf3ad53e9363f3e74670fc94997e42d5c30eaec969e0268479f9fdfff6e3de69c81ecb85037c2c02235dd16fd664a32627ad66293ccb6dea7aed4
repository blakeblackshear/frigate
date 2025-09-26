import { toGregorianDate, toHebrewDate } from "../utils/dateConversion.js";
import { monthIndexToHebrewDate, monthsSinceEpoch } from "../utils/serial.js";
export function setMonth(date, month) {
    const hebrew = toHebrewDate(date);
    const baseIndex = monthsSinceEpoch({ year: hebrew.year, monthIndex: 0 });
    const targetIndex = baseIndex + month;
    const target = monthIndexToHebrewDate(targetIndex, hebrew.day);
    return toGregorianDate(target);
}
