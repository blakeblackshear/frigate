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
import { findNodeForKeyword, findNodesForKeyword, findNodeForProperty, findNodesForProperty } from '../utils/grammar-utils.js';
import { isCompositeCstNode, isLeafCstNode } from '../syntax-tree.js';
import { streamAllContents } from '../utils/ast-utils.js';
import { getInteriorNodes, getNextNode } from '../utils/cst-utils.js';
import { DONE_RESULT, EMPTY_STREAM, StreamImpl, TreeStreamImpl } from '../utils/stream.js';

/**
 * Language specific service for handling formatting related LSP requests.
 */
export interface Formatter {
    /**
     * Handles full document formatting.
     */
    formatDocument(document: LangiumDocument, params: DocumentFormattingParams, cancelToken?: CancellationToken): MaybePromise<TextEdit[]>
    /**
     * Handles partial document formatting. Only parts of the document within the `params.range` property are formatted.
     */
    formatDocumentRange(document: LangiumDocument, params: DocumentRangeFormattingParams, cancelToken?: CancellationToken): MaybePromise<TextEdit[]>
    /**
     * Handles document formatting while typing. Only formats the current line.
     */
    formatDocumentOnType(document: LangiumDocument, params: DocumentOnTypeFormattingParams, cancelToken?: CancellationToken): MaybePromise<TextEdit[]>
    /**
     * Options that determine when the `formatDocumentOnType` method should be invoked by the language client.
     * When `undefined` is returned, document format on type will be disabled.
     */
    get formatOnTypeOptions(): DocumentOnTypeFormattingOptions | undefined
}

export abstract class AbstractFormatter implements Formatter {

    protected collector: FormattingCollector = () => { /* Does nothing at first */ };

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
    protected getNodeFormatter<T extends AstNode>(node: T): NodeFormatter<T> {
        return new DefaultNodeFormatter(node, this.collector);
    }

    formatDocument(document: LangiumDocument, params: DocumentFormattingParams): MaybePromise<TextEdit[]> {
        const pr = document.parseResult;
        if (pr.lexerErrors.length === 0 && pr.parserErrors.length === 0) {
            // safe to format
            return this.doDocumentFormat(document, params.options);
        } else {
            // don't format a potentially broken document, return no edits
            return [];
        }
    }

    /**
     * Returns whether a range for a given document is error free, i.e. safe to format
     *
     * @param document Document to inspect for lexer & parser errors that may produce an unsafe range
     * @param range Formatting range to check for safety
     * @returns Whether the given formatting range does not overlap with or follow any regions with an error
     */
    protected isFormatRangeErrorFree(document: LangiumDocument, range: Range): boolean {
        const pr = document.parseResult;
        if (pr.lexerErrors.length || pr.parserErrors.length) {
            // collect the earliest error line from either
            const earliestErrLine = Math.min(
                ...pr.lexerErrors.map(e => e.line ?? Number.MAX_VALUE),
                ...pr.parserErrors.map(e => e.token.startLine ?? Number.MAX_VALUE)
            );
            // if the earliest error line occurs before or at the end line of the range, then don't format
            return earliestErrLine > range.end.line;
        } else {
            // no errors, ok to format
            return true;
        }
    }

    formatDocumentRange(document: LangiumDocument, params: DocumentRangeFormattingParams): MaybePromise<TextEdit[]> {
        if (this.isFormatRangeErrorFree(document, params.range)) {
            return this.doDocumentFormat(document, params.options, params.range);
        } else {
            return [];
        }
    }

    formatDocumentOnType(document: LangiumDocument, params: DocumentOnTypeFormattingParams): MaybePromise<TextEdit[]> {
        // Format the current line after typing something
        const range = {
            start: {
                character: 0,
                line: params.position.line
            },
            end: params.position
        };

        if (this.isFormatRangeErrorFree(document, range)) {
            return this.doDocumentFormat(document, params.options, range);
        } else {
            return [];
        }
    }

    get formatOnTypeOptions(): DocumentOnTypeFormattingOptions | undefined {
        return undefined;
    }

    protected doDocumentFormat(document: LangiumDocument, options: FormattingOptions, range?: Range): TextEdit[] {
        const map = new Map<string, FormattingAction>();
        const collector: FormattingCollector = (node, mode, formatting) => {
            const key = this.nodeModeToKey(node, mode);
            const existing = map.get(key);
            const priority = formatting.options.priority ?? 0;
            const existingPriority = existing?.options.priority ?? 0;
            if (!existing || existingPriority <= priority) {
                map.set(key, formatting);
            }
        };
        this.collector = collector;

        this.iterateAstFormatting(document, range);
        const edits = this.iterateCstFormatting(document, map, options, range);

        return this.avoidOverlappingEdits(document.textDocument, edits);
    }

    protected avoidOverlappingEdits(textDocument: TextDocument, textEdits: TextEdit[]): TextEdit[] {
        const edits: TextEdit[] = [];
        for (const edit of textEdits) {
            let last = edits[edits.length - 1];
            while (last) {
                const currentStart = textDocument.offsetAt(edit.range.start);
                const lastEnd = textDocument.offsetAt(last.range.end);
                if (currentStart < lastEnd) {
                    edits.pop();
                    last = edits[edits.length - 1];
                }
                else {
                    break;
                }
            }
            edits.push(edit);
        }
        return edits.filter(edit => this.isNecessary(edit, textDocument));
    }

    protected iterateAstFormatting(document: LangiumDocument, range?: Range): void {
        const root = document.parseResult.value;
        this.format(root);
        const treeIterator = streamAllContents(root).iterator();
        let result: IteratorResult<AstNode>;
        do {
            result = treeIterator.next();
            if (!result.done) {
                const node = result.value;
                const inside = this.insideRange(node.$cstNode!.range, range);
                if (inside) {
                    this.format(node);
                } else {
                    treeIterator.prune();
                }
            }
        } while (!result.done);
    }

    protected abstract format(node: AstNode): void;

    protected nodeModeToKey(node: CstNode, mode: 'prepend' | 'append'): string {
        return `${node.offset}:${node.end}:${mode}`;
    }

    protected insideRange(inside: Range, total?: Range): boolean {
        if (!total) {
            return true;
        }
        if ((inside.start.line <= total.start.line && inside.end.line >= total.end.line) ||
            (inside.start.line >= total.start.line && inside.end.line <= total.end.line) ||
            (inside.start.line <= total.end.line && inside.end.line >= total.end.line)) {
            return true;
        }
        return false;
    }

    protected isNecessary(edit: TextEdit, document: TextDocument): boolean {
        return edit.newText !== document.getText(edit.range).replace(/\r/g, '');
    }

    protected iterateCstFormatting(document: LangiumDocument, formattings: Map<string, FormattingAction>, options: FormattingOptions, range?: Range): TextEdit[] {
        const context: FormattingContext = {
            indentation: 0,
            options,
            document: document.textDocument
        };
        const edits: TextEdit[] = [];
        const cstTreeStream = this.iterateCstTree(document, context);
        const iterator = cstTreeStream.iterator();
        let lastNode: CstNode | undefined;
        let result: IteratorResult<CstNode>;
        do {
            result = iterator.next();
            if (!result.done) {
                const node = result.value;
                const isLeaf = isLeafCstNode(node);
                const prependKey = this.nodeModeToKey(node, 'prepend');
                const prependFormatting = formattings.get(prependKey);
                formattings.delete(prependKey);
                if (prependFormatting) {
                    const nodeEdits = this.createTextEdit(lastNode, node, prependFormatting, context);
                    for (const edit of nodeEdits) {
                        if (edit && this.insideRange(edit.range, range)) {
                            edits.push(edit);
                        }
                    }
                }
                const appendKey = this.nodeModeToKey(node, 'append');
                const appendFormatting = formattings.get(appendKey);
                formattings.delete(appendKey);
                if (appendFormatting) {
                    const nextNode = getNextNode(node);
                    if (nextNode) {
                        const nodeEdits = this.createTextEdit(node, nextNode, appendFormatting, context);
                        for (const edit of nodeEdits) {
                            if (edit && this.insideRange(edit.range, range)) {
                                edits.push(edit);
                            }
                        }
                    }
                }

                if (!prependFormatting && node.hidden) {
                    const hiddenEdits = this.createHiddenTextEdits(lastNode, node, undefined, context);
                    for (const edit of hiddenEdits) {
                        if (edit && this.insideRange(edit.range, range)) {
                            edits.push(edit);
                        }
                    }
                }
                if (isLeaf) {
                    lastNode = node;
                }
            }
        } while (!result.done);

        return edits;
    }

    protected createHiddenTextEdits(previous: CstNode | undefined, hidden: CstNode, formatting: FormattingAction | undefined, context: FormattingContext): TextEdit[] {
        // Don't format the hidden node if it is on the same line as its previous node
        const startLine = hidden.range.start.line;
        if (previous && previous.range.end.line === startLine) {
            return [];
        }
        const edits: TextEdit[] = [];

        const startRange: Range = {
            start: {
                character: 0,
                line: startLine
            },
            end: hidden.range.start
        };
        const hiddenStartText = context.document.getText(startRange);
        const move = this.findFittingMove(startRange, formatting?.moves ?? [], context);
        const hiddenStartChar = this.getExistingIndentationCharacterCount(hiddenStartText, context);
        const expectedStartChar = this.getIndentationCharacterCount(context, move);

        const characterIncrease = expectedStartChar - hiddenStartChar;

        if (characterIncrease === 0) {
            return [];
        }

        let newText = '';
        if (characterIncrease > 0) {
            newText = (context.options.insertSpaces ? ' ' : '\t').repeat(characterIncrease);
        }

        const lines = hidden.text.split('\n');
        lines[0] = hiddenStartText + lines[0];
        for (let i = 0; i < lines.length; i++) {
            const currentLine = startLine + i;
            const pos = {
                character: 0,
                line: currentLine
            };
            if (characterIncrease > 0) {
                edits.push({
                    newText,
                    range: {
                        start: pos,
                        end: pos
                    }
                });
            } else {
                const currentText = lines[i];
                let j = 0;
                for (; j < currentText.length; j++) {
                    const char = currentText.charAt(j);
                    if (char !== ' ' && char !== '\t') {
                        break;
                    }
                }
                edits.push({
                    newText: '',
                    range: {
                        start: pos,
                        end: {
                            line: currentLine,
                            // Remove as much whitespace characters as necessary
                            // In some cases `characterIncrease` is actually larger than the amount of whitespace available
                            // So we simply remove all whitespace characters `j`
                            character: Math.min(j, Math.abs(characterIncrease))
                        }
                    }
                });
            }
        }

        return edits;
    }

    protected getExistingIndentationCharacterCount(text: string, context: FormattingContext): number {
        const tabWhitespace = ' '.repeat(context.options.tabSize);
        const normalized = context.options.insertSpaces ? text.replaceAll('\t', tabWhitespace) : text.replaceAll(tabWhitespace, '\t');
        return normalized.length;
    }

    protected getIndentationCharacterCount(context: FormattingContext, formattingMove?: FormattingMove): number {
        let indentation = context.indentation;
        if (formattingMove && formattingMove.tabs) {
            indentation += formattingMove.tabs;
        }
        return (context.options.insertSpaces ? context.options.tabSize : 1) * indentation;
    }

    protected createTextEdit(a: CstNode | undefined, b: CstNode, formatting: FormattingAction, context: FormattingContext): TextEdit[] {
        if (b.hidden) {
            return this.createHiddenTextEdits(a, b, formatting, context);
        }
        // Ignore the edit if the previous node ends after the current node starts
        if (a && (a.range.end.line > b.range.start.line ||
            (a.range.end.line === b.range.start.line && a.range.end.character > b.range.start.character))) {
            return [];
        }
        const betweenRange: Range = {
            start: a?.range.end ?? {
                character: 0,
                line: 0
            },
            end: b.range.start
        };
        const move = this.findFittingMove(betweenRange, formatting.moves, context);
        if (!move) {
            return [];
        }
        const chars = move.characters;
        const lines = move.lines;
        const tabs = move.tabs;
        const existingIndentation = context.indentation;
        context.indentation += (tabs ?? 0);
        const edits: TextEdit[] = [];
        if (chars !== undefined) {
            // Do not apply formatting on the same line if preceding node is hidden
            if (!a?.hidden) {
                edits.push(this.createSpaceTextEdit(betweenRange, chars, formatting.options));
            }
        } else if (lines !== undefined) {
            edits.push(this.createLineTextEdit(betweenRange, lines, context, formatting.options));
        } else if (tabs !== undefined) {
            edits.push(this.createTabTextEdit(betweenRange, Boolean(a), context));
        }
        if (isLeafCstNode(b)) {
            context.indentation = existingIndentation;
        }
        return edits;
    }

    protected createSpaceTextEdit(range: Range, spaces: number, options: FormattingActionOptions): TextEdit {
        if (range.start.line === range.end.line) {
            const existingSpaces = range.end.character - range.start.character;
            spaces = this.fitIntoOptions(spaces, existingSpaces, options);
        }
        const newText = ' '.repeat(spaces);
        return {
            newText,
            range
        };
    }

    protected createLineTextEdit(range: Range, lines: number, context: FormattingContext, options: FormattingActionOptions): TextEdit {
        const existingLines = range.end.line - range.start.line;
        lines = this.fitIntoOptions(lines, existingLines, options);
        const indent = context.options.insertSpaces ? ' '.repeat(context.options.tabSize) : '\t';
        const nodeIndent = indent.repeat(context.indentation);
        const newText = `${'\n'.repeat(lines)}${nodeIndent}`;
        return {
            newText,
            range
        };
    }

    protected createTabTextEdit(range: Range, hasPrevious: boolean, context: FormattingContext): TextEdit {
        const indent = context.options.insertSpaces ? ' '.repeat(context.options.tabSize) : '\t';
        const nodeIndent = indent.repeat(context.indentation);
        const minimumLines = hasPrevious ? 1 : 0;
        const lines = Math.max(range.end.line - range.start.line, minimumLines);
        const newText = `${'\n'.repeat(lines)}${nodeIndent}`;
        return {
            newText,
            range
        };
    }

    protected fitIntoOptions(value: number, existing: number, options: FormattingActionOptions): number {
        if (options.allowMore) {
            value = Math.max(existing, value);
        } else if (options.allowLess) {
            value = Math.min(existing, value);
        }
        return value;
    }

    protected findFittingMove(range: Range, moves: FormattingMove[], _context: FormattingContext): FormattingMove | undefined {
        if (moves.length === 0) {
            return undefined;
        } else if (moves.length === 1) {
            return moves[0];
        }

        const existingLines = range.end.line - range.start.line;

        for (const move of moves) {
            if (move.lines !== undefined && existingLines <= move.lines) {
                return move;
            } else if (move.lines === undefined && existingLines === 0) {
                return move;
            }
        }

        // Return the last move
        return moves[moves.length - 1];
    }

    protected iterateCstTree(document: LangiumDocument, context: FormattingContext): Stream<CstNode> {
        const root = document.parseResult.value;
        const rootCst = root.$cstNode;
        if (!rootCst) {
            return EMPTY_STREAM;
        }
        return new TreeStreamImpl(rootCst, node => this.iterateCst(node, context));
    }

    protected iterateCst(node: CstNode, context: FormattingContext): Stream<CstNode> {
        if (!isCompositeCstNode(node)) {
            return EMPTY_STREAM;
        }
        const initial = context.indentation;
        return new StreamImpl<{ index: number }, CstNode>(
            () => ({ index: 0 }),
            (state) => {
                if (state.index < node.content.length) {
                    return { done: false, value: node.content[state.index++] };
                } else {
                    // Reset the indentation to the level when we entered the node
                    context.indentation = initial;
                    return DONE_RESULT;
                }
            }
        );
    }

}

/**
 * Represents an object that allows to format certain parts of a specific node, like its keywords or properties.
 */
export interface NodeFormatter<T extends AstNode> {
    /**
     * Creates a new formatting region that contains the specified node.
     */
    node(node: AstNode): FormattingRegion
    /**
     * Creates a new formatting region that contains all of the specified nodes.
     */
    nodes(...nodes: AstNode[]): FormattingRegion
    /**
     * Creates a new formatting region that contains the specified property of the supplied node.
     *
     * @param property The name of the property to format. Scoped to the supplied node.
     * @param index The index of the property, if the property is an array. `0` by default. To retrieve all elements of this array, use the {@link properties} method instead.
     */
    property(property: Properties<T>, index?: number): FormattingRegion
    /**
     * Creates a new formatting region that contains the all of the specified properties of the supplied node.
     *
     * @param properties The names of the properties to format. Scoped to the supplied node.
     */
    properties(...properties: Array<Properties<T>>): FormattingRegion
    /**
     * Creates a new formatting region that contains the specified keyword of the supplied node.
     *
     * @param keyword The keyword to format. Scoped to the supplied node.
     * @param index The index of the keyword, necessary if the keyword appears multiple times. `0` by default. To retrieve all keywords, use the {@link keywords} method instead.
     */
    keyword(keyword: string, index?: number): FormattingRegion
    /**
     * Creates a new formatting region that contains the all of the specified keywords of the supplied node.
     *
     * @param keywords The keywords to format. Scoped to the supplied node.
     */
    keywords(...keywords: string[]): FormattingRegion
    /**
     * Creates a new formatting region that contains the all of the specified CST nodes.
     *
     * @param nodes A list of CST nodes to format
     */
    cst(nodes: CstNode[]): FormattingRegion
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
    interior(start: FormattingRegion, end: FormattingRegion): FormattingRegion
}

export class DefaultNodeFormatter<T extends AstNode> implements NodeFormatter<T> {

    protected readonly astNode: T;
    protected readonly collector: FormattingCollector;

    constructor(astNode: T, collector: FormattingCollector) {
        this.astNode = astNode;
        this.collector = collector;
    }

    node(node: AstNode): FormattingRegion {
        return new FormattingRegion(node.$cstNode ? [node.$cstNode] : [], this.collector);
    }

    nodes(...nodes: AstNode[]): FormattingRegion {
        const cstNodes: CstNode[] = [];
        for (const node of nodes) {
            if (node.$cstNode) {
                cstNodes.push(node.$cstNode);
            }
        }
        return new FormattingRegion(cstNodes, this.collector);
    }

    property(feature: Properties<T>, index?: number): FormattingRegion {
        const cstNode = findNodeForProperty(this.astNode.$cstNode, feature, index);
        return new FormattingRegion(cstNode ? [cstNode] : [], this.collector);
    }

    properties(...features: Array<Properties<T>>): FormattingRegion {
        const nodes: CstNode[] = [];
        for (const feature of features) {
            const cstNodes = findNodesForProperty(this.astNode.$cstNode, feature);
            nodes.push(...cstNodes);
        }
        return new FormattingRegion(nodes, this.collector);
    }

    keyword(keyword: string, index?: number): FormattingRegion {
        const cstNode = findNodeForKeyword(this.astNode.$cstNode, keyword, index);
        return new FormattingRegion(cstNode ? [cstNode] : [], this.collector);
    }

    keywords(...keywords: string[]): FormattingRegion {
        const nodes: CstNode[] = [];
        for (const feature of keywords) {
            const cstNodes = findNodesForKeyword(this.astNode.$cstNode, feature);
            nodes.push(...cstNodes);
        }
        return new FormattingRegion(nodes, this.collector);
    }

    cst(nodes: CstNode[]): FormattingRegion {
        return new FormattingRegion([...nodes], this.collector);
    }

    interior(start: FormattingRegion, end: FormattingRegion): FormattingRegion {
        const startNodes = start.nodes;
        const endNodes = end.nodes;
        if (startNodes.length !== 1 || endNodes.length !== 1) {
            return new FormattingRegion([], this.collector);
        }
        let startNode = startNodes[0];
        let endNode = endNodes[0];

        if (startNode.offset > endNode.offset) {
            const intermediate = startNode;
            startNode = endNode;
            endNode = intermediate;
        }

        return new FormattingRegion(getInteriorNodes(startNode, endNode), this.collector);
    }
}

export interface FormattingContext {
    document: TextDocument
    options: FormattingOptions
    indentation: number // Level of indentation, not the amount of spaces/tabs
}

export class FormattingRegion {

    readonly nodes: CstNode[];
    protected readonly collector: FormattingCollector;

    constructor(nodes: CstNode[], collector: FormattingCollector) {
        this.nodes = nodes;
        this.collector = collector;
    }

    /**
     * Prepends the specified formatting to all nodes of this region.
     */
    prepend(formatting: FormattingAction): FormattingRegion {
        for (const node of this.nodes) {
            this.collector(node, 'prepend', formatting);
        }
        return this;
    }

    /**
     * Appends the specified formatting to all nodes of this region.
     */
    append(formatting: FormattingAction): FormattingRegion {
        for (const node of this.nodes) {
            this.collector(node, 'append', formatting);
        }
        return this;
    }

    /**
     * Sorrounds all nodes of this region with the specified formatting.
     * Functionally the same as invoking `prepend` and `append` with the same formatting.
     */
    surround(formatting: FormattingAction): FormattingRegion {
        for (const node of this.nodes) {
            this.collector(node, 'prepend', formatting);
            this.collector(node, 'append', formatting);
        }
        return this;
    }

    /**
     * Creates a copy of this region with a slice of the selected nodes.
     * For both start and end, a negative index can be used to indicate an offset from the end of the array.
     * For example, -2 refers to the second to last element of the array.
     * @param start The beginning index of the specified portion of the region. If start is undefined, then the slice begins at index 0.
     * @param end The end index of the specified portion of the region. This is exclusive of the element at the index 'end'. If end is undefined, then the slice extends to the end of the region.
     */
    slice(start?: number, end?: number): FormattingRegion {
        return new FormattingRegion(this.nodes.slice(start, end), this.collector);
    }
}

export interface FormattingAction {
    options: FormattingActionOptions
    moves: FormattingMove[]
}

export interface FormattingActionOptions {
    /**
     * The priority of this formatting. Formattings with a higher priority override those with lower priority.
     * `0` by default.
     */
    priority?: number
    /**
     * Determines whether this formatting allows more spaces/lines than expected. For example, if {@link Formatting.newLine} is used, but 2 empty lines already exist between the elements, no formatting is applied.
     */
    allowMore?: boolean
    /**
     * Determines whether this formatting allows less spaces/lines than expected. For example, if {@link Formatting.oneSpace} is used, but no spaces exist between the elements, no formatting is applied.
     */
    allowLess?: boolean
}

export interface FormattingMove {
    characters?: number
    tabs?: number
    lines?: number
}

/**
 * Contains utilities to easily create formatting actions that can be applied to a {@link FormattingRegion}.
 */
export namespace Formatting {

    /**
     * Creates a new formatting that tries to fit the existing text into one of the specified formattings.
     * @param formattings All possible formattings.
     */
    export function fit(...formattings: FormattingAction[]): FormattingAction {
        return {
            options: {},
            moves: formattings.flatMap(e => e.moves).sort(compareMoves)
        };
    }

    /**
     * Creates a new formatting that removes all spaces
     */
    export function noSpace(options?: FormattingActionOptions): FormattingAction {
        return spaces(0, options);
    }

    /**
     * Creates a new formatting that creates a single space
     */
    export function oneSpace(options?: FormattingActionOptions): FormattingAction {
        return spaces(1, options);
    }

    /**
     * Creates a new formatting that creates the specified amount of spaces
     *
     * @param count The amount of spaces to be inserted
     */
    export function spaces(count: number, options?: FormattingActionOptions): FormattingAction {
        return {
            options: options ?? {},
            moves: [{
                characters: count
            }]
        };
    }

    /**
     * Creates a new formatting that moves an element to the next line
     */
    export function newLine(options?: FormattingActionOptions): FormattingAction {
        return newLines(1, options);
    }

    /**
     * Creates a new formatting that creates the specified amount of new lines.
     */
    export function newLines(count: number, options?: FormattingActionOptions): FormattingAction {
        return {
            options: options ?? {},
            moves: [{
                lines: count
            }]
        };
    }

    /**
     * Creates a new formatting that moves the element to a new line and indents that line.
     */
    export function indent(options?: FormattingActionOptions): FormattingAction {
        return {
            options: options ?? {},
            moves: [{
                tabs: 1,
                lines: 1
            }]
        };
    }

    /**
     * Creates a new formatting that removes all indentation.
     */
    export function noIndent(options?: FormattingActionOptions): FormattingAction {
        return {
            options: options ?? {},
            moves: [{
                tabs: 0
            }]
        };
    }

    function compareMoves(a: FormattingMove, b: FormattingMove): number {
        const aLines = a.lines ?? 0;
        const bLines = b.lines ?? 0;
        const aTabs = a.tabs ?? 0;
        const bTabs = b.tabs ?? 0;
        const aSpaces = a.characters ?? 0;
        const bSpaces = b.characters ?? 0;
        if (aLines < bLines) {
            return -1;
        } else if (aLines > bLines) {
            return 1;
        } else if (aTabs < bTabs) {
            return -1;
        } else if (aTabs > bTabs) {
            return 1;
        } else if (aSpaces < bSpaces) {
            return -1;
        } else if (aSpaces > bSpaces) {
            return 1;
        } else {
            return 0;
        }
    }
}

export type FormattingCollector = (node: CstNode, mode: 'prepend' | 'append', formatting: FormattingAction) => void;
