import type { DateLib } from "../classes/DateLib.js";
import type { DropdownOption } from "../components/Dropdown.js";
import type { Formatters } from "../types/index.js";
/**
 * Returns the months to show in the dropdown.
 *
 * This function generates a list of months for the current year, formatted
 * using the provided formatter, and determines whether each month should be
 * disabled based on the navigation range.
 *
 * @param displayMonth The currently displayed month.
 * @param navStart The start date for navigation.
 * @param navEnd The end date for navigation.
 * @param formatters The formatters to use for formatting the month labels.
 * @param dateLib The date library to use for date manipulation.
 * @returns An array of dropdown options representing the months, or `undefined`
 *   if no months are available.
 */
export declare function getMonthOptions(displayMonth: Date, navStart: Date | undefined, navEnd: Date | undefined, formatters: Pick<Formatters, "formatMonthDropdown">, dateLib: DateLib): DropdownOption[] | undefined;
