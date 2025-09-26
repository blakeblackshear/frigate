import { Animation, DayFlag, SelectionState, UI } from "../UI.js";
/**
 * Returns the default class names for the UI elements.
 *
 * This function generates a mapping of default class names for various UI
 * elements, day flags, selection states, and animations.
 *
 * @returns An object containing the default class names.
 * @group Utilities
 */
export function getDefaultClassNames() {
    const classNames = {};
    for (const key in UI) {
        classNames[UI[key]] =
            `rdp-${UI[key]}`;
    }
    for (const key in DayFlag) {
        classNames[DayFlag[key]] =
            `rdp-${DayFlag[key]}`;
    }
    for (const key in SelectionState) {
        classNames[SelectionState[key]] =
            `rdp-${SelectionState[key]}`;
    }
    for (const key in Animation) {
        classNames[Animation[key]] =
            `rdp-${Animation[key]}`;
    }
    return classNames;
}
