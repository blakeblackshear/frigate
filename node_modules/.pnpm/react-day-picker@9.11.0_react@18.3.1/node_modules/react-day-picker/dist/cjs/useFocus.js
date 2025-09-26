"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useFocus = useFocus;
const react_1 = require("react");
const calculateFocusTarget_js_1 = require("./helpers/calculateFocusTarget.js");
const getNextFocus_js_1 = require("./helpers/getNextFocus.js");
/**
 * Manages focus behavior for the DayPicker component, including setting,
 * moving, and blurring focus on calendar days.
 *
 * @template T - The type of DayPicker props.
 * @param props - The DayPicker props.
 * @param calendar - The calendar object containing the displayed days and
 *   months.
 * @param getModifiers - A function to retrieve modifiers for a given day.
 * @param isSelected - A function to check if a date is selected.
 * @param dateLib - The date utility library instance.
 * @returns An object containing focus-related methods and the currently focused
 *   day.
 */
function useFocus(props, calendar, getModifiers, isSelected, dateLib) {
    const { autoFocus } = props;
    const [lastFocused, setLastFocused] = (0, react_1.useState)();
    const focusTarget = (0, calculateFocusTarget_js_1.calculateFocusTarget)(calendar.days, getModifiers, isSelected || (() => false), lastFocused);
    const [focusedDay, setFocused] = (0, react_1.useState)(autoFocus ? focusTarget : undefined);
    const blur = () => {
        setLastFocused(focusedDay);
        setFocused(undefined);
    };
    const moveFocus = (moveBy, moveDir) => {
        if (!focusedDay)
            return;
        const nextFocus = (0, getNextFocus_js_1.getNextFocus)(moveBy, moveDir, focusedDay, calendar.navStart, calendar.navEnd, props, dateLib);
        if (!nextFocus)
            return;
        calendar.goToDay(nextFocus);
        setFocused(nextFocus);
    };
    const isFocusTarget = (day) => {
        return Boolean(focusTarget?.isEqualTo(day));
    };
    const useFocus = {
        isFocusTarget,
        setFocused,
        focused: focusedDay,
        blur,
        moveFocus,
    };
    return useFocus;
}
