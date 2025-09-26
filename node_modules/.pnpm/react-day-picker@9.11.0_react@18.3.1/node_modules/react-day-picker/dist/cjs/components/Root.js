"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Root = Root;
const react_1 = __importDefault(require("react"));
/**
 * Render the root element of the calendar.
 *
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
function Root(props) {
    const { rootRef, ...rest } = props;
    return react_1.default.createElement("div", { ...rest, ref: rootRef });
}
