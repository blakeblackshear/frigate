/**
 * Represents a week in a calendar month.
 *
 * A `CalendarWeek` contains the days within the week and the week number.
 */
export class CalendarWeek {
    constructor(weekNumber, days) {
        this.days = days;
        this.weekNumber = weekNumber;
    }
}
