import React from "react";
/**
 * Render the button elements in the calendar.
 *
 * @private
 * @deprecated Use `PreviousMonthButton` or `@link NextMonthButton` instead.
 */
export function Button(props) {
    return React.createElement("button", { ...props });
}
