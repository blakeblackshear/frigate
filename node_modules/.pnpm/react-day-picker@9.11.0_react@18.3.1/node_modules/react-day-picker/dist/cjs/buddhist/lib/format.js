"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.format = format;
const date_fns_1 = require("date-fns");
/** Format override adding +543 to year tokens for Buddhist Era (BE). */
function format(date, formatStr, options) {
    const beYear = date.getFullYear() + 543;
    switch (formatStr) {
        case "LLLL y":
        case "LLLL yyyy":
            return `${(0, date_fns_1.format)(date, "LLLL", options)} ${beYear}`;
        case "LLLL":
            return (0, date_fns_1.format)(date, "LLLL", options);
        case "yyyy":
            return String(beYear).padStart(4, "0");
        case "y":
            return String(beYear);
        case "yyyy-MM":
            return `${beYear}-${(0, date_fns_1.format)(date, "MM", options)}`;
        case "yyyy-MM-dd":
            return `${beYear}-${(0, date_fns_1.format)(date, "MM", options)}-${(0, date_fns_1.format)(date, "dd", options)}`;
        case "PPP":
        case "PPPP": {
            const raw = (0, date_fns_1.format)(date, formatStr, options);
            return raw.replace(/(.*)(\d{4})(?!.*\d)/, (_m, pre) => `${pre}${beYear}`);
        }
        default:
            return (0, date_fns_1.format)(date, formatStr, options);
    }
}
