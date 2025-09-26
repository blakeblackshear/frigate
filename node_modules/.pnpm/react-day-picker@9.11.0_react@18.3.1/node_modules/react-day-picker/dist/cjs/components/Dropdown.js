"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dropdown = Dropdown;
const react_1 = __importDefault(require("react"));
const UI_js_1 = require("../UI.js");
/**
 * Render a dropdown component for navigation in the calendar.
 *
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
function Dropdown(props) {
    const { options, className, components, classNames, ...selectProps } = props;
    const cssClassSelect = [classNames[UI_js_1.UI.Dropdown], className].join(" ");
    const selectedOption = options?.find(({ value }) => value === selectProps.value);
    return (react_1.default.createElement("span", { "data-disabled": selectProps.disabled, className: classNames[UI_js_1.UI.DropdownRoot] },
        react_1.default.createElement(components.Select, { className: cssClassSelect, ...selectProps }, options?.map(({ value, label, disabled }) => (react_1.default.createElement(components.Option, { key: value, value: value, disabled: disabled }, label)))),
        react_1.default.createElement("span", { className: classNames[UI_js_1.UI.CaptionLabel], "aria-hidden": true },
            selectedOption?.label,
            react_1.default.createElement(components.Chevron, { orientation: "down", size: 18, className: classNames[UI_js_1.UI.Chevron] }))));
}
