import React, { type HTMLAttributes } from "react";
import type { CalendarMonth } from "../classes/CalendarMonth.js";
/**
 * Render the grid with the weekday header row and the weeks for a specific
 * month.
 *
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
export declare function Month(props: {
    /** The month to display in the grid. */
    calendarMonth: CalendarMonth;
    /** The index of the month being displayed. */
    displayIndex: number;
} & HTMLAttributes<HTMLDivElement>): React.JSX.Element;
export type MonthProps = Parameters<typeof Month>[0];
