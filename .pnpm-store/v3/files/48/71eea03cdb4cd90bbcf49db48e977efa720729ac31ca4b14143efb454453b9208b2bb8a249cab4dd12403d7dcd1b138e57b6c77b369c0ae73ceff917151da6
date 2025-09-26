import { toHebrewDate } from "../utils/dateConversion.js";
import { monthsSinceEpoch } from "../utils/serial.js";
export function differenceInCalendarMonths(dateLeft, dateRight) {
    const left = toHebrewDate(dateLeft);
    const right = toHebrewDate(dateRight);
    return monthsSinceEpoch(left) - monthsSinceEpoch(right);
}
