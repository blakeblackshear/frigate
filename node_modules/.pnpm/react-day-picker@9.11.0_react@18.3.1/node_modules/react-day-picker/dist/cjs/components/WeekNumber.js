"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeekNumber = WeekNumber;
const react_1 = __importDefault(require("react"));
/**
 * Render a table cell displaying the number of the week.
 *
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
function WeekNumber(props) {
    const { week, ...thProps } = props;
    return react_1.default.createElement("th", { ...thProps });
}
