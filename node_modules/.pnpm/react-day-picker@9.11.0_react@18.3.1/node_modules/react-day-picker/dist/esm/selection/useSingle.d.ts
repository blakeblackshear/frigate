import type { DateLib } from "../classes/DateLib.js";
import type { DayPickerProps, SelectedValue, SelectHandler, Selection } from "../types/index.js";
export type UseSingle<T extends DayPickerProps> = {
    select: SelectHandler<T>;
    isSelected: (date: Date) => boolean;
    selected: SelectedValue<T>;
};
/**
 * Hook to manage single-date selection in the DayPicker component.
 *
 * @template T - The type of DayPicker props.
 * @param props - The DayPicker props.
 * @param dateLib - The date utility library instance.
 * @returns An object containing the selected date, a function to select a date,
 *   and a function to check if a date is selected.
 */
export declare function useSingle<T extends DayPickerProps>(props: DayPickerProps, dateLib: DateLib): Selection<T>;
