import type { FormatOptions as DateFnsFormatOptions } from "date-fns";
/** Options for formatting dates in the Ethiopian calendar */
export type FormatOptions = DateFnsFormatOptions;
/**
 * Format an Ethiopic calendar date using a subset of date-fns tokens.
 *
 * Behavior specifics for Ethiopic mode:
 *
 * - Weekday names ("cccc", "cccccc") come from `Intl.DateTimeFormat` using
 *   `options.locale?.code` (default: `am-ET`). Narrow form is a single letter.
 * - Month names ("LLLL") are Amharic by default and switch to Latin
 *   transliteration when the locale code starts with `en` or when
 *   `options.numerals === 'latn'`.
 * - Time parts such as `hh:mm a` are delegated to `Intl.DateTimeFormat` with the
 *   given locale.
 * - Digits are converted to Ethiopic (Geez) when `options.numerals === 'geez'`.
 */
export declare function format(date: Date, formatStr: string, options?: DateFnsFormatOptions): string;
export declare const ethMonths: string[];
export declare const ethMonthsLatin: string[];
export declare const shortDays: string[];
export declare const longDays: string[];
