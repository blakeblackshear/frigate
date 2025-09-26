import * as locales from "date-fns/locale";
import React from "react";
import { DateLib, DayPicker as DayPickerComponent, } from "../index.js";
import { format as originalBuddhistFormat } from "./lib/format.js";
// Adapter to match DateLib's format signature without using `any`.
const buddhistFormat = (date, formatStr, options) => {
    return originalBuddhistFormat(date, formatStr, options);
};
export const th = locales.th;
export const enUS = locales.enUS;
/**
 * Render the Buddhist (Thai) calendar.
 *
 * Months/weeks are Gregorian; displayed year is Buddhist Era (BE = CE + 543).
 * Thai digits are used by default.
 *
 * Defaults:
 *
 * - `locale`: `th`
 * - `dir`: `ltr`
 * - `numerals`: `thai`
 */
export function DayPicker(props) {
    const dateLib = getDateLib({
        locale: props.locale ?? th,
        weekStartsOn: props.broadcastCalendar ? 1 : props.weekStartsOn,
        firstWeekContainsDate: props.firstWeekContainsDate,
        useAdditionalWeekYearTokens: props.useAdditionalWeekYearTokens,
        useAdditionalDayOfYearTokens: props.useAdditionalDayOfYearTokens,
        timeZone: props.timeZone,
    });
    return (React.createElement(DayPickerComponent, { ...props, locale: props.locale ?? th, numerals: props.numerals ?? "thai", dir: props.dir ?? "ltr", dateLib: dateLib }));
}
/** Returns the date library used in the Buddhist calendar. */
export const getDateLib = (options) => {
    return new DateLib(options, {
        format: buddhistFormat,
    });
};
