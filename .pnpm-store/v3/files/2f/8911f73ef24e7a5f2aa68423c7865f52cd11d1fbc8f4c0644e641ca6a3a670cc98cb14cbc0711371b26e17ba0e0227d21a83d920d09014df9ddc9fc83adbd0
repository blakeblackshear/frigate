/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
export declare const NEWLINE_REGEXP: RegExp;
export declare function getTerminalParts(regexp: RegExp | string): Array<{
    start: string;
    end: string;
}>;
export declare function isMultilineComment(regexp: RegExp | string): boolean;
/**
 * A set of all characters that are considered whitespace by the '\s' RegExp character class.
 * Taken from [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Character_classes).
 */
export declare const whitespaceCharacters: string[];
export declare function isWhitespace(value: RegExp | string): boolean;
export declare function escapeRegExp(value: string): string;
export declare function getCaseInsensitivePattern(keyword: string): string;
/**
 * Determines whether the given input has a partial match with the specified regex.
 * @param regex The regex to partially match against
 * @param input The input string
 * @returns Whether any match exists.
 */
export declare function partialMatches(regex: RegExp | string, input: string): boolean;
/**
 * Builds a partial regex from the input regex. A partial regex is able to match incomplete input strings. E.g.
 * a partial regex constructed from `/ab/` is able to match the string `a` without needing a following `b` character. However it won't match `b` alone.
 * @param regex The input regex to be converted.
 * @returns A partial regex constructed from the input regex.
 */
export declare function partialRegExp(regex: RegExp | string): RegExp;
//# sourceMappingURL=regexp-utils.d.ts.map