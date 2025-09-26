import { toHebrewDate } from "../utils/dateConversion.js";
export function getMonth(date) {
    return toHebrewDate(date).monthIndex;
}
