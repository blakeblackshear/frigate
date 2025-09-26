/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { CancellationToken } from '../utils/cancellation.js';
import { findNodeForKeyword, findNodeForProperty } from '../utils/grammar-utils.js';
import { streamAst } from '../utils/ast-utils.js';
import { tokenToRange } from '../utils/cst-utils.js';
import { interruptAndCheck, isOperationCancelled } from '../utils/promise-utils.js';
import { diagnosticData } from './validation-registry.js';
export class DefaultDocumentValidator {
    constructor(services) {
        this.validationRegistry = services.validation.ValidationRegistry;
        this.metadata = services.LanguageMetaData;
    }
    async validateDocument(document, options = {}, cancelToken = CancellationToken.None) {
        const parseResult = document.parseResult;
        const diagnostics = [];
        await interruptAndCheck(cancelToken);
        if (!options.categories || options.categories.includes('built-in')) {
            this.processLexingErrors(parseResult, diagnostics, options);
            if (options.stopAfterLexingErrors && diagnostics.some(d => { var _a; return ((_a = d.data) === null || _a === void 0 ? void 0 : _a.code) === DocumentValidator.LexingError; })) {
                return diagnostics;
            }
            this.processParsingErrors(parseResult, diagnostics, options);
            if (options.stopAfterParsingErrors && diagnostics.some(d => { var _a; return ((_a = d.data) === null || _a === void 0 ? void 0 : _a.code) === DocumentValidator.ParsingError; })) {
                return diagnostics;
            }
            this.processLinkingErrors(document, diagnostics, options);
            if (options.stopAfterLinkingErrors && diagnostics.some(d => { var _a; return ((_a = d.data) === null || _a === void 0 ? void 0 : _a.code) === DocumentValidator.LinkingError; })) {
                return diagnostics;
            }
        }
        // Process custom validations
        try {
            diagnostics.push(...await this.validateAst(parseResult.value, options, cancelToken));
        }
        catch (err) {
            if (isOperationCancelled(err)) {
                throw err;
            }
            console.error('An error occurred during validation:', err);
        }
        await interruptAndCheck(cancelToken);
        return diagnostics;
    }
    processLexingErrors(parseResult, diagnostics, _options) {
        var _a, _b, _c;
        const lexerDiagnostics = [...parseResult.lexerErrors, ...(_b = (_a = parseResult.lexerReport) === null || _a === void 0 ? void 0 : _a.diagnostics) !== null && _b !== void 0 ? _b : []];
        for (const lexerDiagnostic of lexerDiagnostics) {
            const severity = (_c = lexerDiagnostic.severity) !== null && _c !== void 0 ? _c : 'error';
            const diagnostic = {
                severity: toDiagnosticSeverity(severity),
                range: {
                    start: {
                        line: lexerDiagnostic.line - 1,
                        character: lexerDiagnostic.column - 1
                    },
                    end: {
                        line: lexerDiagnostic.line - 1,
                        character: lexerDiagnostic.column + lexerDiagnostic.length - 1
                    }
                },
                message: lexerDiagnostic.message,
                data: toDiagnosticData(severity),
                source: this.getSource()
            };
            diagnostics.push(diagnostic);
        }
    }
    processParsingErrors(parseResult, diagnostics, _options) {
        for (const parserError of parseResult.parserErrors) {
            let range = undefined;
            // We can run into the chevrotain error recovery here
            // The token contained in the parser error might be automatically inserted
            // In this case every position value will be `NaN`
            if (isNaN(parserError.token.startOffset)) {
                // Some special parser error types contain a `previousToken`
                // We can simply append our diagnostic to that token
                if ('previousToken' in parserError) {
                    const token = parserError.previousToken;
                    if (!isNaN(token.startOffset)) {
                        const position = { line: token.endLine - 1, character: token.endColumn };
                        range = { start: position, end: position };
                    }
                    else {
                        // No valid prev token. Might be empty document or containing only hidden tokens.
                        // Point to document start
                        const position = { line: 0, character: 0 };
                        range = { start: position, end: position };
                    }
                }
            }
            else {
                range = tokenToRange(parserError.token);
            }
            if (range) {
                const diagnostic = {
                    severity: toDiagnosticSeverity('error'),
                    range,
                    message: parserError.message,
                    data: diagnosticData(DocumentValidator.ParsingError),
                    source: this.getSource()
                };
                diagnostics.push(diagnostic);
            }
        }
    }
    processLinkingErrors(document, diagnostics, _options) {
        for (const reference of document.references) {
            const linkingError = reference.error;
            if (linkingError) {
                const info = {
                    node: linkingError.container,
                    property: linkingError.property,
                    index: linkingError.index,
                    data: {
                        code: DocumentValidator.LinkingError,
                        containerType: linkingError.container.$type,
                        property: linkingError.property,
                        refText: linkingError.reference.$refText
                    }
                };
                diagnostics.push(this.toDiagnostic('error', linkingError.message, info));
            }
        }
    }
    async validateAst(rootNode, options, cancelToken = CancellationToken.None) {
        const validationItems = [];
        const acceptor = (severity, message, info) => {
            validationItems.push(this.toDiagnostic(severity, message, info));
        };
        await this.validateAstBefore(rootNode, options, acceptor, cancelToken);
        await this.validateAstNodes(rootNode, options, acceptor, cancelToken);
        await this.validateAstAfter(rootNode, options, acceptor, cancelToken);
        return validationItems;
    }
    async validateAstBefore(rootNode, options, acceptor, cancelToken = CancellationToken.None) {
        var _a;
        const checksBefore = this.validationRegistry.checksBefore;
        for (const checkBefore of checksBefore) {
            await interruptAndCheck(cancelToken);
            await checkBefore(rootNode, acceptor, (_a = options.categories) !== null && _a !== void 0 ? _a : [], cancelToken);
        }
    }
    async validateAstNodes(rootNode, options, acceptor, cancelToken = CancellationToken.None) {
        await Promise.all(streamAst(rootNode).map(async (node) => {
            await interruptAndCheck(cancelToken);
            const checks = this.validationRegistry.getChecks(node.$type, options.categories);
            for (const check of checks) {
                await check(node, acceptor, cancelToken);
            }
        }));
    }
    async validateAstAfter(rootNode, options, acceptor, cancelToken = CancellationToken.None) {
        var _a;
        const checksAfter = this.validationRegistry.checksAfter;
        for (const checkAfter of checksAfter) {
            await interruptAndCheck(cancelToken);
            await checkAfter(rootNode, acceptor, (_a = options.categories) !== null && _a !== void 0 ? _a : [], cancelToken);
        }
    }
    toDiagnostic(severity, message, info) {
        return {
            message,
            range: getDiagnosticRange(info),
            severity: toDiagnosticSeverity(severity),
            code: info.code,
            codeDescription: info.codeDescription,
            tags: info.tags,
            relatedInformation: info.relatedInformation,
            data: info.data,
            source: this.getSource()
        };
    }
    getSource() {
        return this.metadata.languageId;
    }
}
export function getDiagnosticRange(info) {
    if (info.range) {
        return info.range;
    }
    let cstNode;
    if (typeof info.property === 'string') {
        cstNode = findNodeForProperty(info.node.$cstNode, info.property, info.index);
    }
    else if (typeof info.keyword === 'string') {
        cstNode = findNodeForKeyword(info.node.$cstNode, info.keyword, info.index);
    }
    cstNode !== null && cstNode !== void 0 ? cstNode : (cstNode = info.node.$cstNode);
    if (!cstNode) {
        return {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 }
        };
    }
    return cstNode.range;
}
/**
 * Transforms the diagnostic severity from the {@link LexingDiagnosticSeverity} format to LSP's `DiagnosticSeverity` format.
 *
 * @param severity The lexing diagnostic severity
 * @returns Diagnostic severity according to `vscode-languageserver-types/lib/esm/main.js#DiagnosticSeverity`
 */
export function toDiagnosticSeverity(severity) {
    switch (severity) {
        case 'error':
            return 1;
        case 'warning':
            return 2;
        case 'info':
            return 3;
        case 'hint':
            return 4;
        default:
            throw new Error('Invalid diagnostic severity: ' + severity);
    }
}
export function toDiagnosticData(severity) {
    switch (severity) {
        case 'error':
            return diagnosticData(DocumentValidator.LexingError);
        case 'warning':
            return diagnosticData(DocumentValidator.LexingWarning);
        case 'info':
            return diagnosticData(DocumentValidator.LexingInfo);
        case 'hint':
            return diagnosticData(DocumentValidator.LexingHint);
        default:
            throw new Error('Invalid diagnostic severity: ' + severity);
    }
}
export var DocumentValidator;
(function (DocumentValidator) {
    DocumentValidator.LexingError = 'lexing-error';
    DocumentValidator.LexingWarning = 'lexing-warning';
    DocumentValidator.LexingInfo = 'lexing-info';
    DocumentValidator.LexingHint = 'lexing-hint';
    DocumentValidator.ParsingError = 'parsing-error';
    DocumentValidator.LinkingError = 'linking-error';
})(DocumentValidator || (DocumentValidator = {}));
//# sourceMappingURL=document-validator.js.map