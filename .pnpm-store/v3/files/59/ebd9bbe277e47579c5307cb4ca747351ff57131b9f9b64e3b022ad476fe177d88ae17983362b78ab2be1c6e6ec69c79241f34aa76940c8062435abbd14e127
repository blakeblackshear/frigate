import { SemanticTokens, SemanticTokensPartialResult, SemanticTokensDelta, SemanticTokensDeltaPartialResult, SemanticTokensParams, SemanticTokensDeltaParams, SemanticTokensRangeParams, SemanticTokensEdit, Disposable } from 'vscode-languageserver-protocol';
import type { Feature, _Languages, ServerRequestHandler } from './server';
/**
 * Shape of the semantic token feature
 *
 * @since 3.16.0
 */
export interface SemanticTokensFeatureShape {
    semanticTokens: {
        refresh(): void;
        on(handler: ServerRequestHandler<SemanticTokensParams, SemanticTokens, SemanticTokensPartialResult, void>): Disposable;
        onDelta(handler: ServerRequestHandler<SemanticTokensDeltaParams, SemanticTokensDelta | SemanticTokens, SemanticTokensDeltaPartialResult | SemanticTokensPartialResult, void>): Disposable;
        onRange(handler: ServerRequestHandler<SemanticTokensRangeParams, SemanticTokens, SemanticTokensPartialResult, void>): Disposable;
    };
}
export declare const SemanticTokensFeature: Feature<_Languages, SemanticTokensFeatureShape>;
export declare class SemanticTokensDiff {
    private readonly originalSequence;
    private readonly modifiedSequence;
    constructor(originalSequence: number[], modifiedSequence: number[]);
    computeDiff(): SemanticTokensEdit[];
}
export declare class SemanticTokensBuilder {
    private _id;
    private _prevLine;
    private _prevChar;
    private _data;
    private _dataLen;
    private _prevData;
    constructor();
    private initialize;
    push(line: number, char: number, length: number, tokenType: number, tokenModifiers: number): void;
    get id(): string;
    previousResult(id: string): void;
    build(): SemanticTokens;
    canBuildEdits(): boolean;
    buildEdits(): SemanticTokens | SemanticTokensDelta;
}
