/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { CustomPatternMatcherFunc, TokenType, IToken, IMultiModeLexerDefinition, TokenVocabulary } from 'chevrotain';
import type { Grammar, TerminalRule } from '../languages/generated/ast.js';
import type { LexingReport, TokenBuilderOptions } from './token-builder.js';
import type { LexerResult, TokenizeOptions } from './lexer.js';
import type { LangiumCoreServices } from '../services.js';
import { createToken, createTokenInstance, Lexer } from 'chevrotain';
import { DefaultTokenBuilder } from './token-builder.js';
import { DEFAULT_TOKENIZE_OPTIONS, DefaultLexer, isTokenTypeArray } from './lexer.js';

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
    ignoreIndentationDelimiters: Array<IndentationAwareDelimiter<TerminalName | KeywordName>>
}

export const indentationBuilderDefaultOptions: IndentationTokenBuilderOptions = {
    indentTokenName: 'INDENT',
    dedentTokenName: 'DEDENT',
    whitespaceTokenName: 'WS',
    ignoreIndentationDelimiters: [],
};

export enum LexingMode {
    REGULAR = 'indentation-sensitive',
    IGNORE_INDENTATION = 'ignore-indentation',
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
export class IndentationAwareTokenBuilder<Terminals extends string = string, KeywordName extends string = string> extends DefaultTokenBuilder {
    /**
     * The stack stores all the previously matched indentation levels to understand how deeply the next tokens are nested.
     * The stack is valid for lexing
     */
    protected indentationStack: number[] = [0];

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
    protected whitespaceRegExp = /[ \t]+/y;

    constructor(options: Partial<IndentationTokenBuilderOptions<NoInfer<Terminals>, NoInfer<KeywordName>>> = indentationBuilderDefaultOptions as IndentationTokenBuilderOptions<Terminals, KeywordName>) {
        super();
        this.options = {
            ...indentationBuilderDefaultOptions as IndentationTokenBuilderOptions<Terminals, KeywordName>,
            ...options,
        };

        this.indentTokenType = createToken({
            name: this.options.indentTokenName,
            pattern: this.indentMatcher.bind(this),
            line_breaks: false,
        });

        this.dedentTokenType = createToken({
            name: this.options.dedentTokenName,
            pattern: this.dedentMatcher.bind(this),
            line_breaks: false,
        });
    }

    override buildTokens(grammar: Grammar, options?: TokenBuilderOptions | undefined): TokenVocabulary {
        const tokenTypes = super.buildTokens(grammar, options);
        if (!isTokenTypeArray(tokenTypes)) {
            throw new Error('Invalid tokens built by default builder');
        }

        const { indentTokenName, dedentTokenName, whitespaceTokenName, ignoreIndentationDelimiters } = this.options;

        // Rearrange tokens because whitespace (which is ignored) goes to the beginning by default, consuming indentation as well
        // Order should be: dedent, indent, spaces
        let dedent: TokenType | undefined;
        let indent: TokenType | undefined;
        let ws: TokenType | undefined;
        const otherTokens: TokenType[] = [];
        for (const tokenType of tokenTypes) {
            for (const [begin, end] of ignoreIndentationDelimiters) {
                if (tokenType.name === begin) {
                    tokenType.PUSH_MODE = LexingMode.IGNORE_INDENTATION;
                } else if (tokenType.name === end) {
                    tokenType.POP_MODE = true;
                }
            }
            if (tokenType.name === dedentTokenName) {
                dedent = tokenType;
            } else if (tokenType.name === indentTokenName) {
                indent = tokenType;
            } else if (tokenType.name === whitespaceTokenName) {
                ws = tokenType;
            } else {
                otherTokens.push(tokenType);
            }
        }
        if (!dedent || !indent || !ws) {
            throw new Error('Some indentation/whitespace tokens not found!');
        }

        if (ignoreIndentationDelimiters.length > 0) {
            const multiModeLexerDef: IMultiModeLexerDefinition = {
                modes: {
                    [LexingMode.REGULAR]: [dedent, indent, ...otherTokens, ws],
                    [LexingMode.IGNORE_INDENTATION]: [...otherTokens, ws],
                },
                defaultMode: LexingMode.REGULAR,
            };
            return multiModeLexerDef;
        } else {
            return [dedent, indent, ws, ...otherTokens];
        }
    }

    override flushLexingReport(text: string): IndentationLexingReport {
        const result = super.flushLexingReport(text);
        return {
            ...result,
            remainingDedents: this.flushRemainingDedents(text),
        };
    }

    /**
     * Helper function to check if the current position is the start of a new line.
     *
     * @param text The full input string.
     * @param offset The current position at which to check
     * @returns Whether the current position is the start of a new line
     */
    protected isStartOfLine(text: string, offset: number): boolean {
        return offset === 0 || '\r\n'.includes(text[offset - 1]);
    }

    /**
     * A helper function used in matching both indents and dedents.
     *
     * @param text The full input string.
     * @param offset The current position at which to attempt a match
     * @param tokens Previously scanned tokens
     * @param groups Token Groups
     * @returns The current and previous indentation levels and the matched whitespace
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected matchWhitespace(text: string, offset: number, tokens: IToken[], groups: Record<string, IToken[]>): { currIndentLevel: number, prevIndentLevel: number, match: RegExpExecArray | null } {
        this.whitespaceRegExp.lastIndex = offset;
        const match = this.whitespaceRegExp.exec(text);
        return {
            currIndentLevel: match?.[0].length ?? 0,
            prevIndentLevel: this.indentationStack.at(-1)!,
            match,
        };
    }

    /**
     * Helper function to create an instance of an indentation token.
     *
     * @param tokenType Indent or dedent token type
     * @param text Full input string, used to calculate the line number
     * @param image The original image of the token (tabs or spaces)
     * @param offset Current position in the input string
     * @returns The indentation token instance
     */
    protected createIndentationTokenInstance(tokenType: TokenType, text: string, image: string, offset: number): IToken {
        const lineNumber = this.getLineNumber(text, offset);
        return createTokenInstance(
            tokenType,
            image,
            offset, offset + image.length,
            lineNumber, lineNumber,
            1, image.length,
        );
    }

    /**
     * Helper function to get the line number at a given offset.
     *
     * @param text Full input string, used to calculate the line number
     * @param offset Current position in the input string
     * @returns The line number at the given offset
     */
    protected getLineNumber(text: string, offset: number): number {
        return text.substring(0, offset).split(/\r\n|\r|\n/).length;
    }

    /**
     * A custom pattern for matching indents
     *
     * @param text The full input string.
     * @param offset The offset at which to attempt a match
     * @param tokens Previously scanned tokens
     * @param groups Token Groups
     */
    protected indentMatcher(text: string, offset: number, tokens: IToken[], groups: Record<string, IToken[]>): ReturnType<CustomPatternMatcherFunc> {
        if (!this.isStartOfLine(text, offset)) {
            return null;
        }

        const { currIndentLevel, prevIndentLevel, match } = this.matchWhitespace(text, offset, tokens, groups);

        if (currIndentLevel <= prevIndentLevel) {
            // shallower indentation (should be matched by dedent)
            // or same indentation level (should be matched by whitespace and ignored)
            return null;
        }

        this.indentationStack.push(currIndentLevel);

        return match;
    }

    /**
     * A custom pattern for matching dedents
     *
     * @param text The full input string.
     * @param offset The offset at which to attempt a match
     * @param tokens Previously scanned tokens
     * @param groups Token Groups
     */
    protected dedentMatcher(text: string, offset: number, tokens: IToken[], groups: Record<string, IToken[]>): ReturnType<CustomPatternMatcherFunc> {
        if (!this.isStartOfLine(text, offset)) {
            return null;
        }

        const { currIndentLevel, prevIndentLevel, match } = this.matchWhitespace(text, offset, tokens, groups);

        if (currIndentLevel >= prevIndentLevel) {
            // bigger indentation (should be matched by indent)
            // or same indentation level (should be matched by whitespace and ignored)
            return null;
        }

        const matchIndentIndex = this.indentationStack.lastIndexOf(currIndentLevel);

        // Any dedent must match some previous indentation level.
        if (matchIndentIndex === -1) {
            this.diagnostics.push({
                severity: 'error',
                message: `Invalid dedent level ${currIndentLevel} at offset: ${offset}. Current indentation stack: ${this.indentationStack}`,
                offset,
                length: match?.[0]?.length ?? 0,
                line: this.getLineNumber(text, offset),
                column: 1
            });
            return null;
        }

        const numberOfDedents = this.indentationStack.length - matchIndentIndex - 1;
        const newlinesBeforeDedent = text.substring(0, offset).match(/[\r\n]+$/)?.[0].length ?? 1;

        for (let i = 0; i < numberOfDedents; i++) {
            const token = this.createIndentationTokenInstance(
                this.dedentTokenType,
                text,
                '',  // Dedents are 0-width tokens
                offset - (newlinesBeforeDedent - 1), // Place the dedent after the first new line character
            );
            tokens.push(token);
            this.indentationStack.pop();
        }

        // Token already added, let the dedentation now be consumed as whitespace (if any) and ignored
        return null;
    }

    protected override buildTerminalToken(terminal: TerminalRule): TokenType {
        const tokenType = super.buildTerminalToken(terminal);
        const { indentTokenName, dedentTokenName, whitespaceTokenName } = this.options;

        if (tokenType.name === indentTokenName) {
            return this.indentTokenType;
        } else if (tokenType.name === dedentTokenName) {
            return this.dedentTokenType;
        } else if (tokenType.name === whitespaceTokenName) {
            return createToken({
                name: whitespaceTokenName,
                pattern: this.whitespaceRegExp,
                group: Lexer.SKIPPED,
            });
        }
        return tokenType;
    }

    /**
     * Resets the indentation stack between different runs of the lexer
     *
     * @param text Full text that was tokenized
     * @returns Remaining dedent tokens to match all previous indents at the end of the file
     */
    flushRemainingDedents(text: string): IToken[] {
        const remainingDedents: IToken[] = [];
        while (this.indentationStack.length > 1) {
            remainingDedents.push(
                this.createIndentationTokenInstance(this.dedentTokenType, text, '', text.length)
            );
            this.indentationStack.pop();
        }

        this.indentationStack = [0];
        return remainingDedents;
    }
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
export class IndentationAwareLexer extends DefaultLexer {

    protected readonly indentationTokenBuilder: IndentationAwareTokenBuilder;

    constructor(services: LangiumCoreServices) {
        super(services);
        if (services.parser.TokenBuilder instanceof IndentationAwareTokenBuilder) {
            this.indentationTokenBuilder = services.parser.TokenBuilder;
        } else {
            throw new Error('IndentationAwareLexer requires an accompanying IndentationAwareTokenBuilder');
        }
    }

    override tokenize(text: string, options: TokenizeOptions = DEFAULT_TOKENIZE_OPTIONS): LexerResult {
        const result = super.tokenize(text);

        // consuming all remaining dedents and remove them as they might not be serializable
        const report = result.report as IndentationLexingReport;
        if (options?.mode === 'full') {
            // auto-complete document with remaining dedents
            result.tokens.push(...report.remainingDedents);
        }
        report.remainingDedents = [];

        // remove any "indent-dedent" pair with an empty body as these are typically
        // added by comments or lines with just whitespace but have no real value
        const { indentTokenType, dedentTokenType } = this.indentationTokenBuilder;
        // Use tokenTypeIdx for fast comparison
        const indentTokenIdx = indentTokenType.tokenTypeIdx;
        const dedentTokenIdx = dedentTokenType.tokenTypeIdx;
        const cleanTokens: IToken[] = [];
        const length = result.tokens.length - 1;
        for (let i = 0; i < length; i++) {
            const token = result.tokens[i];
            const nextToken = result.tokens[i + 1];
            if (token.tokenTypeIdx === indentTokenIdx && nextToken.tokenTypeIdx === dedentTokenIdx) {
                i++;
                continue;
            }

            cleanTokens.push(token);
        }
        // Push last token separately
        if (length >= 0) {
            cleanTokens.push(result.tokens[length]);
        }
        result.tokens = cleanTokens;

        return result;
    }
}
