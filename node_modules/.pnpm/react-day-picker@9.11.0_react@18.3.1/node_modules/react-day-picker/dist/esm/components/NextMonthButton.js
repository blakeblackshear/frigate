import React from "react";
import { useDayPicker } from "../useDayPicker.js";
/**
 * Render the button to navigate to the next month in the calendar.
 *
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
export function NextMonthButton(props) {
    const { components } = useDayPicker();
    return React.createElement(components.Button, { ...props });
}
