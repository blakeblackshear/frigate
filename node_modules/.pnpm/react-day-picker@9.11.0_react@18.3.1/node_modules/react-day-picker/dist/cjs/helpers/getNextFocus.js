"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNextFocus = getNextFocus;
const index_js_1 = require("../classes/index.js");
const dateMatchModifiers_js_1 = require("../utils/dateMatchModifiers.js");
const getFocusableDate_js_1 = require("./getFocusableDate.js");
/**
 * Determines the next focusable day in the calendar.
 *
 * This function recursively calculates the next focusable day based on the
 * movement direction and modifiers applied to the days.
 *
 * @param moveBy The unit of movement (e.g., "day", "week").
 * @param moveDir The direction of movement ("before" or "after").
 * @param refDay The currently focused day.
 * @param calendarStartMonth The earliest month the user can navigate to.
 * @param calendarEndMonth The latest month the user can navigate to.
 * @param props The DayPicker props, including modifiers and configuration
 *   options.
 * @param dateLib The date library to use for date manipulation.
 * @param attempt The current recursion attempt (used to limit recursion depth).
 * @returns The next focusable day, or `undefined` if no focusable day is found.
 */
function getNextFocus(moveBy, moveDir, refDay, calendarStartMonth, calendarEndMonth, props, dateLib, attempt = 0) {
    if (attempt > 365) {
        // Limit the recursion to 365 attempts
        return undefined;
    }
    const focusableDate = (0, getFocusableDate_js_1.getFocusableDate)(moveBy, moveDir, refDay.date, calendarStartMonth, calendarEndMonth, props, dateLib);
    const isDisabled = Boolean(props.disabled &&
        (0, dateMatchModifiers_js_1.dateMatchModifiers)(focusableDate, props.disabled, dateLib));
    const isHidden = Boolean(props.hidden && (0, dateMatchModifiers_js_1.dateMatchModifiers)(focusableDate, props.hidden, dateLib));
    const targetMonth = focusableDate;
    const focusDay = new index_js_1.CalendarDay(focusableDate, targetMonth, dateLib);
    if (!isDisabled && !isHidden) {
        return focusDay;
    }
    // Recursively attempt to find the next focusable date
    return getNextFocus(moveBy, moveDir, focusDay, calendarStartMonth, calendarEndMonth, props, dateLib, attempt + 1);
}
