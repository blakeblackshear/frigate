/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import * as assert from 'node:assert';
import { DiagnosticSeverity, MarkupContent } from 'vscode-languageserver-types';
import { normalizeEOL } from '../generate/template-string.js';
import { SemanticTokensDecoder } from '../lsp/semantic-token-provider.js';
import { Disposable } from '../utils/disposable.js';
import { findNodeForProperty } from '../utils/grammar-utils.js';
import { escapeRegExp } from '../utils/regexp-utils.js';
import { stream } from '../utils/stream.js';
import { URI } from '../utils/uri-utils.js';
import { DocumentValidator } from '../validation/document-validator.js';
import { TextDocument } from '../workspace/documents.js';
let nextDocumentId = 1;
export function parseHelper(services) {
    const metaData = services.LanguageMetaData;
    const documentBuilder = services.shared.workspace.DocumentBuilder;
    return async (input, options) => {
        var _a, _b;
        const uri = URI.parse((_a = options === null || options === void 0 ? void 0 : options.documentUri) !== null && _a !== void 0 ? _a : `file:///${nextDocumentId++}${(_b = metaData.fileExtensions[0]) !== null && _b !== void 0 ? _b : ''}`);
        const document = services.shared.workspace.LangiumDocumentFactory.fromString(input, uri, options === null || options === void 0 ? void 0 : options.parserOptions);
        services.shared.workspace.LangiumDocuments.addDocument(document);
        await documentBuilder.build([document], options);
        return document;
    };
}
let expectedFunction = (actual, expected, message) => {
    assert.deepStrictEqual(actual, expected, message);
};
/**
 * Overrides the assertion function used by tests. Uses `assert.deepStrictEqual` by default
 *
 * @deprecated Since 1.2.0. Do not override the assertion functionality.
 */
export function expectFunction(functions) {
    expectedFunction = functions;
}
/**
 * Testing utility function for the `textDocument/documentHighlight` LSP request
 *
 * @returns A function that performs the assertion
 */
export function expectHighlight(services) {
    return async (input) => {
        var _a, _b;
        const { output, indices, ranges } = replaceIndices(input);
        const document = await parseDocument(services, output);
        const highlightProvider = services.lsp.DocumentHighlightProvider;
        const highlights = (_b = await (highlightProvider === null || highlightProvider === void 0 ? void 0 : highlightProvider.getDocumentHighlight(document, textDocumentPositionParams(document, indices[(_a = input.index) !== null && _a !== void 0 ? _a : 0])))) !== null && _b !== void 0 ? _b : [];
        const rangeIndex = input.rangeIndex;
        if (Array.isArray(rangeIndex)) {
            expectedFunction(highlights.length, rangeIndex.length, `Expected ${rangeIndex.length} highlights but received ${highlights.length}`);
            for (let i = 0; i < rangeIndex.length; i++) {
                const index = rangeIndex[i];
                const expectedRange = {
                    start: document.textDocument.positionAt(ranges[index][0]),
                    end: document.textDocument.positionAt(ranges[index][1])
                };
                const range = highlights[i].range;
                expectedFunction(range, expectedRange, `Expected range ${rangeToString(expectedRange)} does not match actual range ${rangeToString(range)}`);
            }
        }
        else if (typeof rangeIndex === 'number') {
            const expectedRange = {
                start: document.textDocument.positionAt(ranges[rangeIndex][0]),
                end: document.textDocument.positionAt(ranges[rangeIndex][1])
            };
            expectedFunction(highlights.length, 1, `Expected a single highlight but received ${highlights.length}`);
            const range = highlights[0].range;
            expectedFunction(range, expectedRange, `Expected range ${rangeToString(expectedRange)} does not match actual range ${rangeToString(range)}`);
        }
        else {
            expectedFunction(highlights.length, ranges.length, `Expected ${ranges.length} highlights but received ${highlights.length}`);
            for (let i = 0; i < ranges.length; i++) {
                const range = ranges[i];
                const expectedRange = {
                    start: document.textDocument.positionAt(range[0]),
                    end: document.textDocument.positionAt(range[1])
                };
                const targetRange = highlights[i].range;
                expectedFunction(targetRange, expectedRange, `Expected range ${rangeToString(expectedRange)} does not match actual range ${rangeToString(targetRange)}`);
            }
        }
        const disposable = Disposable.create(() => clearDocuments(services, [document]));
        if (input.disposeAfterCheck) {
            await disposable.dispose();
        }
        return disposable;
    };
}
export function expectSymbols(services) {
    return async (input) => {
        var _a, _b;
        const document = await parseDocument(services, input.text, input.parseOptions);
        const symbolProvider = services.lsp.DocumentSymbolProvider;
        const symbols = (_a = await (symbolProvider === null || symbolProvider === void 0 ? void 0 : symbolProvider.getSymbols(document, textDocumentParams(document)))) !== null && _a !== void 0 ? _a : [];
        if ('assert' in input && typeof input.assert === 'function') {
            input.assert(symbols);
        }
        else if ('expectedSymbols' in input) {
            const symbolToString = (_b = input.symbolToString) !== null && _b !== void 0 ? _b : (symbol => symbol.name);
            const expectedSymbols = input.expectedSymbols;
            if (symbols.length === expectedSymbols.length) {
                for (let i = 0; i < expectedSymbols.length; i++) {
                    const expected = expectedSymbols[i];
                    const item = symbols[i];
                    if (typeof expected === 'string') {
                        expectedFunction(symbolToString(item), expected);
                    }
                    else {
                        expectedFunction(item, expected);
                    }
                }
            }
            else {
                const symbolsMapped = symbols.map((s, i) => expectedSymbols[i] === undefined || typeof expectedSymbols[i] === 'string' ? symbolToString(s) : s);
                expectedFunction(symbolsMapped, expectedSymbols, `Expected ${expectedSymbols.length} but found ${symbols.length} symbols in document`);
            }
        }
        const disposable = Disposable.create(() => clearDocuments(services, [document]));
        if (input.disposeAfterCheck) {
            await disposable.dispose();
        }
        return disposable;
    };
}
export function expectWorkspaceSymbols(services) {
    return async (input) => {
        var _a, _b, _c;
        const symbolProvider = services.lsp.WorkspaceSymbolProvider;
        const symbols = (_b = await (symbolProvider === null || symbolProvider === void 0 ? void 0 : symbolProvider.getSymbols({
            query: (_a = input.query) !== null && _a !== void 0 ? _a : ''
        }))) !== null && _b !== void 0 ? _b : [];
        if ('assert' in input && typeof input.assert === 'function') {
            input.assert(symbols);
        }
        else if ('expectedSymbols' in input) {
            const symbolToString = (_c = input.symbolToString) !== null && _c !== void 0 ? _c : (symbol => symbol.name);
            const expectedSymbols = input.expectedSymbols;
            if (symbols.length === expectedSymbols.length) {
                for (let i = 0; i < expectedSymbols.length; i++) {
                    const expected = expectedSymbols[i];
                    const item = symbols[i];
                    if (typeof expected === 'string') {
                        expectedFunction(symbolToString(item), expected);
                    }
                    else {
                        expectedFunction(item, expected);
                    }
                }
            }
            else {
                const symbolsMapped = symbols.map((s, i) => expectedSymbols[i] === undefined || typeof expectedSymbols[i] === 'string' ? symbolToString(s) : s);
                expectedFunction(symbolsMapped, expectedSymbols, `Expected ${expectedSymbols.length} but found ${symbols.length} symbols in workspace`);
            }
        }
    };
}
export function expectFoldings(services) {
    return async (input) => {
        var _a;
        const { output, ranges } = replaceIndices(input);
        const document = await parseDocument(services, output, input.parseOptions);
        const foldingRangeProvider = services.lsp.FoldingRangeProvider;
        const foldings = (_a = await (foldingRangeProvider === null || foldingRangeProvider === void 0 ? void 0 : foldingRangeProvider.getFoldingRanges(document, textDocumentParams(document)))) !== null && _a !== void 0 ? _a : [];
        foldings.sort((a, b) => a.startLine - b.startLine);
        if ('assert' in input && typeof input.assert === 'function') {
            input.assert(foldings, ranges);
        }
        else {
            expectedFunction(foldings.length, ranges.length, `Expected ${ranges.length} but received ${foldings.length} foldings`);
            for (let i = 0; i < ranges.length; i++) {
                const expected = ranges[i];
                const item = foldings[i];
                const expectedStart = document.textDocument.positionAt(expected[0]);
                const expectedEnd = document.textDocument.positionAt(expected[1]);
                expectedFunction(item.startLine, expectedStart.line, `Expected folding start at line ${expectedStart.line} but received folding start at line ${item.startLine} instead.`);
                expectedFunction(item.endLine, expectedEnd.line, `Expected folding end at line ${expectedEnd.line} but received folding end at line ${item.endLine} instead.`);
            }
        }
        const disposable = Disposable.create(() => clearDocuments(services, [document]));
        if (input.disposeAfterCheck) {
            await disposable.dispose();
        }
        return disposable;
    };
}
export function textDocumentParams(document) {
    return { textDocument: { uri: document.textDocument.uri } };
}
export function expectCompletion(services) {
    return async (expectedCompletion) => {
        var _a, _b;
        const { output, indices } = replaceIndices(expectedCompletion);
        const document = await parseDocument(services, output, expectedCompletion.parseOptions);
        const completionProvider = services.lsp.CompletionProvider;
        const offset = indices[expectedCompletion.index];
        const completions = (_a = await (completionProvider === null || completionProvider === void 0 ? void 0 : completionProvider.getCompletion(document, textDocumentPositionParams(document, offset)))) !== null && _a !== void 0 ? _a : { isIncomplete: false, items: [] };
        if ('assert' in expectedCompletion && typeof expectedCompletion.assert === 'function') {
            expectedCompletion.assert(completions);
        }
        else if ('expectedItems' in expectedCompletion) {
            const itemToString = (_b = expectedCompletion.itemToString) !== null && _b !== void 0 ? _b : (completion => completion.label);
            const expectedItems = expectedCompletion.expectedItems;
            const items = completions.items.sort((a, b) => { var _a; return ((_a = a.sortText) === null || _a === void 0 ? void 0 : _a.localeCompare(b.sortText || '0')) || 0; });
            if (items.length === expectedItems.length) {
                for (let i = 0; i < expectedItems.length; i++) {
                    const expected = expectedItems[i];
                    const completion = items[i];
                    if (typeof expected === 'string') {
                        expectedFunction(itemToString(completion), expected);
                    }
                    else {
                        expectedFunction(completion, expected);
                    }
                }
            }
            else {
                const itemsMapped = items.map((s, i) => expectedItems[i] === undefined || typeof expectedItems[i] === 'string' ? itemToString(s) : s);
                expectedFunction(itemsMapped, expectedItems, `Expected ${expectedItems.length} but received ${items.length} completion items`);
            }
        }
        const disposable = Disposable.create(() => clearDocuments(services, [document]));
        if (expectedCompletion.disposeAfterCheck) {
            await disposable.dispose();
        }
        return disposable;
    };
}
export function expectGoToDefinition(services) {
    return async (expectedGoToDefinition) => {
        var _a;
        const { output, indices, ranges } = replaceIndices(expectedGoToDefinition);
        const document = await parseDocument(services, output, expectedGoToDefinition.parseOptions);
        const definitionProvider = services.lsp.DefinitionProvider;
        const locationLinks = (_a = await (definitionProvider === null || definitionProvider === void 0 ? void 0 : definitionProvider.getDefinition(document, textDocumentPositionParams(document, indices[expectedGoToDefinition.index])))) !== null && _a !== void 0 ? _a : [];
        const rangeIndex = expectedGoToDefinition.rangeIndex;
        if (Array.isArray(rangeIndex)) {
            expectedFunction(locationLinks.length, rangeIndex.length, `Expected ${rangeIndex.length} definitions but received ${locationLinks.length}`);
            for (const index of rangeIndex) {
                const expectedRange = {
                    start: document.textDocument.positionAt(ranges[index][0]),
                    end: document.textDocument.positionAt(ranges[index][1])
                };
                const range = locationLinks[0].targetSelectionRange;
                expectedFunction(range, expectedRange, `Expected range ${rangeToString(expectedRange)} does not match actual range ${rangeToString(range)}`);
            }
        }
        else {
            const expectedRange = {
                start: document.textDocument.positionAt(ranges[rangeIndex][0]),
                end: document.textDocument.positionAt(ranges[rangeIndex][1])
            };
            expectedFunction(locationLinks.length, 1, `Expected a single definition but received ${locationLinks.length}`);
            const range = locationLinks[0].targetSelectionRange;
            expectedFunction(range, expectedRange, `Expected range ${rangeToString(expectedRange)} does not match actual range ${rangeToString(range)}`);
        }
        const disposable = Disposable.create(() => clearDocuments(services, [document]));
        if (expectedGoToDefinition.disposeAfterCheck) {
            await disposable.dispose();
        }
        return disposable;
    };
}
export function expectFindReferences(services) {
    return async (expectedFindReferences) => {
        var _a;
        const { output, indices, ranges } = replaceIndices(expectedFindReferences);
        const document = await parseDocument(services, output, expectedFindReferences.parseOptions);
        const expectedRanges = ranges.map(range => ({
            start: document.textDocument.positionAt(range[0]),
            end: document.textDocument.positionAt(range[1])
        }));
        const referenceFinder = services.lsp.ReferencesProvider;
        for (const index of indices) {
            const referenceParameters = referenceParams(document, index, expectedFindReferences.includeDeclaration);
            const references = (_a = await (referenceFinder === null || referenceFinder === void 0 ? void 0 : referenceFinder.findReferences(document, referenceParameters))) !== null && _a !== void 0 ? _a : [];
            expectedFunction(references.length, expectedRanges.length, 'Found references do not match amount of expected references');
            for (const reference of references) {
                expectedFunction(expectedRanges.some(range => isRangeEqual(range, reference.range)), true, `Found unexpected reference at range ${rangeToString(reference.range)}`);
            }
        }
        const disposable = Disposable.create(() => clearDocuments(services, [document]));
        if (expectedFindReferences.disposeAfterCheck) {
            await disposable.dispose();
        }
        return disposable;
    };
}
export function referenceParams(document, offset, includeDeclaration) {
    return {
        textDocument: { uri: document.textDocument.uri },
        position: document.textDocument.positionAt(offset),
        context: { includeDeclaration }
    };
}
export function expectHover(services) {
    return async (expectedHover) => {
        const { output, indices } = replaceIndices(expectedHover);
        const document = await parseDocument(services, output, expectedHover.parseOptions);
        const hoverProvider = services.lsp.HoverProvider;
        const hover = await (hoverProvider === null || hoverProvider === void 0 ? void 0 : hoverProvider.getHoverContent(document, textDocumentPositionParams(document, indices[expectedHover.index])));
        const hoverContent = hover && MarkupContent.is(hover.contents) ? hover.contents.value : undefined;
        if (typeof expectedHover.hover !== 'object') {
            expectedFunction(hoverContent, expectedHover.hover);
        }
        else {
            const value = hoverContent !== null && hoverContent !== void 0 ? hoverContent : '';
            expectedFunction(expectedHover.hover.test(value), true, `Hover '${value}' does not match regex /${expectedHover.hover.source}/${expectedHover.hover.flags}.`);
        }
        const disposable = Disposable.create(() => clearDocuments(services, [document]));
        if (expectedHover.disposeAfterCheck) {
            await disposable.dispose();
        }
        return disposable;
    };
}
export function expectFormatting(services) {
    const formatter = services.lsp.Formatter;
    if (!formatter) {
        throw new Error(`No formatter registered for language ${services.LanguageMetaData.languageId}`);
    }
    return async (expectedFormatting) => {
        var _a;
        const document = await parseDocument(services, expectedFormatting.before, expectedFormatting.parseOptions);
        const identifier = { uri: document.uri.toString() };
        const options = (_a = expectedFormatting.options) !== null && _a !== void 0 ? _a : {
            insertSpaces: true,
            tabSize: 4
        };
        const edits = await (expectedFormatting.range ?
            formatter.formatDocumentRange(document, { options, textDocument: identifier, range: expectedFormatting.range }) :
            formatter.formatDocument(document, { options, textDocument: identifier }));
        const editedDocument = TextDocument.applyEdits(document.textDocument, edits);
        expectedFunction(normalizeEOL(editedDocument), normalizeEOL(expectedFormatting.after));
        const disposable = Disposable.create(() => clearDocuments(services, [document]));
        if (expectedFormatting.disposeAfterCheck) {
            await disposable.dispose();
        }
        return disposable;
    };
}
export function textDocumentPositionParams(document, offset) {
    return { textDocument: { uri: document.textDocument.uri }, position: document.textDocument.positionAt(offset) };
}
export async function parseDocument(services, input, options) {
    const document = await parseHelper(services)(input, options);
    if (!document.parseResult) {
        throw new Error('Could not parse document');
    }
    return document;
}
export function replaceIndices(base) {
    const indices = [];
    const ranges = [];
    const rangeStack = [];
    const indexMarker = base.indexMarker || '<|>';
    const rangeStartMarker = base.rangeStartMarker || '<|';
    const rangeEndMarker = base.rangeEndMarker || '|>';
    const regex = new RegExp(`${escapeRegExp(indexMarker)}|${escapeRegExp(rangeStartMarker)}|${escapeRegExp(rangeEndMarker)}`);
    let matched = true;
    let input = base.text;
    while (matched) {
        const regexMatch = regex.exec(input);
        if (regexMatch) {
            const matchedString = regexMatch[0];
            switch (matchedString) {
                case indexMarker:
                    indices.push(regexMatch.index);
                    break;
                case rangeStartMarker:
                    rangeStack.push(regexMatch.index);
                    break;
                case rangeEndMarker: {
                    const rangeStart = rangeStack.pop() || 0;
                    ranges.push([rangeStart, regexMatch.index]);
                    break;
                }
            }
            input = input.substring(0, regexMatch.index) + input.substring(regexMatch.index + matchedString.length);
        }
        else {
            matched = false;
        }
    }
    return { output: input, indices, ranges: ranges.sort((a, b) => a[0] - b[0]) };
}
export function validationHelper(services) {
    const parse = parseHelper(services);
    return async (input, options) => {
        var _a;
        const document = await parse(input, Object.assign(Object.assign({}, (options !== null && options !== void 0 ? options : {})), { validation: true }));
        const result = {
            document,
            diagnostics: (_a = document.diagnostics) !== null && _a !== void 0 ? _a : [],
            dispose: () => clearDocuments(services, [document])
        };
        if (options === null || options === void 0 ? void 0 : options.failOnParsingErrors) {
            expectNoIssues(result, {
                severity: DiagnosticSeverity.Error,
                data: {
                    code: DocumentValidator.ParsingError,
                },
            });
        }
        return result;
    };
}
export function isDiagnosticDataEqual(lhs, rhs) {
    if (lhs === rhs) {
        return true;
    }
    if (typeof lhs === 'object' && lhs !== null && typeof rhs === 'object' && rhs !== null) {
        for (const key of Object.keys(rhs)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (!isDiagnosticDataEqual(lhs[key], rhs[key])) {
                return false;
            }
        }
        return true;
    }
    return false;
}
export function isRangeEqual(lhs, rhs) {
    return lhs.start.character === rhs.start.character
        && lhs.start.line === rhs.start.line
        && lhs.end.character === rhs.end.character
        && lhs.end.line === rhs.end.line;
}
export function rangeToString(range) {
    return `${range.start.line}:${range.start.character}--${range.end.line}:${range.end.character}`;
}
export function filterByOptions(validationResult, options) {
    const filters = [];
    if ('node' in options && options.node) {
        let cstNode = options.node.$cstNode;
        if (options.property) {
            const name = typeof options.property === 'string' ? options.property : options.property.name;
            const index = typeof options.property === 'string' ? undefined : options.property.index;
            cstNode = findNodeForProperty(cstNode, name, index);
        }
        if (!cstNode) {
            throw new Error('Cannot find the node!');
        }
        filters.push(d => isRangeEqual(cstNode.range, d.range));
    }
    if ('offset' in options) {
        const outer = {
            start: validationResult.document.textDocument.positionAt(options.offset),
            end: validationResult.document.textDocument.positionAt(options.offset + options.length)
        };
        filters.push(d => isRangeEqual(outer, d.range));
    }
    if ('range' in options) {
        filters.push(d => isRangeEqual(options.range, d.range));
    }
    if (options.code) {
        filters.push(d => d.code === options.code);
    }
    if (options.data) {
        filters.push(d => isDiagnosticDataEqual(d.data, options.data));
    }
    if (options.message) {
        if (typeof options.message === 'string') {
            filters.push(d => d.message === options.message);
        }
        else if (options.message instanceof RegExp) {
            const regexp = options.message;
            filters.push(d => regexp.test(d.message));
        }
    }
    if (options.severity) {
        filters.push(d => d.severity === options.severity);
    }
    return validationResult.diagnostics.filter(diag => filters.every(holdsFor => holdsFor(diag)));
}
export function expectNoIssues(validationResult, filterOptions) {
    const filtered = filterOptions ? filterByOptions(validationResult, filterOptions) : validationResult.diagnostics;
    expectedFunction(filtered.length, 0, `Expected no issues, but found ${filtered.length}:\n${printDiagnostics(filtered)}`);
}
export function expectIssue(validationResult, filterOptions) {
    const filtered = filterOptions ? filterByOptions(validationResult, filterOptions) : validationResult.diagnostics;
    expectedFunction(filtered.length > 0, true, 'Found no issues');
}
export function expectError(validationResult, message, filterOptions) {
    const content = {
        message,
        severity: DiagnosticSeverity.Error
    };
    expectIssue(validationResult, Object.assign(Object.assign({}, filterOptions), content));
}
export function expectWarning(validationResult, message, filterOptions) {
    const content = {
        message,
        severity: DiagnosticSeverity.Warning
    };
    expectIssue(validationResult, Object.assign(Object.assign({}, filterOptions), content));
}
export function printDiagnostics(diagnostics) {
    var _a;
    return (_a = diagnostics === null || diagnostics === void 0 ? void 0 : diagnostics.map(d => `line ${d.range.start.line}, column ${d.range.start.character}: ${d.message}`).join('\n')) !== null && _a !== void 0 ? _a : '';
}
/**
 * Add the given document to the `TextDocuments` service, simulating it being opened in an editor.
 *
 * @deprecated Since 3.2.0. Use `set`/`delete` from `TextDocuments` instead.
 */
export function setTextDocument(services, document) {
    const shared = 'shared' in services ? services.shared : services;
    const textDocuments = shared.workspace.TextDocuments;
    textDocuments.set(document);
    return Disposable.create(() => {
        textDocuments.delete(document.uri);
    });
}
export function clearDocuments(services, documents) {
    const shared = 'shared' in services ? services.shared : services;
    const allDocs = (documents ? stream(documents) : shared.workspace.LangiumDocuments.all).map(x => x.uri).toArray();
    return shared.workspace.DocumentBuilder.update([], allDocs);
}
export function highlightHelper(services) {
    const parse = parseHelper(services);
    const tokenProvider = services.lsp.SemanticTokenProvider;
    if (!tokenProvider) {
        throw new Error('No semantic token provider provided!');
    }
    return async (text, options) => {
        const { output: input, ranges } = replaceIndices({
            text
        });
        const document = await parse(input, options);
        const params = { textDocument: { uri: document.textDocument.uri } };
        const tokens = await tokenProvider.semanticHighlight(document, params);
        return { tokens: SemanticTokensDecoder.decode(tokens, tokenProvider.tokenTypes, document), ranges };
    };
}
export function expectSemanticToken(tokensWithRanges, options) {
    const range = tokensWithRanges.ranges[options.rangeIndex || 0];
    const result = tokensWithRanges.tokens.filter(t => {
        return t.tokenType === options.tokenType && t.offset === range[0] && t.offset + t.text.length === range[1];
    });
    expectedFunction(result.length, 1, `Expected one token with the specified options but found ${result.length}`);
}
//# sourceMappingURL=langium-test.js.map