import { TZDate } from "@date-fns/tz";
import React, { useCallback, useMemo, useRef } from "react";
import { DateLib, defaultLocale } from "./classes/DateLib.js";
import { createGetModifiers } from "./helpers/createGetModifiers.js";
import { getClassNamesForModifiers } from "./helpers/getClassNamesForModifiers.js";
import { getComponents } from "./helpers/getComponents.js";
import { getDataAttributes } from "./helpers/getDataAttributes.js";
import { getDefaultClassNames } from "./helpers/getDefaultClassNames.js";
import { getFormatters } from "./helpers/getFormatters.js";
import { getMonthOptions } from "./helpers/getMonthOptions.js";
import { getStyleForModifiers } from "./helpers/getStyleForModifiers.js";
import { getWeekdays } from "./helpers/getWeekdays.js";
import { getYearOptions } from "./helpers/getYearOptions.js";
import * as defaultLabels from "./labels/index.js";
import { DayFlag, SelectionState, UI } from "./UI.js";
import { useAnimation } from "./useAnimation.js";
import { useCalendar } from "./useCalendar.js";
import { dayPickerContext } from "./useDayPicker.js";
import { useFocus } from "./useFocus.js";
import { useSelection } from "./useSelection.js";
import { rangeIncludesDate } from "./utils/rangeIncludesDate.js";
import { isDateRange } from "./utils/typeguards.js";
/**
 * Renders the DayPicker calendar component.
 *
 * @param initialProps - The props for the DayPicker component.
 * @returns The rendered DayPicker component.
 * @group DayPicker
 * @see https://daypicker.dev
 */
export function DayPicker(initialProps) {
    let props = initialProps;
    if (props.timeZone) {
        props = {
            ...initialProps,
        };
        if (props.today) {
            props.today = new TZDate(props.today, props.timeZone);
        }
        if (props.month) {
            props.month = new TZDate(props.month, props.timeZone);
        }
        if (props.defaultMonth) {
            props.defaultMonth = new TZDate(props.defaultMonth, props.timeZone);
        }
        if (props.startMonth) {
            props.startMonth = new TZDate(props.startMonth, props.timeZone);
        }
        if (props.endMonth) {
            props.endMonth = new TZDate(props.endMonth, props.timeZone);
        }
        if (props.mode === "single" && props.selected) {
            props.selected = new TZDate(props.selected, props.timeZone);
        }
        else if (props.mode === "multiple" && props.selected) {
            props.selected = props.selected?.map((date) => new TZDate(date, props.timeZone));
        }
        else if (props.mode === "range" && props.selected) {
            props.selected = {
                from: props.selected.from
                    ? new TZDate(props.selected.from, props.timeZone)
                    : undefined,
                to: props.selected.to
                    ? new TZDate(props.selected.to, props.timeZone)
                    : undefined,
            };
        }
    }
    const { components, formatters, labels, dateLib, locale, classNames } = useMemo(() => {
        const locale = { ...defaultLocale, ...props.locale };
        const dateLib = new DateLib({
            locale,
            weekStartsOn: props.broadcastCalendar ? 1 : props.weekStartsOn,
            firstWeekContainsDate: props.firstWeekContainsDate,
            useAdditionalWeekYearTokens: props.useAdditionalWeekYearTokens,
            useAdditionalDayOfYearTokens: props.useAdditionalDayOfYearTokens,
            timeZone: props.timeZone,
            numerals: props.numerals,
        }, props.dateLib);
        return {
            dateLib,
            components: getComponents(props.components),
            formatters: getFormatters(props.formatters),
            labels: { ...defaultLabels, ...props.labels },
            locale,
            classNames: { ...getDefaultClassNames(), ...props.classNames },
        };
    }, [
        props.locale,
        props.broadcastCalendar,
        props.weekStartsOn,
        props.firstWeekContainsDate,
        props.useAdditionalWeekYearTokens,
        props.useAdditionalDayOfYearTokens,
        props.timeZone,
        props.numerals,
        props.dateLib,
        props.components,
        props.formatters,
        props.labels,
        props.classNames,
    ]);
    const { captionLayout, mode, navLayout, numberOfMonths = 1, onDayBlur, onDayClick, onDayFocus, onDayKeyDown, onDayMouseEnter, onDayMouseLeave, onNextClick, onPrevClick, showWeekNumber, styles, } = props;
    const { formatCaption, formatDay, formatMonthDropdown, formatWeekNumber, formatWeekNumberHeader, formatWeekdayName, formatYearDropdown, } = formatters;
    const calendar = useCalendar(props, dateLib);
    const { days, months, navStart, navEnd, previousMonth, nextMonth, goToMonth, } = calendar;
    const getModifiers = createGetModifiers(days, props, navStart, navEnd, dateLib);
    const { isSelected, select, selected: selectedValue, } = useSelection(props, dateLib) ?? {};
    const { blur, focused, isFocusTarget, moveFocus, setFocused } = useFocus(props, calendar, getModifiers, isSelected ?? (() => false), dateLib);
    const { labelDayButton, labelGridcell, labelGrid, labelMonthDropdown, labelNav, labelPrevious, labelNext, labelWeekday, labelWeekNumber, labelWeekNumberHeader, labelYearDropdown, } = labels;
    const weekdays = useMemo(() => getWeekdays(dateLib, props.ISOWeek), [dateLib, props.ISOWeek]);
    const isInteractive = mode !== undefined || onDayClick !== undefined;
    const handlePreviousClick = useCallback(() => {
        if (!previousMonth)
            return;
        goToMonth(previousMonth);
        onPrevClick?.(previousMonth);
    }, [previousMonth, goToMonth, onPrevClick]);
    const handleNextClick = useCallback(() => {
        if (!nextMonth)
            return;
        goToMonth(nextMonth);
        onNextClick?.(nextMonth);
    }, [goToMonth, nextMonth, onNextClick]);
    const handleDayClick = useCallback((day, m) => (e) => {
        e.preventDefault();
        e.stopPropagation();
        setFocused(day);
        select?.(day.date, m, e);
        onDayClick?.(day.date, m, e);
    }, [select, onDayClick, setFocused]);
    const handleDayFocus = useCallback((day, m) => (e) => {
        setFocused(day);
        onDayFocus?.(day.date, m, e);
    }, [onDayFocus, setFocused]);
    const handleDayBlur = useCallback((day, m) => (e) => {
        blur();
        onDayBlur?.(day.date, m, e);
    }, [blur, onDayBlur]);
    const handleDayKeyDown = useCallback((day, modifiers) => (e) => {
        const keyMap = {
            ArrowLeft: [
                e.shiftKey ? "month" : "day",
                props.dir === "rtl" ? "after" : "before",
            ],
            ArrowRight: [
                e.shiftKey ? "month" : "day",
                props.dir === "rtl" ? "before" : "after",
            ],
            ArrowDown: [e.shiftKey ? "year" : "week", "after"],
            ArrowUp: [e.shiftKey ? "year" : "week", "before"],
            PageUp: [e.shiftKey ? "year" : "month", "before"],
            PageDown: [e.shiftKey ? "year" : "month", "after"],
            Home: ["startOfWeek", "before"],
            End: ["endOfWeek", "after"],
        };
        if (keyMap[e.key]) {
            e.preventDefault();
            e.stopPropagation();
            const [moveBy, moveDir] = keyMap[e.key];
            moveFocus(moveBy, moveDir);
        }
        onDayKeyDown?.(day.date, modifiers, e);
    }, [moveFocus, onDayKeyDown, props.dir]);
    const handleDayMouseEnter = useCallback((day, modifiers) => (e) => {
        onDayMouseEnter?.(day.date, modifiers, e);
    }, [onDayMouseEnter]);
    const handleDayMouseLeave = useCallback((day, modifiers) => (e) => {
        onDayMouseLeave?.(day.date, modifiers, e);
    }, [onDayMouseLeave]);
    const handleMonthChange = useCallback((date) => (e) => {
        const selectedMonth = Number(e.target.value);
        const month = dateLib.setMonth(dateLib.startOfMonth(date), selectedMonth);
        goToMonth(month);
    }, [dateLib, goToMonth]);
    const handleYearChange = useCallback((date) => (e) => {
        const selectedYear = Number(e.target.value);
        const month = dateLib.setYear(dateLib.startOfMonth(date), selectedYear);
        goToMonth(month);
    }, [dateLib, goToMonth]);
    const { className, style } = useMemo(() => ({
        className: [classNames[UI.Root], props.className]
            .filter(Boolean)
            .join(" "),
        style: { ...styles?.[UI.Root], ...props.style },
    }), [classNames, props.className, props.style, styles]);
    const dataAttributes = getDataAttributes(props);
    const rootElRef = useRef(null);
    useAnimation(rootElRef, Boolean(props.animate), {
        classNames,
        months,
        focused,
        dateLib,
    });
    const contextValue = {
        dayPickerProps: props,
        selected: selectedValue,
        select: select,
        isSelected,
        months,
        nextMonth,
        previousMonth,
        goToMonth,
        getModifiers,
        components,
        classNames,
        styles,
        labels,
        formatters,
    };
    return (React.createElement(dayPickerContext.Provider, { value: contextValue },
        React.createElement(components.Root, { rootRef: props.animate ? rootElRef : undefined, className: className, style: style, dir: props.dir, id: props.id, lang: props.lang, nonce: props.nonce, title: props.title, role: props.role, "aria-label": props["aria-label"], "aria-labelledby": props["aria-labelledby"], ...dataAttributes },
            React.createElement(components.Months, { className: classNames[UI.Months], style: styles?.[UI.Months] },
                !props.hideNavigation && !navLayout && (React.createElement(components.Nav, { "data-animated-nav": props.animate ? "true" : undefined, className: classNames[UI.Nav], style: styles?.[UI.Nav], "aria-label": labelNav(), onPreviousClick: handlePreviousClick, onNextClick: handleNextClick, previousMonth: previousMonth, nextMonth: nextMonth })),
                months.map((calendarMonth, displayIndex) => {
                    return (React.createElement(components.Month, { "data-animated-month": props.animate ? "true" : undefined, className: classNames[UI.Month], style: styles?.[UI.Month], 
                        // biome-ignore lint/suspicious/noArrayIndexKey: breaks animation
                        key: displayIndex, displayIndex: displayIndex, calendarMonth: calendarMonth },
                        navLayout === "around" &&
                            !props.hideNavigation &&
                            displayIndex === 0 && (React.createElement(components.PreviousMonthButton, { type: "button", className: classNames[UI.PreviousMonthButton], tabIndex: previousMonth ? undefined : -1, "aria-disabled": previousMonth ? undefined : true, "aria-label": labelPrevious(previousMonth), onClick: handlePreviousClick, "data-animated-button": props.animate ? "true" : undefined },
                            React.createElement(components.Chevron, { disabled: previousMonth ? undefined : true, className: classNames[UI.Chevron], orientation: props.dir === "rtl" ? "right" : "left" }))),
                        React.createElement(components.MonthCaption, { "data-animated-caption": props.animate ? "true" : undefined, className: classNames[UI.MonthCaption], style: styles?.[UI.MonthCaption], calendarMonth: calendarMonth, displayIndex: displayIndex }, captionLayout?.startsWith("dropdown") ? (React.createElement(components.DropdownNav, { className: classNames[UI.Dropdowns], style: styles?.[UI.Dropdowns] },
                            (() => {
                                const monthControl = captionLayout === "dropdown" ||
                                    captionLayout === "dropdown-months" ? (React.createElement(components.MonthsDropdown, { key: "month", className: classNames[UI.MonthsDropdown], "aria-label": labelMonthDropdown(), classNames: classNames, components: components, disabled: Boolean(props.disableNavigation), onChange: handleMonthChange(calendarMonth.date), options: getMonthOptions(calendarMonth.date, navStart, navEnd, formatters, dateLib), style: styles?.[UI.Dropdown], value: dateLib.getMonth(calendarMonth.date) })) : (React.createElement("span", { key: "month" }, formatMonthDropdown(calendarMonth.date, dateLib)));
                                const yearControl = captionLayout === "dropdown" ||
                                    captionLayout === "dropdown-years" ? (React.createElement(components.YearsDropdown, { key: "year", className: classNames[UI.YearsDropdown], "aria-label": labelYearDropdown(dateLib.options), classNames: classNames, components: components, disabled: Boolean(props.disableNavigation), onChange: handleYearChange(calendarMonth.date), options: getYearOptions(navStart, navEnd, formatters, dateLib, Boolean(props.reverseYears)), style: styles?.[UI.Dropdown], value: dateLib.getYear(calendarMonth.date) })) : (React.createElement("span", { key: "year" }, formatYearDropdown(calendarMonth.date, dateLib)));
                                const controls = dateLib.getMonthYearOrder() === "year-first"
                                    ? [yearControl, monthControl]
                                    : [monthControl, yearControl];
                                return controls;
                            })(),
                            React.createElement("span", { role: "status", "aria-live": "polite", style: {
                                    border: 0,
                                    clip: "rect(0 0 0 0)",
                                    height: "1px",
                                    margin: "-1px",
                                    overflow: "hidden",
                                    padding: 0,
                                    position: "absolute",
                                    width: "1px",
                                    whiteSpace: "nowrap",
                                    wordWrap: "normal",
                                } }, formatCaption(calendarMonth.date, dateLib.options, dateLib)))) : (
                        // biome-ignore lint/a11y/useSemanticElements: breaking change
                        React.createElement(components.CaptionLabel, { className: classNames[UI.CaptionLabel], role: "status", "aria-live": "polite" }, formatCaption(calendarMonth.date, dateLib.options, dateLib)))),
                        navLayout === "around" &&
                            !props.hideNavigation &&
                            displayIndex === numberOfMonths - 1 && (React.createElement(components.NextMonthButton, { type: "button", className: classNames[UI.NextMonthButton], tabIndex: nextMonth ? undefined : -1, "aria-disabled": nextMonth ? undefined : true, "aria-label": labelNext(nextMonth), onClick: handleNextClick, "data-animated-button": props.animate ? "true" : undefined },
                            React.createElement(components.Chevron, { disabled: nextMonth ? undefined : true, className: classNames[UI.Chevron], orientation: props.dir === "rtl" ? "left" : "right" }))),
                        displayIndex === numberOfMonths - 1 &&
                            navLayout === "after" &&
                            !props.hideNavigation && (React.createElement(components.Nav, { "data-animated-nav": props.animate ? "true" : undefined, className: classNames[UI.Nav], style: styles?.[UI.Nav], "aria-label": labelNav(), onPreviousClick: handlePreviousClick, onNextClick: handleNextClick, previousMonth: previousMonth, nextMonth: nextMonth })),
                        React.createElement(components.MonthGrid, { role: "grid", "aria-multiselectable": mode === "multiple" || mode === "range", "aria-label": labelGrid(calendarMonth.date, dateLib.options, dateLib) ||
                                undefined, className: classNames[UI.MonthGrid], style: styles?.[UI.MonthGrid] },
                            !props.hideWeekdays && (React.createElement(components.Weekdays, { "data-animated-weekdays": props.animate ? "true" : undefined, className: classNames[UI.Weekdays], style: styles?.[UI.Weekdays] },
                                showWeekNumber && (React.createElement(components.WeekNumberHeader, { "aria-label": labelWeekNumberHeader(dateLib.options), className: classNames[UI.WeekNumberHeader], style: styles?.[UI.WeekNumberHeader], scope: "col" }, formatWeekNumberHeader())),
                                weekdays.map((weekday) => (React.createElement(components.Weekday, { "aria-label": labelWeekday(weekday, dateLib.options, dateLib), className: classNames[UI.Weekday], key: String(weekday), style: styles?.[UI.Weekday], scope: "col" }, formatWeekdayName(weekday, dateLib.options, dateLib)))))),
                            React.createElement(components.Weeks, { "data-animated-weeks": props.animate ? "true" : undefined, className: classNames[UI.Weeks], style: styles?.[UI.Weeks] }, calendarMonth.weeks.map((week) => {
                                return (React.createElement(components.Week, { className: classNames[UI.Week], key: week.weekNumber, style: styles?.[UI.Week], week: week },
                                    showWeekNumber && (
                                    // biome-ignore lint/a11y/useSemanticElements: react component
                                    React.createElement(components.WeekNumber, { week: week, style: styles?.[UI.WeekNumber], "aria-label": labelWeekNumber(week.weekNumber, {
                                            locale,
                                        }), className: classNames[UI.WeekNumber], scope: "row", role: "rowheader" }, formatWeekNumber(week.weekNumber, dateLib))),
                                    week.days.map((day) => {
                                        const { date } = day;
                                        const modifiers = getModifiers(day);
                                        modifiers[DayFlag.focused] =
                                            !modifiers.hidden &&
                                                Boolean(focused?.isEqualTo(day));
                                        modifiers[SelectionState.selected] =
                                            isSelected?.(date) || modifiers.selected;
                                        if (isDateRange(selectedValue)) {
                                            // add range modifiers
                                            const { from, to } = selectedValue;
                                            modifiers[SelectionState.range_start] = Boolean(from && to && dateLib.isSameDay(date, from));
                                            modifiers[SelectionState.range_end] = Boolean(from && to && dateLib.isSameDay(date, to));
                                            modifiers[SelectionState.range_middle] =
                                                rangeIncludesDate(selectedValue, date, true, dateLib);
                                        }
                                        const style = getStyleForModifiers(modifiers, styles, props.modifiersStyles);
                                        const className = getClassNamesForModifiers(modifiers, classNames, props.modifiersClassNames);
                                        const ariaLabel = !isInteractive && !modifiers.hidden
                                            ? labelGridcell(date, modifiers, dateLib.options, dateLib)
                                            : undefined;
                                        return (
                                        // biome-ignore lint/a11y/useSemanticElements: react component
                                        React.createElement(components.Day, { key: `${dateLib.format(date, "yyyy-MM-dd")}_${dateLib.format(day.displayMonth, "yyyy-MM")}`, day: day, modifiers: modifiers, className: className.join(" "), style: style, role: "gridcell", "aria-selected": modifiers.selected || undefined, "aria-label": ariaLabel, "data-day": dateLib.format(date, "yyyy-MM-dd"), "data-month": day.outside
                                                ? dateLib.format(date, "yyyy-MM")
                                                : undefined, "data-selected": modifiers.selected || undefined, "data-disabled": modifiers.disabled || undefined, "data-hidden": modifiers.hidden || undefined, "data-outside": day.outside || undefined, "data-focused": modifiers.focused || undefined, "data-today": modifiers.today || undefined }, !modifiers.hidden && isInteractive ? (React.createElement(components.DayButton, { className: classNames[UI.DayButton], style: styles?.[UI.DayButton], type: "button", day: day, modifiers: modifiers, disabled: modifiers.disabled || undefined, tabIndex: isFocusTarget(day) ? 0 : -1, "aria-label": labelDayButton(date, modifiers, dateLib.options, dateLib), onClick: handleDayClick(day, modifiers), onBlur: handleDayBlur(day, modifiers), onFocus: handleDayFocus(day, modifiers), onKeyDown: handleDayKeyDown(day, modifiers), onMouseEnter: handleDayMouseEnter(day, modifiers), onMouseLeave: handleDayMouseLeave(day, modifiers) }, formatDay(date, dateLib.options, dateLib))) : (!modifiers.hidden &&
                                            formatDay(day.date, dateLib.options, dateLib))));
                                    })));
                            })))));
                })),
            props.footer && (
            // biome-ignore lint/a11y/useSemanticElements: react component
            React.createElement(components.Footer, { className: classNames[UI.Footer], style: styles?.[UI.Footer], role: "status", "aria-live": "polite" }, props.footer)))));
}
