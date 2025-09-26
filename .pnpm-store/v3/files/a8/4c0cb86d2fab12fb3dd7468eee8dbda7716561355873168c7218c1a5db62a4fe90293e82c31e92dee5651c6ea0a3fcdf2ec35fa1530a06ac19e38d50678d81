(() => {
var _window$dateFnsJalali;function _typeof(o) {"@babel/helpers - typeof";return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) {return typeof o;} : function (o) {return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;}, _typeof(o);}function ownKeys(e, r) {var t = Object.keys(e);if (Object.getOwnPropertySymbols) {var o = Object.getOwnPropertySymbols(e);r && (o = o.filter(function (r) {return Object.getOwnPropertyDescriptor(e, r).enumerable;})), t.push.apply(t, o);}return t;}function _objectSpread(e) {for (var r = 1; r < arguments.length; r++) {var t = null != arguments[r] ? arguments[r] : {};r % 2 ? ownKeys(Object(t), !0).forEach(function (r) {_defineProperty(e, r, t[r]);}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) {Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));});}return e;}function _defineProperty(obj, key, value) {key = _toPropertyKey(key);if (key in obj) {Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true });} else {obj[key] = value;}return obj;}function _toPropertyKey(t) {var i = _toPrimitive(t, "string");return "symbol" == _typeof(i) ? i : String(i);}function _toPrimitive(t, r) {if ("object" != _typeof(t) || !t) return t;var e = t[Symbol.toPrimitive];if (void 0 !== e) {var i = e.call(t, r || "default");if ("object" != _typeof(i)) return i;throw new TypeError("@@toPrimitive must return a primitive value.");}return ("string" === r ? String : Number)(t);}var __defProp = Object.defineProperty;
var __export = function __export(target, all) {
  for (var name in all)
  __defProp(target, name, {
    get: all[name],
    enumerable: true,
    configurable: true,
    set: function set(newValue) {return all[name] = function () {return newValue;};}
  });
};

// ../../../../../../tmp/date-fns-jalali/locale.js
var exports_locale = {};
__export(exports_locale, {
  faIR: function faIR() {return _faIR;},
  enUS: function enUS() {return _enUS;}
});

// ../../../../../../tmp/date-fns-jalali/locale/en-US/_lib/formatDistance.js
var formatDistanceLocale = {
  lessThanXSeconds: {
    one: "less than a second",
    other: "less than {{count}} seconds"
  },
  xSeconds: {
    one: "1 second",
    other: "{{count}} seconds"
  },
  halfAMinute: "half a minute",
  lessThanXMinutes: {
    one: "less than a minute",
    other: "less than {{count}} minutes"
  },
  xMinutes: {
    one: "1 minute",
    other: "{{count}} minutes"
  },
  aboutXHours: {
    one: "about 1 hour",
    other: "about {{count}} hours"
  },
  xHours: {
    one: "1 hour",
    other: "{{count}} hours"
  },
  xDays: {
    one: "1 day",
    other: "{{count}} days"
  },
  aboutXWeeks: {
    one: "about 1 week",
    other: "about {{count}} weeks"
  },
  xWeeks: {
    one: "1 week",
    other: "{{count}} weeks"
  },
  aboutXMonths: {
    one: "about 1 month",
    other: "about {{count}} months"
  },
  xMonths: {
    one: "1 month",
    other: "{{count}} months"
  },
  aboutXYears: {
    one: "about 1 year",
    other: "about {{count}} years"
  },
  xYears: {
    one: "1 year",
    other: "{{count}} years"
  },
  overXYears: {
    one: "over 1 year",
    other: "over {{count}} years"
  },
  almostXYears: {
    one: "almost 1 year",
    other: "almost {{count}} years"
  }
};
var formatDistance = function formatDistance(token, count, options) {
  var result;
  var tokenValue = formatDistanceLocale[token];
  if (typeof tokenValue === "string") {
    result = tokenValue;
  } else if (count === 1) {
    result = tokenValue.one;
  } else {
    result = tokenValue.other.replace("{{count}}", count.toString());
  }
  if (options !== null && options !== void 0 && options.addSuffix) {
    if (options.comparison && options.comparison > 0) {
      return "in " + result;
    } else {
      return result + " ago";
    }
  }
  return result;
};

// ../../../../../../tmp/date-fns-jalali/locale/_lib/buildFormatLongFn.js
function buildFormatLongFn(args) {
  return function () {var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var width = options.width ? String(options.width) : args.defaultWidth;
    var format = args.formats[width] || args.formats[args.defaultWidth];
    return format;
  };
}

// ../../../../../../tmp/date-fns-jalali/locale/en-US/_lib/formatLong.js
var dateFormats = {
  full: "EEEE, MMMM do, y",
  long: "MMMM do, y",
  medium: "MMM d, y",
  short: "MM/dd/yyyy"
};
var timeFormats = {
  full: "h:mm:ss a zzzz",
  long: "h:mm:ss a z",
  medium: "h:mm:ss a",
  short: "h:mm a"
};
var dateTimeFormats = {
  full: "{{date}} 'at' {{time}}",
  long: "{{date}} 'at' {{time}}",
  medium: "{{date}}, {{time}}",
  short: "{{date}}, {{time}}"
};
var formatLong = {
  date: buildFormatLongFn({
    formats: dateFormats,
    defaultWidth: "full"
  }),
  time: buildFormatLongFn({
    formats: timeFormats,
    defaultWidth: "full"
  }),
  dateTime: buildFormatLongFn({
    formats: dateTimeFormats,
    defaultWidth: "full"
  })
};

// ../../../../../../tmp/date-fns-jalali/locale/en-US/_lib/formatRelative.js
var formatRelativeLocale = {
  lastWeek: "'last' eeee 'at' p",
  yesterday: "'yesterday at' p",
  today: "'today at' p",
  tomorrow: "'tomorrow at' p",
  nextWeek: "eeee 'at' p",
  other: "P"
};
var formatRelative = function formatRelative(token, _date, _baseDate, _options) {return formatRelativeLocale[token];};

// ../../../../../../tmp/date-fns-jalali/locale/_lib/buildLocalizeFn.js
function buildLocalizeFn(args) {
  return function (value, options) {
    var context = options !== null && options !== void 0 && options.context ? String(options.context) : "standalone";
    var valuesArray;
    if (context === "formatting" && args.formattingValues) {
      var defaultWidth = args.defaultFormattingWidth || args.defaultWidth;
      var width = options !== null && options !== void 0 && options.width ? String(options.width) : defaultWidth;
      valuesArray = args.formattingValues[width] || args.formattingValues[defaultWidth];
    } else {
      var _defaultWidth = args.defaultWidth;
      var _width = options !== null && options !== void 0 && options.width ? String(options.width) : args.defaultWidth;
      valuesArray = args.values[_width] || args.values[_defaultWidth];
    }
    var index = args.argumentCallback ? args.argumentCallback(value) : value;
    return valuesArray[index];
  };
}

// ../../../../../../tmp/date-fns-jalali/locale/en-US/_lib/localize.js
var eraValues = {
  narrow: ["B", "A"],
  abbreviated: ["BC", "AD"],
  wide: ["Before Christ", "Anno Domini"]
};
var quarterValues = {
  narrow: ["1", "2", "3", "4"],
  abbreviated: ["Q1", "Q2", "Q3", "Q4"],
  wide: ["1st quarter", "2nd quarter", "3rd quarter", "4th quarter"]
};
var monthValues = {
  narrow: ["F", "O", "K", "T", "M", "S", "M", "A", "A", "D", "B", "E"],
  abbreviated: [
  "Far",
  "Ord",
  "Kho",
  "Tir",
  "Mor",
  "Sha",
  "Meh",
  "Aba",
  "Aza",
  "Day",
  "Bah",
  "Esf"],

  wide: [
  "Farvardin",
  "Ordibehesht",
  "Khordad",
  "Tir",
  "Mordad",
  "Sharivar",
  "Mehr",
  "Aban",
  "Azar",
  "Day",
  "Bahman",
  "Esfand"]

};
var dayValues = {
  narrow: ["S", "M", "T", "W", "T", "F", "S"],
  short: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  abbreviated: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  wide: [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"]

};
var dayPeriodValues = {
  narrow: {
    am: "a",
    pm: "p",
    midnight: "mi",
    noon: "n",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  },
  abbreviated: {
    am: "AM",
    pm: "PM",
    midnight: "midnight",
    noon: "noon",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  },
  wide: {
    am: "a.m.",
    pm: "p.m.",
    midnight: "midnight",
    noon: "noon",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  }
};
var formattingDayPeriodValues = {
  narrow: {
    am: "a",
    pm: "p",
    midnight: "mi",
    noon: "n",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  },
  abbreviated: {
    am: "AM",
    pm: "PM",
    midnight: "midnight",
    noon: "noon",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  },
  wide: {
    am: "a.m.",
    pm: "p.m.",
    midnight: "midnight",
    noon: "noon",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  }
};
var ordinalNumber = function ordinalNumber(dirtyNumber, _options) {
  var number = Number(dirtyNumber);
  var rem100 = number % 100;
  if (rem100 > 20 || rem100 < 10) {
    switch (rem100 % 10) {
      case 1:
        return number + "st";
      case 2:
        return number + "nd";
      case 3:
        return number + "rd";
    }
  }
  return number + "th";
};
var localize = {
  ordinalNumber: ordinalNumber,
  era: buildLocalizeFn({
    values: eraValues,
    defaultWidth: "wide"
  }),
  quarter: buildLocalizeFn({
    values: quarterValues,
    defaultWidth: "wide",
    argumentCallback: function argumentCallback(quarter) {return quarter - 1;}
  }),
  month: buildLocalizeFn({
    values: monthValues,
    defaultWidth: "wide"
  }),
  day: buildLocalizeFn({
    values: dayValues,
    defaultWidth: "wide"
  }),
  dayPeriod: buildLocalizeFn({
    values: dayPeriodValues,
    defaultWidth: "wide",
    formattingValues: formattingDayPeriodValues,
    defaultFormattingWidth: "wide"
  })
};

// ../../../../../../tmp/date-fns-jalali/locale/_lib/buildMatchFn.js
function buildMatchFn(args) {
  return function (string) {var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var width = options.width;
    var matchPattern = width && args.matchPatterns[width] || args.matchPatterns[args.defaultMatchWidth];
    var matchResult = string.match(matchPattern);
    if (!matchResult) {
      return null;
    }
    var matchedString = matchResult[0];
    var parsePatterns = width && args.parsePatterns[width] || args.parsePatterns[args.defaultParseWidth];
    var key = Array.isArray(parsePatterns) ? findIndex(parsePatterns, function (pattern) {return pattern.test(matchedString);}) : findKey(parsePatterns, function (pattern) {return pattern.test(matchedString);});
    var value;
    value = args.valueCallback ? args.valueCallback(key) : key;
    value = options.valueCallback ? options.valueCallback(value) : value;
    var rest = string.slice(matchedString.length);
    return { value: value, rest: rest };
  };
}
function findKey(object, predicate) {
  for (var key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key) && predicate(object[key])) {
      return key;
    }
  }
  return;
}
function findIndex(array, predicate) {
  for (var key = 0; key < array.length; key++) {
    if (predicate(array[key])) {
      return key;
    }
  }
  return;
}

// ../../../../../../tmp/date-fns-jalali/locale/_lib/buildMatchPatternFn.js
function buildMatchPatternFn(args) {
  return function (string) {var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var matchResult = string.match(args.matchPattern);
    if (!matchResult)
    return null;
    var matchedString = matchResult[0];
    var parseResult = string.match(args.parsePattern);
    if (!parseResult)
    return null;
    var value = args.valueCallback ? args.valueCallback(parseResult[0]) : parseResult[0];
    value = options.valueCallback ? options.valueCallback(value) : value;
    var rest = string.slice(matchedString.length);
    return { value: value, rest: rest };
  };
}

// ../../../../../../tmp/date-fns-jalali/locale/en-US/_lib/match.js
var matchOrdinalNumberPattern = /^(\d+)(th|st|nd|rd)?/i;
var parseOrdinalNumberPattern = /\d+/i;
var matchEraPatterns = {
  narrow: /^(b|a)/i,
  abbreviated: /^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,
  wide: /^(before christ|before common era|anno domini|common era)/i
};
var parseEraPatterns = {
  any: [/^b/i, /^(a|c)/i]
};
var matchQuarterPatterns = {
  narrow: /^[1234]/i,
  abbreviated: /^q[1234]/i,
  wide: /^[1234](th|st|nd|rd)? quarter/i
};
var parseQuarterPatterns = {
  any: [/1/i, /2/i, /3/i, /4/i]
};
var matchMonthPatterns = {
  narrow: /^[foktmsadbe]/i,
  abbreviated: /^(far|ord|kho|tir|mor|sha|meh|aba|aza|day|bah|esf)/i,
  wide: /^(farvardin|ordibehesht|khordad|tir|mordad|sharivar|mehr|aban|azar|day|bahman|esfand)/i
};
var parseMonthPatterns = {
  narrow: [
  /^f/i,
  /^o/i,
  /^k/i,
  /^t/i,
  /^m/i,
  /^s/i,
  /^m/i,
  /^a/i,
  /^a/i,
  /^d/i,
  /^b/i,
  /^e/i],

  any: [
  /^f/i,
  /^o/i,
  /^kh/i,
  /^t/i,
  /^mo/i,
  /^s/i,
  /^me/i,
  /^ab/i,
  /^az/i,
  /^d/i,
  /^b/i,
  /^e/i]

};
var matchDayPatterns = {
  narrow: /^[smtwf]/i,
  short: /^(su|mo|tu|we|th|fr|sa)/i,
  abbreviated: /^(sun|mon|tue|wed|thu|fri|sat)/i,
  wide: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
};
var parseDayPatterns = {
  narrow: [/^s/i, /^m/i, /^t/i, /^w/i, /^t/i, /^f/i, /^s/i],
  any: [/^su/i, /^m/i, /^tu/i, /^w/i, /^th/i, /^f/i, /^sa/i]
};
var matchDayPeriodPatterns = {
  narrow: /^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,
  any: /^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i
};
var parseDayPeriodPatterns = {
  any: {
    am: /^a/i,
    pm: /^p/i,
    midnight: /^mi/i,
    noon: /^no/i,
    morning: /morning/i,
    afternoon: /afternoon/i,
    evening: /evening/i,
    night: /night/i
  }
};
var match = {
  ordinalNumber: buildMatchPatternFn({
    matchPattern: matchOrdinalNumberPattern,
    parsePattern: parseOrdinalNumberPattern,
    valueCallback: function valueCallback(value) {return parseInt(value, 10);}
  }),
  era: buildMatchFn({
    matchPatterns: matchEraPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseEraPatterns,
    defaultParseWidth: "any"
  }),
  quarter: buildMatchFn({
    matchPatterns: matchQuarterPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseQuarterPatterns,
    defaultParseWidth: "any",
    valueCallback: function valueCallback(index) {return index + 1;}
  }),
  month: buildMatchFn({
    matchPatterns: matchMonthPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseMonthPatterns,
    defaultParseWidth: "any"
  }),
  day: buildMatchFn({
    matchPatterns: matchDayPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseDayPatterns,
    defaultParseWidth: "any"
  }),
  dayPeriod: buildMatchFn({
    matchPatterns: matchDayPeriodPatterns,
    defaultMatchWidth: "any",
    parsePatterns: parseDayPeriodPatterns,
    defaultParseWidth: "any"
  })
};

// ../../../../../../tmp/date-fns-jalali/locale/en-US.js
var _enUS = {
  code: "en-US",
  formatDistance: formatDistance,
  formatLong: formatLong,
  formatRelative: formatRelative,
  localize: localize,
  match: match,
  options: {
    weekStartsOn: 0,
    firstWeekContainsDate: 1
  }
};
// ../../../../../../tmp/date-fns-jalali/locale/fa-IR/_lib/formatDistance.js
var formatDistanceLocale2 = {
  lessThanXSeconds: {
    one: "\u06A9\u0645\u062A\u0631 \u0627\u0632 \u06CC\u06A9 \u062B\u0627\u0646\u06CC\u0647",
    other: "\u06A9\u0645\u062A\u0631 \u0627\u0632 {{count}} \u062B\u0627\u0646\u06CC\u0647"
  },
  xSeconds: {
    one: "1 \u062B\u0627\u0646\u06CC\u0647",
    other: "{{count}} \u062B\u0627\u0646\u06CC\u0647"
  },
  halfAMinute: "\u0646\u06CC\u0645 \u062F\u0642\u06CC\u0642\u0647",
  lessThanXMinutes: {
    one: "\u06A9\u0645\u062A\u0631 \u0627\u0632 \u06CC\u06A9 \u062F\u0642\u06CC\u0642\u0647",
    other: "\u06A9\u0645\u062A\u0631 \u0627\u0632 {{count}} \u062F\u0642\u06CC\u0642\u0647"
  },
  xMinutes: {
    one: "1 \u062F\u0642\u06CC\u0642\u0647",
    other: "{{count}} \u062F\u0642\u06CC\u0642\u0647"
  },
  aboutXHours: {
    one: "\u062D\u062F\u0648\u062F 1 \u0633\u0627\u0639\u062A",
    other: "\u062D\u062F\u0648\u062F {{count}} \u0633\u0627\u0639\u062A"
  },
  xHours: {
    one: "1 \u0633\u0627\u0639\u062A",
    other: "{{count}} \u0633\u0627\u0639\u062A"
  },
  xDays: {
    one: "1 \u0631\u0648\u0632",
    other: "{{count}} \u0631\u0648\u0632"
  },
  aboutXWeeks: {
    one: "\u062D\u062F\u0648\u062F 1 \u0647\u0641\u062A\u0647",
    other: "\u062D\u062F\u0648\u062F {{count}} \u0647\u0641\u062A\u0647"
  },
  xWeeks: {
    one: "1 \u0647\u0641\u062A\u0647",
    other: "{{count}} \u0647\u0641\u062A\u0647"
  },
  aboutXMonths: {
    one: "\u062D\u062F\u0648\u062F 1 \u0645\u0627\u0647",
    other: "\u062D\u062F\u0648\u062F {{count}} \u0645\u0627\u0647"
  },
  xMonths: {
    one: "1 \u0645\u0627\u0647",
    other: "{{count}} \u0645\u0627\u0647"
  },
  aboutXYears: {
    one: "\u062D\u062F\u0648\u062F 1 \u0633\u0627\u0644",
    other: "\u062D\u062F\u0648\u062F {{count}} \u0633\u0627\u0644"
  },
  xYears: {
    one: "1 \u0633\u0627\u0644",
    other: "{{count}} \u0633\u0627\u0644"
  },
  overXYears: {
    one: "\u0628\u06CC\u0634\u062A\u0631 \u0627\u0632 1 \u0633\u0627\u0644",
    other: "\u0628\u06CC\u0634\u062A\u0631 \u0627\u0632 {{count}} \u0633\u0627\u0644"
  },
  almostXYears: {
    one: "\u0646\u0632\u062F\u06CC\u06A9 1 \u0633\u0627\u0644",
    other: "\u0646\u0632\u062F\u06CC\u06A9 {{count}} \u0633\u0627\u0644"
  }
};
var formatDistance3 = function formatDistance3(token, count, options) {
  var result;
  var tokenValue = formatDistanceLocale2[token];
  if (typeof tokenValue === "string") {
    result = tokenValue;
  } else if (count === 1) {
    result = tokenValue.one;
  } else {
    result = tokenValue.other.replace("{{count}}", count.toString());
  }
  if (options !== null && options !== void 0 && options.addSuffix) {
    if (options.comparison && options.comparison > 0) {
      return "\u062F\u0631 " + result;
    } else {
      return result + " \u0642\u0628\u0644";
    }
  }
  return result;
};

// ../../../../../../tmp/date-fns-jalali/locale/fa-IR/_lib/formatLong.js
var dateFormats2 = {
  full: "EEEE do MMMM y",
  long: "do MMMM y",
  medium: "d MMM y",
  short: "yyyy/MM/dd"
};
var timeFormats2 = {
  full: "h:mm:ss a zzzz",
  long: "h:mm:ss a z",
  medium: "h:mm:ss a",
  short: "h:mm a"
};
var dateTimeFormats2 = {
  full: "{{date}} '\u062F\u0631' {{time}}",
  long: "{{date}} '\u062F\u0631' {{time}}",
  medium: "{{date}}, {{time}}",
  short: "{{date}}, {{time}}"
};
var formatLong3 = {
  date: buildFormatLongFn({
    formats: dateFormats2,
    defaultWidth: "full"
  }),
  time: buildFormatLongFn({
    formats: timeFormats2,
    defaultWidth: "full"
  }),
  dateTime: buildFormatLongFn({
    formats: dateTimeFormats2,
    defaultWidth: "full"
  })
};

// ../../../../../../tmp/date-fns-jalali/locale/fa-IR/_lib/formatRelative.js
var formatRelativeLocale2 = {
  lastWeek: "eeee '\u06AF\u0630\u0634\u062A\u0647 \u062F\u0631' p",
  yesterday: "'\u062F\u06CC\u0631\u0648\u0632 \u062F\u0631' p",
  today: "'\u0627\u0645\u0631\u0648\u0632 \u062F\u0631' p",
  tomorrow: "'\u0641\u0631\u062F\u0627 \u062F\u0631' p",
  nextWeek: "eeee '\u062F\u0631' p",
  other: "P"
};
var formatRelative3 = function formatRelative3(token, _date, _baseDate, _options) {return formatRelativeLocale2[token];};

// ../../../../../../tmp/date-fns-jalali/locale/fa-IR/_lib/localize.js
var eraValues2 = {
  narrow: ["\u0642", "\u0628"],
  abbreviated: ["\u0642.\u0647.", "\u0628.\u0647."],
  wide: ["\u0642\u0628\u0644 \u0627\u0632 \u0647\u062C\u0631\u062A", "\u0628\u0639\u062F \u0627\u0632 \u0647\u062C\u0631\u062A"]
};
var quarterValues2 = {
  narrow: ["1", "2", "3", "4"],
  abbreviated: ["\u0633\u200C\u06451", "\u0633\u200C\u06452", "\u0633\u200C\u06453", "\u0633\u200C\u06454"],
  wide: ["\u0633\u0647\u200C\u0645\u0627\u0647\u0647 1", "\u0633\u0647\u200C\u0645\u0627\u0647\u0647 2", "\u0633\u0647\u200C\u0645\u0627\u0647\u0647 3", "\u0633\u0647\u200C\u0645\u0627\u0647\u0647 4"]
};
var monthValues2 = {
  narrow: [
  "\u0641\u0631",
  "\u0627\u0631",
  "\u062E\u0631",
  "\u062A\u06CC",
  "\u0645\u0631",
  "\u0634\u0647",
  "\u0645\u0647",
  "\u0622\u0628",
  "\u0622\u0630",
  "\u062F\u06CC",
  "\u0628\u0647",
  "\u0627\u0633"],

  abbreviated: [
  "\u0641\u0631\u0648",
  "\u0627\u0631\u062F",
  "\u062E\u0631\u062F",
  "\u062A\u06CC\u0631",
  "\u0645\u0631\u062F",
  "\u0634\u0647\u0631",
  "\u0645\u0647\u0631",
  "\u0622\u0628\u0627",
  "\u0622\u0630\u0631",
  "\u062F\u06CC",
  "\u0628\u0647\u0645",
  "\u0627\u0633\u0641"],

  wide: [
  "\u0641\u0631\u0648\u0631\u062F\u06CC\u0646",
  "\u0627\u0631\u062F\u06CC\u0628\u0647\u0634\u062A",
  "\u062E\u0631\u062F\u0627\u062F",
  "\u062A\u06CC\u0631",
  "\u0645\u0631\u062F\u0627\u062F",
  "\u0634\u0647\u0631\u06CC\u0648\u0631",
  "\u0645\u0647\u0631",
  "\u0622\u0628\u0627\u0646",
  "\u0622\u0630\u0631",
  "\u062F\u06CC",
  "\u0628\u0647\u0645\u0646",
  "\u0627\u0633\u0641\u0646\u062F"]

};
var dayValues2 = {
  narrow: ["\u06CC", "\u062F", "\u0633", "\u0686", "\u067E", "\u062C", "\u0634"],
  short: ["1\u0634", "2\u0634", "3\u0634", "4\u0634", "5\u0634", "\u062C", "\u0634"],
  abbreviated: [
  "\u06CC\u06A9\u200C\u0634\u0646\u0628\u0647",
  "\u062F\u0648\u0634\u0646\u0628\u0647",
  "\u0633\u0647\u200C\u0634\u0646\u0628\u0647",
  "\u0686\u0647\u0627\u0631\u0634\u0646\u0628\u0647",
  "\u067E\u0646\u062C\u200C\u0634\u0646\u0628\u0647",
  "\u062C\u0645\u0639\u0647",
  "\u0634\u0646\u0628\u0647"],

  wide: [
  "\u06CC\u06A9\u200C\u0634\u0646\u0628\u0647",
  "\u062F\u0648\u0634\u0646\u0628\u0647",
  "\u0633\u0647\u200C\u0634\u0646\u0628\u0647",
  "\u0686\u0647\u0627\u0631\u0634\u0646\u0628\u0647",
  "\u067E\u0646\u062C\u200C\u0634\u0646\u0628\u0647",
  "\u062C\u0645\u0639\u0647",
  "\u0634\u0646\u0628\u0647"]

};
var dayPeriodValues2 = {
  narrow: {
    am: "\u0642",
    pm: "\u0628",
    midnight: "\u0646",
    noon: "\u0638",
    morning: "\u0635",
    afternoon: "\u0628.\u0638.",
    evening: "\u0639",
    night: "\u0634"
  },
  abbreviated: {
    am: "\u0642.\u0638.",
    pm: "\u0628.\u0638.",
    midnight: "\u0646\u06CC\u0645\u0647\u200C\u0634\u0628",
    noon: "\u0638\u0647\u0631",
    morning: "\u0635\u0628\u062D",
    afternoon: "\u0628\u0639\u062F\u0627\u0632\u0638\u0647\u0631",
    evening: "\u0639\u0635\u0631",
    night: "\u0634\u0628"
  },
  wide: {
    am: "\u0642\u0628\u0644\u200C\u0627\u0632\u0638\u0647\u0631",
    pm: "\u0628\u0639\u062F\u0627\u0632\u0638\u0647\u0631",
    midnight: "\u0646\u06CC\u0645\u0647\u200C\u0634\u0628",
    noon: "\u0638\u0647\u0631",
    morning: "\u0635\u0628\u062D",
    afternoon: "\u0628\u0639\u062F\u0627\u0632\u0638\u0647\u0631",
    evening: "\u0639\u0635\u0631",
    night: "\u0634\u0628"
  }
};
var formattingDayPeriodValues2 = {
  narrow: {
    am: "\u0642",
    pm: "\u0628",
    midnight: "\u0646",
    noon: "\u0638",
    morning: "\u0635",
    afternoon: "\u0628.\u0638.",
    evening: "\u0639",
    night: "\u0634"
  },
  abbreviated: {
    am: "\u0642.\u0638.",
    pm: "\u0628.\u0638.",
    midnight: "\u0646\u06CC\u0645\u0647\u200C\u0634\u0628",
    noon: "\u0638\u0647\u0631",
    morning: "\u0635\u0628\u062D",
    afternoon: "\u0628\u0639\u062F\u0627\u0632\u0638\u0647\u0631",
    evening: "\u0639\u0635\u0631",
    night: "\u0634\u0628"
  },
  wide: {
    am: "\u0642\u0628\u0644\u200C\u0627\u0632\u0638\u0647\u0631",
    pm: "\u0628\u0639\u062F\u0627\u0632\u0638\u0647\u0631",
    midnight: "\u0646\u06CC\u0645\u0647\u200C\u0634\u0628",
    noon: "\u0638\u0647\u0631",
    morning: "\u0635\u0628\u062D",
    afternoon: "\u0628\u0639\u062F\u0627\u0632\u0638\u0647\u0631",
    evening: "\u0639\u0635\u0631",
    night: "\u0634\u0628"
  }
};
var ordinalNumber2 = function ordinalNumber2(dirtyNumber, _options) {
  var number = Number(dirtyNumber);
  return number + "-\u0627\u0645";
};
var localize3 = {
  ordinalNumber: ordinalNumber2,
  era: buildLocalizeFn({
    values: eraValues2,
    defaultWidth: "wide"
  }),
  quarter: buildLocalizeFn({
    values: quarterValues2,
    defaultWidth: "wide",
    argumentCallback: function argumentCallback(quarter) {return quarter - 1;}
  }),
  month: buildLocalizeFn({
    values: monthValues2,
    defaultWidth: "wide"
  }),
  day: buildLocalizeFn({
    values: dayValues2,
    defaultWidth: "wide"
  }),
  dayPeriod: buildLocalizeFn({
    values: dayPeriodValues2,
    defaultWidth: "wide",
    formattingValues: formattingDayPeriodValues2,
    defaultFormattingWidth: "wide"
  })
};

// ../../../../../../tmp/date-fns-jalali/locale/fa-IR/_lib/match.js
var matchOrdinalNumberPattern2 = /^(\d+)(-?ام)?/i;
var parseOrdinalNumberPattern2 = /\d+/i;
var matchEraPatterns2 = {
  narrow: /^(ق|ب)/i,
  abbreviated: /^(ق\.?\s?ه\.?|ب\.?\s?ه\.?|ه\.?)/i,
  wide: /^(قبل از هجرت|هجری شمسی|بعد از هجرت)/i
};
var parseEraPatterns2 = {
  any: [/^قبل/i, /^بعد/i]
};
var matchQuarterPatterns2 = {
  narrow: /^[1234]/i,
  abbreviated: /^(ف|Q|س‌م)[1234]/i,
  wide: /^(فصل|quarter|سه‌ماهه) [1234](-ام|ام)?/i
};
var parseQuarterPatterns2 = {
  any: [/1/i, /2/i, /3/i, /4/i]
};
var matchMonthPatterns2 = {
  narrow: /^(فر|ار|خر|تی|مر|شه|مه|آب|آذ|دی|به|اس)/i,
  abbreviated: /^(فرو|ارد|خرد|تیر|مرد|شهر|مهر|آبا|آذر|دی|بهم|اسف)/i,
  wide: /^(فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند)/i
};
var parseMonthPatterns2 = {
  narrow: [
  /^فر/i,
  /^ار/i,
  /^خر/i,
  /^تی/i,
  /^مر/i,
  /^شه/i,
  /^مه/i,
  /^آب/i,
  /^آذ/i,
  /^دی/i,
  /^به/i,
  /^اس/i],

  any: [
  /^فر/i,
  /^ار/i,
  /^خر/i,
  /^تی/i,
  /^مر/i,
  /^شه/i,
  /^مه/i,
  /^آب/i,
  /^آذ/i,
  /^دی/i,
  /^به/i,
  /^اس/i]

};
var matchDayPatterns2 = {
  narrow: /^[شیدسچپج]/i,
  short: /^(ش|ج|1ش|2ش|3ش|4ش|5ش)/i,
  abbreviated: /^(یکشنبه|دوشنبه|سه‌شنبه|چهارشنبه|پنج‌شنبه|جمعه|شنبه)/i,
  wide: /^(یکشنبه|دوشنبه|سه‌شنبه|چهارشنبه|پنج‌شنبه|جمعه|شنبه)/i
};
var parseDayPatterns2 = {
  narrow: [/^ی/i, /^دو/i, /^س/i, /^چ/i, /^پ/i, /^ج/i, /^ش/i],
  any: [
  /^(ی|1ش|یکشنبه)/i,
  /^(د|2ش|دوشنبه)/i,
  /^(س|3ش|سه‌شنبه)/i,
  /^(چ|4ش|چهارشنبه)/i,
  /^(پ|5ش|پنجشنبه)/i,
  /^(ج|جمعه)/i,
  /^(ش|شنبه)/i]

};
var matchDayPeriodPatterns2 = {
  narrow: /^(ب|ق|ن|ظ|ص|ب.ظ.|ع|ش)/i,
  any: /^(ق.ظ.|ب.ظ.|قبل‌ازظهر|نیمه‌شب|ظهر|صبح|بعدازظهر|عصر|شب)/i
};
var parseDayPeriodPatterns2 = {
  any: {
    am: /^(ق|ق.ظ.|قبل‌ازظهر)/i,
    pm: /^(ب|ب.ظ.|بعدازظهر)/i,
    midnight: /^(‌نیمه‌شب|ن)/i,
    noon: /^(ظ|ظهر)/i,
    morning: /^(ص|صبح)/i,
    afternoon: /^(ب|ب.ظ.|بعدازظهر)/i,
    evening: /^(ع|عصر)/i,
    night: /^(ش|شب)/i
  }
};
var match3 = {
  ordinalNumber: buildMatchPatternFn({
    matchPattern: matchOrdinalNumberPattern2,
    parsePattern: parseOrdinalNumberPattern2,
    valueCallback: function valueCallback(value) {return parseInt(value, 10);}
  }),
  era: buildMatchFn({
    matchPatterns: matchEraPatterns2,
    defaultMatchWidth: "wide",
    parsePatterns: parseEraPatterns2,
    defaultParseWidth: "any"
  }),
  quarter: buildMatchFn({
    matchPatterns: matchQuarterPatterns2,
    defaultMatchWidth: "wide",
    parsePatterns: parseQuarterPatterns2,
    defaultParseWidth: "any",
    valueCallback: function valueCallback(index) {return index + 1;}
  }),
  month: buildMatchFn({
    matchPatterns: matchMonthPatterns2,
    defaultMatchWidth: "wide",
    parsePatterns: parseMonthPatterns2,
    defaultParseWidth: "any"
  }),
  day: buildMatchFn({
    matchPatterns: matchDayPatterns2,
    defaultMatchWidth: "wide",
    parsePatterns: parseDayPatterns2,
    defaultParseWidth: "any"
  }),
  dayPeriod: buildMatchFn({
    matchPatterns: matchDayPeriodPatterns2,
    defaultMatchWidth: "any",
    parsePatterns: parseDayPeriodPatterns2,
    defaultParseWidth: "any"
  })
};

// ../../../../../../tmp/date-fns-jalali/locale/fa-IR.js
var _faIR = {
  code: "fa-IR",
  formatDistance: formatDistance3,
  formatLong: formatLong3,
  formatRelative: formatRelative3,
  localize: localize3,
  match: match3,
  options: {
    weekStartsOn: 6,
    firstWeekContainsDate: 1
  }
};
// ../../../../../../tmp/date-fns-jalali/locale/cdn.js
window.dateFnsJalali = _objectSpread(_objectSpread({},
window.dateFnsJalali), {}, {
  locale: _objectSpread(_objectSpread({}, (_window$dateFnsJalali =
  window.dateFnsJalali) === null || _window$dateFnsJalali === void 0 ? void 0 : _window$dateFnsJalali.locale),
  exports_locale) });



//# debugId=C0132A4A76E8A44164756E2164756E21

//# sourceMappingURL=cdn.js.map
})();