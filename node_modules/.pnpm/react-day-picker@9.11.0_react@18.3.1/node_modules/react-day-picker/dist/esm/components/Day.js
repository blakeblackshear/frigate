import React from "react";
/**
 * Render a grid cell for a specific day in the calendar.
 *
 * Handles interaction and focus for the day. If you only need to change the
 * content of the day cell, consider swapping the `DayButton` component
 * instead.
 *
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
export function Day(props) {
    const { day, modifiers, ...tdProps } = props;
    return React.createElement("td", { ...tdProps });
}
