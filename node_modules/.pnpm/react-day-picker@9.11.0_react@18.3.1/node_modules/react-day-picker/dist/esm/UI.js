/**
 * Enum representing the UI elements composing DayPicker. These elements are
 * mapped to {@link CustomComponents}, {@link ClassNames}, and {@link Styles}.
 *
 * Some elements are extended by flags and modifiers.
 */
export var UI;
(function (UI) {
    /** The root component displaying the months and the navigation bar. */
    UI["Root"] = "root";
    /** The Chevron SVG element used by navigation buttons and dropdowns. */
    UI["Chevron"] = "chevron";
    /**
     * The grid cell with the day's date. Extended by {@link DayFlag} and
     * {@link SelectionState}.
     */
    UI["Day"] = "day";
    /** The button containing the formatted day's date, inside the grid cell. */
    UI["DayButton"] = "day_button";
    /** The caption label of the month (when not showing the dropdown navigation). */
    UI["CaptionLabel"] = "caption_label";
    /** The container of the dropdown navigation (when enabled). */
    UI["Dropdowns"] = "dropdowns";
    /** The dropdown element to select for years and months. */
    UI["Dropdown"] = "dropdown";
    /** The container element of the dropdown. */
    UI["DropdownRoot"] = "dropdown_root";
    /** The root element of the footer. */
    UI["Footer"] = "footer";
    /** The month grid. */
    UI["MonthGrid"] = "month_grid";
    /** Contains the dropdown navigation or the caption label. */
    UI["MonthCaption"] = "month_caption";
    /** The dropdown with the months. */
    UI["MonthsDropdown"] = "months_dropdown";
    /** Wrapper of the month grid. */
    UI["Month"] = "month";
    /** The container of the displayed months. */
    UI["Months"] = "months";
    /** The navigation bar with the previous and next buttons. */
    UI["Nav"] = "nav";
    /**
     * The next month button in the navigation. *
     *
     * @since 9.1.0
     */
    UI["NextMonthButton"] = "button_next";
    /**
     * The previous month button in the navigation.
     *
     * @since 9.1.0
     */
    UI["PreviousMonthButton"] = "button_previous";
    /** The row containing the week. */
    UI["Week"] = "week";
    /** The group of row weeks in a month (`tbody`). */
    UI["Weeks"] = "weeks";
    /** The column header with the weekday. */
    UI["Weekday"] = "weekday";
    /** The row grouping the weekdays in the column headers. */
    UI["Weekdays"] = "weekdays";
    /** The cell containing the week number. */
    UI["WeekNumber"] = "week_number";
    /** The cell header of the week numbers column. */
    UI["WeekNumberHeader"] = "week_number_header";
    /** The dropdown with the years. */
    UI["YearsDropdown"] = "years_dropdown";
})(UI || (UI = {}));
/** Enum representing flags for the {@link UI.Day} element. */
export var DayFlag;
(function (DayFlag) {
    /** The day is disabled. */
    DayFlag["disabled"] = "disabled";
    /** The day is hidden. */
    DayFlag["hidden"] = "hidden";
    /** The day is outside the current month. */
    DayFlag["outside"] = "outside";
    /** The day is focused. */
    DayFlag["focused"] = "focused";
    /** The day is today. */
    DayFlag["today"] = "today";
})(DayFlag || (DayFlag = {}));
/**
 * Enum representing selection states that can be applied to the {@link UI.Day}
 * element in selection mode.
 */
export var SelectionState;
(function (SelectionState) {
    /** The day is at the end of a selected range. */
    SelectionState["range_end"] = "range_end";
    /** The day is at the middle of a selected range. */
    SelectionState["range_middle"] = "range_middle";
    /** The day is at the start of a selected range. */
    SelectionState["range_start"] = "range_start";
    /** The day is selected. */
    SelectionState["selected"] = "selected";
})(SelectionState || (SelectionState = {}));
/**
 * Enum representing different animation states for transitioning between
 * months.
 */
export var Animation;
(function (Animation) {
    /** The entering weeks when they appear before the exiting month. */
    Animation["weeks_before_enter"] = "weeks_before_enter";
    /** The exiting weeks when they disappear before the entering month. */
    Animation["weeks_before_exit"] = "weeks_before_exit";
    /** The entering weeks when they appear after the exiting month. */
    Animation["weeks_after_enter"] = "weeks_after_enter";
    /** The exiting weeks when they disappear after the entering month. */
    Animation["weeks_after_exit"] = "weeks_after_exit";
    /** The entering caption when it appears after the exiting month. */
    Animation["caption_after_enter"] = "caption_after_enter";
    /** The exiting caption when it disappears after the entering month. */
    Animation["caption_after_exit"] = "caption_after_exit";
    /** The entering caption when it appears before the exiting month. */
    Animation["caption_before_enter"] = "caption_before_enter";
    /** The exiting caption when it disappears before the entering month. */
    Animation["caption_before_exit"] = "caption_before_exit";
})(Animation || (Animation = {}));
