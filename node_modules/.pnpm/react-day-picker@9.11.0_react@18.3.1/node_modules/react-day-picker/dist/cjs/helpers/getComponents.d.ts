import type { CustomComponents, DayPickerProps } from "../types/index.js";
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
export declare function getComponents(customComponents: DayPickerProps["components"]): CustomComponents;
