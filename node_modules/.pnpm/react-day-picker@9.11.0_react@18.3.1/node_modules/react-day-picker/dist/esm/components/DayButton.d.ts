import React, { type ButtonHTMLAttributes } from "react";
import type { CalendarDay } from "../classes/index.js";
import type { Modifiers } from "../types/index.js";
/**
 * Render a button for a specific day in the calendar.
 *
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
export declare function DayButton(props: {
    /** The day to render. */
    day: CalendarDay;
    /** The modifiers to apply to the day. */
    modifiers: Modifiers;
} & ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element;
export type DayButtonProps = Parameters<typeof DayButton>[0];
