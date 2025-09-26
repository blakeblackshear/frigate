import { DayFlag, SelectionState, UI } from "../UI.js";
/**
 * Returns the class names for a day based on its modifiers.
 *
 * This function combines the base class name for the day with any class names
 * associated with active modifiers.
 *
 * @param modifiers The modifiers applied to the day.
 * @param classNames The base class names for the calendar elements.
 * @param modifiersClassNames The class names associated with specific
 *   modifiers.
 * @returns An array of class names for the day.
 */
export function getClassNamesForModifiers(modifiers, classNames, modifiersClassNames = {}) {
    const modifierClassNames = Object.entries(modifiers)
        .filter(([, active]) => active === true)
        .reduce((previousValue, [key]) => {
        if (modifiersClassNames[key]) {
            previousValue.push(modifiersClassNames[key]);
        }
        else if (classNames[DayFlag[key]]) {
            previousValue.push(classNames[DayFlag[key]]);
        }
        else if (classNames[SelectionState[key]]) {
            previousValue.push(classNames[SelectionState[key]]);
        }
        return previousValue;
    }, [classNames[UI.Day]]);
    return modifierClassNames;
}
