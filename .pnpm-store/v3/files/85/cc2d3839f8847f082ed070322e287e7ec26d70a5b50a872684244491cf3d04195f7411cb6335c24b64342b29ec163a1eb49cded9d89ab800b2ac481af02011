/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import * as ast from '../../languages/generated/ast.js';
import type { References } from '../../references/references.js';
import type { Reference } from '../../syntax-tree.js';
import type { ValidationAcceptor } from '../../validation/validation-registry.js';
import type { AstNodeLocator } from '../../workspace/ast-node-locator.js';
import type { LangiumDocuments } from '../../workspace/documents.js';
import type { LangiumGrammarServices } from '../langium-grammar-module.js';
export declare function registerValidationChecks(services: LangiumGrammarServices): void;
export declare namespace IssueCodes {
    const GrammarNameUppercase = "grammar-name-uppercase";
    const RuleNameUppercase = "rule-name-uppercase";
    const HiddenGrammarTokens = "hidden-grammar-tokens";
    const UseRegexTokens = "use-regex-tokens";
    const EntryRuleTokenSyntax = "entry-rule-token-syntax";
    const CrossRefTokenSyntax = "cross-ref-token-syntax";
    const UnnecessaryFileExtension = "unnecessary-file-extension";
    const InvalidReturns = "invalid-returns";
    const InvalidInfers = "invalid-infers";
    const MissingInfer = "missing-infer";
    const MissingReturns = "missing-returns";
    const SuperfluousInfer = "superfluous-infer";
    const OptionalUnorderedGroup = "optional-unordered-group";
    const ParsingRuleEmpty = "parsing-rule-empty";
}
export declare class LangiumGrammarValidator {
    protected readonly references: References;
    protected readonly nodeLocator: AstNodeLocator;
    protected readonly documents: LangiumDocuments;
    constructor(services: LangiumGrammarServices);
    checkGrammarName(grammar: ast.Grammar, accept: ValidationAcceptor): void;
    checkEntryGrammarRule(grammar: ast.Grammar, accept: ValidationAcceptor): void;
    /**
     * Check whether any rule defined in this grammar is a duplicate of an already defined rule or an imported rule
     */
    checkUniqueRuleName(grammar: ast.Grammar, accept: ValidationAcceptor): void;
    /**
     * Check whether any type defined in this grammar is a duplicate of an already defined type or an imported type
     */
    checkUniqueTypeName(grammar: ast.Grammar, accept: ValidationAcceptor): void;
    private checkUniqueName;
    checkDuplicateImportedGrammar(grammar: ast.Grammar, accept: ValidationAcceptor): void;
    /**
     * Compared to the validation above, this validation only checks whether two imported grammars export the same grammar rule.
     */
    checkUniqueImportedRules(grammar: ast.Grammar, accept: ValidationAcceptor): void;
    private getDuplicateExportedRules;
    checkGrammarTypeInfer(grammar: ast.Grammar, accept: ValidationAcceptor): void;
    private getActionType;
    checkGrammarHiddenTokens(grammar: ast.Grammar, accept: ValidationAcceptor): void;
    checkHiddenTerminalRule(terminalRule: ast.TerminalRule, accept: ValidationAcceptor): void;
    checkEmptyTerminalRule(terminalRule: ast.TerminalRule, accept: ValidationAcceptor): void;
    checkEmptyParserRule(parserRule: ast.ParserRule, accept: ValidationAcceptor): void;
    checkInvalidRegexFlags(token: ast.RegexToken, accept: ValidationAcceptor): void;
    checkDirectlyUsedRegexFlags(token: ast.RegexToken, accept: ValidationAcceptor): void;
    private getFlagRange;
    checkUsedHiddenTerminalRule(ruleCall: ast.RuleCall | ast.TerminalRuleCall, accept: ValidationAcceptor): void;
    checkUsedFragmentTerminalRule(ruleCall: ast.RuleCall, accept: ValidationAcceptor): void;
    checkCrossReferenceSyntax(crossRef: ast.CrossReference, accept: ValidationAcceptor): void;
    checkPackageImport(imp: ast.GrammarImport, accept: ValidationAcceptor): void;
    checkInvalidCharacterRange(range: ast.CharacterRange, accept: ValidationAcceptor): void;
    checkGrammarForUnusedRules(grammar: ast.Grammar, accept: ValidationAcceptor): void;
    checkClashingTerminalNames(grammar: ast.Grammar, accept: ValidationAcceptor): void;
    checkRuleName(rule: ast.AbstractRule, accept: ValidationAcceptor): void;
    /** This validation checks, that parser rules which are called multiple times are assigned (except for fragments). */
    checkMultiRuleCallsAreAssigned(call: ast.RuleCall, accept: ValidationAcceptor): void;
    checkTypeReservedName(type: ast.Interface | ast.TypeAttribute | ast.Type | ast.InferredType, accept: ValidationAcceptor): void;
    checkAssignmentReservedName(assignment: ast.Assignment | ast.Action, accept: ValidationAcceptor): void;
    checkParserRuleReservedName(rule: ast.ParserRule, accept: ValidationAcceptor): void;
    private checkReservedName;
    checkKeyword(keyword: ast.Keyword, accept: ValidationAcceptor): void;
    checkUnorderedGroup(unorderedGroup: ast.UnorderedGroup, accept: ValidationAcceptor): void;
    checkRuleParametersUsed(rule: ast.ParserRule, accept: ValidationAcceptor): void;
    checkParserRuleDataType(rule: ast.ParserRule, accept: ValidationAcceptor): void;
    checkAssignmentToFragmentRule(assignment: ast.Assignment, accept: ValidationAcceptor): void;
    checkAssignmentTypes(assignment: ast.Assignment, accept: ValidationAcceptor): void;
    /** This validation recursively looks at all assignments (and rewriting actions) with '=' as assignment operator and checks,
     * whether the operator should be '+=' instead. */
    checkOperatorMultiplicitiesForMultiAssignments(rule: ast.ParserRule, accept: ValidationAcceptor): void;
    private checkOperatorMultiplicitiesForMultiAssignmentsIndependent;
    private checkOperatorMultiplicitiesForMultiAssignmentsNested;
    checkInterfacePropertyTypes(interfaceDecl: ast.Interface, accept: ValidationAcceptor): void;
    protected createMixedTypeError(propName: string): string;
    checkTerminalRuleReturnType(rule: ast.TerminalRule, accept: ValidationAcceptor): void;
    checkRuleCallParameters(ruleCall: ast.RuleCall, accept: ValidationAcceptor): void;
    checkCrossRefNameAssignment(reference: ast.CrossReference, accept: ValidationAcceptor): void;
    checkCrossRefTerminalType(reference: ast.CrossReference, accept: ValidationAcceptor): void;
    checkCrossRefType(reference: ast.CrossReference, accept: ValidationAcceptor): void;
    checkCrossReferenceToTypeUnion(reference: ast.CrossReference, accept: ValidationAcceptor): void;
    checkFragmentsInTypes(type: ast.SimpleType, accept: ValidationAcceptor): void;
    checkReferenceTypeUnion(type: ast.ReferenceType, accept: ValidationAcceptor): void;
    protected checkReferenceToRuleButNotType(type: Reference<ast.AbstractType>): string | undefined;
    checkAssignmentWithFeatureName(assignment: ast.Assignment, accept: ValidationAcceptor): void;
}
//# sourceMappingURL=validator.d.ts.map