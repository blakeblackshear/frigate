import { CalendarDay, CalendarMonth, CalendarWeek } from "../classes/index.js";
/**
 * Returns the months to display in the calendar.
 *
 * This function generates `CalendarMonth` objects for each month to be
 * displayed, including their weeks and days, based on the provided display
 * months and dates.
 *
 * @param displayMonths The months (as dates) to display in the calendar.
 * @param dates The dates to display in the calendar.
 * @param props Options from the DayPicker props context.
 * @param dateLib The date library to use for date manipulation.
 * @returns An array of `CalendarMonth` objects representing the months to
 *   display.
 */
export function getMonths(displayMonths, dates, props, dateLib) {
    const { addDays, endOfBroadcastWeek, endOfISOWeek, endOfMonth, endOfWeek, getISOWeek, getWeek, startOfBroadcastWeek, startOfISOWeek, startOfWeek, } = dateLib;
    const dayPickerMonths = displayMonths.reduce((months, month) => {
        const firstDateOfFirstWeek = props.broadcastCalendar
            ? startOfBroadcastWeek(month, dateLib)
            : props.ISOWeek
                ? startOfISOWeek(month)
                : startOfWeek(month);
        const lastDateOfLastWeek = props.broadcastCalendar
            ? endOfBroadcastWeek(month)
            : props.ISOWeek
                ? endOfISOWeek(endOfMonth(month))
                : endOfWeek(endOfMonth(month));
        /** The dates to display in the month. */
        const monthDates = dates.filter((date) => {
            return date >= firstDateOfFirstWeek && date <= lastDateOfLastWeek;
        });
        const nrOfDaysWithFixedWeeks = props.broadcastCalendar ? 35 : 42;
        if (props.fixedWeeks && monthDates.length < nrOfDaysWithFixedWeeks) {
            const extraDates = dates.filter((date) => {
                const daysToAdd = nrOfDaysWithFixedWeeks - monthDates.length;
                return (date > lastDateOfLastWeek &&
                    date <= addDays(lastDateOfLastWeek, daysToAdd));
            });
            monthDates.push(...extraDates);
        }
        const weeks = monthDates.reduce((weeks, date) => {
            const weekNumber = props.ISOWeek ? getISOWeek(date) : getWeek(date);
            const week = weeks.find((week) => week.weekNumber === weekNumber);
            const day = new CalendarDay(date, month, dateLib);
            if (!week) {
                weeks.push(new CalendarWeek(weekNumber, [day]));
            }
            else {
                week.days.push(day);
            }
            return weeks;
        }, []);
        const dayPickerMonth = new CalendarMonth(month, weeks);
        months.push(dayPickerMonth);
        return months;
    }, []);
    if (!props.reverseMonths) {
        return dayPickerMonths;
    }
    else {
        return dayPickerMonths.reverse();
    }
}
