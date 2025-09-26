"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultClassNames = getDefaultClassNames;
const UI_js_1 = require("../UI.js");
/**
 * Returns the default class names for the UI elements.
 *
 * This function generates a mapping of default class names for various UI
 * elements, day flags, selection states, and animations.
 *
 * @returns An object containing the default class names.
 * @group Utilities
 */
function getDefaultClassNames() {
    const classNames = {};
    for (const key in UI_js_1.UI) {
        classNames[UI_js_1.UI[key]] =
            `rdp-${UI_js_1.UI[key]}`;
    }
    for (const key in UI_js_1.DayFlag) {
        classNames[UI_js_1.DayFlag[key]] =
            `rdp-${UI_js_1.DayFlag[key]}`;
    }
    for (const key in UI_js_1.SelectionState) {
        classNames[UI_js_1.SelectionState[key]] =
            `rdp-${UI_js_1.SelectionState[key]}`;
    }
    for (const key in UI_js_1.Animation) {
        classNames[UI_js_1.Animation[key]] =
            `rdp-${UI_js_1.Animation[key]}`;
    }
    return classNames;
}
