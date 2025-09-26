"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DayPicker = DayPicker;
const tz_1 = require("@date-fns/tz");
const react_1 = __importStar(require("react"));
const DateLib_js_1 = require("./classes/DateLib.js");
const createGetModifiers_js_1 = require("./helpers/createGetModifiers.js");
const getClassNamesForModifiers_js_1 = require("./helpers/getClassNamesForModifiers.js");
const getComponents_js_1 = require("./helpers/getComponents.js");
const getDataAttributes_js_1 = require("./helpers/getDataAttributes.js");
const getDefaultClassNames_js_1 = require("./helpers/getDefaultClassNames.js");
const getFormatters_js_1 = require("./helpers/getFormatters.js");
const getMonthOptions_js_1 = require("./helpers/getMonthOptions.js");
const getStyleForModifiers_js_1 = require("./helpers/getStyleForModifiers.js");
const getWeekdays_js_1 = require("./helpers/getWeekdays.js");
const getYearOptions_js_1 = require("./helpers/getYearOptions.js");
const defaultLabels = __importStar(require("./labels/index.js"));
const UI_js_1 = require("./UI.js");
const useAnimation_js_1 = require("./useAnimation.js");
const useCalendar_js_1 = require("./useCalendar.js");
const useDayPicker_js_1 = require("./useDayPicker.js");
const useFocus_js_1 = require("./useFocus.js");
const useSelection_js_1 = require("./useSelection.js");
const rangeIncludesDate_js_1 = require("./utils/rangeIncludesDate.js");
const typeguards_js_1 = require("./utils/typeguards.js");
/**
 * Renders the DayPicker calendar component.
 *
 * @param initialProps - The props for the DayPicker component.
 * @returns The rendered DayPicker component.
 * @group DayPicker
 * @see https://daypicker.dev
 */
function DayPicker(initialProps) {
    let props = initialProps;
    if (props.timeZone) {
        props = {
            ...initialProps,
        };
        if (props.today) {
            props.today = new tz_1.TZDate(props.today, props.timeZone);
        }
        if (props.month) {
            props.month = new tz_1.TZDate(props.month, props.timeZone);
        }
        if (props.defaultMonth) {
            props.defaultMonth = new tz_1.TZDate(props.defaultMonth, props.timeZone);
        }
        if (props.startMonth) {
            props.startMonth = new tz_1.TZDate(props.startMonth, props.timeZone);
        }
        if (props.endMonth) {
            props.endMonth = new tz_1.TZDate(props.endMonth, props.timeZone);
        }
        if (props.mode === "single" && props.selected) {
            props.selected = new tz_1.TZDate(props.selected, props.timeZone);
        }
        else if (props.mode === "multiple" && props.selected) {
            props.selected = props.selected?.map((date) => new tz_1.TZDate(date, props.timeZone));
        }
        else if (props.mode === "range" && props.selected) {
            props.selected = {
                from: props.selected.from
                    ? new tz_1.TZDate(props.selected.from, props.timeZone)
                    : undefined,
                to: props.selected.to
                    ? new tz_1.TZDate(props.selected.to, props.timeZone)
                    : undefined,
            };
        }
    }
    const { components, formatters, labels, dateLib, locale, classNames } = (0, react_1.useMemo)(() => {
        const locale = { ...DateLib_js_1.defaultLocale, ...props.locale };
        const dateLib = new DateLib_js_1.DateLib({
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
            components: (0, getComponents_js_1.getComponents)(props.components),
            formatters: (0, getFormatters_js_1.getFormatters)(props.formatters),
            labels: { ...defaultLabels, ...props.labels },
            locale,
            classNames: { ...(0, getDefaultClassNames_js_1.getDefaultClassNames)(), ...props.classNames },
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
    const calendar = (0, useCalendar_js_1.useCalendar)(props, dateLib);
    const { days, months, navStart, navEnd, previousMonth, nextMonth, goToMonth, } = calendar;
    const getModifiers = (0, createGetModifiers_js_1.createGetModifiers)(days, props, navStart, navEnd, dateLib);
    const { isSelected, select, selected: selectedValue, } = (0, useSelection_js_1.useSelection)(props, dateLib) ?? {};
    const { blur, focused, isFocusTarget, moveFocus, setFocused } = (0, useFocus_js_1.useFocus)(props, calendar, getModifiers, isSelected ?? (() => false), dateLib);
    const { labelDayButton, labelGridcell, labelGrid, labelMonthDropdown, labelNav, labelPrevious, labelNext, labelWeekday, labelWeekNumber, labelWeekNumberHeader, labelYearDropdown, } = labels;
    const weekdays = (0, react_1.useMemo)(() => (0, getWeekdays_js_1.getWeekdays)(dateLib, props.ISOWeek), [dateLib, props.ISOWeek]);
    const isInteractive = mode !== undefined || onDayClick !== undefined;
    const handlePreviousClick = (0, react_1.useCallback)(() => {
        if (!previousMonth)
            return;
        goToMonth(previousMonth);
        onPrevClick?.(previousMonth);
    }, [previousMonth, goToMonth, onPrevClick]);
    const handleNextClick = (0, react_1.useCallback)(() => {
        if (!nextMonth)
            return;
        goToMonth(nextMonth);
        onNextClick?.(nextMonth);
    }, [goToMonth, nextMonth, onNextClick]);
    const handleDayClick = (0, react_1.useCallback)((day, m) => (e) => {
        e.preventDefault();
        e.stopPropagation();
        setFocused(day);
        select?.(day.date, m, e);
        onDayClick?.(day.date, m, e);
    }, [select, onDayClick, setFocused]);
    const handleDayFocus = (0, react_1.useCallback)((day, m) => (e) => {
        setFocused(day);
        onDayFocus?.(day.date, m, e);
    }, [onDayFocus, setFocused]);
    const handleDayBlur = (0, react_1.useCallback)((day, m) => (e) => {
        blur();
        onDayBlur?.(day.date, m, e);
    }, [blur, onDayBlur]);
    const handleDayKeyDown = (0, react_1.useCallback)((day, modifiers) => (e) => {
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
    const handleDayMouseEnter = (0, react_1.useCallback)((day, modifiers) => (e) => {
        onDayMouseEnter?.(day.date, modifiers, e);
    }, [onDayMouseEnter]);
    const handleDayMouseLeave = (0, react_1.useCallback)((day, modifiers) => (e) => {
        onDayMouseLeave?.(day.date, modifiers, e);
    }, [onDayMouseLeave]);
    const handleMonthChange = (0, react_1.useCallback)((date) => (e) => {
        const selectedMonth = Number(e.target.value);
        const month = dateLib.setMonth(dateLib.startOfMonth(date), selectedMonth);
        goToMonth(month);
    }, [dateLib, goToMonth]);
    const handleYearChange = (0, react_1.useCallback)((date) => (e) => {
        const selectedYear = Number(e.target.value);
        const month = dateLib.setYear(dateLib.startOfMonth(date), selectedYear);
        goToMonth(month);
    }, [dateLib, goToMonth]);
    const { className, style } = (0, react_1.useMemo)(() => ({
        className: [classNames[UI_js_1.UI.Root], props.className]
            .filter(Boolean)
            .join(" "),
        style: { ...styles?.[UI_js_1.UI.Root], ...props.style },
    }), [classNames, props.className, props.style, styles]);
    const dataAttributes = (0, getDataAttributes_js_1.getDataAttributes)(props);
    const rootElRef = (0, react_1.useRef)(null);
    (0, useAnimation_js_1.useAnimation)(rootElRef, Boolean(props.animate), {
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
    return (react_1.default.createElement(useDayPicker_js_1.dayPickerContext.Provider, { value: contextValue },
        react_1.default.createElement(components.Root, { rootRef: props.animate ? rootElRef : undefined, className: className, style: style, dir: props.dir, id: props.id, lang: props.lang, nonce: props.nonce, title: props.title, role: props.role, "aria-label": props["aria-label"], "aria-labelledby": props["aria-labelledby"], ...dataAttributes },
            react_1.default.createElement(components.Months, { className: classNames[UI_js_1.UI.Months], style: styles?.[UI_js_1.UI.Months] },
                !props.hideNavigation && !navLayout && (react_1.default.createElement(components.Nav, { "data-animated-nav": props.animate ? "true" : undefined, className: classNames[UI_js_1.UI.Nav], style: styles?.[UI_js_1.UI.Nav], "aria-label": labelNav(), onPreviousClick: handlePreviousClick, onNextClick: handleNextClick, previousMonth: previousMonth, nextMonth: nextMonth })),
                months.map((calendarMonth, displayIndex) => {
                    return (react_1.default.createElement(components.Month, { "data-animated-month": props.animate ? "true" : undefined, className: classNames[UI_js_1.UI.Month], style: styles?.[UI_js_1.UI.Month], 
                        // biome-ignore lint/suspicious/noArrayIndexKey: breaks animation
                        key: displayIndex, displayIndex: displayIndex, calendarMonth: calendarMonth },
                        navLayout === "around" &&
                            !props.hideNavigation &&
                            displayIndex === 0 && (react_1.default.createElement(components.PreviousMonthButton, { type: "button", className: classNames[UI_js_1.UI.PreviousMonthButton], tabIndex: previousMonth ? undefined : -1, "aria-disabled": previousMonth ? undefined : true, "aria-label": labelPrevious(previousMonth), onClick: handlePreviousClick, "data-animated-button": props.animate ? "true" : undefined },
                            react_1.default.createElement(components.Chevron, { disabled: previousMonth ? undefined : true, className: classNames[UI_js_1.UI.Chevron], orientation: props.dir === "rtl" ? "right" : "left" }))),
                        react_1.default.createElement(components.MonthCaption, { "data-animated-caption": props.animate ? "true" : undefined, className: classNames[UI_js_1.UI.MonthCaption], style: styles?.[UI_js_1.UI.MonthCaption], calendarMonth: calendarMonth, displayIndex: displayIndex }, captionLayout?.startsWith("dropdown") ? (react_1.default.createElement(components.DropdownNav, { className: classNames[UI_js_1.UI.Dropdowns], style: styles?.[UI_js_1.UI.Dropdowns] },
                            (() => {
                                const monthControl = captionLayout === "dropdown" ||
                                    captionLayout === "dropdown-months" ? (react_1.default.createElement(components.MonthsDropdown, { key: "month", className: classNames[UI_js_1.UI.MonthsDropdown], "aria-label": labelMonthDropdown(), classNames: classNames, components: components, disabled: Boolean(props.disableNavigation), onChange: handleMonthChange(calendarMonth.date), options: (0, getMonthOptions_js_1.getMonthOptions)(calendarMonth.date, navStart, navEnd, formatters, dateLib), style: styles?.[UI_js_1.UI.Dropdown], value: dateLib.getMonth(calendarMonth.date) })) : (react_1.default.createElement("span", { key: "month" }, formatMonthDropdown(calendarMonth.date, dateLib)));
                                const yearControl = captionLayout === "dropdown" ||
                                    captionLayout === "dropdown-years" ? (react_1.default.createElement(components.YearsDropdown, { key: "year", className: classNames[UI_js_1.UI.YearsDropdown], "aria-label": labelYearDropdown(dateLib.options), classNames: classNames, components: components, disabled: Boolean(props.disableNavigation), onChange: handleYearChange(calendarMonth.date), options: (0, getYearOptions_js_1.getYearOptions)(navStart, navEnd, formatters, dateLib, Boolean(props.reverseYears)), style: styles?.[UI_js_1.UI.Dropdown], value: dateLib.getYear(calendarMonth.date) })) : (react_1.default.createElement("span", { key: "year" }, formatYearDropdown(calendarMonth.date, dateLib)));
                                const controls = dateLib.getMonthYearOrder() === "year-first"
                                    ? [yearControl, monthControl]
                                    : [monthControl, yearControl];
                                return controls;
                            })(),
                            react_1.default.createElement("span", { role: "status", "aria-live": "polite", style: {
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
                        react_1.default.createElement(components.CaptionLabel, { className: classNames[UI_js_1.UI.CaptionLabel], role: "status", "aria-live": "polite" }, formatCaption(calendarMonth.date, dateLib.options, dateLib)))),
                        navLayout === "around" &&
                            !props.hideNavigation &&
                            displayIndex === numberOfMonths - 1 && (react_1.default.createElement(components.NextMonthButton, { type: "button", className: classNames[UI_js_1.UI.NextMonthButton], tabIndex: nextMonth ? undefined : -1, "aria-disabled": nextMonth ? undefined : true, "aria-label": labelNext(nextMonth), onClick: handleNextClick, "data-animated-button": props.animate ? "true" : undefined },
                            react_1.default.createElement(components.Chevron, { disabled: nextMonth ? undefined : true, className: classNames[UI_js_1.UI.Chevron], orientation: props.dir === "rtl" ? "left" : "right" }))),
                        displayIndex === numberOfMonths - 1 &&
                            navLayout === "after" &&
                            !props.hideNavigation && (react_1.default.createElement(components.Nav, { "data-animated-nav": props.animate ? "true" : undefined, className: classNames[UI_js_1.UI.Nav], style: styles?.[UI_js_1.UI.Nav], "aria-label": labelNav(), onPreviousClick: handlePreviousClick, onNextClick: handleNextClick, previousMonth: previousMonth, nextMonth: nextMonth })),
                        react_1.default.createElement(components.MonthGrid, { role: "grid", "aria-multiselectable": mode === "multiple" || mode === "range", "aria-label": labelGrid(calendarMonth.date, dateLib.options, dateLib) ||
                                undefined, className: classNames[UI_js_1.UI.MonthGrid], style: styles?.[UI_js_1.UI.MonthGrid] },
                            !props.hideWeekdays && (react_1.default.createElement(components.Weekdays, { "data-animated-weekdays": props.animate ? "true" : undefined, className: classNames[UI_js_1.UI.Weekdays], style: styles?.[UI_js_1.UI.Weekdays] },
                                showWeekNumber && (react_1.default.createElement(components.WeekNumberHeader, { "aria-label": labelWeekNumberHeader(dateLib.options), className: classNames[UI_js_1.UI.WeekNumberHeader], style: styles?.[UI_js_1.UI.WeekNumberHeader], scope: "col" }, formatWeekNumberHeader())),
                                weekdays.map((weekday) => (react_1.default.createElement(components.Weekday, { "aria-label": labelWeekday(weekday, dateLib.options, dateLib), className: classNames[UI_js_1.UI.Weekday], key: String(weekday), style: styles?.[UI_js_1.UI.Weekday], scope: "col" }, formatWeekdayName(weekday, dateLib.options, dateLib)))))),
                            react_1.default.createElement(components.Weeks, { "data-animated-weeks": props.animate ? "true" : undefined, className: classNames[UI_js_1.UI.Weeks], style: styles?.[UI_js_1.UI.Weeks] }, calendarMonth.weeks.map((week) => {
                                return (react_1.default.createElement(components.Week, { className: classNames[UI_js_1.UI.Week], key: week.weekNumber, style: styles?.[UI_js_1.UI.Week], week: week },
                                    showWeekNumber && (
                                    // biome-ignore lint/a11y/useSemanticElements: react component
                                    react_1.default.createElement(components.WeekNumber, { week: week, style: styles?.[UI_js_1.UI.WeekNumber], "aria-label": labelWeekNumber(week.weekNumber, {
                                            locale,
                                        }), className: classNames[UI_js_1.UI.WeekNumber], scope: "row", role: "rowheader" }, formatWeekNumber(week.weekNumber, dateLib))),
                                    week.days.map((day) => {
                                        const { date } = day;
                                        const modifiers = getModifiers(day);
                                        modifiers[UI_js_1.DayFlag.focused] =
                                            !modifiers.hidden &&
                                                Boolean(focused?.isEqualTo(day));
                                        modifiers[UI_js_1.SelectionState.selected] =
                                            isSelected?.(date) || modifiers.selected;
                                        if ((0, typeguards_js_1.isDateRange)(selectedValue)) {
                                            // add range modifiers
                                            const { from, to } = selectedValue;
                                            modifiers[UI_js_1.SelectionState.range_start] = Boolean(from && to && dateLib.isSameDay(date, from));
                                            modifiers[UI_js_1.SelectionState.range_end] = Boolean(from && to && dateLib.isSameDay(date, to));
                                            modifiers[UI_js_1.SelectionState.range_middle] =
                                                (0, rangeIncludesDate_js_1.rangeIncludesDate)(selectedValue, date, true, dateLib);
                                        }
                                        const style = (0, getStyleForModifiers_js_1.getStyleForModifiers)(modifiers, styles, props.modifiersStyles);
                                        const className = (0, getClassNamesForModifiers_js_1.getClassNamesForModifiers)(modifiers, classNames, props.modifiersClassNames);
                                        const ariaLabel = !isInteractive && !modifiers.hidden
                                            ? labelGridcell(date, modifiers, dateLib.options, dateLib)
                                            : undefined;
                                        return (
                                        // biome-ignore lint/a11y/useSemanticElements: react component
                                        react_1.default.createElement(components.Day, { key: `${dateLib.format(date, "yyyy-MM-dd")}_${dateLib.format(day.displayMonth, "yyyy-MM")}`, day: day, modifiers: modifiers, className: className.join(" "), style: style, role: "gridcell", "aria-selected": modifiers.selected || undefined, "aria-label": ariaLabel, "data-day": dateLib.format(date, "yyyy-MM-dd"), "data-month": day.outside
                                                ? dateLib.format(date, "yyyy-MM")
                                                : undefined, "data-selected": modifiers.selected || undefined, "data-disabled": modifiers.disabled || undefined, "data-hidden": modifiers.hidden || undefined, "data-outside": day.outside || undefined, "data-focused": modifiers.focused || undefined, "data-today": modifiers.today || undefined }, !modifiers.hidden && isInteractive ? (react_1.default.createElement(components.DayButton, { className: classNames[UI_js_1.UI.DayButton], style: styles?.[UI_js_1.UI.DayButton], type: "button", day: day, modifiers: modifiers, disabled: modifiers.disabled || undefined, tabIndex: isFocusTarget(day) ? 0 : -1, "aria-label": labelDayButton(date, modifiers, dateLib.options, dateLib), onClick: handleDayClick(day, modifiers), onBlur: handleDayBlur(day, modifiers), onFocus: handleDayFocus(day, modifiers), onKeyDown: handleDayKeyDown(day, modifiers), onMouseEnter: handleDayMouseEnter(day, modifiers), onMouseLeave: handleDayMouseLeave(day, modifiers) }, formatDay(date, dateLib.options, dateLib))) : (!modifiers.hidden &&
                                            formatDay(day.date, dateLib.options, dateLib))));
                                    })));
                            })))));
                })),
            props.footer && (
            // biome-ignore lint/a11y/useSemanticElements: react component
            react_1.default.createElement(components.Footer, { className: classNames[UI_js_1.UI.Footer], style: styles?.[UI_js_1.UI.Footer], role: "status", "aria-live": "polite" }, props.footer)))));
}
