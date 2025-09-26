"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGetModifiers = createGetModifiers;
const UI_js_1 = require("../UI.js");
const dateMatchModifiers_js_1 = require("../utils/dateMatchModifiers.js");
/**
 * Creates a function to retrieve the modifiers for a given day.
 *
 * This function calculates both internal and custom modifiers for each day
 * based on the provided calendar days and DayPicker props.
 *
 * @private
 * @param days The array of `CalendarDay` objects to process.
 * @param props The DayPicker props, including modifiers and configuration
 *   options.
 * @param dateLib The date library to use for date manipulation.
 * @returns A function that retrieves the modifiers for a given `CalendarDay`.
 */
function createGetModifiers(days, props, navStart, navEnd, dateLib) {
    const { disabled, hidden, modifiers, showOutsideDays, broadcastCalendar, today, } = props;
    const { isSameDay, isSameMonth, startOfMonth, isBefore, endOfMonth, isAfter, } = dateLib;
    const computedNavStart = navStart && startOfMonth(navStart);
    const computedNavEnd = navEnd && endOfMonth(navEnd);
    const internalModifiersMap = {
        [UI_js_1.DayFlag.focused]: [],
        [UI_js_1.DayFlag.outside]: [],
        [UI_js_1.DayFlag.disabled]: [],
        [UI_js_1.DayFlag.hidden]: [],
        [UI_js_1.DayFlag.today]: [],
    };
    const customModifiersMap = {};
    for (const day of days) {
        const { date, displayMonth } = day;
        const isOutside = Boolean(displayMonth && !isSameMonth(date, displayMonth));
        const isBeforeNavStart = Boolean(computedNavStart && isBefore(date, computedNavStart));
        const isAfterNavEnd = Boolean(computedNavEnd && isAfter(date, computedNavEnd));
        const isDisabled = Boolean(disabled && (0, dateMatchModifiers_js_1.dateMatchModifiers)(date, disabled, dateLib));
        const isHidden = Boolean(hidden && (0, dateMatchModifiers_js_1.dateMatchModifiers)(date, hidden, dateLib)) ||
            isBeforeNavStart ||
            isAfterNavEnd ||
            // Broadcast calendar will show outside days as default
            (!broadcastCalendar && !showOutsideDays && isOutside) ||
            (broadcastCalendar && showOutsideDays === false && isOutside);
        const isToday = isSameDay(date, today ?? dateLib.today());
        if (isOutside)
            internalModifiersMap.outside.push(day);
        if (isDisabled)
            internalModifiersMap.disabled.push(day);
        if (isHidden)
            internalModifiersMap.hidden.push(day);
        if (isToday)
            internalModifiersMap.today.push(day);
        // Add custom modifiers
        if (modifiers) {
            Object.keys(modifiers).forEach((name) => {
                const modifierValue = modifiers?.[name];
                const isMatch = modifierValue
                    ? (0, dateMatchModifiers_js_1.dateMatchModifiers)(date, modifierValue, dateLib)
                    : false;
                if (!isMatch)
                    return;
                if (customModifiersMap[name]) {
                    customModifiersMap[name].push(day);
                }
                else {
                    customModifiersMap[name] = [day];
                }
            });
        }
    }
    return (day) => {
        // Initialize all the modifiers to false
        const dayFlags = {
            [UI_js_1.DayFlag.focused]: false,
            [UI_js_1.DayFlag.disabled]: false,
            [UI_js_1.DayFlag.hidden]: false,
            [UI_js_1.DayFlag.outside]: false,
            [UI_js_1.DayFlag.today]: false,
        };
        const customModifiers = {};
        // Find the modifiers for the given day
        for (const name in internalModifiersMap) {
            const days = internalModifiersMap[name];
            dayFlags[name] = days.some((d) => d === day);
        }
        for (const name in customModifiersMap) {
            customModifiers[name] = customModifiersMap[name].some((d) => d === day);
        }
        return {
            ...dayFlags,
            // custom modifiers should override all the previous ones
            ...customModifiers,
        };
    };
}
