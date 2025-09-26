import type { CalendarDay } from "../classes/index.js";
import type { Modifiers } from "../types/index.js";
/**
 * Calculates the focus target day based on priority.
 *
 * This function determines the day that should receive focus in the calendar,
 * prioritizing days with specific modifiers (e.g., "focused", "today") or
 * selection states.
 *
 * @param days The array of `CalendarDay` objects to evaluate.
 * @param getModifiers A function to retrieve the modifiers for a given day.
 * @param isSelected A function to determine if a day is selected.
 * @param lastFocused The last focused day, if any.
 * @returns The `CalendarDay` that should receive focus, or `undefined` if no
 *   focusable day is found.
 */
export declare function calculateFocusTarget(days: CalendarDay[], getModifiers: (day: CalendarDay) => Modifiers, isSelected: (date: Date) => boolean, lastFocused: CalendarDay | undefined): CalendarDay | undefined;
