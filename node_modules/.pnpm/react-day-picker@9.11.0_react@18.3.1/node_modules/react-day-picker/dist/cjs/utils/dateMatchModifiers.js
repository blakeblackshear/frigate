"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMatch = void 0;
exports.dateMatchModifiers = dateMatchModifiers;
const DateLib_js_1 = require("../classes/DateLib.js");
const rangeIncludesDate_js_1 = require("./rangeIncludesDate.js");
const typeguards_js_1 = require("./typeguards.js");
/**
 * Checks if a given date matches at least one of the specified {@link Matcher}.
 *
 * @param date - The date to check.
 * @param matchers - The matchers to check against.
 * @param dateLib - The date utility library instance.
 * @returns `true` if the date matches any of the matchers, otherwise `false`.
 * @group Utilities
 */
function dateMatchModifiers(date, matchers, dateLib = DateLib_js_1.defaultDateLib) {
    const matchersArr = !Array.isArray(matchers) ? [matchers] : matchers;
    const { isSameDay, differenceInCalendarDays, isAfter } = dateLib;
    return matchersArr.some((matcher) => {
        if (typeof matcher === "boolean") {
            return matcher;
        }
        if (dateLib.isDate(matcher)) {
            return isSameDay(date, matcher);
        }
        if ((0, typeguards_js_1.isDatesArray)(matcher, dateLib)) {
            return matcher.includes(date);
        }
        if ((0, typeguards_js_1.isDateRange)(matcher)) {
            return (0, rangeIncludesDate_js_1.rangeIncludesDate)(matcher, date, false, dateLib);
        }
        if ((0, typeguards_js_1.isDayOfWeekType)(matcher)) {
            if (!Array.isArray(matcher.dayOfWeek)) {
                return matcher.dayOfWeek === date.getDay();
            }
            return matcher.dayOfWeek.includes(date.getDay());
        }
        if ((0, typeguards_js_1.isDateInterval)(matcher)) {
            const diffBefore = differenceInCalendarDays(matcher.before, date);
            const diffAfter = differenceInCalendarDays(matcher.after, date);
            const isDayBefore = diffBefore > 0;
            const isDayAfter = diffAfter < 0;
            const isClosedInterval = isAfter(matcher.before, matcher.after);
            if (isClosedInterval) {
                return isDayAfter && isDayBefore;
            }
            else {
                return isDayBefore || isDayAfter;
            }
        }
        if ((0, typeguards_js_1.isDateAfterType)(matcher)) {
            return differenceInCalendarDays(date, matcher.after) > 0;
        }
        if ((0, typeguards_js_1.isDateBeforeType)(matcher)) {
            return differenceInCalendarDays(matcher.before, date) > 0;
        }
        if (typeof matcher === "function") {
            return matcher(date);
        }
        return false;
    });
}
/**
 * @private
 * @deprecated Use {@link dateMatchModifiers} instead.
 */
exports.isMatch = dateMatchModifiers;
