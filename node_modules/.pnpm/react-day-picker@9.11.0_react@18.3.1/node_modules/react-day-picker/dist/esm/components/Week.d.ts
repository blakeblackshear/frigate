import React, { type HTMLAttributes } from "react";
import type { CalendarWeek } from "../classes/index.js";
/**
 * Render a table row representing a week in the calendar.
 *
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
export declare function Week(props: {
    /** The week to render. */
    week: CalendarWeek;
} & HTMLAttributes<HTMLTableRowElement>): React.JSX.Element;
export type WeekProps = Parameters<typeof Week>[0];
