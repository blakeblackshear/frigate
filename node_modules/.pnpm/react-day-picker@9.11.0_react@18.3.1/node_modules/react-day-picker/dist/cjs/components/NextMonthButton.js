"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NextMonthButton = NextMonthButton;
const react_1 = __importDefault(require("react"));
const useDayPicker_js_1 = require("../useDayPicker.js");
/**
 * Render the button to navigate to the next month in the calendar.
 *
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
function NextMonthButton(props) {
    const { components } = (0, useDayPicker_js_1.useDayPicker)();
    return react_1.default.createElement(components.Button, { ...props });
}
