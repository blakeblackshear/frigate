"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDateLib = exports.enUS = exports.th = void 0;
exports.DayPicker = DayPicker;
const locales = __importStar(require("date-fns/locale"));
const react_1 = __importDefault(require("react"));
const index_js_1 = require("../index.js");
const format_js_1 = require("./lib/format.js");
// Adapter to match DateLib's format signature without using `any`.
const buddhistFormat = (date, formatStr, options) => {
    return (0, format_js_1.format)(date, formatStr, options);
};
exports.th = locales.th;
exports.enUS = locales.enUS;
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
function DayPicker(props) {
    const dateLib = (0, exports.getDateLib)({
        locale: props.locale ?? exports.th,
        weekStartsOn: props.broadcastCalendar ? 1 : props.weekStartsOn,
        firstWeekContainsDate: props.firstWeekContainsDate,
        useAdditionalWeekYearTokens: props.useAdditionalWeekYearTokens,
        useAdditionalDayOfYearTokens: props.useAdditionalDayOfYearTokens,
        timeZone: props.timeZone,
    });
    return (react_1.default.createElement(index_js_1.DayPicker, { ...props, locale: props.locale ?? exports.th, numerals: props.numerals ?? "thai", dir: props.dir ?? "ltr", dateLib: dateLib }));
}
/** Returns the date library used in the Buddhist calendar. */
const getDateLib = (options) => {
    return new index_js_1.DateLib(options, {
        format: buddhistFormat,
    });
};
exports.getDateLib = getDateLib;
