/**
 * Generates a series of 7 days, starting from the beginning of the week, to use
 * for formatting weekday names (e.g., Monday, Tuesday, etc.).
 *
 * @param dateLib The date library to use for date manipulation.
 * @param ISOWeek Whether to use ISO week numbering (weeks start on Monday).
 * @param broadcastCalendar Whether to use the broadcast calendar (weeks start
 *   on Monday, but may include adjustments for broadcast-specific rules).
 * @returns An array of 7 dates representing the weekdays.
 */
export function getWeekdays(dateLib, ISOWeek, broadcastCalendar) {
    const today = dateLib.today();
    const start = broadcastCalendar
        ? dateLib.startOfBroadcastWeek(today, dateLib)
        : ISOWeek
            ? dateLib.startOfISOWeek(today)
            : dateLib.startOfWeek(today);
    const days = [];
    for (let i = 0; i < 7; i++) {
        const day = dateLib.addDays(start, i);
        days.push(day);
    }
    return days;
}
