"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarMonth = void 0;
/**
 * Represents a month in a calendar year.
 *
 * A `CalendarMonth` contains the weeks within the month and the date of the
 * month.
 */
class CalendarMonth {
    constructor(month, weeks) {
        this.date = month;
        this.weeks = weeks;
    }
}
exports.CalendarMonth = CalendarMonth;
