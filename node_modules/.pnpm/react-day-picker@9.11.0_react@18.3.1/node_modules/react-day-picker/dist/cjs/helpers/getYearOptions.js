"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getYearOptions = getYearOptions;
/**
 * Returns the years to display in the dropdown.
 *
 * This function generates a list of years between the navigation start and end
 * dates, formatted using the provided formatter.
 *
 * @param navStart The start date for navigation.
 * @param navEnd The end date for navigation.
 * @param formatters The formatters to use for formatting the year labels.
 * @param dateLib The date library to use for date manipulation.
 * @param reverse If true, reverses the order of the years (descending).
 * @returns An array of dropdown options representing the years, or `undefined`
 *   if `navStart` or `navEnd` is not provided.
 */
function getYearOptions(navStart, navEnd, formatters, dateLib, reverse = false) {
    if (!navStart)
        return undefined;
    if (!navEnd)
        return undefined;
    const { startOfYear, endOfYear, addYears, getYear, isBefore, isSameYear } = dateLib;
    const firstNavYear = startOfYear(navStart);
    const lastNavYear = endOfYear(navEnd);
    const years = [];
    let year = firstNavYear;
    while (isBefore(year, lastNavYear) || isSameYear(year, lastNavYear)) {
        years.push(year);
        year = addYears(year, 1);
    }
    if (reverse)
        years.reverse();
    return years.map((year) => {
        const label = formatters.formatYearDropdown(year, dateLib);
        return {
            value: getYear(year),
            label,
            disabled: false,
        };
    });
}
