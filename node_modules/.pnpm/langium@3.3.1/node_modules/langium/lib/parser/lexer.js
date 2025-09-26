/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { Lexer as ChevrotainLexer, defaultLexerErrorProvider } from 'chevrotain';
export class DefaultLexerErrorMessageProvider {
    buildUnexpectedCharactersMessage(fullText, startOffset, length, line, column) {
        return defaultLexerErrorProvider.buildUnexpectedCharactersMessage(fullText, startOffset, length, line, column);
    }
    buildUnableToPopLexerModeMessage(token) {
        return defaultLexerErrorProvider.buildUnableToPopLexerModeMessage(token);
    }
}
export const DEFAULT_TOKENIZE_OPTIONS = { mode: 'full' };
export class DefaultLexer {
    constructor(services) {
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
    get definition() {
        return this.tokenTypes;
    }
    tokenize(text, _options = DEFAULT_TOKENIZE_OPTIONS) {
        var _a, _b, _c;
        const chevrotainResult = this.chevrotainLexer.tokenize(text);
        return {
            tokens: chevrotainResult.tokens,
            errors: chevrotainResult.errors,
            hidden: (_a = chevrotainResult.groups.hidden) !== null && _a !== void 0 ? _a : [],
            report: (_c = (_b = this.tokenBuilder).flushLexingReport) === null || _c === void 0 ? void 0 : _c.call(_b, text)
        };
    }
    toTokenTypeDictionary(buildTokens) {
        if (isTokenTypeDictionary(buildTokens))
            return buildTokens;
        const tokens = isIMultiModeLexerDefinition(buildTokens) ? Object.values(buildTokens.modes).flat() : buildTokens;
        const res = {};
        tokens.forEach(token => res[token.name] = token);
        return res;
    }
}
/**
 * Returns a check whether the given TokenVocabulary is TokenType array
 */
export function isTokenTypeArray(tokenVocabulary) {
    return Array.isArray(tokenVocabulary) && (tokenVocabulary.length === 0 || 'name' in tokenVocabulary[0]);
}
/**
 * Returns a check whether the given TokenVocabulary is IMultiModeLexerDefinition
 */
export function isIMultiModeLexerDefinition(tokenVocabulary) {
    return tokenVocabulary && 'modes' in tokenVocabulary && 'defaultMode' in tokenVocabulary;
}
/**
 * Returns a check whether the given TokenVocabulary is TokenTypeDictionary
 */
export function isTokenTypeDictionary(tokenVocabulary) {
    return !isTokenTypeArray(tokenVocabulary) && !isIMultiModeLexerDefinition(tokenVocabulary);
}
//# sourceMappingURL=lexer.js.map