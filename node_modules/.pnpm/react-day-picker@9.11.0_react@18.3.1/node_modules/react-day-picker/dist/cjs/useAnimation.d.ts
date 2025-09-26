import type React from "react";
import type { CalendarDay } from "./classes/CalendarDay.js";
import type { CalendarMonth } from "./classes/CalendarMonth.js";
import type { DateLib } from "./classes/DateLib.js";
import type { ClassNames } from "./types/shared.js";
/**
 * Handles animations for transitioning between months in the DayPicker
 * component.
 *
 * @private
 * @param rootElRef - A reference to the root element of the DayPicker
 *   component.
 * @param enabled - Whether animations are enabled.
 * @param options - Configuration options for the animation, including class
 *   names, months, focused day, and the date utility library.
 */
export declare function useAnimation(rootElRef: React.RefObject<HTMLDivElement | null>, enabled: boolean, { classNames, months, focused, dateLib, }: {
    classNames: ClassNames;
    months: CalendarMonth[];
    focused: CalendarDay | undefined;
    dateLib: DateLib;
}): void;
