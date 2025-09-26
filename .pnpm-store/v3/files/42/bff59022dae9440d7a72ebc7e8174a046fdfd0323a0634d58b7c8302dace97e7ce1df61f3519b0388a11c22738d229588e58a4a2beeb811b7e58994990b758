import React from "react";
/**
 * Render a button for a specific day in the calendar.
 *
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
export function DayButton(props) {
    const { day, modifiers, ...buttonProps } = props;
    const ref = React.useRef(null);
    React.useEffect(() => {
        if (modifiers.focused)
            ref.current?.focus();
    }, [modifiers.focused]);
    return React.createElement("button", { ref: ref, ...buttonProps });
}
