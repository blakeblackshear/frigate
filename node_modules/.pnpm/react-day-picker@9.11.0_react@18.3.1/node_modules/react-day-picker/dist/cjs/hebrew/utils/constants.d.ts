export declare const MS_PER_DAY: number;
export declare const GREGORIAN_EPOCH: number;
export declare const HEBREW_EPOCH = -2067381;
export declare const MONTH_SEQUENCE_COMMON: readonly ["tishrei", "cheshvan", "kislev", "tevet", "shevat", "adar", "nisan", "iyar", "sivan", "tamuz", "av", "elul"];
export declare const MONTH_SEQUENCE_LEAP: readonly ["tishrei", "cheshvan", "kislev", "tevet", "shevat", "adarI", "adar", "nisan", "iyar", "sivan", "tamuz", "av", "elul"];
export declare const MONTHS_PER_CYCLE = 235;
export type HebrewMonthCode = (typeof MONTH_SEQUENCE_LEAP)[number];
export type HebrewDate = {
    year: number;
    monthIndex: number;
    day: number;
};
export type YearType = "deficient" | "regular" | "complete";
