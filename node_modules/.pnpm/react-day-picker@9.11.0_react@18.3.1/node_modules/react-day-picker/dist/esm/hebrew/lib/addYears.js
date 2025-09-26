import { toHebrewDate } from "../utils/dateConversion.js";
import { setYear } from "./setYear.js";
export function addYears(date, amount) {
    if (amount === 0) {
        return new Date(date.getTime());
    }
    const hebrew = toHebrewDate(date);
    return setYear(date, hebrew.year + amount);
}
