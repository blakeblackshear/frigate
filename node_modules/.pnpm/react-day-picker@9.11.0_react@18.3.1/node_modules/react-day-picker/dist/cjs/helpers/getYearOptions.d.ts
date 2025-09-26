import type { DateLib } from "../classes/DateLib.js";
import type { DropdownOption } from "../components/Dropdown.js";
import type { Formatters } from "../types/index.js";
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
export declare function getYearOptions(navStart: Date | undefined, navEnd: Date | undefined, formatters: Pick<Formatters, "formatYearDropdown">, dateLib: DateLib, reverse?: boolean): DropdownOption[] | undefined;
