import type { CSSProperties } from "react";
/**
 * Enum representing the UI elements composing DayPicker. These elements are
 * mapped to {@link CustomComponents}, {@link ClassNames}, and {@link Styles}.
 *
 * Some elements are extended by flags and modifiers.
 */
export declare enum UI {
    /** The root component displaying the months and the navigation bar. */
    Root = "root",
    /** The Chevron SVG element used by navigation buttons and dropdowns. */
    Chevron = "chevron",
    /**
     * The grid cell with the day's date. Extended by {@link DayFlag} and
     * {@link SelectionState}.
     */
    Day = "day",
    /** The button containing the formatted day's date, inside the grid cell. */
    DayButton = "day_button",
    /** The caption label of the month (when not showing the dropdown navigation). */
    CaptionLabel = "caption_label",
    /** The container of the dropdown navigation (when enabled). */
    Dropdowns = "dropdowns",
    /** The dropdown element to select for years and months. */
    Dropdown = "dropdown",
    /** The container element of the dropdown. */
    DropdownRoot = "dropdown_root",
    /** The root element of the footer. */
    Footer = "footer",
    /** The month grid. */
    MonthGrid = "month_grid",
    /** Contains the dropdown navigation or the caption label. */
    MonthCaption = "month_caption",
    /** The dropdown with the months. */
    MonthsDropdown = "months_dropdown",
    /** Wrapper of the month grid. */
    Month = "month",
    /** The container of the displayed months. */
    Months = "months",
    /** The navigation bar with the previous and next buttons. */
    Nav = "nav",
    /**
     * The next month button in the navigation. *
     *
     * @since 9.1.0
     */
    NextMonthButton = "button_next",
    /**
     * The previous month button in the navigation.
     *
     * @since 9.1.0
     */
    PreviousMonthButton = "button_previous",
    /** The row containing the week. */
    Week = "week",
    /** The group of row weeks in a month (`tbody`). */
    Weeks = "weeks",
    /** The column header with the weekday. */
    Weekday = "weekday",
    /** The row grouping the weekdays in the column headers. */
    Weekdays = "weekdays",
    /** The cell containing the week number. */
    WeekNumber = "week_number",
    /** The cell header of the week numbers column. */
    WeekNumberHeader = "week_number_header",
    /** The dropdown with the years. */
    YearsDropdown = "years_dropdown"
}
/** Enum representing flags for the {@link UI.Day} element. */
export declare enum DayFlag {
    /** The day is disabled. */
    disabled = "disabled",
    /** The day is hidden. */
    hidden = "hidden",
    /** The day is outside the current month. */
    outside = "outside",
    /** The day is focused. */
    focused = "focused",
    /** The day is today. */
    today = "today"
}
/**
 * Enum representing selection states that can be applied to the {@link UI.Day}
 * element in selection mode.
 */
export declare enum SelectionState {
    /** The day is at the end of a selected range. */
    range_end = "range_end",
    /** The day is at the middle of a selected range. */
    range_middle = "range_middle",
    /** The day is at the start of a selected range. */
    range_start = "range_start",
    /** The day is selected. */
    selected = "selected"
}
/**
 * Enum representing different animation states for transitioning between
 * months.
 */
export declare enum Animation {
    /** The entering weeks when they appear before the exiting month. */
    weeks_before_enter = "weeks_before_enter",
    /** The exiting weeks when they disappear before the entering month. */
    weeks_before_exit = "weeks_before_exit",
    /** The entering weeks when they appear after the exiting month. */
    weeks_after_enter = "weeks_after_enter",
    /** The exiting weeks when they disappear after the entering month. */
    weeks_after_exit = "weeks_after_exit",
    /** The entering caption when it appears after the exiting month. */
    caption_after_enter = "caption_after_enter",
    /** The exiting caption when it disappears after the entering month. */
    caption_after_exit = "caption_after_exit",
    /** The entering caption when it appears before the exiting month. */
    caption_before_enter = "caption_before_enter",
    /** The exiting caption when it disappears before the entering month. */
    caption_before_exit = "caption_before_exit"
}
/**
 * Deprecated UI elements and flags from previous versions of DayPicker.
 *
 * These elements are kept for backward compatibility and to assist in
 * transitioning to the new {@link UI} elements.
 *
 * @deprecated
 * @since 9.0.1
 * @template T - The type of the deprecated UI element (e.g., CSS class or
 *   style).
 * @see https://daypicker.dev/upgrading
 * @see https://daypicker.dev/docs/styling
 */
export type DeprecatedUI<T extends CSSProperties | string> = {
    /**
     * This element was applied to the style of any button in DayPicker and it is
     * replaced by {@link UI.PreviousMonthButton} and {@link UI.NextMonthButton}.
     *
     * @deprecated
     */
    button: T;
    /**
     * This element was resetting the style of any button in DayPicker and it is
     * replaced by {@link UI.PreviousMonthButton} and {@link UI.NextMonthButton}.
     *
     * @deprecated
     */
    button_reset: T;
    /**
     * This element has been renamed to {@link UI.MonthCaption}.
     *
     * @deprecated
     */
    caption: T;
    /**
     * This element has been removed. Captions are styled via
     * {@link UI.MonthCaption}.
     *
     * @deprecated
     */
    caption_between: T;
    /**
     * This element has been renamed to {@link UI.Dropdowns}.
     *
     * @deprecated
     */
    caption_dropdowns: T;
    /**
     * This element has been removed. Captions are styled via
     * {@link UI.MonthCaption}.
     *
     * @deprecated
     */
    caption_end: T;
    /**
     * This element has been removed.
     *
     * @deprecated
     */
    caption_start: T;
    /**
     * This element has been renamed to {@link UI.Day}.
     *
     * @deprecated
     */
    cell: T;
    /**
     * This element has been renamed to {@link DayFlag.disabled}.
     *
     * @deprecated
     */
    day_disabled: T;
    /**
     * This element has been renamed to {@link DayFlag.hidden}.
     *
     * @deprecated
     */
    day_hidden: T;
    /**
     * This element has been renamed to {@link DayFlag.outside}.
     *
     * @deprecated
     */
    day_outside: T;
    /**
     * This element has been renamed to {@link SelectionState.range_end}.
     *
     * @deprecated
     */
    day_range_end: T;
    /**
     * This element has been renamed to {@link SelectionState.range_middle}.
     *
     * @deprecated
     */
    day_range_middle: T;
    /**
     * This element has been renamed to {@link SelectionState.range_start}.
     *
     * @deprecated
     */
    day_range_start: T;
    /**
     * This element has been renamed to {@link SelectionState.selected}.
     *
     * @deprecated
     */
    day_selected: T;
    /**
     * This element has been renamed to {@link DayFlag.today}.
     *
     * @deprecated
     */
    day_today: T;
    /**
     * This element has been removed. The dropdown icon is now {@link UI.Chevron}
     * inside a {@link UI.CaptionLabel}.
     *
     * @deprecated
     */
    dropdown_icon: T;
    /**
     * This element has been renamed to {@link UI.MonthsDropdown}.
     *
     * @deprecated
     */
    dropdown_month: T;
    /**
     * This element has been renamed to {@link UI.YearsDropdown}.
     *
     * @deprecated
     */
    dropdown_year: T;
    /**
     * This element has been removed.
     *
     * @deprecated
     */
    head: T;
    /**
     * This element has been renamed to {@link UI.Weekday}.
     *
     * @deprecated
     */
    head_cell: T;
    /**
     * This element has been renamed to {@link UI.Weekdays}.
     *
     * @deprecated
     */
    head_row: T;
    /**
     * This flag has been removed. Use `data-multiple-months` in your CSS
     * selectors.
     *
     * @deprecated
     */
    multiple_months: T;
    /**
     * This element has been removed. To style the navigation buttons, use
     * {@link UI.PreviousMonthButton} and {@link UI.NextMonthButton}.
     *
     * @deprecated
     */
    nav_button: T;
    /**
     * This element has been renamed to {@link UI.NextMonthButton}.
     *
     * @deprecated
     */
    nav_button_next: T;
    /**
     * This element has been renamed to {@link UI.PreviousMonthButton}.
     *
     * @deprecated
     */
    nav_button_previous: T;
    /**
     * This element has been removed. The dropdown icon is now {@link UI.Chevron}
     * inside a {@link UI.NextMonthButton} or a {@link UI.PreviousMonthButton}.
     *
     * @deprecated
     */
    nav_icon: T;
    /**
     * This element has been renamed to {@link UI.Week}.
     *
     * @deprecated
     */
    row: T;
    /**
     * This element has been renamed to {@link UI.MonthGrid}.
     *
     * @deprecated
     */
    table: T;
    /**
     * This element has been renamed to {@link UI.Weeks}.
     *
     * @deprecated
     */
    tbody: T;
    /**
     * This element has been removed. The {@link UI.Footer} is now a single element
     * below the months.
     *
     * @deprecated
     */
    tfoot: T;
    /**
     * This flag has been removed. There are no "visually hidden" elements in
     * DayPicker 9.
     *
     * @deprecated
     */
    vhidden: T;
    /**
     * This element has been renamed. Use {@link UI.WeekNumber} instead.
     *
     * @deprecated
     */
    weeknumber: T;
    /**
     * This flag has been removed. Use `data-week-numbers` in your CSS.
     *
     * @deprecated
     */
    with_weeknumber: T;
};
