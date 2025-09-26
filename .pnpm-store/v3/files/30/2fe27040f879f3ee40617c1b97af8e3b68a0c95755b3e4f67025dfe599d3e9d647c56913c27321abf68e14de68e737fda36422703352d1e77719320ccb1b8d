/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * This service implements a [fuzzy matching](https://en.wikipedia.org/wiki/Approximate_string_matching) method.
 */
export interface FuzzyMatcher {
    /**
     * Performs [fuzzy matching](https://en.wikipedia.org/wiki/Approximate_string_matching).
     *
     * Fuzzy matching improves search/completion user experience by allowing to omit characters.
     * For example, a query such as `FuMa` matches the text `FuzzyMatcher`.
     *
     * @param query The user input search query.
     * @param text The text that should be matched against the query.
     * @returns Whether the query matches the text.
     */
    match(query: string, text: string): boolean;
}

export class DefaultFuzzyMatcher implements FuzzyMatcher {

    match(query: string, text: string): boolean {
        if (query.length === 0) {
            return true;
        }

        let matchedFirstCharacter = false;
        let previous: number | undefined;
        let character = 0;
        const len = text.length;
        for (let i = 0; i < len; i++) {
            const strChar = text.charCodeAt(i);
            const testChar = query.charCodeAt(character);
            if (strChar === testChar || this.toUpperCharCode(strChar) === this.toUpperCharCode(testChar)) {
                matchedFirstCharacter ||=
                    previous === undefined || // Beginning of word
                    this.isWordTransition(previous, strChar);
                if (matchedFirstCharacter) {
                    character++;
                }
                if (character === query.length) {
                    return true;
                }
            }
            previous = strChar;
        }
        return false;
    }

    protected isWordTransition(previous: number, current: number): boolean {
        return a <= previous && previous <= z && A <= current && current <= Z || // camelCase transition
            previous === _ && current !== _; // snake_case transition
    }

    protected toUpperCharCode(charCode: number) {
        if (a <= charCode && charCode <= z) {
            return charCode - 32;
        }
        return charCode;
    }
}

const a = 'a'.charCodeAt(0);
const z = 'z'.charCodeAt(0);
const A = 'A'.charCodeAt(0);
const Z = 'Z'.charCodeAt(0);
const _ = '_'.charCodeAt(0);
