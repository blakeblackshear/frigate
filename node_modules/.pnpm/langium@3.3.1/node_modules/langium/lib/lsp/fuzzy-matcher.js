/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
export class DefaultFuzzyMatcher {
    match(query, text) {
        if (query.length === 0) {
            return true;
        }
        let matchedFirstCharacter = false;
        let previous;
        let character = 0;
        const len = text.length;
        for (let i = 0; i < len; i++) {
            const strChar = text.charCodeAt(i);
            const testChar = query.charCodeAt(character);
            if (strChar === testChar || this.toUpperCharCode(strChar) === this.toUpperCharCode(testChar)) {
                matchedFirstCharacter || (matchedFirstCharacter = previous === undefined || // Beginning of word
                    this.isWordTransition(previous, strChar));
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
    isWordTransition(previous, current) {
        return a <= previous && previous <= z && A <= current && current <= Z || // camelCase transition
            previous === _ && current !== _; // snake_case transition
    }
    toUpperCharCode(charCode) {
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
//# sourceMappingURL=fuzzy-matcher.js.map