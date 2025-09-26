import React, { type HTMLAttributes, type MouseEventHandler } from "react";
/**
 * Render the navigation toolbar with buttons to navigate between months.
 *
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
export declare function Nav(props: {
    /** Handler for the previous month button click. */
    onPreviousClick?: MouseEventHandler<HTMLButtonElement>;
    /** Handler for the next month button click. */
    onNextClick?: MouseEventHandler<HTMLButtonElement>;
    /** The date of the previous month, if available. */
    previousMonth?: Date | undefined;
    /** The date of the next month, if available. */
    nextMonth?: Date | undefined;
} & HTMLAttributes<HTMLElement>): React.JSX.Element;
export type NavProps = Parameters<typeof Nav>[0];
