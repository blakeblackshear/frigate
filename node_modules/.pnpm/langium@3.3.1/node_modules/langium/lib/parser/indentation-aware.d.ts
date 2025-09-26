/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { CustomPatternMatcherFunc, TokenType, IToken, TokenVocabulary } from 'chevrotain';
import type { Grammar, TerminalRule } from '../languages/generated/ast.js';
import type { LexingReport, TokenBuilderOptions } from './token-builder.js';
import type { LexerResult, TokenizeOptions } from './lexer.js';
import type { LangiumCoreServices } from '../services.js';
import { DefaultTokenBuilder } from './token-builder.js';
import { DefaultLexer } from './lexer.js';
type IndentationAwareDelimiter<TokenName extends string> = [begin: TokenName, end: TokenName];
export interface IndentationTokenBuilderOptions<TerminalName extends string = string, KeywordName extends string = string> {
    /**
     * The name of the token used to denote indentation in the grammar.
     * A possible definition in the grammar could look like this:
     * ```langium
     * terminal INDENT: ':synthetic-indent:';
     * ```
     *
     * @default 'INDENT'
     */
    indentTokenName: TerminalName;
    /**
     * The name of the token used to denote deindentation in the grammar.
     * A possible definition in the grammar could look like this:
     * ```langium
     * terminal DEDENT: ':synthetic-dedent:';
     * ```
     *
     * @default 'DEDENT'
     */
    dedentTokenName: TerminalName;
    /**
     * The name of the token used to denote whitespace other than indentation and newlines in the grammar.
     * A possible definition in the grammar could look like this:
     * ```langium
     * hidden terminal WS: /[ \t]+/;
     * ```
     *
     * @default 'WS'
     */
    whitespaceTokenName: TerminalName;
    /**
     * The delimiter tokens inside of which indentation should be ignored and treated as normal whitespace.
     * For example, Python doesn't treat any whitespace between `(` and `)` as significant.
     *
     * Can be either terminal tokens or keyword tokens.
     *
     * @default []
     */
    ignoreIndentationDelimiters: Array<IndentationAwareDelimiter<TerminalName | KeywordName>>;
}
export declare const indentationBuilderDefaultOptions: IndentationTokenBuilderOptions;
export declare enum LexingMode {
    REGULAR = "indentation-sensitive",
    IGNORE_INDENTATION = "ignore-indentation"
}
export interface IndentationLexingReport extends LexingReport {
    /** Dedent tokens that are necessary to close the remaining indents. */
    remainingDedents: IToken[];
}
/**
 * A token builder that is sensitive to indentation in the input text.
 * It will generate tokens for indentation and dedentation based on the indentation level.
 *
 * The first generic parameter corresponds to the names of terminal tokens,
 * while the second one corresponds to the names of keyword tokens.
 * Both parameters are optional and can be imported from `./generated/ast.js`.
 *
 * Inspired by https://github.com/chevrotain/chevrotain/blob/master/examples/lexer/python_indentation/python_indentation.js
 */
export declare class IndentationAwareTokenBuilder<Terminals extends string = string, KeywordName extends string = string> extends DefaultTokenBuilder {
    /**
     * The stack stores all the previously matched indentation levels to understand how deeply the next tokens are nested.
     * The stack is valid for lexing
     */
    protected indentationStack: number[];
    readonly options: IndentationTokenBuilderOptions<Terminals, KeywordName>;
    /**
     * The token type to be used for indentation tokens
     */
    readonly indentTokenType: TokenType;
    /**
     * The token type to be used for dedentation tokens
     */
    readonly dedentTokenType: TokenType;
    /**
     * A regular expression to match a series of tabs and/or spaces.
     * Override this to customize what the indentation is allowed to consist of.
     */
    protected whitespaceRegExp: RegExp;
    constructor(options?: Partial<IndentationTokenBuilderOptions<NoInfer<Terminals>, NoInfer<KeywordName>>>);
    buildTokens(grammar: Grammar, options?: TokenBuilderOptions | undefined): TokenVocabulary;
    flushLexingReport(text: string): IndentationLexingReport;
    /**
     * Helper function to check if the current position is the start of a new line.
     *
     * @param text The full input string.
     * @param offset The current position at which to check
     * @returns Whether the current position is the start of a new line
     */
    protected isStartOfLine(text: string, offset: number): boolean;
    /**
     * A helper function used in matching both indents and dedents.
     *
     * @param text The full input string.
     * @param offset The current position at which to attempt a match
     * @param tokens Previously scanned tokens
     * @param groups Token Groups
     * @returns The current and previous indentation levels and the matched whitespace
     */
    protected matchWhitespace(text: string, offset: number, tokens: IToken[], groups: Record<string, IToken[]>): {
        currIndentLevel: number;
        prevIndentLevel: number;
        match: RegExpExecArray | null;
    };
    /**
     * Helper function to create an instance of an indentation token.
     *
     * @param tokenType Indent or dedent token type
     * @param text Full input string, used to calculate the line number
     * @param image The original image of the token (tabs or spaces)
     * @param offset Current position in the input string
     * @returns The indentation token instance
     */
    protected createIndentationTokenInstance(tokenType: TokenType, text: string, image: string, offset: number): IToken;
    /**
     * Helper function to get the line number at a given offset.
     *
     * @param text Full input string, used to calculate the line number
     * @param offset Current position in the input string
     * @returns The line number at the given offset
     */
    protected getLineNumber(text: string, offset: number): number;
    /**
     * A custom pattern for matching indents
     *
     * @param text The full input string.
     * @param offset The offset at which to attempt a match
     * @param tokens Previously scanned tokens
     * @param groups Token Groups
     */
    protected indentMatcher(text: string, offset: number, tokens: IToken[], groups: Record<string, IToken[]>): ReturnType<CustomPatternMatcherFunc>;
    /**
     * A custom pattern for matching dedents
     *
     * @param text The full input string.
     * @param offset The offset at which to attempt a match
     * @param tokens Previously scanned tokens
     * @param groups Token Groups
     */
    protected dedentMatcher(text: string, offset: number, tokens: IToken[], groups: Record<string, IToken[]>): ReturnType<CustomPatternMatcherFunc>;
    protected buildTerminalToken(terminal: TerminalRule): TokenType;
    /**
     * Resets the indentation stack between different runs of the lexer
     *
     * @param text Full text that was tokenized
     * @returns Remaining dedent tokens to match all previous indents at the end of the file
     */
    flushRemainingDedents(text: string): IToken[];
}
/**
 * A lexer that is aware of indentation in the input text.
 * The only purpose of this lexer is to reset the internal state of the {@link IndentationAwareTokenBuilder}
 * between the tokenization of different text inputs.
 *
 * In your module, you can override the default lexer with this one as such:
 * ```ts
 * parser: {
 *    TokenBuilder: () => new IndentationAwareTokenBuilder(),
 *    Lexer: (services) => new IndentationAwareLexer(services),
 * }
 * ```
 */
export declare class IndentationAwareLexer extends DefaultLexer {
    protected readonly indentationTokenBuilder: IndentationAwareTokenBuilder;
    constructor(services: LangiumCoreServices);
    tokenize(text: string, options?: TokenizeOptions): LexerResult;
}
export {};
//# sourceMappingURL=indentation-aware.d.ts.map