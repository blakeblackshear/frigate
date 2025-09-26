import React, { type HTMLAttributes } from "react";
import type { CalendarMonth } from "../classes/index.js";
/**
 * Render the caption for a month in the calendar.
 *
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
export declare function MonthCaption(props: {
    /** The month to display in the caption. */
    calendarMonth: CalendarMonth;
    /** The index of the month being displayed. */
    displayIndex: number;
} & HTMLAttributes<HTMLDivElement>): React.JSX.Element;
export type MonthCaptionProps = Parameters<typeof MonthCaption>[0];
