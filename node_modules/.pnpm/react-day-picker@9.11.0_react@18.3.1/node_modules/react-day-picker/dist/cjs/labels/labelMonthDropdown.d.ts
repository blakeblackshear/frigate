import type { DateLibOptions } from "../classes/DateLib.js";
/**
 * Generates the ARIA label for the months dropdown.
 *
 * @defaultValue `"Choose the Month"`
 * @param options - Optional configuration for the date formatting library.
 * @returns The ARIA label for the months dropdown.
 * @group Labels
 * @see https://daypicker.dev/docs/translation#aria-labels
 */
export declare function labelMonthDropdown(_options?: DateLibOptions): string;
