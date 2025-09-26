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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Nav = Nav;
const react_1 = __importStar(require("react"));
const UI_js_1 = require("../UI.js");
const useDayPicker_js_1 = require("../useDayPicker.js");
/**
 * Render the navigation toolbar with buttons to navigate between months.
 *
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
function Nav(props) {
    const { onPreviousClick, onNextClick, previousMonth, nextMonth, ...navProps } = props;
    const { components, classNames, labels: { labelPrevious, labelNext }, } = (0, useDayPicker_js_1.useDayPicker)();
    const handleNextClick = (0, react_1.useCallback)((e) => {
        if (nextMonth) {
            onNextClick?.(e);
        }
    }, [nextMonth, onNextClick]);
    const handlePreviousClick = (0, react_1.useCallback)((e) => {
        if (previousMonth) {
            onPreviousClick?.(e);
        }
    }, [previousMonth, onPreviousClick]);
    return (react_1.default.createElement("nav", { ...navProps },
        react_1.default.createElement(components.PreviousMonthButton, { type: "button", className: classNames[UI_js_1.UI.PreviousMonthButton], tabIndex: previousMonth ? undefined : -1, "aria-disabled": previousMonth ? undefined : true, "aria-label": labelPrevious(previousMonth), onClick: handlePreviousClick },
            react_1.default.createElement(components.Chevron, { disabled: previousMonth ? undefined : true, className: classNames[UI_js_1.UI.Chevron], orientation: "left" })),
        react_1.default.createElement(components.NextMonthButton, { type: "button", className: classNames[UI_js_1.UI.NextMonthButton], tabIndex: nextMonth ? undefined : -1, "aria-disabled": nextMonth ? undefined : true, "aria-label": labelNext(nextMonth), onClick: handleNextClick },
            react_1.default.createElement(components.Chevron, { disabled: nextMonth ? undefined : true, orientation: "right", className: classNames[UI_js_1.UI.Chevron] }))));
}
