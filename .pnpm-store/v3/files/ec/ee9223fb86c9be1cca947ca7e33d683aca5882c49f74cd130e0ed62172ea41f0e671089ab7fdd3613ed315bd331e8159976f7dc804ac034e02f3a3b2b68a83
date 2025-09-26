/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { Range, SemanticTokens, SemanticTokensClientCapabilities, SemanticTokensDelta, SemanticTokensDeltaParams, SemanticTokensOptions, SemanticTokensParams, SemanticTokensRangeParams } from 'vscode-languageserver';
import { SemanticTokensBuilder as BaseSemanticTokensBuilder, SemanticTokenTypes } from 'vscode-languageserver';
import { CancellationToken } from '../utils/cancellation.js';
import type { AstNode, CstNode, Properties } from '../syntax-tree.js';
import type { MaybePromise } from '../utils/promise-utils.js';
import type { LangiumDocument } from '../workspace/documents.js';
import type { LangiumServices } from './lsp-services.js';
export declare const AllSemanticTokenTypes: Record<string, number>;
export declare const AllSemanticTokenModifiers: Record<string, number>;
export declare const DefaultSemanticTokenOptions: SemanticTokensOptions;
export interface SemanticTokenProvider {
    semanticHighlight(document: LangiumDocument, params: SemanticTokensParams, cancelToken?: CancellationToken): MaybePromise<SemanticTokens>;
    semanticHighlightRange(document: LangiumDocument, params: SemanticTokensRangeParams, cancelToken?: CancellationToken): MaybePromise<SemanticTokens>;
    semanticHighlightDelta(document: LangiumDocument, params: SemanticTokensDeltaParams, cancelToken?: CancellationToken): MaybePromise<SemanticTokens | SemanticTokensDelta>;
    readonly tokenTypes: Record<string, number>;
    readonly tokenModifiers: Record<string, number>;
    readonly semanticTokensOptions: SemanticTokensOptions;
}
export declare function mergeSemanticTokenProviderOptions(options: Array<SemanticTokensOptions | undefined>): SemanticTokensOptions;
export interface SemanticToken {
    line: number;
    char: number;
    length: number;
    tokenType: number;
    tokenModifiers: number;
}
export type SemanticTokenAcceptorOptions<N extends AstNode = AstNode> = ({
    line: number;
    char: number;
    length: number;
} | {
    node: N;
    property: Properties<N>;
    index?: number;
} | {
    node: N;
    keyword: string;
    index?: number;
} | {
    cst: CstNode;
} | {
    range: Range;
}) & {
    type: string;
    modifier?: string | string[];
};
export interface SemanticTokenPropertyOptions<T extends AstNode> {
    node: T;
    property: Properties<T>;
    index?: number;
    type: string;
    modifier?: string | string[];
}
export interface SemanticTokenKeywordOptions {
    node: AstNode;
    keyword: string;
    index?: number;
    type: string;
    modifier?: string | string[];
}
export interface SemanticTokenNodeOptions {
    node: CstNode;
    type: string;
    modifier?: string | string[];
}
export interface SemanticTokenRangeOptions {
    range: Range;
    type: string;
    modifier?: string | string[];
}
export declare class SemanticTokensBuilder extends BaseSemanticTokensBuilder {
    private _tokens;
    push(line: number, char: number, length: number, tokenType: number, tokenModifiers: number): void;
    build(): SemanticTokens;
    buildEdits(): SemanticTokens | SemanticTokensDelta;
    /**
     * Flushes the cached delta token values
     */
    flush(): void;
    private applyTokens;
    private compareTokens;
}
export type SemanticTokenAcceptor = <N extends AstNode = AstNode>(options: SemanticTokenAcceptorOptions<N>) => void;
/**
 * A basic super class for providing semantic token data.
 * Users of Langium should extend this class to create their own `SemanticTokenProvider`.
 *
 * The entry method for generating semantic tokens based on an `AstNode` is the `highlightElement` method.
 */
export declare abstract class AbstractSemanticTokenProvider implements SemanticTokenProvider {
    /**
     * Store a token builder for each open document.
     */
    protected tokensBuilders: Map<string, SemanticTokensBuilder>;
    protected currentDocument?: LangiumDocument;
    protected currentTokensBuilder?: SemanticTokensBuilder;
    protected currentRange?: Range;
    protected clientCapabilities?: SemanticTokensClientCapabilities;
    constructor(services: LangiumServices);
    initialize(clientCapabilities?: SemanticTokensClientCapabilities): void;
    get tokenTypes(): Record<string, number>;
    get tokenModifiers(): Record<string, number>;
    get semanticTokensOptions(): SemanticTokensOptions;
    semanticHighlight(document: LangiumDocument, _params: SemanticTokensParams, cancelToken?: CancellationToken): Promise<SemanticTokens>;
    semanticHighlightRange(document: LangiumDocument, params: SemanticTokensRangeParams, cancelToken?: CancellationToken): Promise<SemanticTokens>;
    semanticHighlightDelta(document: LangiumDocument, params: SemanticTokensDeltaParams, cancelToken?: CancellationToken): Promise<SemanticTokens | SemanticTokensDelta>;
    protected createAcceptor(): SemanticTokenAcceptor;
    protected getDocumentTokensBuilder(document: LangiumDocument): SemanticTokensBuilder;
    protected computeHighlighting(document: LangiumDocument, acceptor: SemanticTokenAcceptor, cancelToken: CancellationToken): Promise<void>;
    /**
     * @return `'prune'` to skip the children of this element, nothing otherwise.
     */
    protected abstract highlightElement(node: AstNode, acceptor: SemanticTokenAcceptor): void | undefined | 'prune';
    protected highlightToken(options: SemanticTokenRangeOptions): void;
    protected highlightProperty<N extends AstNode>(options: SemanticTokenPropertyOptions<N>): void;
    protected highlightKeyword(options: SemanticTokenKeywordOptions): void;
    protected highlightNode(options: SemanticTokenNodeOptions): void;
}
export declare namespace SemanticTokensDecoder {
    interface DecodedSemanticToken {
        offset: number;
        tokenType: SemanticTokenTypes;
        tokenModifiers: number;
        text: string;
    }
    function decode<T extends AstNode = AstNode>(tokens: SemanticTokens, tokenTypes: Record<string, number>, document: LangiumDocument<T>): DecodedSemanticToken[];
}
//# sourceMappingURL=semantic-token-provider.d.ts.map