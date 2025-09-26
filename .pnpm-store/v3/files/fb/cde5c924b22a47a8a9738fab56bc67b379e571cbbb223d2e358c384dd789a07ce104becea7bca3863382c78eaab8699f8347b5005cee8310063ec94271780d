import { Parser } from "../Parser.js";

import { parseNDigitsSigned } from "../utils.js";

import { setFullYear as coreSetFullYear } from "../../../_core/setFullYear.js";

export class ExtendedYearParser extends Parser {
  priority = 130;

  parse(dateString, token) {
    if (token === "u") {
      return parseNDigitsSigned(4, dateString);
    }

    return parseNDigitsSigned(token.length, dateString);
  }

  set(date, _flags, value) {
    coreSetFullYear(date, value, 0, 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  incompatibleTokens = ["G", "y", "Y", "R", "w", "I", "i", "e", "c", "t", "T"];
}
