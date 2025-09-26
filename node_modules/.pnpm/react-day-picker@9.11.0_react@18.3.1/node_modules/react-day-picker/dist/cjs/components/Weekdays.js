"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Weekdays = Weekdays;
const react_1 = __importDefault(require("react"));
/**
 * Render the table row containing the weekday names.
 *
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
function Weekdays(props) {
    return (react_1.default.createElement("thead", { "aria-hidden": true },
        react_1.default.createElement("tr", { ...props })));
}
