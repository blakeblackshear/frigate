"use strict";
exports.DateParser = void 0;
var _constants = require("../constants.cjs");
var _Parser = require("../Parser.cjs");

var _utils = require("../utils.cjs");

var _index = require("../../../_core/getMonth.cjs");
var _index2 = require("../../../_core/setDate.cjs");
var _index3 = require("../../../_core/getFullYear.cjs");

const DAYS_IN_MONTH = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
const DAYS_IN_MONTH_LEAP_YEAR = [
  31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30,
];

// Day of the month
class DateParser extends _Parser.Parser {
  priority = 90;
  subPriority = 1;

  parse(dateString, token, match) {
    switch (token) {
      case "d":
        return (0, _utils.parseNumericPattern)(
          _constants.numericPatterns.date,
          dateString,
        );
      case "do":
        return match.ordinalNumber(dateString, { unit: "date" });
      default:
        return (0, _utils.parseNDigits)(token.length, dateString);
    }
  }

  validate(date, value) {
    const year = (0, _index3.getFullYear)(date);
    const isLeapYear = (0, _utils.isLeapYearIndex)(year);
    const month = (0, _index.getMonth)(date);
    if (isLeapYear) {
      return value >= 1 && value <= DAYS_IN_MONTH_LEAP_YEAR[month];
    } else {
      return value >= 1 && value <= DAYS_IN_MONTH[month];
    }
  }

  set(date, _flags, value) {
    (0, _index2.setDate)(date, value);
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
exports.DateParser = DateParser;
