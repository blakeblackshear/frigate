"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endOfBroadcastWeek = endOfBroadcastWeek;
const getBroadcastWeeksInMonth_js_1 = require("./getBroadcastWeeksInMonth.js");
const startOfBroadcastWeek_js_1 = require("./startOfBroadcastWeek.js");
/**
 * Returns the end date of the week in the broadcast calendar.
 *
 * The broadcast week ends on the last day of the last broadcast week for the
 * given date.
 *
 * @since 9.4.0
 * @param date The date for which to calculate the end of the broadcast week.
 * @param dateLib The date library to use for date manipulation.
 * @returns The end date of the broadcast week.
 */
function endOfBroadcastWeek(date, dateLib) {
    const startDate = (0, startOfBroadcastWeek_js_1.startOfBroadcastWeek)(date, dateLib);
    const numberOfWeeks = (0, getBroadcastWeeksInMonth_js_1.getBroadcastWeeksInMonth)(date, dateLib);
    const endDate = dateLib.addDays(startDate, numberOfWeeks * 7 - 1);
    return endDate;
}
