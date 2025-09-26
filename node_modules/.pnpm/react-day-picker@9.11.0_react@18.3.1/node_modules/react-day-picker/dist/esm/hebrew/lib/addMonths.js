import { toGregorianDate, toHebrewDate } from "../utils/dateConversion.js";
import { clampHebrewDay, monthIndexToHebrewDate, monthsSinceEpoch, } from "../utils/serial.js";
export function addMonths(date, amount) {
    if (amount === 0) {
        return new Date(date.getTime());
    }
    const hebrew = toHebrewDate(date);
    const targetIndex = monthsSinceEpoch(hebrew) + amount;
    const target = monthIndexToHebrewDate(targetIndex, hebrew.day);
    const day = clampHebrewDay(target.year, target.monthIndex, target.day);
    return toGregorianDate({ ...target, day });
}
