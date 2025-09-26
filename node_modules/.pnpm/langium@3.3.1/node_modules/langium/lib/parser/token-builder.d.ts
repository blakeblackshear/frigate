/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { CustomPatternMatcherFunc, ILexingError, TokenPattern, TokenType, TokenVocabulary } from 'chevrotain';
import type { AbstractRule, Grammar, Keyword, TerminalRule } from '../languages/generated/ast.js';
import type { Stream } from '../utils/stream.js';
export interface TokenBuilderOptions {
    caseInsensitive?: boolean;
}
export interface TokenBuilder {
    buildTokens(grammar: Grammar, options?: TokenBuilderOptions): TokenVocabulary;
    /**
     * Produces a lexing report for the given text that was just tokenized using the tokens provided by this builder.
     *
     * @param text The text that was tokenized.
     */
    flushLexingReport?(text: string): LexingReport;
}
/**
 * A custom lexing report that can be produced by the token builder during the lexing process.
 * Adopters need to ensure that the any custom fields are serializable so they can be sent across worker threads.
 */
export interface LexingReport {
    diagnostics: LexingDiagnostic[];
}
export type LexingDiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';
export interface LexingDiagnostic extends ILexingError {
    severity?: LexingDiagnosticSeverity;
}
export declare class DefaultTokenBuilder implements TokenBuilder {
    /**
     * The list of diagnostics stored during the lexing process of a single text.
     */
    protected diagnostics: LexingDiagnostic[];
    buildTokens(grammar: Grammar, options?: TokenBuilderOptions): TokenVocabulary;
    flushLexingReport(text: string): LexingReport;
    protected popDiagnostics(): LexingDiagnostic[];
    protected buildTerminalTokens(rules: Stream<AbstractRule>): TokenType[];
    protected buildTerminalToken(terminal: TerminalRule): TokenType;
    protected requiresCustomPattern(regex: RegExp): boolean;
    protected regexPatternFunction(regex: RegExp): CustomPatternMatcherFunc;
    protected buildKeywordTokens(rules: Stream<AbstractRule>, terminalTokens: TokenType[], options?: TokenBuilderOptions): TokenType[];
    protected buildKeywordToken(keyword: Keyword, terminalTokens: TokenType[], caseInsensitive: boolean): TokenType;
    protected buildKeywordPattern(keyword: Keyword, caseInsensitive: boolean): TokenPattern;
    protected findLongerAlt(keyword: Keyword, terminalTokens: TokenType[]): TokenType[];
}
//# sourceMappingURL=token-builder.d.ts.map