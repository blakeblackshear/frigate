"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rangeContainsModifiers = rangeContainsModifiers;
const DateLib_js_1 = require("../classes/DateLib.js");
const dateMatchModifiers_js_1 = require("./dateMatchModifiers.js");
const rangeContainsDayOfWeek_js_1 = require("./rangeContainsDayOfWeek.js");
const rangeIncludesDate_js_1 = require("./rangeIncludesDate.js");
const rangeOverlaps_js_1 = require("./rangeOverlaps.js");
const typeguards_js_1 = require("./typeguards.js");
/**
 * Checks if a date range contains dates that match the given modifiers.
 *
 * @since 9.2.2
 * @param range - The date range to check.
 * @param modifiers - The modifiers to match against.
 * @param dateLib - The date utility library instance.
 * @returns `true` if the range contains matching dates, otherwise `false`.
 * @group Utilities
 */
function rangeContainsModifiers(range, modifiers, dateLib = DateLib_js_1.defaultDateLib) {
    const matchers = Array.isArray(modifiers) ? modifiers : [modifiers];
    // Defer function matchers evaluation as they are the least performant.
    const nonFunctionMatchers = matchers.filter((matcher) => typeof matcher !== "function");
    const nonFunctionMatchersResult = nonFunctionMatchers.some((matcher) => {
        if (typeof matcher === "boolean")
            return matcher;
        if (dateLib.isDate(matcher)) {
            return (0, rangeIncludesDate_js_1.rangeIncludesDate)(range, matcher, false, dateLib);
        }
        if ((0, typeguards_js_1.isDatesArray)(matcher, dateLib)) {
            return matcher.some((date) => (0, rangeIncludesDate_js_1.rangeIncludesDate)(range, date, false, dateLib));
        }
        if ((0, typeguards_js_1.isDateRange)(matcher)) {
            if (matcher.from && matcher.to) {
                return (0, rangeOverlaps_js_1.rangeOverlaps)(range, { from: matcher.from, to: matcher.to }, dateLib);
            }
            return false;
        }
        if ((0, typeguards_js_1.isDayOfWeekType)(matcher)) {
            return (0, rangeContainsDayOfWeek_js_1.rangeContainsDayOfWeek)(range, matcher.dayOfWeek, dateLib);
        }
        if ((0, typeguards_js_1.isDateInterval)(matcher)) {
            const isClosedInterval = dateLib.isAfter(matcher.before, matcher.after);
            if (isClosedInterval) {
                return (0, rangeOverlaps_js_1.rangeOverlaps)(range, {
                    from: dateLib.addDays(matcher.after, 1),
                    to: dateLib.addDays(matcher.before, -1),
                }, dateLib);
            }
            return ((0, dateMatchModifiers_js_1.dateMatchModifiers)(range.from, matcher, dateLib) ||
                (0, dateMatchModifiers_js_1.dateMatchModifiers)(range.to, matcher, dateLib));
        }
        if ((0, typeguards_js_1.isDateAfterType)(matcher) || (0, typeguards_js_1.isDateBeforeType)(matcher)) {
            return ((0, dateMatchModifiers_js_1.dateMatchModifiers)(range.from, matcher, dateLib) ||
                (0, dateMatchModifiers_js_1.dateMatchModifiers)(range.to, matcher, dateLib));
        }
        return false;
    });
    if (nonFunctionMatchersResult) {
        return true;
    }
    const functionMatchers = matchers.filter((matcher) => typeof matcher === "function");
    if (functionMatchers.length) {
        let date = range.from;
        const totalDays = dateLib.differenceInCalendarDays(range.to, range.from);
        for (let i = 0; i <= totalDays; i++) {
            if (functionMatchers.some((matcher) => matcher(date))) {
                return true;
            }
            date = dateLib.addDays(date, 1);
        }
    }
    return false;
}
