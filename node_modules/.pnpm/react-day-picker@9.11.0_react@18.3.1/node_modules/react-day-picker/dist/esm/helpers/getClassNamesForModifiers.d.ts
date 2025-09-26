import type { ClassNames, ModifiersClassNames } from "../types/index.js";
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
export declare function getClassNamesForModifiers(modifiers: Record<string, boolean>, classNames: ClassNames, modifiersClassNames?: ModifiersClassNames): string[];
