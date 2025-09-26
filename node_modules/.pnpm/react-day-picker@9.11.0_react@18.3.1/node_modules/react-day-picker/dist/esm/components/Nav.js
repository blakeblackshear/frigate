import React, { useCallback, } from "react";
import { UI } from "../UI.js";
import { useDayPicker } from "../useDayPicker.js";
/**
 * Render the navigation toolbar with buttons to navigate between months.
 *
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
export function Nav(props) {
    const { onPreviousClick, onNextClick, previousMonth, nextMonth, ...navProps } = props;
    const { components, classNames, labels: { labelPrevious, labelNext }, } = useDayPicker();
    const handleNextClick = useCallback((e) => {
        if (nextMonth) {
            onNextClick?.(e);
        }
    }, [nextMonth, onNextClick]);
    const handlePreviousClick = useCallback((e) => {
        if (previousMonth) {
            onPreviousClick?.(e);
        }
    }, [previousMonth, onPreviousClick]);
    return (React.createElement("nav", { ...navProps },
        React.createElement(components.PreviousMonthButton, { type: "button", className: classNames[UI.PreviousMonthButton], tabIndex: previousMonth ? undefined : -1, "aria-disabled": previousMonth ? undefined : true, "aria-label": labelPrevious(previousMonth), onClick: handlePreviousClick },
            React.createElement(components.Chevron, { disabled: previousMonth ? undefined : true, className: classNames[UI.Chevron], orientation: "left" })),
        React.createElement(components.NextMonthButton, { type: "button", className: classNames[UI.NextMonthButton], tabIndex: nextMonth ? undefined : -1, "aria-disabled": nextMonth ? undefined : true, "aria-label": labelNext(nextMonth), onClick: handleNextClick },
            React.createElement(components.Chevron, { disabled: nextMonth ? undefined : true, orientation: "right", className: classNames[UI.Chevron] }))));
}
