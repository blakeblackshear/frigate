"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DayButton = DayButton;
const react_1 = __importDefault(require("react"));
/**
 * Render a button for a specific day in the calendar.
 *
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
function DayButton(props) {
    const { day, modifiers, ...buttonProps } = props;
    const ref = react_1.default.useRef(null);
    react_1.default.useEffect(() => {
        if (modifiers.focused)
            ref.current?.focus();
    }, [modifiers.focused]);
    return react_1.default.createElement("button", { ref: ref, ...buttonProps });
}
