import type { DateLib } from "../classes/DateLib.js";
import type { DayPickerProps, Selection } from "../types/index.js";
/**
 * Hook to manage range selection in the DayPicker component.
 *
 * @template T - The type of DayPicker props.
 * @param props - The DayPicker props.
 * @param dateLib - The date utility library instance.
 * @returns An object containing the selected range, a function to select a
 *   range, and a function to check if a date is within the range.
 */
export declare function useRange<T extends DayPickerProps>(props: T, dateLib: DateLib): Selection<T>;
