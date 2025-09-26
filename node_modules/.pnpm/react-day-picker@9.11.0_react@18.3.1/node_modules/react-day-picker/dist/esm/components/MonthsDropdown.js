import React from "react";
import { useDayPicker } from "../useDayPicker.js";
/**
 * Render a dropdown to navigate between months in the calendar.
 *
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
export function MonthsDropdown(props) {
    const { components } = useDayPicker();
    return React.createElement(components.Dropdown, { ...props });
}
