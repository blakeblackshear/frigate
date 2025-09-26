import { enUS } from "date-fns/locale/en-US";
/**
 * Minimal Amharic (Ethiopia) locale for date-fns v4.
 *
 * - Uses `Intl.DateTimeFormat('am-ET')` to localize month and weekday names.
 * - Reuses `en-US` implementations for `formatLong`, `formatDistance`,
 *   `formatRelative`, and `match` to keep the footprint small.
 * - Ordinals are returned as plain numeric strings.
 */
// Map date-fns widths to Intl widths
function mapWidth(width) {
    switch (width) {
        case "narrow":
            return "narrow";
        case "short":
        case "abbreviated":
            return "short";
        default:
            return "long";
    }
}
function buildMonthNames(width) {
    const intlWidth = mapWidth(width);
    const fmt = new Intl.DateTimeFormat("am-ET", {
        month: intlWidth,
        timeZone: "UTC",
    });
    const names = [];
    for (let i = 0; i < 12; i++) {
        // Use a fixed UTC date to avoid locale-specific DST artifacts
        names.push(fmt.format(new Date(Date.UTC(2017, i, 1))));
    }
    return names;
}
function buildDayNames(width) {
    const intlWidth = mapWidth(width);
    const fmt = new Intl.DateTimeFormat("am-ET", {
        weekday: intlWidth,
        timeZone: "UTC",
    });
    const names = [];
    // 2017-01-01 was a Sunday; iterate 0..6
    const base = Date.UTC(2017, 0, 1);
    for (let i = 0; i < 7; i++) {
        names.push(fmt.format(new Date(base + i * 24 * 60 * 60 * 1000)));
    }
    return names;
}
function getDayPeriod(value, width) {
    if (value === "am" || value === "pm") {
        const sampleHour = value === "am" ? 1 : 13;
        const parts = new Intl.DateTimeFormat("am-ET", {
            hour: "numeric",
            hour12: true,
            timeZone: "UTC",
        })
            .formatToParts(new Date(Date.UTC(2017, 0, 1, sampleHour)))
            .find((p) => p.type === "dayPeriod");
        if (parts?.value)
            return parts.value;
    }
    // Fallback: delegate to en-US for anything else
    return enUS.localize.dayPeriod(value, { width: width });
}
const localize = {
    ...enUS.localize,
    // Ordinals in Amharic are commonly written as cardinals; keep simple numeric output
    ordinalNumber: (n) => String(n),
    month: (value, options) => {
        const names = buildMonthNames(options?.width);
        // value is 0..11 in date-fns v4
        return names[value];
    },
    day: (value, options) => {
        const names = buildDayNames(options?.width);
        // value is 0..6, where 0 = Sunday
        return names[value];
    },
    dayPeriod: (value, options) => getDayPeriod(value, options?.width),
};
const options = {
    weekStartsOn: 1,
    firstWeekContainsDate: 1,
};
/** Amharic (Ethiopia) locale backed by Intl for core names. */
export const amET = {
    code: "am-ET",
    // Reuse en-US for distance/relative formatting and formatLong skeletons
    formatDistance: enUS.formatDistance,
    formatRelative: enUS.formatRelative,
    formatLong: enUS.formatLong,
    localize,
    match: enUS.match,
    options,
};
export default amET;
