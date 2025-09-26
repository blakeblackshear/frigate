"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStyleForModifiers = getStyleForModifiers;
const UI_js_1 = require("../UI.js");
/**
 * Returns the computed style for a day based on its modifiers.
 *
 * This function merges the base styles for the day with any styles associated
 * with active modifiers.
 *
 * @param dayModifiers The modifiers applied to the day.
 * @param styles The base styles for the calendar elements.
 * @param modifiersStyles The styles associated with specific modifiers.
 * @returns The computed style for the day.
 */
function getStyleForModifiers(dayModifiers, styles = {}, modifiersStyles = {}) {
    let style = { ...styles?.[UI_js_1.UI.Day] };
    Object.entries(dayModifiers)
        .filter(([, active]) => active === true)
        .forEach(([modifier]) => {
        style = {
            ...style,
            ...modifiersStyles?.[modifier],
        };
    });
    return style;
}
