/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { Rule, BaseParser, LLkLookaheadStrategy, ILookaheadValidationError, IOrAlt, OptionalProductionType } from "chevrotain";
export type AmbiguityReport = (message: string) => void;
export interface LLStarLookaheadOptions {
    logging?: AmbiguityReport;
}
export declare class LLStarLookaheadStrategy extends LLkLookaheadStrategy {
    private atn;
    private dfas;
    private logging;
    constructor(options?: LLStarLookaheadOptions);
    initialize(options: {
        rules: Rule[];
    }): void;
    validateAmbiguousAlternationAlternatives(): ILookaheadValidationError[];
    validateEmptyOrAlternatives(): ILookaheadValidationError[];
    buildLookaheadForAlternation(options: {
        prodOccurrence: number;
        rule: Rule;
        maxLookahead: number;
        hasPredicates: boolean;
        dynamicTokensEnabled: boolean;
    }): (this: BaseParser, orAlts?: IOrAlt<any>[] | undefined) => number | undefined;
    buildLookaheadForOptional(options: {
        prodOccurrence: number;
        prodType: OptionalProductionType;
        rule: Rule;
        maxLookahead: number;
        dynamicTokensEnabled: boolean;
    }): (this: BaseParser) => boolean;
}
//# sourceMappingURL=all-star-lookahead.d.ts.map