/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { CompletionItem, CompletionList, Diagnostic, DocumentSymbol, FoldingRange, FormattingOptions, Range, ReferenceParams, SemanticTokenTypes, TextDocumentIdentifier, TextDocumentPositionParams, WorkspaceSymbol } from 'vscode-languageserver-protocol';
import { DiagnosticSeverity } from 'vscode-languageserver-types';
import type { LangiumServices, LangiumSharedLSPServices } from '../lsp/lsp-services.js';
import { SemanticTokensDecoder } from '../lsp/semantic-token-provider.js';
import type { ParserOptions } from '../parser/langium-parser.js';
import type { LangiumCoreServices, LangiumSharedCoreServices } from '../services.js';
import type { AstNode, Properties } from '../syntax-tree.js';
import type { AsyncDisposable } from '../utils/disposable.js';
import { Disposable } from '../utils/disposable.js';
import type { BuildOptions } from '../workspace/document-builder.js';
import { TextDocument, type LangiumDocument } from '../workspace/documents.js';
export interface ParseHelperOptions extends BuildOptions {
    /**
     * Specifies the URI of the generated document. Will use a counter variable if not specified.
     */
    documentUri?: string;
    /**
     * Options passed to the LangiumParser.
     */
    parserOptions?: ParserOptions;
}
export declare function parseHelper<T extends AstNode = AstNode>(services: LangiumCoreServices): (input: string, options?: ParseHelperOptions) => Promise<LangiumDocument<T>>;
export type ExpectFunction = (actual: unknown, expected: unknown, message?: string) => void;
/**
 * Overrides the assertion function used by tests. Uses `assert.deepStrictEqual` by default
 *
 * @deprecated Since 1.2.0. Do not override the assertion functionality.
 */
export declare function expectFunction(functions: ExpectFunction): void;
export interface ExpectedBase {
    /**
     * Document content.
     * Use `<|>` and `<|...|>` to mark special items that are relevant to the test case.
     */
    text: string;
    /**
     * Parse options used to parse the {@link text} property.
     */
    parseOptions?: ParseHelperOptions;
    /**
     * String to mark indices for test cases. `<|>` by default.
     */
    indexMarker?: string;
    /**
     * String to mark start indices for test cases. `<|` by default.
     */
    rangeStartMarker?: string;
    /**
     * String to mark end indices for test cases. `|>` by default.
     */
    rangeEndMarker?: string;
    /**
     * Whether to dispose the created documents right after performing the check.
     *
     * Defaults to `false`.
     */
    disposeAfterCheck?: boolean;
}
export interface ExpectedHighlight extends ExpectedBase {
    index?: number;
    rangeIndex?: number | number[];
}
/**
 * Testing utility function for the `textDocument/documentHighlight` LSP request
 *
 * @returns A function that performs the assertion
 */
export declare function expectHighlight(services: LangiumServices): (input: ExpectedHighlight) => Promise<AsyncDisposable>;
export interface ExpectedSymbolsList extends ExpectedBase {
    expectedSymbols: Array<string | DocumentSymbol>;
    symbolToString?: (item: DocumentSymbol) => string;
}
export interface ExpectedSymbolsCallback extends ExpectedBase {
    assert: (symbols: DocumentSymbol[]) => void;
}
export type ExpectedSymbols = ExpectedSymbolsList | ExpectedSymbolsCallback;
export declare function expectSymbols(services: LangiumServices): (input: ExpectedSymbols) => Promise<AsyncDisposable>;
export interface ExpectedWorkspaceSymbolsBase {
    query?: string;
}
export interface ExpectedWorkspaceSymbolsList extends ExpectedWorkspaceSymbolsBase {
    expectedSymbols: Array<string | WorkspaceSymbol>;
    symbolToString?: (item: WorkspaceSymbol) => string;
}
export interface ExpectedWorkspaceSymbolsCallback extends ExpectedWorkspaceSymbolsBase {
    assert: (symbols: WorkspaceSymbol[]) => void;
}
export type ExpectedWorkspaceSymbols = ExpectedWorkspaceSymbolsList | ExpectedWorkspaceSymbolsCallback;
export declare function expectWorkspaceSymbols(services: LangiumSharedLSPServices): (input: ExpectedWorkspaceSymbols) => Promise<void>;
export interface ExpectedFoldings extends ExpectedBase {
    assert?: (foldings: FoldingRange[], expected: Array<[number, number]>) => void;
}
export declare function expectFoldings(services: LangiumServices): (input: ExpectedFoldings) => Promise<AsyncDisposable>;
export declare function textDocumentParams(document: LangiumDocument): {
    textDocument: TextDocumentIdentifier;
};
export interface ExpectedCompletionItems extends ExpectedBase {
    index: number;
    expectedItems: Array<string | CompletionItem>;
    itemToString?: (item: CompletionItem) => string;
}
export interface ExpectedCompletionCallback extends ExpectedBase {
    index: number;
    assert: (completions: CompletionList) => void;
}
export type ExpectedCompletion = ExpectedCompletionItems | ExpectedCompletionCallback;
export declare function expectCompletion(services: LangiumServices): (expectedCompletion: ExpectedCompletion) => Promise<AsyncDisposable>;
export interface ExpectedGoToDefinition extends ExpectedBase {
    index: number;
    rangeIndex: number | number[];
}
export declare function expectGoToDefinition(services: LangiumServices): (expectedGoToDefinition: ExpectedGoToDefinition) => Promise<AsyncDisposable>;
export interface ExpectedFindReferences extends ExpectedBase {
    includeDeclaration: boolean;
}
export declare function expectFindReferences(services: LangiumServices): (expectedFindReferences: ExpectedFindReferences) => Promise<AsyncDisposable>;
export declare function referenceParams(document: LangiumDocument, offset: number, includeDeclaration: boolean): ReferenceParams;
export interface ExpectedHover extends ExpectedBase {
    index: number;
    hover?: string | RegExp;
}
export declare function expectHover(services: LangiumServices): (expectedHover: ExpectedHover) => Promise<AsyncDisposable>;
export interface ExpectFormatting {
    /**
     * Document content before formatting.
     */
    before: string;
    /**
     * Expected document content after formatting.
     * The test case will compare this to the actual formatted document.
     */
    after: string;
    /**
     * Parse options used to parse the {@link text} property.
     */
    parseOptions?: ParseHelperOptions;
    /**
     * If given, only the specified range will be affected by the formatter
     */
    range?: Range;
    /**
     * Options used by the formatter. Default:
     * ```ts
     * {
     *     insertSpaces: true,
     *     tabSize: 4
     * }
     * ```
     */
    options?: FormattingOptions;
    /**
     * Whether to dispose the created documents right after performing the check.
     *
     * Defaults to `false`.
     */
    disposeAfterCheck?: boolean;
}
export declare function expectFormatting(services: LangiumServices): (expectedFormatting: ExpectFormatting) => Promise<AsyncDisposable>;
export declare function textDocumentPositionParams(document: LangiumDocument, offset: number): TextDocumentPositionParams;
export declare function parseDocument<T extends AstNode = AstNode>(services: LangiumCoreServices, input: string, options?: ParseHelperOptions): Promise<LangiumDocument<T>>;
export declare function replaceIndices(base: ExpectedBase): {
    output: string;
    indices: number[];
    ranges: Array<[number, number]>;
};
export interface ValidationResult<T extends AstNode = AstNode> extends AsyncDisposable {
    diagnostics: Diagnostic[];
    document: LangiumDocument<T>;
}
export type ValidationHelperOptions = ParseHelperOptions & {
    failOnParsingErrors?: boolean;
};
export declare function validationHelper<T extends AstNode = AstNode>(services: LangiumCoreServices): (input: string, options?: ValidationHelperOptions) => Promise<ValidationResult<T>>;
export type ExpectDiagnosticOptionsWithoutContent<T extends AstNode = AstNode> = ExpectDiagnosticCode & ExpectDiagnosticData & (ExpectDiagnosticAstOptions<T> | ExpectDiagnosticRangeOptions | ExpectDiagnosticOffsetOptions);
export type ExpectDiagnosticOptions<T extends AstNode = AstNode> = ExpectDiagnosticContent & ExpectDiagnosticOptionsWithoutContent<T>;
export interface ExpectDiagnosticContent {
    message?: string | RegExp;
    severity?: DiagnosticSeverity;
}
export interface ExpectDiagnosticCode {
    code?: string;
}
export interface ExpectDiagnosticData {
    data?: unknown;
}
export interface ExpectDiagnosticAstOptions<T extends AstNode> {
    node?: T;
    property?: Properties<T> | {
        name: Properties<T>;
        index?: number;
    };
}
export interface ExpectDiagnosticRangeOptions {
    range: Range;
}
export interface ExpectDiagnosticOffsetOptions {
    offset: number;
    length: number;
}
export type Predicate<T> = (arg: T) => boolean;
export declare function isDiagnosticDataEqual(lhs: unknown, rhs: unknown): boolean;
export declare function isRangeEqual(lhs: Range, rhs: Range): boolean;
export declare function rangeToString(range: Range): string;
export declare function filterByOptions<T extends AstNode = AstNode, N extends AstNode = AstNode>(validationResult: ValidationResult<T>, options: ExpectDiagnosticOptions<N>): Diagnostic[];
export declare function expectNoIssues<T extends AstNode = AstNode, N extends AstNode = AstNode>(validationResult: ValidationResult<T>, filterOptions?: ExpectDiagnosticOptions<N>): void;
export declare function expectIssue<T extends AstNode = AstNode, N extends AstNode = AstNode>(validationResult: ValidationResult<T>, filterOptions?: ExpectDiagnosticOptions<N>): void;
export declare function expectError<T extends AstNode = AstNode, N extends AstNode = AstNode>(validationResult: ValidationResult<T>, message: string | RegExp, filterOptions: ExpectDiagnosticOptionsWithoutContent<N>): void;
export declare function expectWarning<T extends AstNode = AstNode, N extends AstNode = AstNode>(validationResult: ValidationResult<T>, message: string | RegExp, filterOptions: ExpectDiagnosticOptionsWithoutContent<N>): void;
export declare function printDiagnostics(diagnostics: Diagnostic[] | undefined): string;
/**
 * Add the given document to the `TextDocuments` service, simulating it being opened in an editor.
 *
 * @deprecated Since 3.2.0. Use `set`/`delete` from `TextDocuments` instead.
 */
export declare function setTextDocument(services: LangiumServices | LangiumSharedLSPServices, document: TextDocument): Disposable;
export declare function clearDocuments(services: LangiumCoreServices | LangiumSharedCoreServices, documents?: LangiumDocument[]): Promise<void>;
export interface DecodedSemanticTokensWithRanges {
    tokens: SemanticTokensDecoder.DecodedSemanticToken[];
    ranges: Array<[number, number]>;
}
export declare function highlightHelper<T extends AstNode = AstNode>(services: LangiumServices): (input: string, options?: ParseHelperOptions) => Promise<DecodedSemanticTokensWithRanges>;
export interface DecodedTokenOptions {
    rangeIndex?: number;
    tokenType: SemanticTokenTypes;
}
export declare function expectSemanticToken(tokensWithRanges: DecodedSemanticTokensWithRanges, options: DecodedTokenOptions): void;
//# sourceMappingURL=langium-test.d.ts.map