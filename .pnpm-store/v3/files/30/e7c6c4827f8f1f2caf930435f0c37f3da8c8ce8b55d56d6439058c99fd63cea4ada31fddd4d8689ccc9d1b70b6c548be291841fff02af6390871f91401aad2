/**
 * Determines the initial month to display in the calendar based on the provided
 * props.
 *
 * This function calculates the starting month, considering constraints such as
 * `startMonth`, `endMonth`, and the number of months to display.
 *
 * @param props The DayPicker props, including navigation and date constraints.
 * @param dateLib The date library to use for date manipulation.
 * @returns The initial month to display.
 */
export function getInitialMonth(props, navStart, navEnd, dateLib) {
    const { month, defaultMonth, today = dateLib.today(), numberOfMonths = 1, } = props;
    let initialMonth = month || defaultMonth || today;
    const { differenceInCalendarMonths, addMonths, startOfMonth } = dateLib;
    if (navEnd &&
        differenceInCalendarMonths(navEnd, initialMonth) < numberOfMonths - 1) {
        const offset = -1 * (numberOfMonths - 1);
        initialMonth = addMonths(navEnd, offset);
    }
    if (navStart && differenceInCalendarMonths(initialMonth, navStart) < 0) {
        initialMonth = navStart;
    }
    return startOfMonth(initialMonth);
}
