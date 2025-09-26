/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { DocumentFormattingParams, DocumentOnTypeFormattingOptions, DocumentOnTypeFormattingParams, DocumentRangeFormattingParams, FormattingOptions, Range, TextEdit } from 'vscode-languageserver-protocol';
import type { CancellationToken } from '../utils/cancellation.js';
import type { AstNode, CstNode, Properties } from '../syntax-tree.js';
import type { MaybePromise } from '../utils/promise-utils.js';
import type { Stream } from '../utils/stream.js';
import type { LangiumDocument, TextDocument } from '../workspace/documents.js';
/**
 * Language specific service for handling formatting related LSP requests.
 */
export interface Formatter {
    /**
     * Handles full document formatting.
     */
    formatDocument(document: LangiumDocument, params: DocumentFormattingParams, cancelToken?: CancellationToken): MaybePromise<TextEdit[]>;
    /**
     * Handles partial document formatting. Only parts of the document within the `params.range` property are formatted.
     */
    formatDocumentRange(document: LangiumDocument, params: DocumentRangeFormattingParams, cancelToken?: CancellationToken): MaybePromise<TextEdit[]>;
    /**
     * Handles document formatting while typing. Only formats the current line.
     */
    formatDocumentOnType(document: LangiumDocument, params: DocumentOnTypeFormattingParams, cancelToken?: CancellationToken): MaybePromise<TextEdit[]>;
    /**
     * Options that determine when the `formatDocumentOnType` method should be invoked by the language client.
     * When `undefined` is returned, document format on type will be disabled.
     */
    get formatOnTypeOptions(): DocumentOnTypeFormattingOptions | undefined;
}
export declare abstract class AbstractFormatter implements Formatter {
    protected collector: FormattingCollector;
    /**
     * Creates a formatter scoped to the supplied AST node.
     * Allows to define fine-grained formatting rules for elements.
     *
     * Example usage:
     *
     * ```ts
     * export class CustomFormatter extends AbstractFormatter {
     *   protected override format(node: AstNode): void {
     *     if (isPerson(node)) {
     *       const formatter = this.getNodeFormatter(node);
     *       formatter.property('name').prepend(Formatting.oneSpace());
     *     }
     *   }
     * }
     * ```
     * @param node The specific node the formatter should be scoped to. Every call to properties or keywords will only select those which belong to the supplied AST node.
     */
    protected getNodeFormatter<T extends AstNode>(node: T): NodeFormatter<T>;
    formatDocument(document: LangiumDocument, params: DocumentFormattingParams): MaybePromise<TextEdit[]>;
    /**
     * Returns whether a range for a given document is error free, i.e. safe to format
     *
     * @param document Document to inspect for lexer & parser errors that may produce an unsafe range
     * @param range Formatting range to check for safety
     * @returns Whether the given formatting range does not overlap with or follow any regions with an error
     */
    protected isFormatRangeErrorFree(document: LangiumDocument, range: Range): boolean;
    formatDocumentRange(document: LangiumDocument, params: DocumentRangeFormattingParams): MaybePromise<TextEdit[]>;
    formatDocumentOnType(document: LangiumDocument, params: DocumentOnTypeFormattingParams): MaybePromise<TextEdit[]>;
    get formatOnTypeOptions(): DocumentOnTypeFormattingOptions | undefined;
    protected doDocumentFormat(document: LangiumDocument, options: FormattingOptions, range?: Range): TextEdit[];
    protected avoidOverlappingEdits(textDocument: TextDocument, textEdits: TextEdit[]): TextEdit[];
    protected iterateAstFormatting(document: LangiumDocument, range?: Range): void;
    protected abstract format(node: AstNode): void;
    protected nodeModeToKey(node: CstNode, mode: 'prepend' | 'append'): string;
    protected insideRange(inside: Range, total?: Range): boolean;
    protected isNecessary(edit: TextEdit, document: TextDocument): boolean;
    protected iterateCstFormatting(document: LangiumDocument, formattings: Map<string, FormattingAction>, options: FormattingOptions, range?: Range): TextEdit[];
    protected createHiddenTextEdits(previous: CstNode | undefined, hidden: CstNode, formatting: FormattingAction | undefined, context: FormattingContext): TextEdit[];
    protected getExistingIndentationCharacterCount(text: string, context: FormattingContext): number;
    protected getIndentationCharacterCount(context: FormattingContext, formattingMove?: FormattingMove): number;
    protected createTextEdit(a: CstNode | undefined, b: CstNode, formatting: FormattingAction, context: FormattingContext): TextEdit[];
    protected createSpaceTextEdit(range: Range, spaces: number, options: FormattingActionOptions): TextEdit;
    protected createLineTextEdit(range: Range, lines: number, context: FormattingContext, options: FormattingActionOptions): TextEdit;
    protected createTabTextEdit(range: Range, hasPrevious: boolean, context: FormattingContext): TextEdit;
    protected fitIntoOptions(value: number, existing: number, options: FormattingActionOptions): number;
    protected findFittingMove(range: Range, moves: FormattingMove[], _context: FormattingContext): FormattingMove | undefined;
    protected iterateCstTree(document: LangiumDocument, context: FormattingContext): Stream<CstNode>;
    protected iterateCst(node: CstNode, context: FormattingContext): Stream<CstNode>;
}
/**
 * Represents an object that allows to format certain parts of a specific node, like its keywords or properties.
 */
export interface NodeFormatter<T extends AstNode> {
    /**
     * Creates a new formatting region that contains the specified node.
     */
    node(node: AstNode): FormattingRegion;
    /**
     * Creates a new formatting region that contains all of the specified nodes.
     */
    nodes(...nodes: AstNode[]): FormattingRegion;
    /**
     * Creates a new formatting region that contains the specified property of the supplied node.
     *
     * @param property The name of the property to format. Scoped to the supplied node.
     * @param index The index of the property, if the property is an array. `0` by default. To retrieve all elements of this array, use the {@link properties} method instead.
     */
    property(property: Properties<T>, index?: number): FormattingRegion;
    /**
     * Creates a new formatting region that contains the all of the specified properties of the supplied node.
     *
     * @param properties The names of the properties to format. Scoped to the supplied node.
     */
    properties(...properties: Array<Properties<T>>): FormattingRegion;
    /**
     * Creates a new formatting region that contains the specified keyword of the supplied node.
     *
     * @param keyword The keyword to format. Scoped to the supplied node.
     * @param index The index of the keyword, necessary if the keyword appears multiple times. `0` by default. To retrieve all keywords, use the {@link keywords} method instead.
     */
    keyword(keyword: string, index?: number): FormattingRegion;
    /**
     * Creates a new formatting region that contains the all of the specified keywords of the supplied node.
     *
     * @param keywords The keywords to format. Scoped to the supplied node.
     */
    keywords(...keywords: string[]): FormattingRegion;
    /**
     * Creates a new formatting region that contains the all of the specified CST nodes.
     *
     * @param nodes A list of CST nodes to format
     */
    cst(nodes: CstNode[]): FormattingRegion;
    /**
     * Creates a new formatting region that contains all nodes between the given formatting regions.
     *
     * For example, can be used to retrieve a formatting region that contains all nodes between two curly braces:
     *
     * ```ts
     * const formatter = this.getNodeFormatter(node);
     * const bracesOpen = formatter.keyword('{');
     * const bracesClose = formatter.keyword('}');
     * formatter.interior(bracesOpen, bracesClose).prepend(Formatting.indent());
     * ```
     *
     * @param start Determines where the search for interior nodes should start
     * @param end Determines where the search for interior nodes should end
     */
    interior(start: FormattingRegion, end: FormattingRegion): FormattingRegion;
}
export declare class DefaultNodeFormatter<T extends AstNode> implements NodeFormatter<T> {
    protected readonly astNode: T;
    protected readonly collector: FormattingCollector;
    constructor(astNode: T, collector: FormattingCollector);
    node(node: AstNode): FormattingRegion;
    nodes(...nodes: AstNode[]): FormattingRegion;
    property(feature: Properties<T>, index?: number): FormattingRegion;
    properties(...features: Array<Properties<T>>): FormattingRegion;
    keyword(keyword: string, index?: number): FormattingRegion;
    keywords(...keywords: string[]): FormattingRegion;
    cst(nodes: CstNode[]): FormattingRegion;
    interior(start: FormattingRegion, end: FormattingRegion): FormattingRegion;
}
export interface FormattingContext {
    document: TextDocument;
    options: FormattingOptions;
    indentation: number;
}
export declare class FormattingRegion {
    readonly nodes: CstNode[];
    protected readonly collector: FormattingCollector;
    constructor(nodes: CstNode[], collector: FormattingCollector);
    /**
     * Prepends the specified formatting to all nodes of this region.
     */
    prepend(formatting: FormattingAction): FormattingRegion;
    /**
     * Appends the specified formatting to all nodes of this region.
     */
    append(formatting: FormattingAction): FormattingRegion;
    /**
     * Sorrounds all nodes of this region with the specified formatting.
     * Functionally the same as invoking `prepend` and `append` with the same formatting.
     */
    surround(formatting: FormattingAction): FormattingRegion;
    /**
     * Creates a copy of this region with a slice of the selected nodes.
     * For both start and end, a negative index can be used to indicate an offset from the end of the array.
     * For example, -2 refers to the second to last element of the array.
     * @param start The beginning index of the specified portion of the region. If start is undefined, then the slice begins at index 0.
     * @param end The end index of the specified portion of the region. This is exclusive of the element at the index 'end'. If end is undefined, then the slice extends to the end of the region.
     */
    slice(start?: number, end?: number): FormattingRegion;
}
export interface FormattingAction {
    options: FormattingActionOptions;
    moves: FormattingMove[];
}
export interface FormattingActionOptions {
    /**
     * The priority of this formatting. Formattings with a higher priority override those with lower priority.
     * `0` by default.
     */
    priority?: number;
    /**
     * Determines whether this formatting allows more spaces/lines than expected. For example, if {@link Formatting.newLine} is used, but 2 empty lines already exist between the elements, no formatting is applied.
     */
    allowMore?: boolean;
    /**
     * Determines whether this formatting allows less spaces/lines than expected. For example, if {@link Formatting.oneSpace} is used, but no spaces exist between the elements, no formatting is applied.
     */
    allowLess?: boolean;
}
export interface FormattingMove {
    characters?: number;
    tabs?: number;
    lines?: number;
}
/**
 * Contains utilities to easily create formatting actions that can be applied to a {@link FormattingRegion}.
 */
export declare namespace Formatting {
    /**
     * Creates a new formatting that tries to fit the existing text into one of the specified formattings.
     * @param formattings All possible formattings.
     */
    function fit(...formattings: FormattingAction[]): FormattingAction;
    /**
     * Creates a new formatting that removes all spaces
     */
    function noSpace(options?: FormattingActionOptions): FormattingAction;
    /**
     * Creates a new formatting that creates a single space
     */
    function oneSpace(options?: FormattingActionOptions): FormattingAction;
    /**
     * Creates a new formatting that creates the specified amount of spaces
     *
     * @param count The amount of spaces to be inserted
     */
    function spaces(count: number, options?: FormattingActionOptions): FormattingAction;
    /**
     * Creates a new formatting that moves an element to the next line
     */
    function newLine(options?: FormattingActionOptions): FormattingAction;
    /**
     * Creates a new formatting that creates the specified amount of new lines.
     */
    function newLines(count: number, options?: FormattingActionOptions): FormattingAction;
    /**
     * Creates a new formatting that moves the element to a new line and indents that line.
     */
    function indent(options?: FormattingActionOptions): FormattingAction;
    /**
     * Creates a new formatting that removes all indentation.
     */
    function noIndent(options?: FormattingActionOptions): FormattingAction;
}
export type FormattingCollector = (node: CstNode, mode: 'prepend' | 'append', formatting: FormattingAction) => void;
//# sourceMappingURL=formatter.d.ts.map