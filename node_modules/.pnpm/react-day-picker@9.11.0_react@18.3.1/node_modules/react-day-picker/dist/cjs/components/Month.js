"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Month = Month;
const react_1 = __importDefault(require("react"));
/**
 * Render the grid with the weekday header row and the weeks for a specific
 * month.
 *
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
function Month(props) {
    const { calendarMonth, displayIndex, ...divProps } = props;
    return react_1.default.createElement("div", { ...divProps }, props.children);
}
