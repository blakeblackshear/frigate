"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeeks = getWeeks;
/**
 * Returns an array of calendar weeks from an array of calendar months.
 *
 * @param months The array of calendar months.
 * @returns An array of calendar weeks.
 */
function getWeeks(months) {
    const initialWeeks = [];
    return months.reduce((weeks, month) => {
        return weeks.concat(month.weeks.slice());
    }, initialWeeks.slice());
}
