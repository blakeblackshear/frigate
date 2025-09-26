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
export declare class DefaultFuzzyMatcher implements FuzzyMatcher {
    match(query: string, text: string): boolean;
    protected isWordTransition(previous: number, current: number): boolean;
    protected toUpperCharCode(charCode: number): number;
}
//# sourceMappingURL=fuzzy-matcher.d.ts.map