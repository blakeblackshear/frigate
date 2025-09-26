import type { CalendarDay, DateLib } from "./classes/index.js";
import type { DayPickerProps, Modifiers, MoveFocusBy, MoveFocusDir } from "./types/index.js";
import type { Calendar } from "./useCalendar.js";
export type UseFocus = {
    /** The date that is currently focused. */
    focused: CalendarDay | undefined;
    /** Check if the given day is the focus target when entering the calendar. */
    isFocusTarget: (day: CalendarDay) => boolean;
    /** Focus the given day. */
    setFocused: (day: CalendarDay | undefined) => void;
    /** Blur the focused day. */
    blur: () => void;
    /** Move the current focus to the next day according to the given direction. */
    moveFocus: (moveBy: MoveFocusBy, moveDir: MoveFocusDir) => void;
};
/**
 * Manages focus behavior for the DayPicker component, including setting,
 * moving, and blurring focus on calendar days.
 *
 * @template T - The type of DayPicker props.
 * @param props - The DayPicker props.
 * @param calendar - The calendar object containing the displayed days and
 *   months.
 * @param getModifiers - A function to retrieve modifiers for a given day.
 * @param isSelected - A function to check if a date is selected.
 * @param dateLib - The date utility library instance.
 * @returns An object containing focus-related methods and the currently focused
 *   day.
 */
export declare function useFocus<T extends DayPickerProps>(props: T, calendar: Calendar, getModifiers: (day: CalendarDay) => Modifiers, isSelected: (date: Date) => boolean, dateLib: DateLib): UseFocus;
