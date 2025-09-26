import { format as dfFormat } from "date-fns";
/** Format override adding +543 to year tokens for Buddhist Era (BE). */
export function format(date, formatStr, options) {
    const beYear = date.getFullYear() + 543;
    switch (formatStr) {
        case "LLLL y":
        case "LLLL yyyy":
            return `${dfFormat(date, "LLLL", options)} ${beYear}`;
        case "LLLL":
            return dfFormat(date, "LLLL", options);
        case "yyyy":
            return String(beYear).padStart(4, "0");
        case "y":
            return String(beYear);
        case "yyyy-MM":
            return `${beYear}-${dfFormat(date, "MM", options)}`;
        case "yyyy-MM-dd":
            return `${beYear}-${dfFormat(date, "MM", options)}-${dfFormat(date, "dd", options)}`;
        case "PPP":
        case "PPPP": {
            const raw = dfFormat(date, formatStr, options);
            return raw.replace(/(.*)(\d{4})(?!.*\d)/, (_m, pre) => `${pre}${beYear}`);
        }
        default:
            return dfFormat(date, formatStr, options);
    }
}
