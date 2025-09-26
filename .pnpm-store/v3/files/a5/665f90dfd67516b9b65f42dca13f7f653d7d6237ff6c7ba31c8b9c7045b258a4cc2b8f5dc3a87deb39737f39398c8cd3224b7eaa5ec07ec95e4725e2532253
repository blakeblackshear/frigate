"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDayNoEthiopian = getDayNoEthiopian;
exports.toGregorianDate = toGregorianDate;
const date_fns_1 = require("date-fns");
const isEthiopicDateValid_js_1 = require("./isEthiopicDateValid.js");
function getDayNoEthiopian(etDate) {
    const num = Math.floor(etDate.year / 4);
    const num2 = etDate.year % 4;
    return num * 1461 + num2 * 365 + (etDate.month - 1) * 30 + etDate.day - 1;
}
function gregorianDateFromDayNo(dayNum) {
    let year = 1, month = 1, day;
    const num400 = Math.floor(dayNum / 146097); // number of full 400-year periods
    dayNum %= 146097;
    if (dayNum === 0) {
        return new Date(400 * num400, 12 - 1, 31);
    }
    const num100 = Math.min(Math.floor(dayNum / 36524), 3); // number of full 100-year periods, but not more than 3
    dayNum -= num100 * 36524;
    if (dayNum === 0) {
        return new Date(400 * num400 + 100 * num100, 12 - 1, 31);
    }
    const num4 = Math.floor(dayNum / 1461); // number of full 4-year periods
    dayNum %= 1461;
    if (dayNum === 0) {
        return new Date(400 * num400 + 100 * num100 + 4 * num4, 12 - 1, 31);
    }
    const num1 = Math.min(Math.floor(dayNum / 365), 3); // number of full years, but not more than 3
    dayNum -= num1 * 365;
    if (dayNum === 0) {
        return new Date(400 * num400 + 100 * num100 + 4 * num4 + num1, 12 - 1, 31);
    }
    year += 400 * num400 + 100 * num100 + 4 * num4 + num1;
    while (dayNum > 0) {
        const tempDate = new Date(year, month - 1);
        const daysInMonth = (0, date_fns_1.getDaysInMonth)(tempDate);
        if (dayNum <= daysInMonth) {
            day = dayNum;
            break;
        }
        dayNum -= daysInMonth;
        month++;
    }
    // Remember in JavaScript Date object, months are 0-based.
    return new Date(year, month - 1, day);
}
/**
 * Converts an Ethiopic date to a Gregorian date.
 *
 * @param ethiopicDate - An EthiopicDate object.
 * @returns A JavaScript Date object representing the Gregorian date.
 */
function toGregorianDate(ethiopicDate) {
    if (!(0, isEthiopicDateValid_js_1.isEthiopicDateValid)(ethiopicDate)) {
        throw new Error("Invalid Ethiopic date");
    }
    return gregorianDateFromDayNo(getDayNoEthiopian(ethiopicDate) + 2431);
}
