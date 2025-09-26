import type { Locale } from "date-fns";
import React from "react";
import { DateLib, type DateLibOptions } from "../index.js";
import type { DayPickerProps } from "../types/props.js";
export declare const he: Locale;
export declare const enUS: Locale;
/**
 * Render the Hebrew (lunisolar) calendar.
 *
 * Months follow the Hebrew lunisolar cycle with leap years containing Adar I
 * and Adar II. Weeks remain Sunday–Saturday.
 *
 * Defaults:
 *
 * - `locale`: `he`
 * - `dir`: `rtl`
 * - `numerals`: `latn`
 */
export declare function DayPicker(props: DayPickerProps & {
    locale?: Locale;
    dir?: DayPickerProps["dir"];
    numerals?: DayPickerProps["numerals"];
    dateLib?: DayPickerProps["dateLib"];
}): React.JSX.Element;
/** Returns the date library used in the Hebrew calendar. */
export declare const getDateLib: (options?: DateLibOptions) => DateLib;
