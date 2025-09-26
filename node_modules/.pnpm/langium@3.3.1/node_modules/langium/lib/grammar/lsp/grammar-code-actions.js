/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { CodeActionKind } from 'vscode-languageserver';
import { getContainerOfType } from '../../utils/ast-utils.js';
import { findLeafNodeAtOffset } from '../../utils/cst-utils.js';
import { findNodeForProperty } from '../../utils/grammar-utils.js';
import { escapeRegExp } from '../../utils/regexp-utils.js';
import { UriUtils } from '../../utils/uri-utils.js';
import { DocumentValidator } from '../../validation/document-validator.js';
import * as ast from '../../languages/generated/ast.js';
import { IssueCodes } from '../validation/validator.js';
export class LangiumGrammarCodeActionProvider {
    constructor(services) {
        this.reflection = services.shared.AstReflection;
        this.indexManager = services.shared.workspace.IndexManager;
    }
    getCodeActions(document, params) {
        const result = [];
        const acceptor = (ca) => ca && result.push(ca);
        for (const diagnostic of params.context.diagnostics) {
            this.createCodeActions(diagnostic, document, acceptor);
        }
        return result;
    }
    createCodeActions(diagnostic, document, accept) {
        var _a;
        switch ((_a = diagnostic.data) === null || _a === void 0 ? void 0 : _a.code) {
            case IssueCodes.GrammarNameUppercase:
            case IssueCodes.RuleNameUppercase:
                accept(this.makeUpperCase(diagnostic, document));
                break;
            case IssueCodes.HiddenGrammarTokens:
                accept(this.fixHiddenTerminals(diagnostic, document));
                break;
            case IssueCodes.UseRegexTokens:
                accept(this.fixRegexTokens(diagnostic, document));
                break;
            case IssueCodes.EntryRuleTokenSyntax:
                accept(this.addEntryKeyword(diagnostic, document));
                break;
            case IssueCodes.CrossRefTokenSyntax:
                accept(this.fixCrossRefSyntax(diagnostic, document));
                break;
            case IssueCodes.UnnecessaryFileExtension:
                accept(this.fixUnnecessaryFileExtension(diagnostic, document));
                break;
            case IssueCodes.MissingReturns:
                accept(this.fixMissingReturns(diagnostic, document));
                break;
            case IssueCodes.InvalidInfers:
            case IssueCodes.InvalidReturns:
                accept(this.fixInvalidReturnsInfers(diagnostic, document));
                break;
            case IssueCodes.MissingInfer:
                accept(this.fixMissingInfer(diagnostic, document));
                break;
            case IssueCodes.SuperfluousInfer:
                accept(this.fixSuperfluousInfer(diagnostic, document));
                break;
            case DocumentValidator.LinkingError: {
                const data = diagnostic.data;
                if (data && data.containerType === 'RuleCall' && data.property === 'rule') {
                    accept(this.addNewRule(diagnostic, data, document));
                }
                if (data) {
                    this.lookInGlobalScope(diagnostic, data, document).forEach(accept);
                }
                break;
            }
        }
        return undefined;
    }
    /**
     * Adds missing returns for parser rule
     */
    fixMissingReturns(diagnostic, document) {
        const text = document.textDocument.getText(diagnostic.range);
        if (text) {
            return {
                title: `Add explicit return type for parser rule ${text}`,
                kind: CodeActionKind.QuickFix,
                diagnostics: [diagnostic],
                edit: {
                    changes: {
                        [document.textDocument.uri]: [{
                                range: diagnostic.range,
                                newText: `${text} returns ${text}` // suggestion adds missing 'return'
                            }]
                    }
                }
            };
        }
        return undefined;
    }
    fixInvalidReturnsInfers(diagnostic, document) {
        const data = diagnostic.data;
        if (data && data.actionSegment) {
            const text = document.textDocument.getText(data.actionSegment.range);
            return {
                title: `Correct ${text} usage`,
                kind: CodeActionKind.QuickFix,
                diagnostics: [diagnostic],
                edit: {
                    changes: {
                        [document.textDocument.uri]: [{
                                range: data.actionSegment.range,
                                newText: text === 'infers' ? 'returns' : 'infers'
                            }]
                    }
                }
            };
        }
        return undefined;
    }
    fixMissingInfer(diagnostic, document) {
        const data = diagnostic.data;
        if (data && data.actionSegment) {
            return {
                title: "Correct 'infer' usage",
                kind: CodeActionKind.QuickFix,
                diagnostics: [diagnostic],
                edit: {
                    changes: {
                        [document.textDocument.uri]: [{
                                range: {
                                    start: data.actionSegment.range.end,
                                    end: data.actionSegment.range.end
                                },
                                newText: 'infer '
                            }]
                    }
                }
            };
        }
        return undefined;
    }
    fixSuperfluousInfer(diagnostic, document) {
        const data = diagnostic.data;
        if (data && data.actionRange) {
            return {
                title: "Remove the 'infer' keyword",
                kind: CodeActionKind.QuickFix,
                diagnostics: [diagnostic],
                edit: {
                    changes: {
                        [document.textDocument.uri]: [{
                                range: data.actionRange,
                                newText: ''
                            }]
                    }
                }
            };
        }
        return undefined;
    }
    fixUnnecessaryFileExtension(diagnostic, document) {
        const end = Object.assign({}, diagnostic.range.end);
        end.character -= 1;
        const start = Object.assign({}, end);
        start.character -= '.langium'.length;
        return {
            title: 'Remove file extension',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: {
                    [document.textDocument.uri]: [{
                            range: {
                                start,
                                end
                            },
                            newText: ''
                        }]
                }
            }
        };
    }
    makeUpperCase(diagnostic, document) {
        const range = {
            start: diagnostic.range.start,
            end: {
                line: diagnostic.range.start.line,
                character: diagnostic.range.start.character + 1
            }
        };
        return {
            title: 'First letter to upper case',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: {
                    [document.textDocument.uri]: [{
                            range,
                            newText: document.textDocument.getText(range).toUpperCase()
                        }]
                }
            }
        };
    }
    addEntryKeyword(diagnostic, document) {
        return {
            title: 'Add entry keyword',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: {
                    [document.textDocument.uri]: [{
                            range: { start: diagnostic.range.start, end: diagnostic.range.start },
                            newText: 'entry '
                        }]
                }
            }
        };
    }
    fixRegexTokens(diagnostic, document) {
        const offset = document.textDocument.offsetAt(diagnostic.range.start);
        const rootCst = document.parseResult.value.$cstNode;
        if (rootCst) {
            const cstNode = findLeafNodeAtOffset(rootCst, offset);
            const container = getContainerOfType(cstNode === null || cstNode === void 0 ? void 0 : cstNode.astNode, ast.isCharacterRange);
            if (container && container.right && container.$cstNode) {
                const left = container.left.value;
                const right = container.right.value;
                return {
                    title: 'Refactor into regular expression',
                    kind: CodeActionKind.QuickFix,
                    diagnostics: [diagnostic],
                    isPreferred: true,
                    edit: {
                        changes: {
                            [document.textDocument.uri]: [{
                                    range: container.$cstNode.range,
                                    newText: `/[${escapeRegExp(left)}-${escapeRegExp(right)}]/`
                                }]
                        }
                    }
                };
            }
        }
        return undefined;
    }
    fixCrossRefSyntax(diagnostic, document) {
        return {
            title: "Replace '|' with ':'",
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: {
                    [document.textDocument.uri]: [{
                            range: diagnostic.range,
                            newText: ':'
                        }]
                }
            }
        };
    }
    fixHiddenTerminals(diagnostic, document) {
        const grammar = document.parseResult.value;
        const hiddenTokens = grammar.hiddenTokens;
        const changes = [];
        const hiddenNode = findNodeForProperty(grammar.$cstNode, 'definesHiddenTokens');
        if (hiddenNode) {
            const start = hiddenNode.range.start;
            const offset = hiddenNode.offset;
            const end = grammar.$cstNode.text.indexOf(')', offset) + 1;
            changes.push({
                newText: '',
                range: {
                    start,
                    end: document.textDocument.positionAt(end)
                }
            });
        }
        for (const terminal of hiddenTokens) {
            const ref = terminal.ref;
            if (ref && ast.isTerminalRule(ref) && !ref.hidden && ref.$cstNode) {
                const start = ref.$cstNode.range.start;
                changes.push({
                    newText: 'hidden ',
                    range: {
                        start,
                        end: start
                    }
                });
            }
        }
        return {
            title: 'Fix hidden terminals',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: {
                    [document.textDocument.uri]: changes
                }
            }
        };
    }
    addNewRule(diagnostic, data, document) {
        const offset = document.textDocument.offsetAt(diagnostic.range.start);
        const rootCst = document.parseResult.value.$cstNode;
        if (rootCst) {
            const cstNode = findLeafNodeAtOffset(rootCst, offset);
            const container = getContainerOfType(cstNode === null || cstNode === void 0 ? void 0 : cstNode.astNode, ast.isParserRule);
            if (container && container.$cstNode) {
                return {
                    title: `Add new rule '${data.refText}'`,
                    kind: CodeActionKind.QuickFix,
                    diagnostics: [diagnostic],
                    isPreferred: false,
                    edit: {
                        changes: {
                            [document.textDocument.uri]: [{
                                    range: {
                                        start: container.$cstNode.range.end,
                                        end: container.$cstNode.range.end
                                    },
                                    newText: '\n\n' + data.refText + ':\n    /* TODO implement rule */ {infer ' + data.refText + '};'
                                }]
                        }
                    }
                };
            }
        }
        return undefined;
    }
    lookInGlobalScope(diagnostic, data, document) {
        var _a, _b;
        const refInfo = {
            container: {
                $type: data.containerType
            },
            property: data.property,
            reference: {
                $refText: data.refText
            }
        };
        const referenceType = this.reflection.getReferenceType(refInfo);
        const candidates = this.indexManager.allElements(referenceType).filter(e => e.name === data.refText);
        const result = [];
        let shortestPathIndex = -1;
        let shortestPathLength = -1;
        for (const candidate of candidates) {
            if (UriUtils.equals(candidate.documentUri, document.uri)) {
                continue;
            }
            // Find an import path and a position to insert the import
            const importPath = getRelativeImport(document.uri, candidate.documentUri);
            let position;
            let suffix = '';
            const grammar = document.parseResult.value;
            const nextImport = grammar.imports.find(imp => imp.path && importPath < imp.path);
            if (nextImport) {
                // Insert the new import alphabetically
                position = (_a = nextImport.$cstNode) === null || _a === void 0 ? void 0 : _a.range.start;
            }
            else if (grammar.imports.length > 0) {
                // Put the new import after the last import
                const rangeEnd = grammar.imports[grammar.imports.length - 1].$cstNode.range.end;
                if (rangeEnd) {
                    position = { line: rangeEnd.line + 1, character: 0 };
                }
            }
            else if (grammar.rules.length > 0) {
                // Put the new import before the first rule
                position = (_b = grammar.rules[0].$cstNode) === null || _b === void 0 ? void 0 : _b.range.start;
                suffix = '\n';
            }
            if (position) {
                if (shortestPathIndex < 0 || importPath.length < shortestPathLength) {
                    shortestPathIndex = result.length;
                    shortestPathLength = importPath.length;
                }
                // Add an import declaration for the candidate in the global scope
                result.push({
                    title: `Add import to '${importPath}'`,
                    kind: CodeActionKind.QuickFix,
                    diagnostics: [diagnostic],
                    isPreferred: false,
                    edit: {
                        changes: {
                            [document.textDocument.uri]: [{
                                    range: {
                                        start: position,
                                        end: position
                                    },
                                    newText: `import '${importPath}'\n${suffix}`
                                }]
                        }
                    }
                });
            }
        }
        // Mark the code action with the shortest import path as preferred
        if (shortestPathIndex >= 0) {
            result[shortestPathIndex].isPreferred = true;
        }
        return result;
    }
}
function getRelativeImport(source, target) {
    const sourceDir = UriUtils.dirname(source);
    let relativePath = UriUtils.relative(sourceDir, target);
    if (!relativePath.startsWith('./') && !relativePath.startsWith('../')) {
        relativePath = './' + relativePath;
    }
    if (relativePath.endsWith('.langium')) {
        relativePath = relativePath.substring(0, relativePath.length - '.langium'.length);
    }
    return relativePath;
}
//# sourceMappingURL=grammar-code-actions.js.map