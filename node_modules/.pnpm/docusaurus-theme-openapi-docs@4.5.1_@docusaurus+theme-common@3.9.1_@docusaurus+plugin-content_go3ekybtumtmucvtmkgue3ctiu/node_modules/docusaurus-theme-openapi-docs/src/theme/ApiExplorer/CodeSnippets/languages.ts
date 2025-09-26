/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import find from "lodash/find";
import mergeWith from "lodash/mergeWith";
import unionBy from "lodash/unionBy";
import codegen from "postman-code-generators";

import { CodeSample, Language } from "./code-snippets-types";

export function mergeCodeSampleLanguage(
  languages: Language[],
  codeSamples: CodeSample[]
): Language[] {
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

export const mergeArraysbyLanguage = (arr1: any, arr2: any) => {
  const mergedArray = unionBy(arr1, arr2, "language");

  return mergedArray.map((item: any) => {
    const matchingItems = [
      find(arr1, ["language", item["language"]]),
      find(arr2, ["language", item["language"]]),
    ];
    return mergeWith({}, ...matchingItems, (objValue: any) => {
      return objValue;
    });
  });
};

export function getCodeSampleSourceFromLanguage(language: Language) {
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

export function generateLanguageSet() {
  const languageSet: Language[] = [];
  codegen.getLanguageList().forEach((language: any) => {
    const variants: any = [];
    language.variants.forEach((variant: any) => {
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
