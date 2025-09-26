import type { CalendarDay } from "./classes/CalendarDay.js";
import type { CalendarMonth } from "./classes/CalendarMonth.js";
import type { DayPickerProps } from "./types/props.js";
import type { SelectedValue, SelectHandler } from "./types/selection.js";
import type { ClassNames, CustomComponents, Formatters, Labels, Mode, Modifiers, Styles } from "./types/shared.js";
/** @ignore */
export declare const dayPickerContext: import("react").Context<DayPickerContext<{
    mode?: Mode | undefined;
    required?: boolean | undefined;
}> | undefined>;
/**
 * Represents the context for the DayPicker component, providing various
 * properties and methods to interact with the calendar.
 *
 * @template T - The type of the DayPicker props, which must optionally include
 *   `mode` and `required` properties. This type can be used to refine the type
 *   returned by the hook.
 */
export type DayPickerContext<T extends {
    mode?: Mode | undefined;
    required?: boolean | undefined;
}> = {
    /** The months displayed in the calendar. */
    months: CalendarMonth[];
    /** The next month to display. */
    nextMonth: Date | undefined;
    /** The previous month to display. */
    previousMonth: Date | undefined;
    /** Navigate to the specified month. Will fire the `onMonthChange` callback. */
    goToMonth: (month: Date) => void;
    /** Returns the modifiers for the given day. */
    getModifiers: (day: CalendarDay) => Modifiers;
    /** The selected date(s). */
    selected: SelectedValue<T> | undefined;
    /** Set a selection. */
    select: SelectHandler<T> | undefined;
    /** Whether the given date is selected. */
    isSelected: ((date: Date) => boolean) | undefined;
    /** The components used internally by DayPicker. */
    components: CustomComponents;
    /** The class names for the UI elements. */
    classNames: ClassNames;
    /** The styles for the UI elements. */
    styles: Partial<Styles> | undefined;
    /** The labels used in the user interface. */
    labels: Labels;
    /** The formatters used to format the UI elements. */
    formatters: Formatters;
    /**
     * The props as passed to the DayPicker component.
     *
     * @since 9.3.0
     */
    dayPickerProps: DayPickerProps;
};
/**
 * Provides access to the DayPicker context, which includes properties and
 * methods to interact with the DayPicker component. This hook must be used
 * within a custom component.
 *
 * @template T - Use this type to refine the returned context type with a
 *   specific selection mode.
 * @returns The context to work with DayPicker.
 * @throws {Error} If the hook is used outside of a DayPicker provider.
 * @group Hooks
 * @see https://daypicker.dev/guides/custom-components
 */
export declare function useDayPicker<T extends {
    mode?: Mode | undefined;
    required?: boolean | undefined;
}>(): DayPickerContext<T>;
