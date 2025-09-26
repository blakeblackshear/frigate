import { toDate } from "date-fns";
import { toGregorianDate, toHebrewDate } from "../utils/dateConversion.js";
import { monthIndexToHebrewDate, monthsSinceEpoch } from "../utils/serial.js";
export function eachMonthOfInterval(interval) {
    const startDate = toDate(interval.start);
    const endDate = toDate(interval.end);
    if (endDate.getTime() < startDate.getTime()) {
        return [];
    }
    const startHebrew = toHebrewDate(startDate);
    const endHebrew = toHebrewDate(endDate);
    const startIndex = monthsSinceEpoch(startHebrew);
    const endIndex = monthsSinceEpoch(endHebrew);
    const months = [];
    for (let index = startIndex; index <= endIndex; index += 1) {
        const hebrew = monthIndexToHebrewDate(index, 1);
        months.push(toGregorianDate(hebrew));
    }
    return months;
}
