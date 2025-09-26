import { CodeSample, Language } from "./code-snippets-types";
export declare function mergeCodeSampleLanguage(languages: Language[], codeSamples: CodeSample[]): Language[];
export declare const mergeArraysbyLanguage: (arr1: any, arr2: any) => any[];
export declare function getCodeSampleSourceFromLanguage(language: Language): string;
export declare function generateLanguageSet(): Language[];
