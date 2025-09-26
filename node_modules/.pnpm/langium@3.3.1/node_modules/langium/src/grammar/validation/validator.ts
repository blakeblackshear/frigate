/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { Range } from 'vscode-languageserver-types';
import { DiagnosticTag } from 'vscode-languageserver-types';
import * as ast from '../../languages/generated/ast.js';
import type { NamedAstNode } from '../../references/name-provider.js';
import type { References } from '../../references/references.js';
import type { AstNode, Properties, Reference } from '../../syntax-tree.js';
import { getContainerOfType, streamAllContents } from '../../utils/ast-utils.js';
import { MultiMap } from '../../utils/collections.js';
import { toDocumentSegment } from '../../utils/cst-utils.js';
import { findNameAssignment, findNodeForKeyword, findNodeForProperty, getAllReachableRules, isArrayCardinality, isDataTypeRule, isOptionalCardinality, terminalRegex } from '../../utils/grammar-utils.js';
import type { Stream } from '../../utils/stream.js';
import { stream } from '../../utils/stream.js';
import type { DiagnosticData, ValidationAcceptor, ValidationChecks } from '../../validation/validation-registry.js';
import { diagnosticData } from '../../validation/validation-registry.js';
import type { AstNodeLocator } from '../../workspace/ast-node-locator.js';
import type { LangiumDocuments } from '../../workspace/documents.js';
import { getTypeNameWithoutError, hasDataTypeReturn, isPrimitiveGrammarType, isStringGrammarType, resolveImport, resolveTransitiveImports } from '../internal-grammar-util.js';
import type { LangiumGrammarServices } from '../langium-grammar-module.js';
import { typeDefinitionToPropertyType } from '../type-system/type-collector/declared-types.js';
import { flattenPlainType, isPlainReferenceType } from '../type-system/type-collector/plain-types.js';

export function registerValidationChecks(services: LangiumGrammarServices): void {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.LangiumGrammarValidator;
    const checks: ValidationChecks<ast.LangiumGrammarAstType> = {
        Action: [
            validator.checkAssignmentReservedName,
        ],
        AbstractRule: validator.checkRuleName,
        Assignment: [
            validator.checkAssignmentWithFeatureName,
            validator.checkAssignmentToFragmentRule,
            validator.checkAssignmentTypes,
            validator.checkAssignmentReservedName
        ],
        ParserRule: [
            validator.checkParserRuleDataType,
            validator.checkRuleParametersUsed,
            validator.checkEmptyParserRule,
            validator.checkParserRuleReservedName,
            validator.checkOperatorMultiplicitiesForMultiAssignments,
        ],
        TerminalRule: [
            validator.checkTerminalRuleReturnType,
            validator.checkHiddenTerminalRule,
            validator.checkEmptyTerminalRule
        ],
        InferredType: validator.checkTypeReservedName,
        Keyword: validator.checkKeyword,
        UnorderedGroup: validator.checkUnorderedGroup,
        Grammar: [
            validator.checkGrammarName,
            validator.checkEntryGrammarRule,
            validator.checkUniqueRuleName,
            validator.checkUniqueTypeName,
            validator.checkUniqueImportedRules,
            validator.checkDuplicateImportedGrammar,
            validator.checkGrammarHiddenTokens,
            validator.checkGrammarForUnusedRules,
            validator.checkGrammarTypeInfer,
            validator.checkClashingTerminalNames,
        ],
        GrammarImport: validator.checkPackageImport,
        CharacterRange: validator.checkInvalidCharacterRange,
        Interface: [
            validator.checkTypeReservedName,
            validator.checkInterfacePropertyTypes,
        ],
        Type: [
            validator.checkTypeReservedName,
        ],
        TypeAttribute: validator.checkTypeReservedName,
        RuleCall: [
            validator.checkUsedHiddenTerminalRule,
            validator.checkUsedFragmentTerminalRule,
            validator.checkRuleCallParameters,
            validator.checkMultiRuleCallsAreAssigned
        ],
        TerminalRuleCall: validator.checkUsedHiddenTerminalRule,
        CrossReference: [
            validator.checkCrossReferenceSyntax,
            validator.checkCrossRefNameAssignment,
            validator.checkCrossRefTerminalType,
            validator.checkCrossRefType,
            validator.checkCrossReferenceToTypeUnion
        ],
        SimpleType: validator.checkFragmentsInTypes,
        ReferenceType: validator.checkReferenceTypeUnion,
        RegexToken: [
            validator.checkInvalidRegexFlags,
            validator.checkDirectlyUsedRegexFlags
        ]
    };
    registry.register(checks, validator);
}

export namespace IssueCodes {
    export const GrammarNameUppercase = 'grammar-name-uppercase';
    export const RuleNameUppercase = 'rule-name-uppercase';
    export const HiddenGrammarTokens = 'hidden-grammar-tokens';
    export const UseRegexTokens = 'use-regex-tokens';
    export const EntryRuleTokenSyntax = 'entry-rule-token-syntax';
    export const CrossRefTokenSyntax = 'cross-ref-token-syntax';
    export const UnnecessaryFileExtension = 'unnecessary-file-extension';
    export const InvalidReturns = 'invalid-returns';
    export const InvalidInfers = 'invalid-infers';
    export const MissingInfer = 'missing-infer';
    export const MissingReturns = 'missing-returns';
    export const SuperfluousInfer = 'superfluous-infer';
    export const OptionalUnorderedGroup = 'optional-unordered-group';
    export const ParsingRuleEmpty = 'parsing-rule-empty';
}

export class LangiumGrammarValidator {

    protected readonly references: References;
    protected readonly nodeLocator: AstNodeLocator;
    protected readonly documents: LangiumDocuments;

    constructor(services: LangiumGrammarServices) {
        this.references = services.references.References;
        this.nodeLocator = services.workspace.AstNodeLocator;
        this.documents = services.shared.workspace.LangiumDocuments;
    }

    checkGrammarName(grammar: ast.Grammar, accept: ValidationAcceptor): void {
        if (grammar.name) {
            const firstChar = grammar.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'Grammar name should start with an upper case letter.', {
                    node: grammar,
                    property: 'name',
                    data: diagnosticData(IssueCodes.GrammarNameUppercase)
                });
            }
        }
    }

    checkEntryGrammarRule(grammar: ast.Grammar, accept: ValidationAcceptor): void {
        if (grammar.isDeclared && !grammar.name) {
            // Incomplete syntax: grammar without a name.
            return;
        }
        const entryRules = grammar.rules.filter(e => ast.isParserRule(e) && e.entry) as ast.ParserRule[];
        if (grammar.isDeclared && entryRules.length === 0) {
            const possibleEntryRule = grammar.rules.find(e => ast.isParserRule(e) && !isDataTypeRule(e));
            if (possibleEntryRule) {
                accept('error', 'The grammar is missing an entry parser rule. This rule can be an entry one.', {
                    node: possibleEntryRule,
                    property: 'name',
                    data: diagnosticData(IssueCodes.EntryRuleTokenSyntax)
                });
            } else {
                accept('error', 'This grammar is missing an entry parser rule.', { node: grammar, property: 'name' });
            }
        } else if (!grammar.isDeclared && entryRules.length >= 1) {
            entryRules.forEach(rule => accept('error', 'Cannot declare entry rules for unnamed grammars.', { node: rule, property: 'name' }));
        } else if (entryRules.length > 1) {
            entryRules.forEach(rule => accept('error', 'The entry rule has to be unique.', { node: rule, property: 'name' }));
        } else if (entryRules.length === 1 && isDataTypeRule(entryRules[0])) {
            accept('error', 'The entry rule cannot be a data type rule.', { node: entryRules[0], property: 'name' });
        }
    }

    /**
     * Check whether any rule defined in this grammar is a duplicate of an already defined rule or an imported rule
     */
    checkUniqueRuleName(grammar: ast.Grammar, accept: ValidationAcceptor): void {
        const extractor = (grammar: ast.Grammar) => stream(grammar.rules).filter(rule => !isEmptyRule(rule));
        this.checkUniqueName(grammar, accept, extractor, 'rule');
    }

    /**
     * Check whether any type defined in this grammar is a duplicate of an already defined type or an imported type
     */
    checkUniqueTypeName(grammar: ast.Grammar, accept: ValidationAcceptor): void {
        const extractor = (grammar: ast.Grammar) => stream(grammar.types).concat(grammar.interfaces);
        this.checkUniqueName(grammar, accept, extractor, 'type');
    }

    private checkUniqueName(grammar: ast.Grammar, accept: ValidationAcceptor, extractor: (grammar: ast.Grammar) => Stream<NamedAstNode>, uniqueObjName: string): void {
        const map = new MultiMap<string, { name: string } & AstNode>();
        extractor(grammar).forEach(e => map.add(e.name, e));

        for (const [, types] of map.entriesGroupedByKey()) {
            if (types.length > 1) {
                types.forEach(e => {
                    accept('error', `A ${uniqueObjName}'s name has to be unique.`, { node: e, property: 'name' });
                });
            }
        }
        const imported = new Set<string>();
        const resolvedGrammars = resolveTransitiveImports(this.documents, grammar);
        for (const resolvedGrammar of resolvedGrammars) {
            extractor(resolvedGrammar).forEach(e => imported.add(e.name));
        }
        for (const name of map.keys()) {
            if (imported.has(name)) {
                const types = map.get(name);
                types.forEach(e => {
                    accept('error', `A ${uniqueObjName} with the name '${e.name}' already exists in an imported grammar.`, { node: e, property: 'name' });
                });
            }
        }
    }

    checkDuplicateImportedGrammar(grammar: ast.Grammar, accept: ValidationAcceptor): void {
        const importMap = new MultiMap<ast.Grammar, ast.GrammarImport>();
        for (const imp of grammar.imports) {
            const resolvedGrammar = resolveImport(this.documents, imp);
            if (resolvedGrammar) {
                importMap.add(resolvedGrammar, imp);
            }
        }
        for (const [, imports] of importMap.entriesGroupedByKey()) {
            if (imports.length > 1) {
                imports.forEach((imp, i) => {
                    if (i > 0) {
                        accept('warning', 'The grammar is already being directly imported.', { node: imp, tags: [DiagnosticTag.Unnecessary] });
                    }
                });
            }
        }
    }

    /**
     * Compared to the validation above, this validation only checks whether two imported grammars export the same grammar rule.
     */
    checkUniqueImportedRules(grammar: ast.Grammar, accept: ValidationAcceptor): void {
        const imports = new Map<ast.GrammarImport, ast.Grammar[]>();
        for (const imp of grammar.imports) {
            const importedGrammars = resolveTransitiveImports(this.documents, imp);
            imports.set(imp, importedGrammars);
        }
        const allDuplicates = new MultiMap<ast.GrammarImport, string>();
        for (const outerImport of grammar.imports) {
            const outerGrammars = imports.get(outerImport)!;
            for (const innerImport of grammar.imports) {
                if (outerImport === innerImport) {
                    continue;
                }
                const innerGrammars = imports.get(innerImport)!;
                const duplicates = this.getDuplicateExportedRules(outerGrammars, innerGrammars);
                for (const duplicate of duplicates) {
                    allDuplicates.add(outerImport, duplicate);
                }
            }
        }
        for (const imp of grammar.imports) {
            const duplicates = allDuplicates.get(imp);
            if (duplicates.length > 0) {
                accept('error', 'Some rules exported by this grammar are also included in other imports: ' + stream(duplicates).distinct().join(', '), { node: imp, property: 'path' });
            }
        }
    }

    private getDuplicateExportedRules(outer: ast.Grammar[], inner: ast.Grammar[]): Set<string> {
        const exclusiveOuter = outer.filter(g => !inner.includes(g));
        const outerRules = exclusiveOuter.flatMap(e => e.rules);
        const innerRules = inner.flatMap(e => e.rules);
        const duplicates = new Set<string>();
        for (const outerRule of outerRules) {
            const outerName = outerRule.name;
            for (const innerRule of innerRules) {
                const innerName = innerRule.name;
                if (outerName === innerName) {
                    duplicates.add(innerRule.name);
                }
            }
        }
        return duplicates;
    }

    checkGrammarTypeInfer(grammar: ast.Grammar, accept: ValidationAcceptor): void {
        const types = new Set<string>();
        for (const type of grammar.types) {
            types.add(type.name);
        }
        for (const interfaceType of grammar.interfaces) {
            types.add(interfaceType.name);
        }
        // Collect type/interface definitions from imported grammars
        for (const importedGrammar of resolveTransitiveImports(this.documents, grammar)) {
            importedGrammar.types.forEach(type => types.add(type.name));
            importedGrammar.interfaces.forEach(iface => types.add(iface.name));
        }

        for (const rule of grammar.rules.filter(ast.isParserRule)) {
            if (isEmptyRule(rule)) {
                continue;
            }

            const isDataType = isDataTypeRule(rule);
            const isInfers = !rule.returnType && !rule.dataType;
            const ruleTypeName = getTypeNameWithoutError(rule);
            if (!isDataType && ruleTypeName && types.has(ruleTypeName) === isInfers) {
                if ((isInfers || rule.returnType?.ref !== undefined) && rule.inferredType === undefined) {
                    // report missing returns (a type of the same name is declared)
                    accept('error', getMessage(ruleTypeName, isInfers), {
                        node: rule,
                        property: 'name',
                        data: diagnosticData(IssueCodes.MissingReturns)
                    });
                } else if (isInfers || rule.returnType?.ref !== undefined) {
                    // report bad infers (should be corrected to 'returns' to match existing type)
                    const infersNode = findNodeForKeyword(rule.inferredType!.$cstNode, 'infers');
                    accept('error', getMessage(ruleTypeName, isInfers), {
                        node: rule.inferredType!,
                        property: 'name',
                        data: {
                            code: IssueCodes.InvalidInfers,
                            actionSegment: toDocumentSegment(infersNode)
                        } satisfies DiagnosticData
                    });
                }
            } else if (isDataType && isInfers) {
                const inferNode = findNodeForKeyword(rule.$cstNode, 'infer');
                accept('error', 'Data type rules cannot infer a type.', {
                    node: rule,
                    property: 'inferredType',
                    data: {
                        code: IssueCodes.InvalidInfers,
                        actionSegment: toDocumentSegment(inferNode)
                    } satisfies DiagnosticData
                });
            }
        }
        for (const action of streamAllContents(grammar).filter(ast.isAction)) {
            const actionType = this.getActionType(action);
            if (actionType) {
                const isInfers = Boolean(action.inferredType);
                const typeName = getTypeNameWithoutError(action);
                if (action.type && typeName && types.has(typeName) === isInfers) {
                    const keywordNode = isInfers ? findNodeForKeyword(action.$cstNode, 'infer') : findNodeForKeyword(action.$cstNode, '{');
                    accept('error', getMessage(typeName, isInfers), {
                        node: action,
                        property: 'type',
                        data: {
                            code: isInfers ? IssueCodes.SuperfluousInfer : IssueCodes.MissingInfer,
                            actionSegment: toDocumentSegment(keywordNode)
                        } satisfies DiagnosticData
                    });
                } else if (actionType && typeName && types.has(typeName) && isInfers) {
                    // error: action infers type that is already defined
                    if (action.$cstNode) {
                        const inferredTypeNode = findNodeForProperty(action.inferredType?.$cstNode, 'name');
                        const keywordNode = findNodeForKeyword(action.$cstNode, '{');
                        if (inferredTypeNode && keywordNode) {
                            // remove everything from the opening { up to the type name
                            // we may lose comments in-between, but this can be undone as needed
                            accept('error', `${typeName} is a declared type and cannot be redefined.`, {
                                node: action,
                                property: 'type',
                                data: {
                                    code: IssueCodes.SuperfluousInfer,
                                    actionRange: {
                                        start: keywordNode.range.end,
                                        end: inferredTypeNode.range.start
                                    }
                                } satisfies DiagnosticData
                            });
                        }
                    }
                }
            }
        }
        function getMessage(name: string, infer: boolean) {
            if (infer) {
                return `The type '${name}' is already explicitly declared and cannot be inferred.`;
            } else {
                return `The type '${name}' is not explicitly declared and must be inferred.`;
            }
        }
    }

    private getActionType(rule: ast.Action): ast.AbstractType | undefined {
        if (rule.type) {
            return rule.type?.ref;
        } else if (rule.inferredType) {
            return rule.inferredType;
        }
        return undefined;
    }

    checkGrammarHiddenTokens(grammar: ast.Grammar, accept: ValidationAcceptor): void {
        if (grammar.definesHiddenTokens) {
            accept('error', 'Hidden terminals are declared at the terminal definition.', {
                node: grammar,
                property: 'definesHiddenTokens',
                data: diagnosticData(IssueCodes.HiddenGrammarTokens)
            });
        }
    }

    checkHiddenTerminalRule(terminalRule: ast.TerminalRule, accept: ValidationAcceptor): void {
        if (terminalRule.hidden && terminalRule.fragment) {
            accept('error', 'Cannot use terminal fragments as hidden tokens.', { node: terminalRule, property: 'hidden' });
        }
    }

    checkEmptyTerminalRule(terminalRule: ast.TerminalRule, accept: ValidationAcceptor): void {
        try {
            const regex = terminalRegex(terminalRule);
            if (new RegExp(regex).test('')) {
                accept('error', 'This terminal could match an empty string.', { node: terminalRule, property: 'name' });
            }
        } catch {
            // In case the terminal can't be transformed into a regex, we throw an error
            // As this indicates unresolved cross references or parser errors, we can ignore this here
        }
    }

    checkEmptyParserRule(parserRule: ast.ParserRule, accept: ValidationAcceptor): void {
        // Rule body needs to be set;
        // Entry rules and fragments may consume no input.
        if (!parserRule.definition || parserRule.entry || parserRule.fragment) {
            return;
        }

        const consumesAnything = (element: ast.AbstractElement): boolean => {
            // First, check cardinality of the element.
            if (element.cardinality === '?' || element.cardinality === '*') {
                return false;
            }
            // Actions themselves count as optional.
            if (ast.isAction(element)) {
                return false;
            }
            // Unordered groups act as alternatives surrounded by `*`
            if (ast.isUnorderedGroup(element)) {
                return false;
            }
            // Only one element of the group needs to consume something
            if (ast.isGroup(element)) {
                return element.elements.some(consumesAnything);
            }
            // Every altneratives needs to consume something
            if (ast.isAlternatives(element)) {
                return element.elements.every(consumesAnything);
            }
            // If the element is a direct rule call
            // We need to check whether the element consumes anything
            if (ast.isRuleCall(element) && element.rule.ref?.definition) {
                return consumesAnything(element.rule.ref.definition);
            }
            // Else, assert that we consume something.
            return true;
        };
        if (!consumesAnything(parserRule.definition)) {
            accept('warning', 'This parser rule potentially consumes no input.', { node: parserRule, property: 'name', code: IssueCodes.ParsingRuleEmpty });
        }
    }

    checkInvalidRegexFlags(token: ast.RegexToken, accept: ValidationAcceptor): void {
        const regex = token.regex;
        if (regex) {
            const slashIndex = regex.lastIndexOf('/');
            const flags = regex.substring(slashIndex + 1);
            // global/multiline/sticky are valid, but not supported
            const unsupportedFlags = 'gmy';
            // only case-insensitive/dotall/unicode are really supported
            const supportedFlags = 'isu';
            const allFlags = unsupportedFlags + supportedFlags;
            const errorFlags = new Set<string>();
            const warningFlags = new Set<string>();
            for (let i = 0; i < flags.length; i++) {
                const flag = flags.charAt(i);
                if (!allFlags.includes(flag)) {
                    errorFlags.add(flag);
                } else if (unsupportedFlags.includes(flag)) {
                    warningFlags.add(flag);
                }
            }
            const range = this.getFlagRange(token);
            if (range) {
                if (errorFlags.size > 0) {
                    accept('error', `'${Array.from(errorFlags).join('')}' ${errorFlags.size > 1 ? 'are' : 'is'} not valid regular expression flag${errorFlags.size > 1 ? 's' : ''}.`, {
                        node: token,
                        range
                    });
                } else if (warningFlags.size > 0) {
                    accept('warning', `'${Array.from(warningFlags).join('')}' regular expression flag${warningFlags.size > 1 ? 's' : ''} will be ignored by Langium.`, {
                        node: token,
                        range
                    });
                }
            }
        }
    }

    checkDirectlyUsedRegexFlags(token: ast.RegexToken, accept: ValidationAcceptor): void {
        const regex = token.regex;
        if (!ast.isTerminalRule(token.$container) && regex) {
            const slashIndex = regex.lastIndexOf('/');
            const flags = regex.substring(slashIndex + 1);
            const range = this.getFlagRange(token);
            if (range && flags) {
                accept('warning', 'Regular expression flags are only applied if the terminal is not a composition.', {
                    node: token,
                    range
                });
            }
        }
    }

    private getFlagRange(token: ast.RegexToken): Range | undefined {
        const regexCstNode = findNodeForProperty(token.$cstNode, 'regex');
        if (!regexCstNode || !token.regex) {
            return undefined;
        }
        const regex = token.regex;
        const slashIndex = regex.lastIndexOf('/') + 1;
        const range: Range = {
            start: {
                line: regexCstNode.range.end.line,
                character: regexCstNode.range.end.character - regex.length + slashIndex
            },
            end: regexCstNode.range.end
        };
        return range;
    }

    checkUsedHiddenTerminalRule(ruleCall: ast.RuleCall | ast.TerminalRuleCall, accept: ValidationAcceptor): void {
        const parentRule = getContainerOfType(ruleCall, (n): n is ast.TerminalRule | ast.ParserRule => ast.isTerminalRule(n) || ast.isParserRule(n));
        if (parentRule) {
            if ('hidden' in parentRule && parentRule.hidden) {
                return;
            }

            if (ruleCall.lookahead) {
                return;
            }

            const terminalGroup = findLookAheadGroup(ruleCall);
            if (terminalGroup && terminalGroup.lookahead) {
                return;
            }

            const ref = ruleCall.rule.ref;
            if (ast.isTerminalRule(ref) && ref.hidden) {
                accept('error', 'Cannot use hidden terminal in non-hidden rule', { node: ruleCall, property: 'rule' });
            }
        }
    }

    checkUsedFragmentTerminalRule(ruleCall: ast.RuleCall, accept: ValidationAcceptor): void {
        const terminal = ruleCall.rule.ref;
        if (ast.isTerminalRule(terminal) && terminal.fragment) {
            const parentRule = getContainerOfType(ruleCall, ast.isParserRule);
            if (parentRule) {
                accept('error', 'Cannot use terminal fragments as part of parser rules.', { node: ruleCall, property: 'rule' });
            }
        }
    }

    checkCrossReferenceSyntax(crossRef: ast.CrossReference, accept: ValidationAcceptor): void {
        if (crossRef.deprecatedSyntax) {
            accept('error', "'|' is deprecated. Please, use ':' instead.", {
                node: crossRef,
                property: 'deprecatedSyntax',
                data: diagnosticData(IssueCodes.CrossRefTokenSyntax)
            });
        }
    }

    checkPackageImport(imp: ast.GrammarImport, accept: ValidationAcceptor): void {
        const resolvedGrammar = resolveImport(this.documents, imp);
        if (resolvedGrammar === undefined) {
            accept('error', 'Import cannot be resolved.', { node: imp, property: 'path' });
        } else if (imp.path.endsWith('.langium')) {
            accept('warning', 'Imports do not need file extensions.', {
                node: imp,
                property: 'path',
                data: diagnosticData(IssueCodes.UnnecessaryFileExtension)
            });
        }
    }

    checkInvalidCharacterRange(range: ast.CharacterRange, accept: ValidationAcceptor): void {
        if (range.right) {
            const message = 'Character ranges cannot use more than one character';
            let invalid = false;
            if (range.left.value.length > 1) {
                invalid = true;
                accept('error', message, { node: range.left, property: 'value' });
            }
            if (range.right.value.length > 1) {
                invalid = true;
                accept('error', message, { node: range.right, property: 'value' });
            }
            if (!invalid) {
                accept('hint', 'Consider using regex instead of character ranges', {
                    node: range,
                    data: diagnosticData(IssueCodes.UseRegexTokens)
                });
            }
        }
    }

    checkGrammarForUnusedRules(grammar: ast.Grammar, accept: ValidationAcceptor): void {
        const reachableRules = getAllReachableRules(grammar, true);

        for (const rule of grammar.rules) {
            if (ast.isTerminalRule(rule) && rule.hidden || isEmptyRule(rule)) {
                continue;
            }
            if (!reachableRules.has(rule)) {
                accept('hint', 'This rule is declared but never referenced.', {
                    node: rule,
                    property: 'name',
                    tags: [DiagnosticTag.Unnecessary]
                });
            }
        }
    }

    checkClashingTerminalNames(grammar: ast.Grammar, accept: ValidationAcceptor): void {
        const localTerminals = new MultiMap<string, ast.TerminalRule>();
        const localKeywords = new Set<string>();

        // Collect locally defined terminals/keywords
        for (const rule of grammar.rules) {
            if (ast.isTerminalRule(rule) && rule.name) {
                localTerminals.add(rule.name, rule);
            }
            if (ast.isParserRule(rule)) {
                const keywords = streamAllContents(rule).filter(ast.isKeyword);
                keywords.forEach(e => localKeywords.add(e.value));
            }
        }

        // Collect imported terminals/keywords and their respective imports
        const importedTerminals = new MultiMap<string, ast.GrammarImport>();
        const importedKeywords = new MultiMap<string, ast.GrammarImport>();

        for (const importNode of grammar.imports) {
            const importedGrammars = resolveTransitiveImports(this.documents, importNode);
            for (const importedGrammar of importedGrammars) {
                for (const rule of importedGrammar.rules) {
                    if (ast.isTerminalRule(rule) && rule.name) {
                        importedTerminals.add(rule.name, importNode);
                    } else if (ast.isParserRule(rule) && rule.name) {
                        const keywords = streamAllContents(rule).filter(ast.isKeyword);
                        keywords.forEach(e => importedKeywords.add(e.value, importNode));
                    }
                }
            }
        }

        for (const localTerminal of localTerminals.values()) {
            if (localKeywords.has(localTerminal.name)) {
                // 1st case: Local terminal with local keyword (error on terminal)
                accept('error', 'Terminal name clashes with existing keyword.', {
                    node: localTerminal,
                    property: 'name'
                });
            } else if (importedKeywords.has(localTerminal.name)) {
                const importNode = importedKeywords.get(localTerminal.name)!;
                // 2nd case: Local terminal with imported keyword (error on terminal)
                accept('error', `Terminal name clashes with imported keyword from "${importNode[0].path}".`, {
                    node: localTerminal,
                    property: 'name'
                });
            }
        }

        // Collect all imported terminals that share a name with a local keyword
        const importTerminalMap = new MultiMap<ast.GrammarImport, string>();
        for (const localKeyword of localKeywords) {
            for (const importNode of importedTerminals.get(localKeyword)) {
                importTerminalMap.add(importNode, localKeyword);
            }
        }

        for (const [importNode, keywords] of importTerminalMap.entriesGroupedByKey()) {
            if (keywords.length > 0) {
                // 3rd case: Imported terminal with local keyword (error on import)
                accept('error', `Imported terminals (${keywords.join(', ')}) clash with locally defined keywords.`, {
                    node: importNode,
                    property: 'path'
                });
            }
        }

        // Collect all imported terminals that share a name with imported keywords
        const importKeywordMap = new MultiMap<ast.GrammarImport, string>();
        for (const [name, imports] of importedTerminals.entriesGroupedByKey()) {
            const keywordImports = importedKeywords.get(name);
            if (keywordImports.length > 0) {
                imports
                    // Exclude transitive keyword/terminal clashing
                    // These errors are already shown in another file
                    // So no need to validate these again here
                    .filter(e => !keywordImports.includes(e))
                    .forEach(e => importKeywordMap.add(e, name));
            }
        }

        for (const [importNode, keywords] of importKeywordMap.entriesGroupedByKey()) {
            if (keywords.length > 0) {
                // 4th case: Imported terminal with imported keyword (error on import)
                accept('error', `Imported terminals (${keywords.join(', ')}) clash with imported keywords.`, {
                    node: importNode,
                    property: 'path'
                });
            }
        }
    }

    checkRuleName(rule: ast.AbstractRule, accept: ValidationAcceptor): void {
        if (rule.name && !isEmptyRule(rule)) {
            const firstChar = rule.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'Rule name should start with an upper case letter.', {
                    node: rule,
                    property: 'name',
                    data: diagnosticData(IssueCodes.RuleNameUppercase)
                });
            }
        }
    }

    /** This validation checks, that parser rules which are called multiple times are assigned (except for fragments). */
    checkMultiRuleCallsAreAssigned(call: ast.RuleCall, accept: ValidationAcceptor): void {
        const findContainerWithCardinality = (node: AstNode) => {
            let result: AstNode | undefined = node;
            while (result !== undefined) {
                if (ast.isAbstractElement(result) && (result.cardinality === '+' || result.cardinality === '*')) {
                    break;
                }
                result = result.$container;
            }
            return result;
        };
        const ref = call.rule.ref;
        // Parsing an unassigned terminal rule is fine.
        if (!ref || ast.isTerminalRule(ref)) {
            return;
        }
        // Fragment or data type rules are fine too.
        if (ref.fragment || isDataTypeRule(ref)) {
            return;
        }
        // Multiple unassigned calls if inside a data type rule is fine too.
        const parentRule = getContainerOfType(call, ast.isParserRule);
        if (!parentRule || isDataTypeRule(parentRule)) {
            return;
        }

        const appearsMultipleTimes = findContainerWithCardinality(call) !== undefined;
        const hasAssignment = getContainerOfType(call, ast.isAssignment) !== undefined;
        if (appearsMultipleTimes && !hasAssignment) {
            accept('error', `Rule call '${ref.name}' requires assignment when parsed multiple times.`, {
                node: call
            });
        }
    }

    checkTypeReservedName(type: ast.Interface | ast.TypeAttribute | ast.Type | ast.InferredType, accept: ValidationAcceptor): void {
        this.checkReservedName(type, 'name', accept);
    }

    checkAssignmentReservedName(assignment: ast.Assignment | ast.Action, accept: ValidationAcceptor): void {
        this.checkReservedName(assignment, 'feature', accept);
    }

    checkParserRuleReservedName(rule: ast.ParserRule, accept: ValidationAcceptor): void {
        if (!rule.inferredType) {
            this.checkReservedName(rule, 'name', accept);
        }
    }

    private checkReservedName<N extends AstNode>(node: N, property: Properties<N>, accept: ValidationAcceptor): void {
        const name = node[property as keyof N];
        if (typeof name === 'string' && reservedNames.has(name)) {
            accept('error', `'${name}' is a reserved name of the JavaScript runtime.`, {
                node,
                property
            });
        }
    }

    checkKeyword(keyword: ast.Keyword, accept: ValidationAcceptor): void {
        if (getContainerOfType(keyword, ast.isParserRule)) {
            if (keyword.value.length === 0) {
                accept('error', 'Keywords cannot be empty.', { node: keyword });
            } else if (keyword.value.trim().length === 0) {
                accept('error', 'Keywords cannot only consist of whitespace characters.', { node: keyword });
            } else if (/\s/g.test(keyword.value)) {
                accept('warning', 'Keywords should not contain whitespace characters.', { node: keyword });
            }
        }
    }

    checkUnorderedGroup(unorderedGroup: ast.UnorderedGroup, accept: ValidationAcceptor): void {
        unorderedGroup.elements.forEach((ele) => {
            if (isOptionalCardinality(ele.cardinality)) {
                accept('error', 'Optional elements in Unordered groups are currently not supported', {
                    node: ele,
                    data: diagnosticData(IssueCodes.OptionalUnorderedGroup)
                });
            }
        });
    }

    checkRuleParametersUsed(rule: ast.ParserRule, accept: ValidationAcceptor): void {
        const parameters = rule.parameters;
        if (parameters.length > 0) {
            const allReferences = streamAllContents(rule).filter(ast.isParameterReference);
            for (const parameter of parameters) {
                if (!allReferences.some(e => e.parameter.ref === parameter)) {
                    accept('hint', `Parameter '${parameter.name}' is unused.`, {
                        node: parameter,
                        tags: [DiagnosticTag.Unnecessary]
                    });
                }
            }
        }
    }

    checkParserRuleDataType(rule: ast.ParserRule, accept: ValidationAcceptor): void {
        if (isEmptyRule(rule)) {
            return;
        }
        const hasDatatypeReturnType = hasDataTypeReturn(rule);
        const dataTypeRule = isDataTypeRule(rule);
        if (!hasDatatypeReturnType && dataTypeRule) {
            accept('error', 'This parser rule does not create an object. Add a primitive return type or an action to the start of the rule to force object instantiation.', { node: rule, property: 'name' });
        } else if (hasDatatypeReturnType && !dataTypeRule) {
            accept('error', 'Normal parser rules are not allowed to return a primitive value. Use a datatype rule for that.', { node: rule, property: rule.dataType ? 'dataType' : 'returnType' });
        }
    }

    checkAssignmentToFragmentRule(assignment: ast.Assignment, accept: ValidationAcceptor): void {
        if (!assignment.terminal) {
            return;
        }
        if (ast.isRuleCall(assignment.terminal) && ast.isParserRule(assignment.terminal.rule.ref) && assignment.terminal.rule.ref.fragment) {
            accept('error', `Cannot use fragment rule '${assignment.terminal.rule.ref.name}' for assignment of property '${assignment.feature}'.`, { node: assignment, property: 'terminal' });
        }
    }

    checkAssignmentTypes(assignment: ast.Assignment, accept: ValidationAcceptor): void {
        if (!assignment.terminal) {
            return;
        }
        let firstType: 'ref' | 'other';
        const foundMixed = streamAllContents(assignment.terminal)
            .map(node => ast.isCrossReference(node) ? 'ref' : 'other')
            .find(type => {
                if (!firstType) {
                    firstType = type;
                    return false;
                }
                return type !== firstType;
            });
        if (foundMixed) {
            accept(
                'error',
                this.createMixedTypeError(assignment.feature),
                {
                    node: assignment,
                    property: 'terminal'
                }
            );
        }
    }

    /** This validation recursively looks at all assignments (and rewriting actions) with '=' as assignment operator and checks,
     * whether the operator should be '+=' instead. */
    checkOperatorMultiplicitiesForMultiAssignments(rule: ast.ParserRule, accept: ValidationAcceptor): void {
        // for usual parser rules AND for fragments, but not for data type rules!
        if (!rule.dataType) {
            this.checkOperatorMultiplicitiesForMultiAssignmentsIndependent([rule.definition], accept);
        }
    }

    private checkOperatorMultiplicitiesForMultiAssignmentsIndependent(startNodes: AstNode[], accept: ValidationAcceptor, map: Map<string, AssignmentUse> = new Map()): void {
        // check all starting nodes
        this.checkOperatorMultiplicitiesForMultiAssignmentsNested(startNodes, 1, map, accept);

        // create the warnings
        for (const entry of map.values()) {
            if (entry.counter >= 2) {
                for (const assignment of entry.assignments) {
                    if (assignment.operator !== '+=') {
                        accept(
                            'warning',
                            `Found multiple assignments to '${assignment.feature}' with the '${assignment.operator}' assignment operator. Consider using '+=' instead to prevent data loss.`,
                            { node: assignment, property: 'feature' } // use 'feature' instead of 'operator', since it is pretty hard to see
                        );
                    }
                }
            }
        }
    }

    private checkOperatorMultiplicitiesForMultiAssignmentsNested(nodes: AstNode[], parentMultiplicity: number, map: Map<string, AssignmentUse>, accept: ValidationAcceptor): boolean {
        let resultCreatedNewObject = false;
        // check all given elements
        for (let i = 0; i < nodes.length; i++) {
            const currentNode = nodes[i];

            // Tree-Rewrite-Actions are a special case: a new object is created => following assignments are put into the new object
            if (ast.isAction(currentNode) && currentNode.feature) {
                // (This does NOT count for unassigned actions, i.e. actions without feature name, since they change only the type of the current object.)
                const mapForNewObject = new Map();
                storeAssignmentUse(mapForNewObject, currentNode.feature, 1, currentNode); // remember the special rewriting feature
                // all following nodes are put into the new object => check their assignments independently
                this.checkOperatorMultiplicitiesForMultiAssignmentsIndependent(nodes.slice(i + 1), accept, mapForNewObject);
                resultCreatedNewObject = true;
                break; // breaks the current loop
            }

            // all other elements don't create new objects themselves:

            // the current element can occur multiple times => its assignments can occur multiple times as well
            let currentMultiplicity = parentMultiplicity;
            if (ast.isAbstractElement(currentNode) && isArrayCardinality(currentNode.cardinality)) {
                currentMultiplicity *= 2; // note that the result is not exact (but it is sufficient for the current use case)!
            }

            // assignment
            if (ast.isAssignment(currentNode)) {
                storeAssignmentUse(map, currentNode.feature, currentMultiplicity, currentNode);
            }

            // Search for assignments in used fragments as well, since their property values are stored in the current object.
            // But do not search in calls of regular parser rules, since parser rules create new objects.
            if (ast.isRuleCall(currentNode) && ast.isParserRule(currentNode.rule.ref) && currentNode.rule.ref.fragment) {
                const createdNewObject = this.checkOperatorMultiplicitiesForMultiAssignmentsNested([currentNode.rule.ref.definition], currentMultiplicity, map, accept);
                resultCreatedNewObject = createdNewObject || resultCreatedNewObject;
            }

            // look for assignments to the same feature nested within groups
            if (ast.isGroup(currentNode) || ast.isUnorderedGroup(currentNode)) {
                // all members of the group are relavant => collect them all
                const mapGroup: Map<string, AssignmentUse> = new Map(); // store assignments for Alternatives separately
                const createdNewObject = this.checkOperatorMultiplicitiesForMultiAssignmentsNested(currentNode.elements, 1, mapGroup, accept);
                mergeAssignmentUse(mapGroup, map, createdNewObject
                    ? (s, t) => (s + t)                         // if a new object is created in the group: ignore the current multiplicity, since a new object is created for each loop cycle!
                    : (s, t) => (s * currentMultiplicity + t)   // otherwise as usual: take the current multiplicity into account
                );
                resultCreatedNewObject = createdNewObject || resultCreatedNewObject;
            }

            // for alternatives, only a single alternative is used => assume the worst case and take the maximum number of assignments
            if (ast.isAlternatives(currentNode)) {
                const mapAllAlternatives: Map<string, AssignmentUse> = new Map(); // store assignments for Alternatives separately
                let countCreatedObjects = 0;
                for (const child of currentNode.elements) {
                    const mapCurrentAlternative: Map<string, AssignmentUse> = new Map();
                    const createdNewObject = this.checkOperatorMultiplicitiesForMultiAssignmentsNested([child], 1, mapCurrentAlternative, accept);
                    mergeAssignmentUse(mapCurrentAlternative, mapAllAlternatives, createdNewObject
                        ? (s, t) => Math.max(s, t)                         // if a new object is created in an alternative: ignore the current multiplicity, since a new object is created for each loop cycle!
                        : (s, t) => Math.max(s * currentMultiplicity, t)   // otherwise as usual: take the current multiplicity into account
                    );
                    if (createdNewObject) {
                        countCreatedObjects++;
                    }
                }
                // merge alternatives
                mergeAssignmentUse(mapAllAlternatives, map);
                // since we assume the worst case, we define, that the entire Alternatives node created a new object, if ALL its alternatives created a new object
                if (countCreatedObjects === currentNode.elements.length) {
                    resultCreatedNewObject = true;
                }
            }
        }
        return resultCreatedNewObject; // indicates, whether a new object was created
    }

    checkInterfacePropertyTypes(interfaceDecl: ast.Interface, accept: ValidationAcceptor): void {
        for (const attribute of interfaceDecl.attributes) {
            if (attribute.type) {
                const plainType = typeDefinitionToPropertyType(attribute.type);
                const flattened = flattenPlainType(plainType);
                let hasRef = false;
                let hasNonRef = false;
                for (const flat of flattened.union.concat(flattened.array)) {
                    if (isPlainReferenceType(flat)) {
                        hasRef = true;
                    } else if (!isPlainReferenceType(flat)) {
                        hasNonRef = true;
                    }
                }
                if (hasRef && hasNonRef) {
                    accept(
                        'error',
                        this.createMixedTypeError(attribute.name),
                        {
                            node: attribute,
                            property: 'type'
                        }
                    );
                }
            }
        }
    }

    protected createMixedTypeError(propName: string) {
        return `Mixing a cross-reference with other types is not supported. Consider splitting property "${propName}" into two or more different properties.`;
    }

    checkTerminalRuleReturnType(rule: ast.TerminalRule, accept: ValidationAcceptor): void {
        if (rule.type?.name && !isPrimitiveGrammarType(rule.type.name)) {
            accept('error', "Terminal rules can only return primitive types like 'string', 'boolean', 'number', 'Date' or 'bigint'.", { node: rule.type, property: 'name' });
        }
    }

    checkRuleCallParameters(ruleCall: ast.RuleCall, accept: ValidationAcceptor): void {
        const rule = ruleCall.rule.ref;
        if (ast.isParserRule(rule)) {
            const expected = rule.parameters.length;
            const given = ruleCall.arguments.length;
            if (expected !== given) {
                accept('error', `Rule '${rule.name}' expects ${expected} arguments, but got ${given}.`, { node: ruleCall });
            }
        } else if (ast.isTerminalRule(rule) && ruleCall.arguments.length > 0) {
            accept('error', 'Terminal rules do not accept any arguments', { node: ruleCall });
        }
    }

    checkCrossRefNameAssignment(reference: ast.CrossReference, accept: ValidationAcceptor): void {
        if (!reference.terminal && reference.type.ref && !findNameAssignment(reference.type.ref)) {
            accept('error', 'Cannot infer terminal or data type rule for cross-reference.', { node: reference, property: 'type' });
        }
    }

    checkCrossRefTerminalType(reference: ast.CrossReference, accept: ValidationAcceptor): void {
        const refTerminal = reference.terminal;
        if (ast.isRuleCall(refTerminal)) {
            const rule = refTerminal.rule.ref;
            if (ast.isParserRule(rule) && !isDataTypeRule(rule)) {
                accept('error', 'Parser rules cannot be used for cross-references.', { node: refTerminal, property: 'rule' });
            } else if (ast.isParserRule(rule) && !isStringGrammarType(rule)) {
                accept('error', 'Data type rules for cross-references must be of type string.', { node: refTerminal, property: 'rule' });
            } else if (ast.isTerminalRule(rule) && rule.type?.name && rule.type.name !== 'string') {
                accept('error', 'Terminal rules for cross-references must be of type string.', { node: refTerminal, property: 'rule' });
            }
        }
    }

    checkCrossRefType(reference: ast.CrossReference, accept: ValidationAcceptor): void {
        const issue = this.checkReferenceToRuleButNotType(reference?.type);
        if (issue) {
            accept('error', issue, { node: reference, property: 'type' });
        }
    }

    checkCrossReferenceToTypeUnion(reference: ast.CrossReference, accept: ValidationAcceptor): void {
        if (ast.isType(reference.type.ref) && ast.isUnionType(reference.type.ref.type)) {
            const errors = checkTypeUnionContainsOnlyParseRules(reference.type.ref.type);
            if (errors.length > 0) {
                accept('error', `Cross-reference on type union is only valid if all alternatives are AST nodes. ${errors.join(', ')} ${errors.length > 1 ? 'are' : 'is'} not ${errors.length > 1 ? '' : 'an '}AST node${errors.length > 1 ? 's':''}.`, { node: reference, property: 'type' });
            }
        }
    }

    checkFragmentsInTypes(type: ast.SimpleType, accept: ValidationAcceptor): void {
        if (ast.isParserRule(type.typeRef?.ref) && type.typeRef?.ref.fragment) {
            accept('error', 'Cannot use rule fragments in types.', { node: type, property: 'typeRef' });
        }
    }

    checkReferenceTypeUnion(type: ast.ReferenceType, accept: ValidationAcceptor): void {
        if (!ast.isSimpleType(type.referenceType)) {
            accept('error', 'Only direct rule references are allowed in reference types.', { node: type, property: 'referenceType' });
        }
    }

    protected checkReferenceToRuleButNotType(type: Reference<ast.AbstractType>): string | undefined {
        if (type && ast.isParserRule(type.ref) && !isDataTypeRule(type.ref) && (type.ref.returnType || type.ref.inferredType)) {
            const typeName = getTypeNameWithoutError(type.ref);
            if (typeName) {
                return `Use the rule type '${typeName}' instead of the typed rule name '${type.ref.name}' for cross-references.`;
            }
        }
        return undefined;
    }

    checkAssignmentWithFeatureName(assignment: ast.Assignment, accept: ValidationAcceptor): void {
        if (assignment.feature === 'name' && ast.isCrossReference(assignment.terminal)) {
            accept('warning', 'The "name" property is not recommended for cross-references.', { node: assignment, property: 'feature' });
        }
    }
}

function isEmptyRule(rule: ast.AbstractRule): boolean {
    return !rule.definition || !rule.definition.$cstNode || rule.definition.$cstNode.length === 0;
}

const reservedNames = new Set([
    // Built-in objects, properties and methods
    // Collections
    'Array',
    'Int8Array',
    'Uint8Array',
    'Uint8ClampedArray',
    'Int16Array',
    'Uint16Array',
    'Int32Array',
    'Uint32Array',
    'Float32Array',
    'Float64Array',
    'BigInt64Array',
    'BigUint64Array',
    // Keyed collections
    'Map',
    'Set',
    'WeakMap',
    'WeakSet',
    // Errors
    'Error',
    'AggregateError',
    'EvalError',
    'InternalError',
    'RangeError',
    'ReferenceError',
    'SyntaxError',
    'TypeError',
    'URIError',
    // Primitives
    'BigInt',
    'RegExp',
    'Number',
    'Object',
    'Function',
    'Symbol',
    'String',
    // Math
    'Math',
    'NaN',
    'Infinity',
    'isFinite',
    'isNaN',
    // Structured data
    'Buffer',
    'ArrayBuffer',
    'SharedArrayBuffer',
    'Atomics',
    'DataView',
    'JSON',
    'globalThis',
    'decodeURIComponent',
    'decodeURI',
    'encodeURIComponent',
    'encodeURI',
    'parseInt',
    'parseFloat',
    // Control abstraction
    'Promise',
    'Generator',
    'GeneratorFunction',
    'AsyncFunction',
    'AsyncGenerator',
    'AsyncGeneratorFunction',
    // Reflection
    'Reflect',
    'Proxy',
    // Others
    'Date',
    'Intl',
    'eval',
    'undefined'
]);

function checkTypeUnionContainsOnlyParseRules(type: ast.UnionType): string[] {
    const errors: string[] = [];
    type.types.forEach(type => {
        if (ast.isSimpleType(type)) {
            if (type.typeRef?.ref) {
                if(ast.isType(type.typeRef.ref)) {
                    if (ast.isUnionType(type.typeRef.ref.type)) {
                        errors.push(...checkTypeUnionContainsOnlyParseRules(type.typeRef.ref.type));
                    } else {
                        errors.push(type.typeRef.ref.name);
                    }
                }
            } else if (type.stringType) {
                errors.push(`"${type.stringType}"`);
            } else if (type.primitiveType) {
                errors.push(type.primitiveType);
            }
        }
    });
    return Array.from(new Set(errors));
}

function findLookAheadGroup(rule: AstNode | undefined): ast.TerminalGroup | undefined {
    const terminalGroup = getContainerOfType(rule, ast.isTerminalGroup);
    if (!terminalGroup) {
        return undefined;
    }
    if (terminalGroup.lookahead) {
        return terminalGroup;
    } else {
        return findLookAheadGroup(terminalGroup.$container);
    }
}

/*
 * Internal helper stuff for collecting information about assignments to features and their cardinalities
 */

interface AssignmentUse {
    /**
     * Collects assignments for the same feature, while an Action represents a "special assignment", when it is a rewrite action.
     * The Set is used in order not to store the same assignment multiple times.
     */
    assignments: Set<ast.Assignment | ast.Action>;
    /**
     * Note, that this number is not exact and "estimates the potential number",
     * i.e. multiplicities like + and * are counted as 2x/twice,
     * and for alternatives, the worst case is assumed.
     * In other words, here it is enough to know, whether there are two or more assignments possible to the same feature.
     */
    counter: number;
}

function storeAssignmentUse(map: Map<string, AssignmentUse>, feature: string, increment: number, ...assignments: Array<ast.Assignment | ast.Action>) {
    let entry = map.get(feature);
    if (!entry) {
        entry = {
            assignments: new Set(),
            counter: 0,
        };
        map.set(feature, entry);
    }
    assignments.forEach(a => entry!.assignments.add(a)); // a Set is necessary, since assignments in Fragements might be used multiple times by different parser rules, but they should be marked only once!
    entry.counter += increment;
}

function mergeAssignmentUse(mapSoure: Map<string, AssignmentUse>, mapTarget: Map<string, AssignmentUse>, counterOperation: (s: number, t: number) => number = (s, t) => s + t): void {
    for (const [key, source] of mapSoure.entries()) {
        const target = mapTarget.get(key);
        if (target) {
            source.assignments.forEach(a => target.assignments.add(a));
            target.counter = counterOperation(source.counter, target.counter);
        } else {
            mapTarget.set(key, source);
            source.counter = counterOperation(source.counter, 0);
        }
    }
    mapSoure.clear();
}
