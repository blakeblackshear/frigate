"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDates = getDates;
/**
 * Returns all the dates to display in the calendar.
 *
 * This function calculates the range of dates to display based on the provided
 * display months, constraints, and calendar configuration.
 *
 * @param displayMonths The months to display in the calendar.
 * @param maxDate The maximum date to include in the range.
 * @param props The DayPicker props, including calendar configuration options.
 * @param dateLib The date library to use for date manipulation.
 * @returns An array of dates to display in the calendar.
 */
function getDates(displayMonths, maxDate, props, dateLib) {
    const firstMonth = displayMonths[0];
    const lastMonth = displayMonths[displayMonths.length - 1];
    const { ISOWeek, fixedWeeks, broadcastCalendar } = props ?? {};
    const { addDays, differenceInCalendarDays, differenceInCalendarMonths, endOfBroadcastWeek, endOfISOWeek, endOfMonth, endOfWeek, isAfter, startOfBroadcastWeek, startOfISOWeek, startOfWeek, } = dateLib;
    const startWeekFirstDate = broadcastCalendar
        ? startOfBroadcastWeek(firstMonth, dateLib)
        : ISOWeek
            ? startOfISOWeek(firstMonth)
            : startOfWeek(firstMonth);
    const endWeekLastDate = broadcastCalendar
        ? endOfBroadcastWeek(lastMonth)
        : ISOWeek
            ? endOfISOWeek(endOfMonth(lastMonth))
            : endOfWeek(endOfMonth(lastMonth));
    const nOfDays = differenceInCalendarDays(endWeekLastDate, startWeekFirstDate);
    const nOfMonths = differenceInCalendarMonths(lastMonth, firstMonth) + 1;
    const dates = [];
    for (let i = 0; i <= nOfDays; i++) {
        const date = addDays(startWeekFirstDate, i);
        if (maxDate && isAfter(date, maxDate)) {
            break;
        }
        dates.push(date);
    }
    // If fixed weeks is enabled, add the extra dates to the array
    const nrOfDaysWithFixedWeeks = broadcastCalendar ? 35 : 42;
    const extraDates = nrOfDaysWithFixedWeeks * nOfMonths;
    if (fixedWeeks && dates.length < extraDates) {
        const daysToAdd = extraDates - dates.length;
        for (let i = 0; i < daysToAdd; i++) {
            const date = addDays(dates[dates.length - 1], 1);
            dates.push(date);
        }
    }
    return dates;
}
