import { formatDistance } from "./fa-IR/_lib/formatDistance.js";
import { formatLong } from "./fa-IR/_lib/formatLong.js";
import { formatRelative } from "./fa-IR/_lib/formatRelative.js";
import { localize } from "./fa-IR/_lib/localize.js";
import { match } from "./fa-IR/_lib/match.js";

/**
 * @category Locales
 * @summary Persian/Farsi locale (Iran).
 * @language Persian
 * @iso-639-2 ira
 * @author Seyyed Morteza Moosavi [@smmoosavi]{@link https://github.com/smmoosavi}
 */
export const faIR = {
  code: "fa-IR",
  formatDistance: formatDistance,
  formatLong: formatLong,
  formatRelative: formatRelative,
  localize: localize,
  match: match,
  options: {
    weekStartsOn: 6 /* Sat */,
    firstWeekContainsDate: 1,
  },
};

// Fallback for modularized imports:
export default faIR;
