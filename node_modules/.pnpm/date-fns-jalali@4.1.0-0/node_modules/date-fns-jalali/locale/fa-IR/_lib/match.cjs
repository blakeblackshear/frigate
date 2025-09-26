"use strict";
exports.match = void 0;

var _index = require("../../_lib/buildMatchFn.cjs");
var _index2 = require("../../_lib/buildMatchPatternFn.cjs");

const matchOrdinalNumberPattern = /^(\d+)(-?ام)?/i;
const parseOrdinalNumberPattern = /\d+/i;

const matchEraPatterns = {
  narrow: /^(ق|ب)/i,
  abbreviated: /^(ق\.?\s?ه\.?|ب\.?\s?ه\.?|ه\.?)/i,
  wide: /^(قبل از هجرت|هجری شمسی|بعد از هجرت)/i,
};
const parseEraPatterns = {
  any: [/^قبل/i, /^بعد/i],
};

const matchQuarterPatterns = {
  narrow: /^[1234]/i,

  abbreviated: /^(ف|Q|س‌م)[1234]/i,
  wide: /^(فصل|quarter|سه‌ماهه) [1234](-ام|ام)?/i,
};
const parseQuarterPatterns = {
  any: [/1/i, /2/i, /3/i, /4/i],
};

const matchMonthPatterns = {
  narrow: /^(فر|ار|خر|تی|مر|شه|مه|آب|آذ|دی|به|اس)/i,
  abbreviated: /^(فرو|ارد|خرد|تیر|مرد|شهر|مهر|آبا|آذر|دی|بهم|اسف)/i,
  wide: /^(فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند)/i,
};
const parseMonthPatterns = {
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
    /^اس/i,
  ],

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
    /^اس/i,
  ],
};

const matchDayPatterns = {
  narrow: /^[شیدسچپج]/i,
  short: /^(ش|ج|1ش|2ش|3ش|4ش|5ش)/i,
  abbreviated: /^(یکشنبه|دوشنبه|سه‌شنبه|چهارشنبه|پنج‌شنبه|جمعه|شنبه)/i,
  wide: /^(یکشنبه|دوشنبه|سه‌شنبه|چهارشنبه|پنج‌شنبه|جمعه|شنبه)/i,
};
const parseDayPatterns = {
  narrow: [/^ی/i, /^دو/i, /^س/i, /^چ/i, /^پ/i, /^ج/i, /^ش/i],
  any: [
    /^(ی|1ش|یکشنبه)/i,
    /^(د|2ش|دوشنبه)/i,
    /^(س|3ش|سه‌شنبه)/i,
    /^(چ|4ش|چهارشنبه)/i,
    /^(پ|5ش|پنجشنبه)/i,
    /^(ج|جمعه)/i,
    /^(ش|شنبه)/i,
  ],
};

const matchDayPeriodPatterns = {
  narrow: /^(ب|ق|ن|ظ|ص|ب.ظ.|ع|ش)/i,
  any: /^(ق.ظ.|ب.ظ.|قبل‌ازظهر|نیمه‌شب|ظهر|صبح|بعدازظهر|عصر|شب)/i,
};
const parseDayPeriodPatterns = {
  any: {
    am: /^(ق|ق.ظ.|قبل‌ازظهر)/i,
    pm: /^(ب|ب.ظ.|بعدازظهر)/i,
    midnight: /^(‌نیمه‌شب|ن)/i,
    noon: /^(ظ|ظهر)/i,
    morning: /^(ص|صبح)/i,
    afternoon: /^(ب|ب.ظ.|بعدازظهر)/i,
    evening: /^(ع|عصر)/i,
    night: /^(ش|شب)/i,
  },
};

const match = (exports.match = {
  ordinalNumber: (0, _index2.buildMatchPatternFn)({
    matchPattern: matchOrdinalNumberPattern,
    parsePattern: parseOrdinalNumberPattern,
    valueCallback: (value) => parseInt(value, 10),
  }),

  era: (0, _index.buildMatchFn)({
    matchPatterns: matchEraPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseEraPatterns,
    defaultParseWidth: "any",
  }),

  quarter: (0, _index.buildMatchFn)({
    matchPatterns: matchQuarterPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseQuarterPatterns,
    defaultParseWidth: "any",
    valueCallback: (index) => index + 1,
  }),

  month: (0, _index.buildMatchFn)({
    matchPatterns: matchMonthPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseMonthPatterns,
    defaultParseWidth: "any",
  }),

  day: (0, _index.buildMatchFn)({
    matchPatterns: matchDayPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseDayPatterns,
    defaultParseWidth: "any",
  }),

  dayPeriod: (0, _index.buildMatchFn)({
    matchPatterns: matchDayPeriodPatterns,
    defaultMatchWidth: "any",
    parsePatterns: parseDayPeriodPatterns,
    defaultParseWidth: "any",
  }),
});
