import type { CSSProperties } from "react";
import type * as components from "../components/custom-components.js";
import type { formatCaption, formatDay, formatMonthCaption, formatMonthDropdown, formatWeekdayName, formatWeekNumber, formatWeekNumberHeader, formatYearCaption, formatYearDropdown } from "../formatters/index.js";
import type { labelDayButton, labelGrid, labelGridcell, labelMonthDropdown, labelNav, labelNext, labelPrevious, labelWeekday, labelWeekNumber, labelWeekNumberHeader, labelYearDropdown } from "../labels/index.js";
import type { Animation, DayFlag, SelectionState, UI } from "../UI.js";
/**
 * Selection modes supported by DayPicker.
 *
 * - `single`: Select a single day.
 * - `multiple`: Select multiple days.
 * - `range`: Select a range of days.
 *
 * @see https://daypicker.dev/docs/selection-modes
 */
export type Mode = "single" | "multiple" | "range";
/**
 * The components that can be customized using the `components` prop.
 *
 * @see https://daypicker.dev/guides/custom-components
 */
export type CustomComponents = {
    /**
     * Render any button element in DayPicker.
     *
     * @deprecated Use {@link CustomComponents.NextMonthButton} or
     *   {@link CustomComponents.PreviousMonthButton} instead.
     */
    Button: typeof components.Button;
    /** Render the chevron icon used in the navigation buttons and dropdowns. */
    Chevron: typeof components.Chevron;
    /** Render the caption label of the month grid. */
    CaptionLabel: typeof components.CaptionLabel;
    /** Render the day cell in the month grid. */
    Day: typeof components.Day;
    /** Render the button containing the day in the day cell. */
    DayButton: typeof components.DayButton;
    /** Render the dropdown element to select years and months. */
    Dropdown: typeof components.Dropdown;
    /** Render the container of the dropdowns. */
    DropdownNav: typeof components.DropdownNav;
    /** Render the footer element announced by screen readers. */
    Footer: typeof components.Footer;
    /** Render the container of the MonthGrid. */
    Month: typeof components.Month;
    /** Render the caption of the month grid. */
    MonthCaption: typeof components.MonthCaption;
    /** Render the grid of days in a month. */
    MonthGrid: typeof components.MonthGrid;
    /** Wrapper of the month grids. */
    Months: typeof components.Months;
    /** Render the navigation element with the next and previous buttons. */
    Nav: typeof components.Nav;
    /** Render the `<option>` HTML element in the dropdown. */
    Option: typeof components.Option;
    /** Render the previous month button element in the navigation. */
    PreviousMonthButton: typeof components.PreviousMonthButton;
    /** Render the next month button element in the navigation. */
    NextMonthButton: typeof components.NextMonthButton;
    /** Render the root element of the calendar. */
    Root: typeof components.Root;
    /** Render the select element in the dropdowns. */
    Select: typeof components.Select;
    /** Render the weeks section in the month grid. */
    Weeks: typeof components.Weeks;
    /** Render the week rows. */
    Week: typeof components.Week;
    /** Render the weekday name in the header. */
    Weekday: typeof components.Weekday;
    /** Render the row containing the week days. */
    Weekdays: typeof components.Weekdays;
    /** Render the cell with the number of the week. */
    WeekNumber: typeof components.WeekNumber;
    /** Render the header of the week number column. */
    WeekNumberHeader: typeof components.WeekNumberHeader;
    /** Render the dropdown for selecting months. */
    MonthsDropdown: typeof components.MonthsDropdown;
    /** Render the dropdown for selecting years. */
    YearsDropdown: typeof components.YearsDropdown;
};
/** Represents a map of formatters used to render localized content. */
export type Formatters = {
    /** Format the caption of a month grid. */
    formatCaption: typeof formatCaption;
    /** Format the day in the day cell. */
    formatDay: typeof formatDay;
    /** Format the label in the month dropdown. */
    formatMonthDropdown: typeof formatMonthDropdown;
    /**
     * @ignore
     * @deprecated Use {@link Formatters.formatCaption} instead.
     *
     *   **Note:** This formatter will be removed in version 10.0.0.
     */
    formatMonthCaption: typeof formatMonthCaption;
    /** Format the week number. */
    formatWeekNumber: typeof formatWeekNumber;
    /** Format the header of the week number column. */
    formatWeekNumberHeader: typeof formatWeekNumberHeader;
    /** Format the week day name in the header. */
    formatWeekdayName: typeof formatWeekdayName;
    /** Format the label in the year dropdown. */
    formatYearDropdown: typeof formatYearDropdown;
    /**
     * @ignore
     * @deprecated Use {@link Formatters.formatYearDropdown} instead.
     */
    formatYearCaption: typeof formatYearCaption;
};
/** A map of functions to translate ARIA labels for various elements. */
export type Labels = {
    /** The label for the navigation toolbar. */
    labelNav: typeof labelNav;
    /** The label for the month grid. */
    labelGrid: typeof labelGrid;
    /** The label for the gridcell, when the calendar is not interactive. */
    labelGridcell: typeof labelGridcell;
    /** The label for the month dropdown. */
    labelMonthDropdown: typeof labelMonthDropdown;
    /** The label for the year dropdown. */
    labelYearDropdown: typeof labelYearDropdown;
    /** The label for the "next month" button. */
    labelNext: typeof labelNext;
    /** The label for the "previous month" button. */
    labelPrevious: typeof labelPrevious;
    /** The label for the day button. */
    labelDayButton: typeof labelDayButton;
    /**
     * @ignore
     * @deprecated Use {@link labelDayButton} instead.
     */
    labelDay: typeof labelDayButton;
    /** The label for the weekday. */
    labelWeekday: typeof labelWeekday;
    /** The label for the week number. */
    labelWeekNumber: typeof labelWeekNumber;
    /** The label for the column of week numbers. */
    labelWeekNumberHeader: typeof labelWeekNumberHeader;
};
/**
 * A value or a function that matches specific days.
 *
 * @example
 *   // Match weekends and specific holidays
 *   const matcher: Matcher = [
 *     { dayOfWeek: [0, 6] }, // Weekends
 *     { from: new Date(2023, 11, 24), to: new Date(2023, 11, 26) }, // Christmas
 *   ];
 */
export type Matcher = boolean | ((date: Date) => boolean) | Date | Date[] | DateRange | DateBefore | DateAfter | DateInterval | DayOfWeek;
/**
 * Match a day falling after the specified date (exclusive).
 *
 * @example
 *   // Match days after February 2, 2019
 *   const matcher: DateAfter = { after: new Date(2019, 1, 2) };
 */
export type DateAfter = {
    after: Date;
};
/**
 * Match a day falling before the specified date (exclusive).
 *
 * @example
 *   // Match days before February 2, 2019
 *   const matcher: DateBefore = { before: new Date(2019, 1, 2) };
 */
export type DateBefore = {
    before: Date;
};
/**
 * An interval of dates. Unlike {@link DateRange}, the range ends are not
 * included.
 *
 * @example
 *   // Match days between February 2 and February 5, 2019
 *   const matcher: DateInterval = {
 *     after: new Date(2019, 1, 2),
 *     before: new Date(2019, 1, 5),
 *   };
 */
export type DateInterval = {
    before: Date;
    after: Date;
};
/**
 * A range of dates. Unlike {@link DateInterval}, the range ends are included.
 *
 * @example
 *   // Match days between February 2 and February 5, 2019
 *   const matcher: DateRange = {
 *     from: new Date(2019, 1, 2),
 *     to: new Date(2019, 1, 5),
 *   };
 */
export type DateRange = {
    from: Date | undefined;
    to?: Date | undefined;
};
/**
 * Match days of the week (`0-6`, where `0` is Sunday).
 *
 * @example
 *   // Match Sundays
 *   const matcher: DayOfWeek = { dayOfWeek: 0 };
 *   // Match weekends
 *   const matcher: DayOfWeek = { dayOfWeek: [0, 6] };
 */
export type DayOfWeek = {
    dayOfWeek: number | number[];
};
/**
 * The event handler triggered when clicking or interacting with a day.
 *
 * @template EventType - The event type that triggered the event (e.g.
 *   `React.MouseEvent`, `React.KeyboardEvent`, etc.).
 * @param date - The date that has triggered the event.
 * @param modifiers - The modifiers belonging to the date.
 * @param e - The DOM event that triggered the event.
 */
export type DayEventHandler<EventType> = (date: Date, modifiers: Modifiers, e: EventType) => void;
/**
 * The event handler when a month is changed in the calendar.
 *
 * ```tsx
 * <DayPicker onMonthChange={(month) => console.log(month)} />
 * ```
 *
 * @see https://daypicker.dev/docs/navigation
 */
export type MonthChangeEventHandler = (month: Date) => void;
/**
 * The CSS classnames to use for the {@link UI} elements, the
 * {@link SelectionState} and the {@link DayFlag}.
 *
 * @example
 *   const classNames: ClassNames = {
 *     [UI.Root]: "root",
 *     [UI.Outside]: "outside",
 *     [UI.Nav]: "nav",
 *     // etc.
 *   };
 */
export type ClassNames = {
    [key in UI | SelectionState | DayFlag | Animation]: string;
};
/**
 * The CSS styles to use for the {@link UI} elements, the {@link SelectionState}
 * and the {@link DayFlag}.
 */
export type Styles = {
    [key in UI | SelectionState | DayFlag]: CSSProperties | undefined;
};
/**
 * Represents the modifiers that match a specific day in the calendar.
 *
 * @example
 *   const modifiers: Modifiers = {
 *     today: true, // The day is today
 *     selected: false, // The day is not selected
 *     weekend: true, // Custom modifier for weekends
 *   };
 *
 * @see https://daypicker.dev/guides/custom-modifiers
 */
export type Modifiers = Record<string, boolean>;
/**
 * The style to apply to each day element matching a modifier.
 *
 * @example
 *   const modifiersStyles: ModifiersStyles = {
 *     today: { color: "red" },
 *     selected: { backgroundColor: "blue" },
 *     weekend: { color: "green" },
 *   };
 */
export type ModifiersStyles = Record<string, CSSProperties>;
/**
 * The classnames to assign to each day element matching a modifier.
 *
 * @example
 *   const modifiersClassNames: ModifiersClassNames = {
 *     today: "today", // Use the "today" class for the today's day
 *     selected: "highlight", // Use the "highlight" class for the selected day
 *     weekend: "weekend", // Use the "weekend" class for the weekend days
 *   };
 */
export type ModifiersClassNames = Record<string, string>;
/**
 * The props that have been deprecated since version 9.0.0.
 *
 * @private
 * @since 9.0.0
 * @see https://daypicker.dev/upgrading
 */
export type V9DeprecatedProps = 
/** Use `hidden` prop instead. */
"fromDate"
/** Use `hidden` prop instead. */
 | "toDate"
/** Use `startMonth` instead. */
 | "fromMonth"
/** Use `endMonth` instead. */
 | "toMonth"
/** Use `startMonth` instead. */
 | "fromYear"
/** Use `endMonth` instead. */
 | "toYear";
/** The direction to move the focus relative to the current focused date. */
export type MoveFocusDir = "after" | "before";
/** The temporal unit to move the focus by. */
export type MoveFocusBy = "day" | "week" | "startOfWeek" | "endOfWeek" | "month" | "year";
/**
 * The numbering system supported by DayPicker.
 *
 * - `latn`: Latin (Western Arabic)
 * - `arab`: Arabic-Indic
 * - `arabext`: Eastern Arabic-Indic (Persian)
 * - `deva`: Devanagari
 * - `beng`: Bengali
 * - `guru`: Gurmukhi
 * - `gujr`: Gujarati
 * - `orya`: Oriya
 * - `tamldec`: Tamil
 * - `telu`: Telugu
 * - `knda`: Kannada
 * - `mlym`: Malayalam
 * - `thai`: Thai
 * - `mymr`: Myanmar
 * - `khmr`: Khmer
 * - `laoo`: Lao
 * - `tibt`: Tibetan
 *
 * @see https://daypicker.dev/docs/translation#numeral-systems
 */
export type Numerals = "latn" | "arab" | "arabext" | "deva" | "geez" | "beng" | "guru" | "gujr" | "orya" | "tamldec" | "telu" | "knda" | "mlym" | "thai" | "mymr" | "khmr" | "laoo" | "tibt";
