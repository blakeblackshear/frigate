/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { Lexer } from 'chevrotain';
import { isKeyword, isParserRule, isTerminalRule } from '../languages/generated/ast.js';
import { streamAllContents } from '../utils/ast-utils.js';
import { getAllReachableRules, terminalRegex } from '../utils/grammar-utils.js';
import { getCaseInsensitivePattern, isWhitespace, partialMatches } from '../utils/regexp-utils.js';
import { stream } from '../utils/stream.js';
export class DefaultTokenBuilder {
    constructor() {
        /**
         * The list of diagnostics stored during the lexing process of a single text.
         */
        this.diagnostics = [];
    }
    buildTokens(grammar, options) {
        const reachableRules = stream(getAllReachableRules(grammar, false));
        const terminalTokens = this.buildTerminalTokens(reachableRules);
        const tokens = this.buildKeywordTokens(reachableRules, terminalTokens, options);
        terminalTokens.forEach(terminalToken => {
            const pattern = terminalToken.PATTERN;
            if (typeof pattern === 'object' && pattern && 'test' in pattern && isWhitespace(pattern)) {
                tokens.unshift(terminalToken);
            }
            else {
                tokens.push(terminalToken);
            }
        });
        // We don't need to add the EOF token explicitly.
        // It is automatically available at the end of the token stream.
        return tokens;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    flushLexingReport(text) {
        return { diagnostics: this.popDiagnostics() };
    }
    popDiagnostics() {
        const diagnostics = [...this.diagnostics];
        this.diagnostics = [];
        return diagnostics;
    }
    buildTerminalTokens(rules) {
        return rules.filter(isTerminalRule).filter(e => !e.fragment)
            .map(terminal => this.buildTerminalToken(terminal)).toArray();
    }
    buildTerminalToken(terminal) {
        const regex = terminalRegex(terminal);
        const pattern = this.requiresCustomPattern(regex) ? this.regexPatternFunction(regex) : regex;
        const tokenType = {
            name: terminal.name,
            PATTERN: pattern,
        };
        if (typeof pattern === 'function') {
            tokenType.LINE_BREAKS = true;
        }
        if (terminal.hidden) {
            // Only skip tokens that are able to accept whitespace
            tokenType.GROUP = isWhitespace(regex) ? Lexer.SKIPPED : 'hidden';
        }
        return tokenType;
    }
    requiresCustomPattern(regex) {
        if (regex.flags.includes('u') || regex.flags.includes('s')) {
            // Unicode and dotall regexes are not supported by Chevrotain.
            return true;
        }
        else if (regex.source.includes('?<=') || regex.source.includes('?<!')) {
            // Negative and positive lookbehind are not supported by Chevrotain yet.
            return true;
        }
        else {
            return false;
        }
    }
    regexPatternFunction(regex) {
        const stickyRegex = new RegExp(regex, regex.flags + 'y');
        return (text, offset) => {
            stickyRegex.lastIndex = offset;
            const execResult = stickyRegex.exec(text);
            return execResult;
        };
    }
    buildKeywordTokens(rules, terminalTokens, options) {
        return rules
            // We filter by parser rules, since keywords in terminal rules get transformed into regex and are not actual tokens
            .filter(isParserRule)
            .flatMap(rule => streamAllContents(rule).filter(isKeyword))
            .distinct(e => e.value).toArray()
            // Sort keywords by descending length
            .sort((a, b) => b.value.length - a.value.length)
            .map(keyword => this.buildKeywordToken(keyword, terminalTokens, Boolean(options === null || options === void 0 ? void 0 : options.caseInsensitive)));
    }
    buildKeywordToken(keyword, terminalTokens, caseInsensitive) {
        const keywordPattern = this.buildKeywordPattern(keyword, caseInsensitive);
        const tokenType = {
            name: keyword.value,
            PATTERN: keywordPattern,
            LONGER_ALT: this.findLongerAlt(keyword, terminalTokens)
        };
        if (typeof keywordPattern === 'function') {
            tokenType.LINE_BREAKS = true;
        }
        return tokenType;
    }
    buildKeywordPattern(keyword, caseInsensitive) {
        return caseInsensitive ?
            new RegExp(getCaseInsensitivePattern(keyword.value)) :
            keyword.value;
    }
    findLongerAlt(keyword, terminalTokens) {
        return terminalTokens.reduce((longerAlts, token) => {
            const pattern = token === null || token === void 0 ? void 0 : token.PATTERN;
            if ((pattern === null || pattern === void 0 ? void 0 : pattern.source) && partialMatches('^' + pattern.source + '$', keyword.value)) {
                longerAlts.push(token);
            }
            return longerAlts;
        }, []);
    }
}
//# sourceMappingURL=token-builder.js.map