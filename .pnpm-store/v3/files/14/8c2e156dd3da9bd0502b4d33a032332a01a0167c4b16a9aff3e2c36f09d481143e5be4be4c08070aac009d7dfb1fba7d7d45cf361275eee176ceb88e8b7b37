/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/* eslint-disable no-bitwise */

import type { Range, SemanticTokens, SemanticTokensClientCapabilities, SemanticTokensDelta, SemanticTokensDeltaParams, SemanticTokensOptions, SemanticTokensParams, SemanticTokensRangeParams } from 'vscode-languageserver';
import { SemanticTokensBuilder as BaseSemanticTokensBuilder, SemanticTokenModifiers, SemanticTokenTypes } from 'vscode-languageserver';
import { CancellationToken } from '../utils/cancellation.js';
import type { AstNode, CstNode, Properties } from '../syntax-tree.js';
import { streamAst } from '../utils/ast-utils.js';
import { inRange } from '../utils/cst-utils.js';
import { findNodeForKeyword, findNodeForProperty, findNodesForKeyword, findNodesForProperty } from '../utils/grammar-utils.js';
import type { MaybePromise } from '../utils/promise-utils.js';
import { interruptAndCheck } from '../utils/promise-utils.js';
import type { LangiumDocument } from '../workspace/documents.js';
import type { LangiumServices } from './lsp-services.js';

export const AllSemanticTokenTypes: Record<string, number> = {
    [SemanticTokenTypes.class]: 0,
    [SemanticTokenTypes.comment]: 1,
    [SemanticTokenTypes.enum]: 2,
    [SemanticTokenTypes.enumMember]: 3,
    [SemanticTokenTypes.event]: 4,
    [SemanticTokenTypes.function]: 5,
    [SemanticTokenTypes.interface]: 6,
    [SemanticTokenTypes.keyword]: 7,
    [SemanticTokenTypes.macro]: 8,
    [SemanticTokenTypes.method]: 9,
    [SemanticTokenTypes.modifier]: 10,
    [SemanticTokenTypes.namespace]: 11,
    [SemanticTokenTypes.number]: 12,
    [SemanticTokenTypes.operator]: 13,
    [SemanticTokenTypes.parameter]: 14,
    [SemanticTokenTypes.property]: 15,
    [SemanticTokenTypes.regexp]: 16,
    [SemanticTokenTypes.string]: 17,
    [SemanticTokenTypes.struct]: 18,
    [SemanticTokenTypes.type]: 19,
    [SemanticTokenTypes.typeParameter]: 20,
    [SemanticTokenTypes.variable]: 21,
    [SemanticTokenTypes.decorator]: 22
};

export const AllSemanticTokenModifiers: Record<string, number> = {
    [SemanticTokenModifiers.abstract]: 1 << 0,
    [SemanticTokenModifiers.async]: 1 << 1,
    [SemanticTokenModifiers.declaration]: 1 << 2,
    [SemanticTokenModifiers.defaultLibrary]: 1 << 3,
    [SemanticTokenModifiers.definition]: 1 << 4,
    [SemanticTokenModifiers.deprecated]: 1 << 5,
    [SemanticTokenModifiers.documentation]: 1 << 6,
    [SemanticTokenModifiers.modification]: 1 << 7,
    [SemanticTokenModifiers.readonly]: 1 << 8,
    [SemanticTokenModifiers.static]: 1 << 9
};

export const DefaultSemanticTokenOptions: SemanticTokensOptions = {
    legend: {
        tokenTypes: Object.keys(AllSemanticTokenTypes),
        tokenModifiers: Object.keys(AllSemanticTokenModifiers)
    },
    full: {
        delta: true
    },
    range: true
};

export interface SemanticTokenProvider {
    semanticHighlight(document: LangiumDocument, params: SemanticTokensParams, cancelToken?: CancellationToken): MaybePromise<SemanticTokens>
    semanticHighlightRange(document: LangiumDocument, params: SemanticTokensRangeParams, cancelToken?: CancellationToken): MaybePromise<SemanticTokens>
    semanticHighlightDelta(document: LangiumDocument, params: SemanticTokensDeltaParams, cancelToken?: CancellationToken): MaybePromise<SemanticTokens | SemanticTokensDelta>
    readonly tokenTypes: Record<string, number>
    readonly tokenModifiers: Record<string, number>
    readonly semanticTokensOptions: SemanticTokensOptions
}

export function mergeSemanticTokenProviderOptions(options: Array<SemanticTokensOptions | undefined>): SemanticTokensOptions {
    const tokenTypes: string[] = [];
    const tokenModifiers: string[] = [];
    let full = true;
    let delta = true;
    let range = true;
    for (const option of options) {
        if (!option) {
            continue;
        }
        option.legend.tokenTypes.forEach((tokenType, index) => {
            const existing = tokenTypes[index];
            if (existing && existing !== tokenType) {
                throw new Error(`Cannot merge '${existing}' and '${tokenType}' token types. They use the same index ${index}.`);
            } else {
                tokenTypes[index] = tokenType;
            }
        });
        option.legend.tokenModifiers.forEach((tokenModifier, index) => {
            const existing = tokenModifiers[index];
            if (existing && existing !== tokenModifier) {
                throw new Error(`Cannot merge '${existing}' and '${tokenModifier}' token modifier. They use the same index ${index}.`);
            } else {
                tokenModifiers[index] = tokenModifier;
            }
        });
        if (!option.full) {
            full = false;
        } else if (typeof option.full === 'object' && !option.full.delta) {
            delta = false;
        }
        if (!option.range) {
            range = false;
        }
    }
    return {
        legend: {
            tokenTypes,
            tokenModifiers,
        },
        full: full && { delta },
        range,
    };
}

export interface SemanticToken {
    line: number
    char: number
    length: number
    tokenType: number
    tokenModifiers: number
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
}

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
    range: Range
    type: string
    modifier?: string | string[]
}

export class SemanticTokensBuilder extends BaseSemanticTokensBuilder {
    private _tokens: SemanticToken[] = [];

    override push(line: number, char: number, length: number, tokenType: number, tokenModifiers: number): void {
        this._tokens.push({
            line,
            char,
            length,
            tokenType,
            tokenModifiers
        });
    }

    override build(): SemanticTokens {
        this.applyTokens();
        return super.build();
    }

    override buildEdits(): SemanticTokens | SemanticTokensDelta {
        this.applyTokens();
        return super.buildEdits();
    }

    /**
     * Flushes the cached delta token values
     */
    flush(): void {
        this.previousResult(this.id);
    }

    private applyTokens(): void {
        for (const token of this._tokens.sort(this.compareTokens)) {
            super.push(token.line, token.char, token.length, token.tokenType, token.tokenModifiers);
        }
        this._tokens = [];
    }

    private compareTokens(a: SemanticToken, b: SemanticToken): number {
        if (a.line === b.line) {
            return a.char - b.char;
        }
        return a.line - b.line;
    }
}

export type SemanticTokenAcceptor = <N extends AstNode = AstNode>(options: SemanticTokenAcceptorOptions<N>) => void;

/**
 * A basic super class for providing semantic token data.
 * Users of Langium should extend this class to create their own `SemanticTokenProvider`.
 *
 * The entry method for generating semantic tokens based on an `AstNode` is the `highlightElement` method.
 */
export abstract class AbstractSemanticTokenProvider implements SemanticTokenProvider {

    /**
     * Store a token builder for each open document.
     */
    protected tokensBuilders = new Map<string, SemanticTokensBuilder>();
    protected currentDocument?: LangiumDocument;
    protected currentTokensBuilder?: SemanticTokensBuilder;
    protected currentRange?: Range;
    protected clientCapabilities?: SemanticTokensClientCapabilities;

    constructor(services: LangiumServices) {
        // Delete the token builder once the text document has been closed
        services.shared.workspace.TextDocuments.onDidClose(e => {
            this.tokensBuilders.delete(e.document.uri);
        });
        services.shared.lsp.LanguageServer.onInitialize(params => {
            this.initialize(params.capabilities.textDocument?.semanticTokens);
        });
    }

    initialize(clientCapabilities?: SemanticTokensClientCapabilities): void {
        this.clientCapabilities = clientCapabilities;
    }

    get tokenTypes(): Record<string, number> {
        return AllSemanticTokenTypes;
    }

    get tokenModifiers(): Record<string, number> {
        return AllSemanticTokenModifiers;
    }

    get semanticTokensOptions(): SemanticTokensOptions {
        return {
            legend: {
                tokenTypes: Object.keys(this.tokenTypes),
                tokenModifiers: Object.keys(this.tokenModifiers),
            },
            full: {
                delta: true
            },
            range: true,
        };
    }

    async semanticHighlight(document: LangiumDocument, _params: SemanticTokensParams, cancelToken = CancellationToken.None): Promise<SemanticTokens> {
        this.currentRange = undefined;
        this.currentDocument = document;
        this.currentTokensBuilder = this.getDocumentTokensBuilder(document);
        this.currentTokensBuilder.flush();
        await this.computeHighlighting(document, this.createAcceptor(), cancelToken);
        return this.currentTokensBuilder.build();
    }

    async semanticHighlightRange(document: LangiumDocument, params: SemanticTokensRangeParams, cancelToken = CancellationToken.None): Promise<SemanticTokens> {
        this.currentRange = params.range;
        this.currentDocument = document;
        this.currentTokensBuilder = this.getDocumentTokensBuilder(document);
        this.currentTokensBuilder.flush();
        await this.computeHighlighting(document, this.createAcceptor(), cancelToken);
        return this.currentTokensBuilder.build();
    }

    async semanticHighlightDelta(document: LangiumDocument, params: SemanticTokensDeltaParams, cancelToken = CancellationToken.None): Promise<SemanticTokens | SemanticTokensDelta> {
        this.currentRange = undefined;
        this.currentDocument = document;
        this.currentTokensBuilder = this.getDocumentTokensBuilder(document);
        this.currentTokensBuilder.previousResult(params.previousResultId);
        await this.computeHighlighting(document, this.createAcceptor(), cancelToken);
        return this.currentTokensBuilder.buildEdits();
    }

    protected createAcceptor(): SemanticTokenAcceptor {
        const acceptor: SemanticTokenAcceptor = options => {
            if ('line' in options) {
                this.highlightToken({
                    range: {
                        start: {
                            line: options.line,
                            character: options.char
                        },
                        end: {
                            line: options.line,
                            character: options.char + options.length
                        }
                    },
                    type: options.type,
                    modifier: options.modifier
                });
            } else if ('range' in options) {
                this.highlightToken(options);
            } else if ('keyword' in options) {
                this.highlightKeyword(options);
            } else if ('property' in options) {
                this.highlightProperty(options);
            } else {
                this.highlightNode({
                    node: options.cst,
                    type: options.type,
                    modifier: options.modifier
                });
            }
        };
        return acceptor;
    }

    protected getDocumentTokensBuilder(document: LangiumDocument): SemanticTokensBuilder {
        const existing = this.tokensBuilders.get(document.uri.toString());
        if (existing) {
            return existing;
        }
        const builder = new SemanticTokensBuilder();
        this.tokensBuilders.set(document.uri.toString(), builder);
        return builder;
    }

    protected async computeHighlighting(document: LangiumDocument, acceptor: SemanticTokenAcceptor, cancelToken: CancellationToken): Promise<void> {
        const root = document.parseResult.value;
        const treeIterator = streamAst(root, { range: this.currentRange }).iterator();
        let result: IteratorResult<AstNode>;
        do {
            result = treeIterator.next();
            if (!result.done) {
                await interruptAndCheck(cancelToken);
                const node = result.value;
                if (this.highlightElement(node, acceptor) === 'prune') {
                    treeIterator.prune();
                }
            }
        } while (!result.done);
    }

    /**
     * @return `'prune'` to skip the children of this element, nothing otherwise.
     */
    protected abstract highlightElement(node: AstNode, acceptor: SemanticTokenAcceptor): void | undefined | 'prune';

    protected highlightToken(options: SemanticTokenRangeOptions): void {
        const { range, type } = options;
        let modifiers = options.modifier;
        if ((this.currentRange && !inRange(range, this.currentRange)) || !this.currentDocument || !this.currentTokensBuilder) {
            return;
        }
        const intType = this.tokenTypes[type];
        let totalModifier = 0;
        if (modifiers !== undefined) {
            if (typeof modifiers === 'string') {
                modifiers = [modifiers];
            }
            for (const modifier of modifiers) {
                const intModifier = this.tokenModifiers[modifier];
                totalModifier |= intModifier;
            }
        }
        const startLine = range.start.line;
        const endLine = range.end.line;
        if (startLine === endLine) {
            // Token only spans a single line
            const char = range.start.character;
            const length = range.end.character - char;
            this.currentTokensBuilder.push(startLine, char, length, intType, totalModifier);
        } else if (this.clientCapabilities?.multilineTokenSupport) {
            // Let token span multiple lines
            const startChar = range.start.character;
            const startOffset = this.currentDocument.textDocument.offsetAt(range.start);
            const endOffset = this.currentDocument.textDocument.offsetAt(range.end);
            this.currentTokensBuilder.push(startLine, startChar, endOffset - startOffset, intType, totalModifier);
        } else {
            // Token spans multiple lines, but the client doesn't support it
            // Split the range into multiple semantic tokens
            const firstLineStart = range.start;
            let nextLineOffset = this.currentDocument.textDocument.offsetAt({
                line: startLine + 1,
                character: 0
            });
            // Build first line
            this.currentTokensBuilder.push(
                firstLineStart.line,
                firstLineStart.character,
                nextLineOffset - firstLineStart.character - 1,
                intType,
                totalModifier
            );
            // Build all lines in between first and last
            for (let i = startLine + 1; i < endLine; i++) {
                const currentLineOffset = nextLineOffset;
                nextLineOffset = this.currentDocument.textDocument.offsetAt({
                    line: i + 1,
                    character: 0
                });
                this.currentTokensBuilder.push(
                    i,
                    0,
                    nextLineOffset - currentLineOffset - 1,
                    intType, totalModifier
                );
            }
            // Build last line
            this.currentTokensBuilder.push(
                endLine,
                0,
                range.end.character,
                intType,
                totalModifier
            );
        }
    }

    protected highlightProperty<N extends AstNode>(options: SemanticTokenPropertyOptions<N>): void {
        const nodes: CstNode[] = [];
        if (typeof options.index === 'number') {
            const node = findNodeForProperty(options.node.$cstNode, options.property, options.index);
            if (node) {
                nodes.push(node);
            }
        } else {
            nodes.push(...findNodesForProperty(options.node.$cstNode, options.property));
        }
        const { type, modifier } = options;
        for (const node of nodes) {
            this.highlightNode({
                node,
                type,
                modifier
            });
        }
    }

    protected highlightKeyword(options: SemanticTokenKeywordOptions): void {
        const { node, keyword, type, index, modifier } = options;
        const nodes: CstNode[] = [];
        if (typeof index === 'number') {
            const keywordNode = findNodeForKeyword(node.$cstNode, keyword, index);
            if (keywordNode) {
                nodes.push(keywordNode);
            }
        } else {
            nodes.push(...findNodesForKeyword(node.$cstNode, keyword));
        }
        for (const keywordNode of nodes) {
            this.highlightNode({
                node: keywordNode,
                type,
                modifier
            });
        }
    }

    protected highlightNode(options: SemanticTokenNodeOptions): void {
        const { node, type, modifier } = options;
        const range = node.range;
        this.highlightToken({
            range,
            type,
            modifier
        });
    }

}

export namespace SemanticTokensDecoder {
    export interface DecodedSemanticToken {
        offset: number;
        tokenType: SemanticTokenTypes;
        tokenModifiers: number;
        text: string;
    }

    export function decode<T extends AstNode = AstNode>(tokens: SemanticTokens, tokenTypes: Record<string, number>, document: LangiumDocument<T>): DecodedSemanticToken[] {
        const typeMap = new Map<number, SemanticTokenTypes>();
        Object.entries(tokenTypes).forEach(([type, index]) => typeMap.set(index, type as SemanticTokenTypes));
        let line = 0;
        let character = 0;
        return sliceIntoChunks(tokens.data, 5).map(t => {
            line += t[0];
            if (t[0] !== 0) {
                character = 0;
            }
            character += t[1];
            const length = t[2];
            const offset = document.textDocument.offsetAt({ line, character });
            return {
                offset,
                tokenType: typeMap.get(t[3])!,
                tokenModifiers: t[4],
                text: document.textDocument.getText({ start: { line, character }, end: { line, character: character + length } })
            } as DecodedSemanticToken;
        });
    }

    function sliceIntoChunks<T>(arr: T[], chunkSize: number) {
        const res = [];
        for (let i = 0; i < arr.length; i += chunkSize) {
            const chunk = arr.slice(i, i + chunkSize);
            res.push(chunk);
        }
        return res;
    }
}
