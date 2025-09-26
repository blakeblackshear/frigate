"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeArraysbyLanguage = void 0;
exports.mergeCodeSampleLanguage = mergeCodeSampleLanguage;
exports.getCodeSampleSourceFromLanguage = getCodeSampleSourceFromLanguage;
exports.generateLanguageSet = generateLanguageSet;
const find_1 = __importDefault(require("lodash/find"));
const mergeWith_1 = __importDefault(require("lodash/mergeWith"));
const unionBy_1 = __importDefault(require("lodash/unionBy"));
const postman_code_generators_1 = __importDefault(
  require("postman-code-generators")
);
function mergeCodeSampleLanguage(languages, codeSamples) {
  return languages.map((language) => {
    const languageCodeSamples = codeSamples.filter(
      ({ lang }) => lang === language.codeSampleLanguage
    );
    if (languageCodeSamples.length) {
      const samples = languageCodeSamples.map(({ lang }) => lang);
      const samplesLabels = languageCodeSamples.map(
        ({ label, lang }) => label || lang
      );
      const samplesSources = languageCodeSamples.map(({ source }) => source);
      return {
        ...language,
        sample: samples[0],
        samples,
        samplesSources,
        samplesLabels,
      };
    }
    return language;
  });
}
const mergeArraysbyLanguage = (arr1, arr2) => {
  const mergedArray = (0, unionBy_1.default)(arr1, arr2, "language");
  return mergedArray.map((item) => {
    const matchingItems = [
      (0, find_1.default)(arr1, ["language", item["language"]]),
      (0, find_1.default)(arr2, ["language", item["language"]]),
    ];
    return (0, mergeWith_1.default)({}, ...matchingItems, (objValue) => {
      return objValue;
    });
  });
};
exports.mergeArraysbyLanguage = mergeArraysbyLanguage;
function getCodeSampleSourceFromLanguage(language) {
  if (
    language &&
    language.sample &&
    language.samples &&
    language.samplesSources
  ) {
    const sampleIndex = language.samples.findIndex(
      (smp) => smp === language.sample
    );
    return language.samplesSources[sampleIndex];
  }
  return "";
}
function generateLanguageSet() {
  const languageSet = [];
  postman_code_generators_1.default.getLanguageList().forEach((language) => {
    const variants = [];
    language.variants.forEach((variant) => {
      variants.push(variant.key);
    });
    languageSet.push({
      highlight: language.syntax_mode,
      language: language.key,
      codeSampleLanguage: language.label,
      logoClass: language.key,
      options: {
        longFormat: false,
        followRedirect: true,
        trimRequestBody: true,
      },
      variant: variants[0],
      variants: variants,
    });
  });
  return languageSet;
}
