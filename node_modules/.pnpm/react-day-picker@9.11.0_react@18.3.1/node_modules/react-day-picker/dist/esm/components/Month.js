import React from "react";
/**
 * Render the grid with the weekday header row and the weeks for a specific
 * month.
 *
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
export function Month(props) {
    const { calendarMonth, displayIndex, ...divProps } = props;
    return React.createElement("div", { ...divProps }, props.children);
}
