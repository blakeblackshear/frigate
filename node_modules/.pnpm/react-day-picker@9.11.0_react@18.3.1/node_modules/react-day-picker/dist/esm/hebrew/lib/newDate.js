import { toGregorianDate } from "../utils/dateConversion.js";
export function newDate(year, monthIndex, day) {
    return toGregorianDate({ year, monthIndex, day });
}
