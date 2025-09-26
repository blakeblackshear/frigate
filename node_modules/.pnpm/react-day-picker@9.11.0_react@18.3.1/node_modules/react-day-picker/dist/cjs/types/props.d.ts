import type React from "react";
import type { DateLib, Locale } from "../classes/DateLib.js";
import type { DeprecatedUI } from "../UI.js";
import type { ClassNames, CustomComponents, DateRange, DayEventHandler, Formatters, Labels, Matcher, Mode, Modifiers, ModifiersClassNames, ModifiersStyles, MonthChangeEventHandler, Numerals, Styles } from "./shared.js";
/**
 * The props for the `<DayPicker />` component.
 *
 * @group DayPicker
 */
export type DayPickerProps = PropsBase & (PropsSingle | PropsSingleRequired | PropsMulti | PropsMultiRequired | PropsRange | PropsRangeRequired | {
    mode?: undefined;
    required?: undefined;
});
/**
 * Props for customizing the calendar, handling localization, and managing
 * events. These exclude the selection mode props.
 *
 * @group DayPicker
 * @see https://daypicker.dev/api/interfaces/PropsBase
 */
export interface PropsBase {
    /**
     * Enable the selection of a single day, multiple days, or a range of days.
     *
     * @see https://daypicker.dev/docs/selection-modes
     */
    mode?: Mode | undefined;
    /**
     * Whether the selection is required.
     *
     * @see https://daypicker.dev/docs/selection-modes
     */
    required?: boolean | undefined;
    /** Class name to add to the root element. */
    className?: string;
    /**
     * Change the class names used by DayPicker.
     *
     * Use this prop when you need to change the default class names — for
     * example, when importing the style via CSS modules or when using a CSS
     * framework.
     *
     * @see https://daypicker.dev/docs/styling
     */
    classNames?: Partial<ClassNames> & Partial<DeprecatedUI<string>>;
    /**
     * Change the class name for the day matching the `modifiers`.
     *
     * @see https://daypicker.dev/guides/custom-modifiers
     */
    modifiersClassNames?: ModifiersClassNames;
    /** Style to apply to the root element. */
    style?: React.CSSProperties;
    /**
     * Change the inline styles of the HTML elements.
     *
     * @see https://daypicker.dev/docs/styling
     */
    styles?: Partial<Styles> & Partial<DeprecatedUI<React.CSSProperties>>;
    /**
     * Change the class name for the day matching the {@link modifiers}.
     *
     * @see https://daypicker.dev/guides/custom-modifiers
     */
    modifiersStyles?: ModifiersStyles;
    /** A unique id to add to the root element. */
    id?: string;
    /**
     * The initial month to show in the calendar.
     *
     * Use this prop to let DayPicker control the current month. If you need to
     * set the month programmatically, use {@link month} and {@link onMonthChange}.
     *
     * @defaultValue The current month
     * @see https://daypicker.dev/docs/navigation
     */
    defaultMonth?: Date;
    /**
     * The month displayed in the calendar.
     *
     * As opposed to `defaultMonth`, use this prop with `onMonthChange` to change
     * the month programmatically.
     *
     * @see https://daypicker.dev/docs/navigation
     */
    month?: Date;
    /**
     * The number of displayed months.
     *
     * @defaultValue 1
     * @see https://daypicker.dev/docs/customization#multiplemonths
     */
    numberOfMonths?: number;
    /**
     * The earliest month to start the month navigation.
     *
     * @since 9.0.0
     * @see https://daypicker.dev/docs/navigation#start-and-end-dates
     */
    startMonth?: Date | undefined;
    /**
     * @private
     * @deprecated This prop has been removed. Use `hidden={{ before: date }}`
     *   instead.
     * @see https://daypicker.dev/docs/navigation#start-and-end-dates
     */
    fromDate?: Date | undefined;
    /**
     * @private
     * @deprecated This prop has been renamed to `startMonth`.
     * @see https://daypicker.dev/docs/navigation#start-and-end-dates
     */
    fromMonth?: Date | undefined;
    /**
     * @private
     * @deprecated Use `startMonth` instead. E.g. `startMonth={new Date(year,
     *   0)}`.
     * @see https://daypicker.dev/docs/navigation#start-and-end-dates
     */
    fromYear?: number | undefined;
    /**
     * The latest month to end the month navigation.
     *
     * @since 9.0.0
     * @see https://daypicker.dev/docs/navigation#start-and-end-dates
     */
    endMonth?: Date;
    /**
     * @private
     * @deprecated This prop has been removed. Use `hidden={{ after: date }}`
     *   instead.
     * @see https://daypicker.dev/docs/navigation#start-and-end-dates
     */
    toDate?: Date;
    /**
     * @private
     * @deprecated This prop has been renamed to `endMonth`.
     * @see https://daypicker.dev/docs/navigation#start-and-end-dates
     */
    toMonth?: Date;
    /**
     * @private
     * @deprecated Use `endMonth` instead. E.g. `endMonth={new Date(year, 0)}`.
     * @see https://daypicker.dev/docs/navigation#start-and-end-dates
     */
    toYear?: number;
    /**
     * Paginate the month navigation displaying the `numberOfMonths` at a time.
     *
     * @see https://daypicker.dev/docs/customization#multiplemonths
     */
    pagedNavigation?: boolean;
    /**
     * Render the months in reversed order (when {@link numberOfMonths} is set) to
     * display the most recent month first.
     *
     * @see https://daypicker.dev/docs/customization#multiplemonths
     */
    reverseMonths?: boolean;
    /**
     * Hide the navigation buttons. This prop won't disable the navigation: to
     * disable the navigation, use {@link disableNavigation}.
     *
     * @since 9.0.0
     * @see https://daypicker.dev/docs/navigation#hidenavigation
     */
    hideNavigation?: boolean;
    /**
     * Disable the navigation between months. This prop won't hide the navigation:
     * to hide the navigation, use {@link hideNavigation}.
     *
     * @see https://daypicker.dev/docs/navigation#disablenavigation
     */
    disableNavigation?: boolean;
    /**
     * Show dropdowns to navigate between months or years.
     *
     * - `label`: Displays the month and year as a label. Default value.
     * - `dropdown`: Displays dropdowns for both month and year navigation.
     * - `dropdown-months`: Displays a dropdown only for the month navigation.
     * - `dropdown-years`: Displays a dropdown only for the year navigation.
     *
     * **Note:** By default, showing the dropdown will set the {@link startMonth}
     * to 100 years ago and {@link endMonth} to the end of the current year. You
     * can override this behavior by explicitly setting `startMonth` and
     * `endMonth`.
     *
     * @see https://daypicker.dev/docs/customization#caption-layouts
     */
    captionLayout?: "label" | "dropdown" | "dropdown-months" | "dropdown-years";
    /**
     * Reverse the order of years in the dropdown when using
     * `captionLayout="dropdown"` or `captionLayout="dropdown-years"`.
     *
     * @since 9.9.0
     * @see https://daypicker.dev/docs/customization#caption-layouts
     */
    reverseYears?: boolean;
    /**
     * Adjust the positioning of the navigation buttons.
     *
     * - `around`: Displays the buttons on either side of the caption.
     * - `after`: Displays the buttons after the caption. This ensures the tab order
     *   matches the visual order.
     *
     * If not set, the buttons default to being displayed after the caption, but
     * the tab order may not align with the visual order.
     *
     * @since 9.7.0
     * @see https://daypicker.dev/docs/customization#navigation-layouts
     */
    navLayout?: "around" | "after" | undefined;
    /**
     * Display always 6 weeks per each month, regardless of the month’s number of
     * weeks. Weeks will be filled with the days from the next month.
     *
     * @see https://daypicker.dev/docs/customization#fixed-weeks
     */
    fixedWeeks?: boolean;
    /**
     * Hide the row displaying the weekday row header.
     *
     * @since 9.0.0
     */
    hideWeekdays?: boolean;
    /**
     * Show the outside days (days falling in the next or the previous month).
     *
     * **Note:** when a {@link broadcastCalendar} is set, this prop defaults to
     * true.
     *
     * @see https://daypicker.dev/docs/customization#outside-days
     */
    showOutsideDays?: boolean;
    /**
     * Show the week numbers column. Weeks are numbered according to the local
     * week index.
     *
     * @see https://daypicker.dev/docs/customization#showweeknumber
     */
    showWeekNumber?: boolean;
    /**
     * Animate navigating between months.
     *
     * @since 9.6.0
     * @see https://daypicker.dev/docs/navigation#animate
     */
    animate?: boolean;
    /**
     * Display the weeks in the month following the broadcast calendar. Setting
     * this prop will ignore {@link weekStartsOn} (always Monday) and
     * {@link showOutsideDays} will default to true.
     *
     * @since 9.4.0
     * @see https://daypicker.dev/docs/localization#broadcast-calendar
     * @see https://en.wikipedia.org/wiki/Broadcast_calendar
     */
    broadcastCalendar?: boolean;
    /**
     * Use ISO week dates instead of the locale setting. Setting this prop will
     * ignore `weekStartsOn` and `firstWeekContainsDate`.
     *
     * @see https://daypicker.dev/docs/localization#iso-week-dates
     * @see https://en.wikipedia.org/wiki/ISO_week_date
     */
    ISOWeek?: boolean;
    /**
     * The time zone (IANA or UTC offset) to use in the calendar (experimental).
     *
     * See
     * [Wikipedia](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
     * for the possible values.
     *
     * @since 9.1.1
     * @see https://daypicker.dev/docs/time-zone
     */
    timeZone?: string | undefined;
    /**
     * Change the components used for rendering the calendar elements.
     *
     * @see https://daypicker.dev/guides/custom-components
     */
    components?: Partial<CustomComponents>;
    /**
     * Add a footer to the calendar, acting as a live region.
     *
     * Use this prop to communicate the calendar's status to screen readers.
     * Prefer strings over complex UI elements.
     *
     * @see https://daypicker.dev/guides/accessibility#footer
     */
    footer?: React.ReactNode | string;
    /**
     * When a selection mode is set, DayPicker will focus the first selected day
     * (if set) or today's date (if not disabled).
     *
     * Use this prop when you need to focus DayPicker after a user action, for
     * improved accessibility.
     *
     * @see https://daypicker.dev/guides/accessibility#autofocus
     */
    autoFocus?: boolean;
    /**
     * @private
     * @deprecated This prop will be removed. Use {@link autoFocus} instead.
     */
    initialFocus?: boolean;
    /**
     * Apply the `disabled` modifier to the matching days. Disabled days cannot be
     * selected when in a selection mode is set.
     *
     * @see https://daypicker.dev/docs/selection-modes#disabled
     */
    disabled?: Matcher | Matcher[] | undefined;
    /**
     * Apply the `hidden` modifier to the matching days. Will hide them from the
     * calendar.
     *
     * @see https://daypicker.dev/guides/custom-modifiers#hidden-modifier
     */
    hidden?: Matcher | Matcher[] | undefined;
    /**
     * The today’s date. Default is the current date. This date will get the
     * `today` modifier to style the day.
     *
     * @see https://daypicker.dev/guides/custom-modifiers#today-modifier
     */
    today?: Date;
    /**
     * Add modifiers to the matching days.
     *
     * @example
     *   const modifiers = {
     *   weekend: { dayOfWeek: [0, 6] }, // Match weekends
     *   holiday: [new Date(2023, 11, 25)] // Match Christmas
     *   };
     *   <DayPicker modifiers={modifiers} />
     *
     * @see https://daypicker.dev/guides/custom-modifiers
     */
    modifiers?: Record<string, Matcher | Matcher[] | undefined> | undefined;
    /**
     * Labels creators to override the defaults. Use this prop to customize the
     * aria-label attributes in DayPicker.
     *
     * @see https://daypicker.dev/docs/translation#aria-labels
     */
    labels?: Partial<Labels>;
    /**
     * Formatters used to format dates to strings. Use this prop to override the
     * default functions.
     *
     * @see https://daypicker.dev/docs/translation#custom-formatters
     */
    formatters?: Partial<Formatters>;
    /**
     * The text direction of the calendar. Use `ltr` for left-to-right (default)
     * or `rtl` for right-to-left.
     *
     * @see https://daypicker.dev/docs/translation#rtl-text-direction
     */
    dir?: HTMLDivElement["dir"];
    /**
     * The aria-label attribute to add to the container element.
     *
     * @since 9.4.1
     * @see https://daypicker.dev/guides/accessibility
     */
    "aria-label"?: string;
    /**
     * The aria-labelledby attribute to add to the container element.
     *
     * @since 9.11.0
     * @see https://daypicker.dev/guides/accessibility
     */
    "aria-labelledby"?: string;
    /**
     * The role attribute to add to the container element.
     *
     * @since 9.4.1
     * @see https://daypicker.dev/guides/accessibility
     */
    role?: "application" | "dialog" | undefined;
    /**
     * A cryptographic nonce ("number used once") which can be used by Content
     * Security Policy for the inline `style` attributes.
     */
    nonce?: HTMLDivElement["nonce"];
    /** Add a `title` attribute to the container element. */
    title?: HTMLDivElement["title"];
    /** Add the language tag to the container element. */
    lang?: HTMLDivElement["lang"];
    /**
     * The locale object used to localize dates. Pass a locale from
     * `react-day-picker/locale` to localize the calendar.
     *
     * @example
     *   import { es } from "react-day-picker/locale";
     *   <DayPicker locale={es} />
     *
     * @defaultValue enUS - The English locale default of `date-fns`.
     * @see https://daypicker.dev/docs/localization
     * @see https://github.com/date-fns/date-fns/tree/main/src/locale for a list of the supported locales
     */
    locale?: Partial<Locale> | undefined;
    /**
     * The numeral system to use when formatting dates.
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
     *
     * @defaultValue `latn` Latin (Western Arabic)
     * @see https://daypicker.dev/docs/translation#numeral-systems
     */
    numerals?: Numerals | undefined;
    /**
     * The index of the first day of the week (0 - Sunday). Overrides the locale's
     * default.
     *
     * @see https://daypicker.dev/docs/localization#first-date-of-the-week
     */
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined;
    /**
     * The day of January that is always in the first week of the year.
     *
     * @see https://daypicker.dev/docs/localization#first-week-contains-date
     */
    firstWeekContainsDate?: 1 | 4;
    /**
     * Enable `DD` and `DDDD` for week year tokens when formatting or parsing
     * dates.
     *
     * @see https://date-fns.org/docs/Unicode-Tokens
     */
    useAdditionalWeekYearTokens?: boolean | undefined;
    /**
     * Enable `YY` and `YYYY` for day of year tokens when formatting or parsing
     * dates.
     *
     * @see https://date-fns.org/docs/Unicode-Tokens
     */
    useAdditionalDayOfYearTokens?: boolean | undefined;
    /**
     * Event fired when the user navigates between months.
     *
     * @see https://daypicker.dev/docs/navigation#onmonthchange
     */
    onMonthChange?: MonthChangeEventHandler;
    /**
     * Event handler when the next month button is clicked.
     *
     * @see https://daypicker.dev/docs/navigation
     */
    onNextClick?: MonthChangeEventHandler;
    /**
     * Event handler when the previous month button is clicked.
     *
     * @see https://daypicker.dev/docs/navigation
     */
    onPrevClick?: MonthChangeEventHandler;
    /**
     * Event handler when a week number is clicked.
     *
     * @private
     * @deprecated Use a custom `WeekNumber` component instead.
     * @see https://daypicker.dev/docs/customization#showweeknumber
     */
    onWeekNumberClick?: any;
    /** Event handler when a day is clicked. */
    onDayClick?: DayEventHandler<React.MouseEvent>;
    /** Event handler when a day is focused. */
    onDayFocus?: DayEventHandler<React.FocusEvent>;
    /** Event handler when a day is blurred. */
    onDayBlur?: DayEventHandler<React.FocusEvent>;
    /** Event handler when a key is pressed on a day. */
    onDayKeyDown?: DayEventHandler<React.KeyboardEvent>;
    /** Event handler when the mouse enters a day. */
    onDayMouseEnter?: DayEventHandler<React.MouseEvent>;
    /** Event handler when the mouse leaves a day. */
    onDayMouseLeave?: DayEventHandler<React.MouseEvent>;
    /**
     * Replace the default date library with a custom one. Experimental: not
     * guaranteed to be stable (may not respect semver).
     *
     * @since 9.0.0
     * @experimental
     */
    dateLib?: Partial<typeof DateLib.prototype> | undefined;
    /**
     * @private
     * @deprecated Use a custom `DayButton` component instead.
     */
    onDayKeyUp?: DayEventHandler<React.KeyboardEvent>;
    /**
     * @private
     * @deprecated Use a custom `DayButton` component instead.
     */
    onDayKeyPress?: DayEventHandler<React.KeyboardEvent>;
    /**
     * @private
     * @deprecated Use a custom `DayButton` component instead.
     */
    onDayPointerEnter?: DayEventHandler<React.PointerEvent>;
    /**
     * @private
     * @deprecated Use a custom `DayButton` component instead.
     */
    onDayPointerLeave?: DayEventHandler<React.PointerEvent>;
    /**
     * @private
     * @deprecated Use a custom `DayButton` component instead.
     */
    onDayTouchCancel?: DayEventHandler<React.TouchEvent>;
    /**
     * @private
     * @deprecated Use a custom `DayButton` component instead.
     */
    onDayTouchEnd?: DayEventHandler<React.TouchEvent>;
    /**
     * @private
     * @deprecated Use a custom `DayButton` component instead.
     */
    onDayTouchMove?: DayEventHandler<React.TouchEvent>;
    /**
     * @private
     * @deprecated Use a custom `DayButton` component instead.
     */
    onDayTouchStart?: DayEventHandler<React.TouchEvent>;
}
/**
 * Shared handler type for `onSelect` callback when a selection mode is set.
 *
 * @example
 *   const handleSelect: OnSelectHandler<Date> = (
 *     selected,
 *     triggerDate,
 *     modifiers,
 *     e,
 *   ) => {
 *     console.log("Selected:", selected);
 *     console.log("Triggered by:", triggerDate);
 *   };
 *
 * @template T - The type of the selected item.
 * @callback OnSelectHandler
 * @param {T} selected - The selected item after the event.
 * @param {Date} triggerDate - The date when the event was triggered. This is
 *   typically the day clicked or interacted with.
 * @param {Modifiers} modifiers - The modifiers associated with the event.
 * @param {React.MouseEvent | React.KeyboardEvent} e - The event object.
 */
export type OnSelectHandler<T> = (selected: T, triggerDate: Date, modifiers: Modifiers, e: React.MouseEvent | React.KeyboardEvent) => void;
/**
 * The props when the single selection is required.
 *
 * @group DayPicker
 * @see https://daypicker.dev/docs/selection-modes#single-mode
 */
export interface PropsSingleRequired {
    mode: "single";
    required: true;
    /** The selected date. */
    selected: Date | undefined;
    /** Event handler when a day is selected. */
    onSelect?: OnSelectHandler<Date>;
}
/**
 * The props when the single selection is optional.
 *
 * @group DayPicker
 * @see https://daypicker.dev/docs/selection-modes#single-mode
 */
export interface PropsSingle {
    mode: "single";
    required?: false | undefined;
    /** The selected date. */
    selected?: Date | undefined;
    /** Event handler when a day is selected. */
    onSelect?: OnSelectHandler<Date | undefined>;
}
/**
 * The props when the multiple selection is required.
 *
 * @group DayPicker
 * @see https://daypicker.dev/docs/selection-modes#multiple-mode
 */
export interface PropsMultiRequired {
    mode: "multiple";
    required: true;
    /** The selected dates. */
    selected: Date[] | undefined;
    /** Event handler when days are selected. */
    onSelect?: OnSelectHandler<Date[]>;
    /** The minimum number of selectable days. */
    min?: number;
    /** The maximum number of selectable days. */
    max?: number;
}
/**
 * The props when the multiple selection is optional.
 *
 * @group DayPicker
 * @see https://daypicker.dev/docs/selection-modes#multiple-mode
 */
export interface PropsMulti {
    mode: "multiple";
    required?: false | undefined;
    /** The selected dates. */
    selected?: Date[] | undefined;
    /** Event handler when days are selected. */
    onSelect?: OnSelectHandler<Date[] | undefined>;
    /** The minimum number of selectable days. */
    min?: number;
    /** The maximum number of selectable days. */
    max?: number;
}
/**
 * The props when the range selection is required.
 *
 * @group DayPicker
 * @see https://daypicker.dev/docs/selection-modes#range-mode
 */
export interface PropsRangeRequired {
    mode: "range";
    required: true;
    /**
     * Apply the `disabled` modifier to the matching days. Disabled days cannot be
     * selected when in a selection mode is set.
     *
     * @see https://daypicker.dev/docs/selection-modes#disabled
     */
    disabled?: Matcher | Matcher[] | undefined;
    /**
     * When `true`, the range will reset when including a disabled day.
     *
     * @since V9.0.2
     */
    excludeDisabled?: boolean | undefined;
    /** The selected range. */
    selected: DateRange | undefined;
    /** Event handler when a range is selected. */
    onSelect?: OnSelectHandler<DateRange>;
    /** The minimum number of days to include in the range. */
    min?: number;
    /** The maximum number of days to include in the range. */
    max?: number;
}
/**
 * The props when the range selection is optional.
 *
 * @group DayPicker
 * @see https://daypicker.dev/docs/selection-modes#range-mode
 */
export interface PropsRange {
    mode: "range";
    required?: false | undefined;
    /**
     * Apply the `disabled` modifier to the matching days. Disabled days cannot be
     * selected when in a selection mode is set.
     *
     * @see https://daypicker.dev/docs/selection-modes#disabled
     */
    disabled?: Matcher | Matcher[] | undefined;
    /**
     * When `true`, the range will reset when including a disabled day.
     *
     * @since V9.0.2
     * @see https://daypicker.dev/docs/selection-modes#exclude-disabled
     */
    excludeDisabled?: boolean | undefined;
    /** The selected range. */
    selected?: DateRange | undefined;
    /** Event handler when the selection changes. */
    onSelect?: OnSelectHandler<DateRange | undefined>;
    /** The minimum number of days to include in the range. */
    min?: number;
    /** The maximum number of days to include in the range. */
    max?: number;
}
