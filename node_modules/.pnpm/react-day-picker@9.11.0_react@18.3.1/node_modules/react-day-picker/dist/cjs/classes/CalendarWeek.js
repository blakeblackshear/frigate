"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarWeek = void 0;
/**
 * Represents a week in a calendar month.
 *
 * A `CalendarWeek` contains the days within the week and the week number.
 */
class CalendarWeek {
    constructor(weekNumber, days) {
        this.days = days;
        this.weekNumber = weekNumber;
    }
}
exports.CalendarWeek = CalendarWeek;
