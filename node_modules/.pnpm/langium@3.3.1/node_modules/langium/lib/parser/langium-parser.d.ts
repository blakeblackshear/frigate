/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { DSLMethodOpts, ILexingError, IOrAlt, IParserErrorMessageProvider, IRecognitionException, IToken, TokenType, TokenVocabulary } from 'chevrotain';
import type { AbstractElement, Action, ParserRule } from '../languages/generated/ast.js';
import type { LangiumCoreServices } from '../services.js';
import type { AstNode } from '../syntax-tree.js';
import type { Lexer } from './lexer.js';
import type { IParserConfig } from './parser-config.js';
import { EmbeddedActionsParser } from 'chevrotain';
import type { LexingReport } from './token-builder.js';
export type ParseResult<T = AstNode> = {
    value: T;
    parserErrors: IRecognitionException[];
    lexerErrors: ILexingError[];
    lexerReport?: LexingReport;
};
export declare const DatatypeSymbol: unique symbol;
type RuleResult = (args: Args) => any;
type Args = Record<string, boolean>;
type RuleImpl = (args: Args) => any;
/**
 * Base interface for all parsers. Mainly used by the `parser-builder-base.ts` to perform work on different kinds of parsers.
 * The main use cases are:
 * * AST parser: Based on a string, create an AST for the current grammar
 * * Completion parser: Based on a partial string, identify the current position of the input within the grammar
 */
export interface BaseParser {
    /**
     * Adds a new parser rule to the parser
     */
    rule(rule: ParserRule, impl: RuleImpl): RuleResult;
    /**
     * Returns the executable rule function for the specified rule name
     */
    getRule(name: string): RuleResult | undefined;
    /**
     * Performs alternatives parsing (the `|` operation in EBNF/Langium)
     */
    alternatives(idx: number, choices: Array<IOrAlt<any>>): void;
    /**
     * Parses the callback as optional (the `?` operation in EBNF/Langium)
     */
    optional(idx: number, callback: DSLMethodOpts<unknown>): void;
    /**
     * Parses the callback 0 or more times (the `*` operation in EBNF/Langium)
     */
    many(idx: number, callback: DSLMethodOpts<unknown>): void;
    /**
     * Parses the callback 1 or more times (the `+` operation in EBNF/Langium)
     */
    atLeastOne(idx: number, callback: DSLMethodOpts<unknown>): void;
    /**
     * Consumes a specific token type from the token input stream.
     * Requires a unique index within the rule for a specific token type.
     */
    consume(idx: number, tokenType: TokenType, feature: AbstractElement): void;
    /**
     * Invokes the executable function for a given parser rule.
     * Requires a unique index within the rule for a specific sub rule.
     * Arguments can be supplied to the rule invocation for semantic predicates
     */
    subrule(idx: number, rule: RuleResult, fragment: boolean, feature: AbstractElement, args: Args): void;
    /**
     * Executes a grammar action that modifies the currently active AST node
     */
    action($type: string, action: Action): void;
    /**
     * Finishes construction of the current AST node. Only used by the AST parser.
     */
    construct(): unknown;
    /**
     * Whether the parser is currently actually in use or in "recording mode".
     * Recording mode is activated once when the parser is analyzing itself.
     * During this phase, no input exists and therefore no AST should be constructed
     */
    isRecording(): boolean;
    /**
     * Current state of the unordered groups
     */
    get unorderedGroups(): Map<string, boolean[]>;
    /**
     * The rule stack indicates the indices of rules that are currently invoked,
     * in order of their invocation.
     */
    getRuleStack(): number[];
}
export declare abstract class AbstractLangiumParser implements BaseParser {
    protected readonly lexer: Lexer;
    protected readonly wrapper: ChevrotainWrapper;
    protected _unorderedGroups: Map<string, boolean[]>;
    protected allRules: Map<string, RuleResult>;
    protected mainRule: RuleResult;
    constructor(services: LangiumCoreServices);
    alternatives(idx: number, choices: Array<IOrAlt<any>>): void;
    optional(idx: number, callback: DSLMethodOpts<unknown>): void;
    many(idx: number, callback: DSLMethodOpts<unknown>): void;
    atLeastOne(idx: number, callback: DSLMethodOpts<unknown>): void;
    abstract rule(rule: ParserRule, impl: RuleImpl): RuleResult;
    abstract consume(idx: number, tokenType: TokenType, feature: AbstractElement): void;
    abstract subrule(idx: number, rule: RuleResult, fragment: boolean, feature: AbstractElement, args: Args): void;
    abstract action($type: string, action: Action): void;
    abstract construct(): unknown;
    getRule(name: string): RuleResult | undefined;
    isRecording(): boolean;
    get unorderedGroups(): Map<string, boolean[]>;
    getRuleStack(): number[];
    finalize(): void;
}
export interface ParserOptions {
    rule?: string;
}
export declare class LangiumParser extends AbstractLangiumParser {
    private readonly linker;
    private readonly converter;
    private readonly astReflection;
    private readonly nodeBuilder;
    private lexerResult?;
    private stack;
    private assignmentMap;
    private get current();
    constructor(services: LangiumCoreServices);
    rule(rule: ParserRule, impl: RuleImpl): RuleResult;
    private computeRuleType;
    parse<T extends AstNode = AstNode>(input: string, options?: ParserOptions): ParseResult<T>;
    private startImplementation;
    private extractHiddenTokens;
    consume(idx: number, tokenType: TokenType, feature: AbstractElement): void;
    /**
     * Most consumed parser tokens are valid. However there are two cases in which they are not valid:
     *
     * 1. They were inserted during error recovery by the parser. These tokens don't really exist and should not be further processed
     * 2. They contain invalid token ranges. This might include the special EOF token, or other tokens produced by invalid token builders.
     */
    private isValidToken;
    subrule(idx: number, rule: RuleResult, fragment: boolean, feature: AbstractElement, args: Args): void;
    private performSubruleAssignment;
    action($type: string, action: Action): void;
    construct(): unknown;
    private getAssignment;
    private assign;
    private assignWithoutOverride;
    get definitionErrors(): IParserDefinitionError[];
}
export interface IParserDefinitionError {
    message: string;
    type: number;
    ruleName?: string;
}
export declare abstract class AbstractParserErrorMessageProvider implements IParserErrorMessageProvider {
    buildMismatchTokenMessage(options: {
        expected: TokenType;
        actual: IToken;
        previous: IToken;
        ruleName: string;
    }): string;
    buildNotAllInputParsedMessage(options: {
        firstRedundant: IToken;
        ruleName: string;
    }): string;
    buildNoViableAltMessage(options: {
        expectedPathsPerAlt: TokenType[][][];
        actual: IToken[];
        previous: IToken;
        customUserDescription: string;
        ruleName: string;
    }): string;
    buildEarlyExitMessage(options: {
        expectedIterationPaths: TokenType[][];
        actual: IToken[];
        previous: IToken;
        customUserDescription: string;
        ruleName: string;
    }): string;
}
export declare class LangiumParserErrorMessageProvider extends AbstractParserErrorMessageProvider {
    buildMismatchTokenMessage({ expected, actual }: {
        expected: TokenType;
        actual: IToken;
        previous: IToken;
        ruleName: string;
    }): string;
    buildNotAllInputParsedMessage({ firstRedundant }: {
        firstRedundant: IToken;
        ruleName: string;
    }): string;
}
export interface CompletionParserResult {
    tokens: IToken[];
    elementStack: AbstractElement[];
    tokenIndex: number;
}
export declare class LangiumCompletionParser extends AbstractLangiumParser {
    private tokens;
    private elementStack;
    private lastElementStack;
    private nextTokenIndex;
    private stackSize;
    action(): void;
    construct(): unknown;
    parse(input: string): CompletionParserResult;
    rule(rule: ParserRule, impl: RuleImpl): RuleResult;
    private resetState;
    private startImplementation;
    private removeUnexpectedElements;
    keepStackSize(): number;
    resetStackSize(size: number): void;
    consume(idx: number, tokenType: TokenType, feature: AbstractElement): void;
    subrule(idx: number, rule: RuleResult, fragment: boolean, feature: AbstractElement, args: Args): void;
    before(element: AbstractElement): void;
    after(element: AbstractElement): void;
    get currIdx(): number;
}
/**
 * This class wraps the embedded actions parser of chevrotain and exposes protected methods.
 * This way, we can build the `LangiumParser` as a composition.
 */
declare class ChevrotainWrapper extends EmbeddedActionsParser {
    definitionErrors: IParserDefinitionError[];
    constructor(tokens: TokenVocabulary, config: IParserConfig);
    get IS_RECORDING(): boolean;
    DEFINE_RULE(name: string, impl: RuleImpl): RuleResult;
    wrapSelfAnalysis(): void;
    wrapConsume(idx: number, tokenType: TokenType): IToken;
    wrapSubrule(idx: number, rule: RuleResult, args: Args): unknown;
    wrapOr(idx: number, choices: Array<IOrAlt<any>>): void;
    wrapOption(idx: number, callback: DSLMethodOpts<unknown>): void;
    wrapMany(idx: number, callback: DSLMethodOpts<unknown>): void;
    wrapAtLeastOne(idx: number, callback: DSLMethodOpts<unknown>): void;
}
export {};
//# sourceMappingURL=langium-parser.d.ts.map