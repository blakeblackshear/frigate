import type { Locale } from "date-fns";
import React from "react";
import { DateLib, type DateLibOptions } from "../index.js";
import type { DayPickerProps } from "../types/props.js";
export { enUS } from "date-fns/locale/en-US";
/**
 * Render the Ethiopic calendar.
 *
 * Defaults:
 *
 * - `locale`: `am-ET` (Amharic) via an Intl-backed date-fns locale
 * - `numerals`: `geez` (Ethiopic digits)
 *
 * Notes:
 *
 * - Weekday names are taken from `Intl.DateTimeFormat(locale.code)`.
 * - Month names are Amharic by default; they switch to Latin transliteration when
 *   `locale.code` starts with `en` or when `numerals` is `latn`.
 * - Time tokens like `hh:mm a` are formatted via `Intl.DateTimeFormat` using the
 *   provided `locale`.
 *
 * @see https://daypicker.dev/docs/localization#ethiopic-calendar
 */
export declare function DayPicker(props: DayPickerProps & {
    /**
     * The locale to use in the calendar.
     *
     * @default `am-ET`
     */
    locale?: Locale;
    /**
     * The numeral system to use when formatting dates.
     *
     * - `latn`: Latin (Western Arabic)
     * - `geez`: Ge'ez (Ethiopic numerals)
     *
     * @defaultValue `geez` (Ethiopic numerals)
     * @see https://daypicker.dev/docs/translation#numeral-systems
     */
    numerals?: DayPickerProps["numerals"];
}): React.JSX.Element;
/** Returns the date library used in the calendar. */
export declare const getDateLib: (options?: DateLibOptions) => DateLib;
export { amET } from "./locale/am-ET.js";
