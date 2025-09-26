/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { ILexerErrorMessageProvider, ILexingError, IMultiModeLexerDefinition, IToken, TokenType, TokenTypeDictionary, TokenVocabulary } from 'chevrotain';
import type { LangiumCoreServices } from '../services.js';
import { Lexer as ChevrotainLexer, defaultLexerErrorProvider } from 'chevrotain';
import type { LexingReport, TokenBuilder } from './token-builder.js';

export class DefaultLexerErrorMessageProvider implements ILexerErrorMessageProvider {

    buildUnexpectedCharactersMessage(fullText: string, startOffset: number, length: number, line?: number, column?: number): string {
        return defaultLexerErrorProvider.buildUnexpectedCharactersMessage(fullText, startOffset, length, line, column);
    }

    buildUnableToPopLexerModeMessage(token: IToken): string {
        return defaultLexerErrorProvider.buildUnableToPopLexerModeMessage(token);
    }
}

export interface LexerResult {
    /**
     * A list of all tokens that were lexed from the input.
     *
     * Note that Langium requires the optional properties
     * `startLine`, `startColumn`, `endOffset`, `endLine` and `endColumn` to be set on each token.
     */
    tokens: IToken[];
    /**
     * Contains hidden tokens, usually comments.
     */
    hidden: IToken[];
    errors: ILexingError[];
    report?: LexingReport;
}

export type TokenizeMode = 'full' | 'partial';

export interface TokenizeOptions {
    mode?: TokenizeMode;
}

export const DEFAULT_TOKENIZE_OPTIONS: TokenizeOptions = { mode: 'full' };

export interface Lexer {
    readonly definition: TokenTypeDictionary;
    tokenize(text: string, options?: TokenizeOptions): LexerResult;
}

export class DefaultLexer implements Lexer {

    protected readonly tokenBuilder: TokenBuilder;
    protected readonly errorMessageProvider: ILexerErrorMessageProvider;
    protected tokenTypes: TokenTypeDictionary;
    protected chevrotainLexer: ChevrotainLexer;

    constructor(services: LangiumCoreServices) {
        this.errorMessageProvider = services.parser.LexerErrorMessageProvider;
        this.tokenBuilder = services.parser.TokenBuilder;
        const tokens = this.tokenBuilder.buildTokens(services.Grammar, {
            caseInsensitive: services.LanguageMetaData.caseInsensitive
        });
        this.tokenTypes = this.toTokenTypeDictionary(tokens);
        const lexerTokens = isTokenTypeDictionary(tokens) ? Object.values(tokens) : tokens;
        const production = services.LanguageMetaData.mode === 'production';
        this.chevrotainLexer = new ChevrotainLexer(lexerTokens, {
            positionTracking: 'full',
            skipValidations: production,
            errorMessageProvider: this.errorMessageProvider
        });
    }

    get definition(): TokenTypeDictionary {
        return this.tokenTypes;
    }

    tokenize(text: string, _options: TokenizeOptions = DEFAULT_TOKENIZE_OPTIONS): LexerResult {
        const chevrotainResult = this.chevrotainLexer.tokenize(text);
        return {
            tokens: chevrotainResult.tokens,
            errors: chevrotainResult.errors,
            hidden: chevrotainResult.groups.hidden ?? [],
            report: this.tokenBuilder.flushLexingReport?.(text)
        };
    }

    protected toTokenTypeDictionary(buildTokens: TokenVocabulary): TokenTypeDictionary {
        if (isTokenTypeDictionary(buildTokens)) return buildTokens;
        const tokens = isIMultiModeLexerDefinition(buildTokens) ? Object.values(buildTokens.modes).flat() : buildTokens;
        const res: TokenTypeDictionary = {};
        tokens.forEach(token => res[token.name] = token);
        return res;
    }
}

/**
 * Returns a check whether the given TokenVocabulary is TokenType array
 */
export function isTokenTypeArray(tokenVocabulary: TokenVocabulary): tokenVocabulary is TokenType[] {
    return Array.isArray(tokenVocabulary) && (tokenVocabulary.length === 0 || 'name' in tokenVocabulary[0]);
}

/**
 * Returns a check whether the given TokenVocabulary is IMultiModeLexerDefinition
 */
export function isIMultiModeLexerDefinition(tokenVocabulary: TokenVocabulary): tokenVocabulary is IMultiModeLexerDefinition {
    return tokenVocabulary && 'modes' in tokenVocabulary && 'defaultMode' in tokenVocabulary;
}

/**
 * Returns a check whether the given TokenVocabulary is TokenTypeDictionary
 */
export function isTokenTypeDictionary(tokenVocabulary: TokenVocabulary): tokenVocabulary is TokenTypeDictionary {
    return !isTokenTypeArray(tokenVocabulary) && !isIMultiModeLexerDefinition(tokenVocabulary);
}
