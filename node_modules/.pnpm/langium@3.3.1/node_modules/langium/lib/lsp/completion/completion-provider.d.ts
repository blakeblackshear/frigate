/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { CompletionItem, CompletionParams, TextEdit } from 'vscode-languageserver-protocol';
import type { LangiumCompletionParser } from '../../parser/langium-parser.js';
import type { NameProvider } from '../../references/name-provider.js';
import type { ScopeProvider } from '../../references/scope-provider.js';
import type { LangiumServices } from '../lsp-services.js';
import type { AstNode, AstNodeDescription, AstReflection, CstNode, ReferenceInfo } from '../../syntax-tree.js';
import type { CancellationToken } from '../../utils/cancellation.js';
import type { MaybePromise } from '../../utils/promise-utils.js';
import type { LangiumDocument, TextDocument } from '../../workspace/documents.js';
import type { NextFeature } from './follow-element-computation.js';
import type { NodeKindProvider } from '../node-kind-provider.js';
import type { FuzzyMatcher } from '../fuzzy-matcher.js';
import type { GrammarConfig } from '../../languages/grammar-config.js';
import type { Lexer } from '../../parser/lexer.js';
import type { DocumentationProvider } from '../../documentation/documentation-provider.js';
import type { MarkupContent } from 'vscode-languageserver';
import { CompletionItemKind, CompletionList, Position } from 'vscode-languageserver';
import * as ast from '../../languages/generated/ast.js';
import { type Stream } from '../../utils/stream.js';
export type CompletionAcceptor = (context: CompletionContext, value: CompletionValueItem) => void;
export type CompletionValueItem = ({
    label?: string;
} | {
    node: AstNode;
} | {
    nodeDescription: AstNodeDescription;
}) & Partial<CompletionItem>;
export interface CompletionContext {
    node?: AstNode;
    document: LangiumDocument;
    textDocument: TextDocument;
    features: NextFeature[];
    /**
     * Index at the start of the token related to this context.
     * If the context performs completion for a token that doesn't exist yet, it is equal to the `offset`.
     */
    tokenOffset: number;
    /**
     * Index at the end of the token related to this context, even if it is behind the cursor position.
     * Points at the first character after the last token.
     * If the context performs completion for a token that doesn't exist yet, it is equal to the `offset`.
     */
    tokenEndOffset: number;
    /**
     * Index of the requested completed position.
     */
    offset: number;
    position: Position;
}
export interface CompletionProviderOptions {
    /**
     * Most tools trigger completion request automatically without explicitly requesting
     * it using a keyboard shortcut (e.g. Ctrl+Space). Typically they do so when the user
     * starts to type an identifier. For example if the user types `c` in a JavaScript file
     * code complete will automatically pop up present `console` besides others as a
     * completion item. Characters that make up identifiers don't need to be listed here.
     *
     * If code complete should automatically be trigger on characters not being valid inside
     * an identifier (for example `.` in JavaScript) list them in `triggerCharacters`.
     */
    triggerCharacters?: string[];
    /**
     * The list of all possible characters that commit a completion. This field can be used
     * if clients don't support individual commit characters per completion item.
     *
     * If a server provides both `allCommitCharacters` and commit characters on an individual
     * completion item the ones on the completion item win.
     */
    allCommitCharacters?: string[];
}
export interface CompletionBacktrackingInformation {
    previousTokenStart?: number;
    previousTokenEnd?: number;
    nextTokenStart: number;
    nextTokenEnd: number;
}
export declare function mergeCompletionProviderOptions(options: Array<CompletionProviderOptions | undefined>): CompletionProviderOptions;
/**
 * Language-specific service for handling completion requests.
 */
export interface CompletionProvider {
    /**
     * Handle a completion request.
     *
     * @param document - the document for which the completion request was triggered
     * @param params - the completion parameters
     * @param cancelToken - a token that can be used to cancel the request
     *
     * @throws `OperationCancelled` if cancellation is detected during execution
     * @throws `ResponseError` if an error is detected that should be sent as response to the client
     */
    getCompletion(document: LangiumDocument, params: CompletionParams, cancelToken?: CancellationToken): MaybePromise<CompletionList | undefined>;
    /**
     * Contains the completion options for this completion provider.
     *
     * If multiple languages return different options, they are merged before being sent to the language client.
     */
    readonly completionOptions?: CompletionProviderOptions;
}
export declare class DefaultCompletionProvider implements CompletionProvider {
    protected readonly completionParser: LangiumCompletionParser;
    protected readonly documentationProvider: DocumentationProvider;
    protected readonly scopeProvider: ScopeProvider;
    protected readonly grammar: ast.Grammar;
    protected readonly nameProvider: NameProvider;
    protected readonly lexer: Lexer;
    protected readonly nodeKindProvider: NodeKindProvider;
    protected readonly fuzzyMatcher: FuzzyMatcher;
    protected readonly grammarConfig: GrammarConfig;
    protected readonly astReflection: AstReflection;
    readonly completionOptions?: CompletionProviderOptions;
    constructor(services: LangiumServices);
    getCompletion(document: LangiumDocument, params: CompletionParams, _cancelToken?: CancellationToken): Promise<CompletionList | undefined>;
    /**
     * The completion algorithm could yield the same reference/keyword multiple times.
     *
     * This methods deduplicates these items afterwards before returning to the client.
     * Unique items are identified as a combination of `kind`, `label` and `detail`.
     */
    protected deduplicateItems(items: CompletionItem[]): CompletionItem[];
    protected findFeaturesAt(document: TextDocument, offset: number): NextFeature[];
    protected buildContexts(document: LangiumDocument, position: Position): IterableIterator<CompletionContext>;
    protected performNextTokenCompletion(document: LangiumDocument, text: string, _offset: number, _end: number): boolean;
    protected findDataTypeRuleStart(cst: CstNode, offset: number): [number, number] | undefined;
    /**
     * Indicates whether the completion should continue to process the next completion context.
     *
     * The default implementation continues the completion only if there are currently no proposed completion items.
     */
    protected continueCompletion(items: CompletionItem[]): boolean;
    /**
     * This method returns two sets of token offset information.
     *
     * The `nextToken*` offsets are related to the token at the cursor position.
     * If there is none, both offsets are simply set to `offset`.
     *
     * The `previousToken*` offsets are related to the last token before the current token at the cursor position.
     * They are `undefined`, if there is no token before the cursor position.
     */
    protected backtrackToAnyToken(text: string, offset: number): CompletionBacktrackingInformation;
    protected completionFor(context: CompletionContext, next: NextFeature, acceptor: CompletionAcceptor): MaybePromise<void>;
    protected completionForCrossReference(context: CompletionContext, next: NextFeature<ast.CrossReference>, acceptor: CompletionAcceptor): MaybePromise<void>;
    /**
     * Override this method to change how the stream of candidates is determined for a reference.
     * This way completion-specific modifications and refinements can be added to the proposals computation
     *  beyond the rules being implemented in the scope provider, e.g. filtering.
     *
     * @param refInfo Information about the reference for which the candidates are requested.
     * @param _context Information about the completion request including document, cursor position, token under cursor, etc.
     * @returns A stream of all elements being valid for the given reference.
     */
    protected getReferenceCandidates(refInfo: ReferenceInfo, _context: CompletionContext): Stream<AstNodeDescription>;
    /**
     * Override this method to change how reference completion items are created.
     *
     * To change the `kind` of a completion item, override the `NodeKindProvider` service instead.
     * To change the `documentation`, override the `DocumentationProvider` service instead.
     *
     * @param nodeDescription The description of a reference candidate
     * @returns A partial completion item
     */
    protected createReferenceCompletionItem(nodeDescription: AstNodeDescription): CompletionValueItem;
    protected getReferenceDocumentation(nodeDescription: AstNodeDescription): MarkupContent | string | undefined;
    protected completionForKeyword(context: CompletionContext, keyword: ast.Keyword, acceptor: CompletionAcceptor): MaybePromise<void>;
    protected getKeywordCompletionItemKind(_keyword: ast.Keyword): CompletionItemKind;
    protected filterKeyword(context: CompletionContext, keyword: ast.Keyword): boolean;
    protected fillCompletionItem(context: CompletionContext, item: CompletionValueItem): CompletionItem | undefined;
    protected buildCompletionTextEdit(context: CompletionContext, label: string, newText: string): TextEdit | undefined;
}
//# sourceMappingURL=completion-provider.d.ts.map