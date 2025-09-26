/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { findNodeForKeyword, findNodesForKeyword, findNodeForProperty, findNodesForProperty } from '../utils/grammar-utils.js';
import { isCompositeCstNode, isLeafCstNode } from '../syntax-tree.js';
import { streamAllContents } from '../utils/ast-utils.js';
import { getInteriorNodes, getNextNode } from '../utils/cst-utils.js';
import { DONE_RESULT, EMPTY_STREAM, StreamImpl, TreeStreamImpl } from '../utils/stream.js';
export class AbstractFormatter {
    constructor() {
        this.collector = () => { };
    }
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
    getNodeFormatter(node) {
        return new DefaultNodeFormatter(node, this.collector);
    }
    formatDocument(document, params) {
        const pr = document.parseResult;
        if (pr.lexerErrors.length === 0 && pr.parserErrors.length === 0) {
            // safe to format
            return this.doDocumentFormat(document, params.options);
        }
        else {
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
    isFormatRangeErrorFree(document, range) {
        const pr = document.parseResult;
        if (pr.lexerErrors.length || pr.parserErrors.length) {
            // collect the earliest error line from either
            const earliestErrLine = Math.min(...pr.lexerErrors.map(e => { var _a; return (_a = e.line) !== null && _a !== void 0 ? _a : Number.MAX_VALUE; }), ...pr.parserErrors.map(e => { var _a; return (_a = e.token.startLine) !== null && _a !== void 0 ? _a : Number.MAX_VALUE; }));
            // if the earliest error line occurs before or at the end line of the range, then don't format
            return earliestErrLine > range.end.line;
        }
        else {
            // no errors, ok to format
            return true;
        }
    }
    formatDocumentRange(document, params) {
        if (this.isFormatRangeErrorFree(document, params.range)) {
            return this.doDocumentFormat(document, params.options, params.range);
        }
        else {
            return [];
        }
    }
    formatDocumentOnType(document, params) {
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
        }
        else {
            return [];
        }
    }
    get formatOnTypeOptions() {
        return undefined;
    }
    doDocumentFormat(document, options, range) {
        const map = new Map();
        const collector = (node, mode, formatting) => {
            var _a, _b;
            const key = this.nodeModeToKey(node, mode);
            const existing = map.get(key);
            const priority = (_a = formatting.options.priority) !== null && _a !== void 0 ? _a : 0;
            const existingPriority = (_b = existing === null || existing === void 0 ? void 0 : existing.options.priority) !== null && _b !== void 0 ? _b : 0;
            if (!existing || existingPriority <= priority) {
                map.set(key, formatting);
            }
        };
        this.collector = collector;
        this.iterateAstFormatting(document, range);
        const edits = this.iterateCstFormatting(document, map, options, range);
        return this.avoidOverlappingEdits(document.textDocument, edits);
    }
    avoidOverlappingEdits(textDocument, textEdits) {
        const edits = [];
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
    iterateAstFormatting(document, range) {
        const root = document.parseResult.value;
        this.format(root);
        const treeIterator = streamAllContents(root).iterator();
        let result;
        do {
            result = treeIterator.next();
            if (!result.done) {
                const node = result.value;
                const inside = this.insideRange(node.$cstNode.range, range);
                if (inside) {
                    this.format(node);
                }
                else {
                    treeIterator.prune();
                }
            }
        } while (!result.done);
    }
    nodeModeToKey(node, mode) {
        return `${node.offset}:${node.end}:${mode}`;
    }
    insideRange(inside, total) {
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
    isNecessary(edit, document) {
        return edit.newText !== document.getText(edit.range).replace(/\r/g, '');
    }
    iterateCstFormatting(document, formattings, options, range) {
        const context = {
            indentation: 0,
            options,
            document: document.textDocument
        };
        const edits = [];
        const cstTreeStream = this.iterateCstTree(document, context);
        const iterator = cstTreeStream.iterator();
        let lastNode;
        let result;
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
    createHiddenTextEdits(previous, hidden, formatting, context) {
        var _a;
        // Don't format the hidden node if it is on the same line as its previous node
        const startLine = hidden.range.start.line;
        if (previous && previous.range.end.line === startLine) {
            return [];
        }
        const edits = [];
        const startRange = {
            start: {
                character: 0,
                line: startLine
            },
            end: hidden.range.start
        };
        const hiddenStartText = context.document.getText(startRange);
        const move = this.findFittingMove(startRange, (_a = formatting === null || formatting === void 0 ? void 0 : formatting.moves) !== null && _a !== void 0 ? _a : [], context);
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
            }
            else {
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
    getExistingIndentationCharacterCount(text, context) {
        const tabWhitespace = ' '.repeat(context.options.tabSize);
        const normalized = context.options.insertSpaces ? text.replaceAll('\t', tabWhitespace) : text.replaceAll(tabWhitespace, '\t');
        return normalized.length;
    }
    getIndentationCharacterCount(context, formattingMove) {
        let indentation = context.indentation;
        if (formattingMove && formattingMove.tabs) {
            indentation += formattingMove.tabs;
        }
        return (context.options.insertSpaces ? context.options.tabSize : 1) * indentation;
    }
    createTextEdit(a, b, formatting, context) {
        var _a;
        if (b.hidden) {
            return this.createHiddenTextEdits(a, b, formatting, context);
        }
        // Ignore the edit if the previous node ends after the current node starts
        if (a && (a.range.end.line > b.range.start.line ||
            (a.range.end.line === b.range.start.line && a.range.end.character > b.range.start.character))) {
            return [];
        }
        const betweenRange = {
            start: (_a = a === null || a === void 0 ? void 0 : a.range.end) !== null && _a !== void 0 ? _a : {
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
        context.indentation += (tabs !== null && tabs !== void 0 ? tabs : 0);
        const edits = [];
        if (chars !== undefined) {
            // Do not apply formatting on the same line if preceding node is hidden
            if (!(a === null || a === void 0 ? void 0 : a.hidden)) {
                edits.push(this.createSpaceTextEdit(betweenRange, chars, formatting.options));
            }
        }
        else if (lines !== undefined) {
            edits.push(this.createLineTextEdit(betweenRange, lines, context, formatting.options));
        }
        else if (tabs !== undefined) {
            edits.push(this.createTabTextEdit(betweenRange, Boolean(a), context));
        }
        if (isLeafCstNode(b)) {
            context.indentation = existingIndentation;
        }
        return edits;
    }
    createSpaceTextEdit(range, spaces, options) {
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
    createLineTextEdit(range, lines, context, options) {
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
    createTabTextEdit(range, hasPrevious, context) {
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
    fitIntoOptions(value, existing, options) {
        if (options.allowMore) {
            value = Math.max(existing, value);
        }
        else if (options.allowLess) {
            value = Math.min(existing, value);
        }
        return value;
    }
    findFittingMove(range, moves, _context) {
        if (moves.length === 0) {
            return undefined;
        }
        else if (moves.length === 1) {
            return moves[0];
        }
        const existingLines = range.end.line - range.start.line;
        for (const move of moves) {
            if (move.lines !== undefined && existingLines <= move.lines) {
                return move;
            }
            else if (move.lines === undefined && existingLines === 0) {
                return move;
            }
        }
        // Return the last move
        return moves[moves.length - 1];
    }
    iterateCstTree(document, context) {
        const root = document.parseResult.value;
        const rootCst = root.$cstNode;
        if (!rootCst) {
            return EMPTY_STREAM;
        }
        return new TreeStreamImpl(rootCst, node => this.iterateCst(node, context));
    }
    iterateCst(node, context) {
        if (!isCompositeCstNode(node)) {
            return EMPTY_STREAM;
        }
        const initial = context.indentation;
        return new StreamImpl(() => ({ index: 0 }), (state) => {
            if (state.index < node.content.length) {
                return { done: false, value: node.content[state.index++] };
            }
            else {
                // Reset the indentation to the level when we entered the node
                context.indentation = initial;
                return DONE_RESULT;
            }
        });
    }
}
export class DefaultNodeFormatter {
    constructor(astNode, collector) {
        this.astNode = astNode;
        this.collector = collector;
    }
    node(node) {
        return new FormattingRegion(node.$cstNode ? [node.$cstNode] : [], this.collector);
    }
    nodes(...nodes) {
        const cstNodes = [];
        for (const node of nodes) {
            if (node.$cstNode) {
                cstNodes.push(node.$cstNode);
            }
        }
        return new FormattingRegion(cstNodes, this.collector);
    }
    property(feature, index) {
        const cstNode = findNodeForProperty(this.astNode.$cstNode, feature, index);
        return new FormattingRegion(cstNode ? [cstNode] : [], this.collector);
    }
    properties(...features) {
        const nodes = [];
        for (const feature of features) {
            const cstNodes = findNodesForProperty(this.astNode.$cstNode, feature);
            nodes.push(...cstNodes);
        }
        return new FormattingRegion(nodes, this.collector);
    }
    keyword(keyword, index) {
        const cstNode = findNodeForKeyword(this.astNode.$cstNode, keyword, index);
        return new FormattingRegion(cstNode ? [cstNode] : [], this.collector);
    }
    keywords(...keywords) {
        const nodes = [];
        for (const feature of keywords) {
            const cstNodes = findNodesForKeyword(this.astNode.$cstNode, feature);
            nodes.push(...cstNodes);
        }
        return new FormattingRegion(nodes, this.collector);
    }
    cst(nodes) {
        return new FormattingRegion([...nodes], this.collector);
    }
    interior(start, end) {
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
export class FormattingRegion {
    constructor(nodes, collector) {
        this.nodes = nodes;
        this.collector = collector;
    }
    /**
     * Prepends the specified formatting to all nodes of this region.
     */
    prepend(formatting) {
        for (const node of this.nodes) {
            this.collector(node, 'prepend', formatting);
        }
        return this;
    }
    /**
     * Appends the specified formatting to all nodes of this region.
     */
    append(formatting) {
        for (const node of this.nodes) {
            this.collector(node, 'append', formatting);
        }
        return this;
    }
    /**
     * Sorrounds all nodes of this region with the specified formatting.
     * Functionally the same as invoking `prepend` and `append` with the same formatting.
     */
    surround(formatting) {
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
    slice(start, end) {
        return new FormattingRegion(this.nodes.slice(start, end), this.collector);
    }
}
/**
 * Contains utilities to easily create formatting actions that can be applied to a {@link FormattingRegion}.
 */
export var Formatting;
(function (Formatting) {
    /**
     * Creates a new formatting that tries to fit the existing text into one of the specified formattings.
     * @param formattings All possible formattings.
     */
    function fit(...formattings) {
        return {
            options: {},
            moves: formattings.flatMap(e => e.moves).sort(compareMoves)
        };
    }
    Formatting.fit = fit;
    /**
     * Creates a new formatting that removes all spaces
     */
    function noSpace(options) {
        return spaces(0, options);
    }
    Formatting.noSpace = noSpace;
    /**
     * Creates a new formatting that creates a single space
     */
    function oneSpace(options) {
        return spaces(1, options);
    }
    Formatting.oneSpace = oneSpace;
    /**
     * Creates a new formatting that creates the specified amount of spaces
     *
     * @param count The amount of spaces to be inserted
     */
    function spaces(count, options) {
        return {
            options: options !== null && options !== void 0 ? options : {},
            moves: [{
                    characters: count
                }]
        };
    }
    Formatting.spaces = spaces;
    /**
     * Creates a new formatting that moves an element to the next line
     */
    function newLine(options) {
        return newLines(1, options);
    }
    Formatting.newLine = newLine;
    /**
     * Creates a new formatting that creates the specified amount of new lines.
     */
    function newLines(count, options) {
        return {
            options: options !== null && options !== void 0 ? options : {},
            moves: [{
                    lines: count
                }]
        };
    }
    Formatting.newLines = newLines;
    /**
     * Creates a new formatting that moves the element to a new line and indents that line.
     */
    function indent(options) {
        return {
            options: options !== null && options !== void 0 ? options : {},
            moves: [{
                    tabs: 1,
                    lines: 1
                }]
        };
    }
    Formatting.indent = indent;
    /**
     * Creates a new formatting that removes all indentation.
     */
    function noIndent(options) {
        return {
            options: options !== null && options !== void 0 ? options : {},
            moves: [{
                    tabs: 0
                }]
        };
    }
    Formatting.noIndent = noIndent;
    function compareMoves(a, b) {
        var _a, _b, _c, _d, _e, _f;
        const aLines = (_a = a.lines) !== null && _a !== void 0 ? _a : 0;
        const bLines = (_b = b.lines) !== null && _b !== void 0 ? _b : 0;
        const aTabs = (_c = a.tabs) !== null && _c !== void 0 ? _c : 0;
        const bTabs = (_d = b.tabs) !== null && _d !== void 0 ? _d : 0;
        const aSpaces = (_e = a.characters) !== null && _e !== void 0 ? _e : 0;
        const bSpaces = (_f = b.characters) !== null && _f !== void 0 ? _f : 0;
        if (aLines < bLines) {
            return -1;
        }
        else if (aLines > bLines) {
            return 1;
        }
        else if (aTabs < bTabs) {
            return -1;
        }
        else if (aTabs > bTabs) {
            return 1;
        }
        else if (aSpaces < bSpaces) {
            return -1;
        }
        else if (aSpaces > bSpaces) {
            return 1;
        }
        else {
            return 0;
        }
    }
})(Formatting || (Formatting = {}));
//# sourceMappingURL=formatter.js.map