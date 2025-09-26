import { numericPatterns } from "../constants.js";
import { Parser } from "../Parser.js";

import {
  isLeapYearIndex,
  parseNDigits,
  parseNumericPattern,
} from "../utils.js";

import { getMonth as coreGetMonth } from "../../../_core/getMonth.js";
import { setDate as coreSetDate } from "../../../_core/setDate.js";
import { getFullYear as coreGetFullYear } from "../../../_core/getFullYear.js";

const DAYS_IN_MONTH = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
const DAYS_IN_MONTH_LEAP_YEAR = [
  31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30,
];

// Day of the month
export class DateParser extends Parser {
  priority = 90;
  subPriority = 1;

  parse(dateString, token, match) {
    switch (token) {
      case "d":
        return parseNumericPattern(numericPatterns.date, dateString);
      case "do":
        return match.ordinalNumber(dateString, { unit: "date" });
      default:
        return parseNDigits(token.length, dateString);
    }
  }

  validate(date, value) {
    const year = coreGetFullYear(date);
    const isLeapYear = isLeapYearIndex(year);
    const month = coreGetMonth(date);
    if (isLeapYear) {
      return value >= 1 && value <= DAYS_IN_MONTH_LEAP_YEAR[month];
    } else {
      return value >= 1 && value <= DAYS_IN_MONTH[month];
    }
  }

  set(date, _flags, value) {
    coreSetDate(date, value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  incompatibleTokens = [
    "Y",
    "R",
    "q",
    "Q",
    "w",
    "I",
    "D",
    "i",
    "e",
    "c",
    "t",
    "T",
  ];
}
