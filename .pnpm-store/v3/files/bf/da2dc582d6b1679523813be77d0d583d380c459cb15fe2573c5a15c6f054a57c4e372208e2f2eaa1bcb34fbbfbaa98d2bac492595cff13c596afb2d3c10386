"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCalendar = useCalendar;
const react_1 = require("react");
const getDates_js_1 = require("./helpers/getDates.js");
const getDays_js_1 = require("./helpers/getDays.js");
const getDisplayMonths_js_1 = require("./helpers/getDisplayMonths.js");
const getInitialMonth_js_1 = require("./helpers/getInitialMonth.js");
const getMonths_js_1 = require("./helpers/getMonths.js");
const getNavMonth_js_1 = require("./helpers/getNavMonth.js");
const getNextMonth_js_1 = require("./helpers/getNextMonth.js");
const getPreviousMonth_js_1 = require("./helpers/getPreviousMonth.js");
const getWeeks_js_1 = require("./helpers/getWeeks.js");
const useControlledValue_js_1 = require("./helpers/useControlledValue.js");
/**
 * Provides the calendar object to work with the calendar in custom components.
 *
 * @private
 * @param props - The DayPicker props related to calendar configuration.
 * @param dateLib - The date utility library instance.
 * @returns The calendar object containing displayed days, weeks, months, and
 *   navigation methods.
 */
function useCalendar(props, dateLib) {
    const [navStart, navEnd] = (0, getNavMonth_js_1.getNavMonths)(props, dateLib);
    const { startOfMonth, endOfMonth } = dateLib;
    const initialMonth = (0, getInitialMonth_js_1.getInitialMonth)(props, navStart, navEnd, dateLib);
    const [firstMonth, setFirstMonth] = (0, useControlledValue_js_1.useControlledValue)(initialMonth, 
    // initialMonth is always computed from props.month if provided
    props.month ? initialMonth : undefined);
    // biome-ignore lint/correctness/useExhaustiveDependencies: change the initial month when the time zone changes.
    (0, react_1.useEffect)(() => {
        const newInitialMonth = (0, getInitialMonth_js_1.getInitialMonth)(props, navStart, navEnd, dateLib);
        setFirstMonth(newInitialMonth);
    }, [props.timeZone]);
    /** The months displayed in the calendar. */
    const displayMonths = (0, getDisplayMonths_js_1.getDisplayMonths)(firstMonth, navEnd, props, dateLib);
    /** The dates displayed in the calendar. */
    const dates = (0, getDates_js_1.getDates)(displayMonths, props.endMonth ? endOfMonth(props.endMonth) : undefined, props, dateLib);
    /** The Months displayed in the calendar. */
    const months = (0, getMonths_js_1.getMonths)(displayMonths, dates, props, dateLib);
    /** The Weeks displayed in the calendar. */
    const weeks = (0, getWeeks_js_1.getWeeks)(months);
    /** The Days displayed in the calendar. */
    const days = (0, getDays_js_1.getDays)(months);
    const previousMonth = (0, getPreviousMonth_js_1.getPreviousMonth)(firstMonth, navStart, props, dateLib);
    const nextMonth = (0, getNextMonth_js_1.getNextMonth)(firstMonth, navEnd, props, dateLib);
    const { disableNavigation, onMonthChange } = props;
    const isDayInCalendar = (day) => weeks.some((week) => week.days.some((d) => d.isEqualTo(day)));
    const goToMonth = (date) => {
        if (disableNavigation) {
            return;
        }
        let newMonth = startOfMonth(date);
        // if month is before start, use the first month instead
        if (navStart && newMonth < startOfMonth(navStart)) {
            newMonth = startOfMonth(navStart);
        }
        // if month is after endMonth, use the last month instead
        if (navEnd && newMonth > startOfMonth(navEnd)) {
            newMonth = startOfMonth(navEnd);
        }
        setFirstMonth(newMonth);
        onMonthChange?.(newMonth);
    };
    const goToDay = (day) => {
        // is this check necessary?
        if (isDayInCalendar(day)) {
            return;
        }
        goToMonth(day.date);
    };
    const calendar = {
        months,
        weeks,
        days,
        navStart,
        navEnd,
        previousMonth,
        nextMonth,
        goToMonth,
        goToDay,
    };
    return calendar;
}
