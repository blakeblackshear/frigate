import * as components from "../components/custom-components.js";
/**
 * Merges custom components from the props with the default components.
 *
 * This function ensures that any custom components provided in the props
 * override the default components.
 *
 * @param customComponents The custom components provided in the DayPicker
 *   props.
 * @returns An object containing the merged components.
 */
export function getComponents(customComponents) {
    return {
        ...components,
        ...customComponents,
    };
}
