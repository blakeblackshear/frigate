import type { DateLib } from "./classes/DateLib.js";
import type { DayPickerProps } from "./types/index.js";
import type { Selection } from "./types/selection.js";
/**
 * Determines the appropriate selection hook to use based on the selection mode
 * and returns the corresponding selection object.
 *
 * @template T - The type of DayPicker props.
 * @param props - The DayPicker props.
 * @param dateLib - The date utility library instance.
 * @returns The selection object for the specified mode, or `undefined` if no
 *   mode is set.
 */
export declare function useSelection<T extends DayPickerProps>(props: T, dateLib: DateLib): Selection<T> | undefined;
