import type { DayPickerProps } from "../types/index.js";
/**
 * Extracts `data-` attributes from the DayPicker props.
 *
 * This function collects all `data-` attributes from the props and adds
 * additional attributes based on the DayPicker configuration.
 *
 * @param props The DayPicker props.
 * @returns An object containing the `data-` attributes.
 */
export declare function getDataAttributes(props: DayPickerProps): Record<string, unknown>;
