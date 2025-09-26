/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { IToken } from 'chevrotain';
import * as ast from '../../languages/generated/ast.js';
export interface NextFeature<T extends ast.AbstractElement = ast.AbstractElement> {
    /**
     * A feature that could appear during completion.
     */
    feature: T;
    /**
     * The type that carries this `feature`. Only set if we encounter a new type.
     */
    type?: string;
    /**
     * The container property for the new `type`
     */
    property?: string;
}
/**
 * Calculates any features that can follow the given feature stack.
 * This also includes features following optional features and features from previously called rules that could follow the last feature.
 * @param featureStack A stack of features starting at the entry rule and ending at the feature of the current cursor position.
 * @param unparsedTokens All tokens which haven't been parsed successfully yet. This is the case when we call this function inside an alternative.
 * @returns Any `AbstractElement` that could be following the given feature stack.
 */
export declare function findNextFeatures(featureStack: NextFeature[][], unparsedTokens: IToken[]): NextFeature[];
/**
 * Calculates the first child feature of any `AbstractElement`.
 * @param next The `AbstractElement` whose first child features should be calculated.
 */
export declare function findFirstFeatures(next: ast.AbstractElement | NextFeature): NextFeature[];
//# sourceMappingURL=follow-element-computation.d.ts.map