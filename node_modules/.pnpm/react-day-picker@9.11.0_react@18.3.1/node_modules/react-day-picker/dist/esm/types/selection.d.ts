import type { DayPickerProps } from "./props.js";
import type { DateRange, Mode, Modifiers } from "./shared.js";
export type Selection<T extends DayPickerProps> = {
    /** The selected date(s). */
    selected: SelectedValue<T> | undefined;
    /** Set a selection. */
    select: SelectHandler<T> | undefined;
    /** Whether the given date is selected. */
    isSelected: (date: Date) => boolean;
};
export type SelectedSingle<T extends {
    required?: boolean;
}> = T["required"] extends true ? Date : Date | undefined;
export type SelectedMulti<T extends {
    required?: boolean;
}> = T["required"] extends true ? Date[] : Date[] | undefined;
export type SelectedRange<T extends {
    required?: boolean;
}> = T["required"] extends true ? DateRange : DateRange | undefined;
/**
 * Represents the selected value based on the selection mode.
 *
 * @example
 *   // Single selection mode
 *   const selected: SelectedValue<{ mode: "single" }> = new Date();
 *
 *   // Multiple selection mode
 *   const selected: SelectedValue<{ mode: "multiple" }> = [
 *     new Date(),
 *     new Date(),
 *   ];
 *
 *   // Range selection mode
 *   const selected: SelectedValue<{ mode: "range" }> = {
 *     from: new Date(),
 *     to: new Date(),
 *   };
 */
export type SelectedValue<T> = T extends {
    mode: "single";
    required?: boolean;
} ? SelectedSingle<T> : T extends {
    mode: "multiple";
    required?: boolean;
} ? SelectedMulti<T> : T extends {
    mode: "range";
    required?: boolean;
} ? SelectedRange<T> : undefined;
export type SelectHandlerSingle<T extends {
    required?: boolean | undefined;
}> = (triggerDate: Date, modifiers: Modifiers, e: React.MouseEvent | React.KeyboardEvent) => T["required"] extends true ? Date : Date | undefined;
export type SelectHandlerMulti<T extends {
    required?: boolean | undefined;
}> = (triggerDate: Date, modifiers: Modifiers, e: React.MouseEvent | React.KeyboardEvent) => T["required"] extends true ? Date[] : Date[] | undefined;
export type SelectHandlerRange<T extends {
    required?: boolean | undefined;
}> = (triggerDate: Date, modifiers: Modifiers, e: React.MouseEvent | React.KeyboardEvent) => T["required"] extends true ? DateRange : DateRange | undefined;
/**
 * The handler to set a selection based on the mode.
 *
 * @example
 *   const handleSelect: SelectHandler<{ mode: "single" }> = (
 *     triggerDate,
 *     modifiers,
 *     e,
 *   ) => {
 *     console.log("Selected date:", triggerDate);
 *   };
 */
export type SelectHandler<T extends {
    mode?: Mode | undefined;
    required?: boolean | undefined;
}> = T extends {
    mode: "single";
} ? SelectHandlerSingle<T> : T extends {
    mode: "multiple";
} ? SelectHandlerMulti<T> : T extends {
    mode: "range";
} ? SelectHandlerRange<T> : undefined;
