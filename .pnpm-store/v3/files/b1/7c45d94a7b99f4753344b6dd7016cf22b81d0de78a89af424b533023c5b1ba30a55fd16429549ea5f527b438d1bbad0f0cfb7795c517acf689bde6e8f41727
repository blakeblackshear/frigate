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
exports.amET = exports.getDateLib = exports.enUS = void 0;
exports.DayPicker = DayPicker;
const react_1 = __importDefault(require("react"));
const index_js_1 = require("../index.js");
const ethiopicDateLib = __importStar(require("./lib/index.js"));
const am_ET_js_1 = __importDefault(require("./locale/am-ET.js"));
var en_US_1 = require("date-fns/locale/en-US");
Object.defineProperty(exports, "enUS", { enumerable: true, get: function () { return en_US_1.enUS; } });
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
function DayPicker(props) {
    return (react_1.default.createElement(index_js_1.DayPicker, { ...props, locale: props.locale ?? am_ET_js_1.default, numerals: props.numerals ?? "geez", 
        // Pass overrides, not a DateLib instance
        dateLib: ethiopicDateLib }));
}
/** Returns the date library used in the calendar. */
const getDateLib = (options) => {
    return new index_js_1.DateLib(options, ethiopicDateLib);
};
exports.getDateLib = getDateLib;
// Export a minimal Amharic (Ethiopia) date-fns locale that uses Intl
var am_ET_js_2 = require("./locale/am-ET.js");
Object.defineProperty(exports, "amET", { enumerable: true, get: function () { return am_ET_js_2.amET; } });
