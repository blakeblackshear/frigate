import type { DateLib } from "../classes/DateLib.js";
import type { DayPickerProps, Selection } from "../types/index.js";
/**
 * Hook to manage multiple-date selection in the DayPicker component.
 *
 * @template T - The type of DayPicker props.
 * @param props - The DayPicker props.
 * @param dateLib - The date utility library instance.
 * @returns An object containing the selected dates, a function to select dates,
 *   and a function to check if a date is selected.
 */
export declare function useMulti<T extends DayPickerProps>(props: T, dateLib: DateLib): Selection<T>;
