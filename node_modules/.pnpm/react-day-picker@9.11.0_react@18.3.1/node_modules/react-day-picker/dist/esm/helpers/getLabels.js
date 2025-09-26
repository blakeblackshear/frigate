import * as defaultLabels from "../labels/index.js";
/**
 * Merges custom labels from the props with the default labels.
 *
 * @param customLabels The custom labels provided in the DayPicker props.
 * @returns The merged labels object.
 */
export function getLabels(customLabels) {
    return {
        ...defaultLabels,
        ...customLabels,
    };
}
