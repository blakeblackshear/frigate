/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { createToken, createTokenInstance, Lexer } from 'chevrotain';
import { DefaultTokenBuilder } from './token-builder.js';
import { DEFAULT_TOKENIZE_OPTIONS, DefaultLexer, isTokenTypeArray } from './lexer.js';
export const indentationBuilderDefaultOptions = {
    indentTokenName: 'INDENT',
    dedentTokenName: 'DEDENT',
    whitespaceTokenName: 'WS',
    ignoreIndentationDelimiters: [],
};
export var LexingMode;
(function (LexingMode) {
    LexingMode["REGULAR"] = "indentation-sensitive";
    LexingMode["IGNORE_INDENTATION"] = "ignore-indentation";
})(LexingMode || (LexingMode = {}));
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
export class IndentationAwareTokenBuilder extends DefaultTokenBuilder {
    constructor(options = indentationBuilderDefaultOptions) {
        super();
        /**
         * The stack stores all the previously matched indentation levels to understand how deeply the next tokens are nested.
         * The stack is valid for lexing
         */
        this.indentationStack = [0];
        /**
         * A regular expression to match a series of tabs and/or spaces.
         * Override this to customize what the indentation is allowed to consist of.
         */
        this.whitespaceRegExp = /[ \t]+/y;
        this.options = Object.assign(Object.assign({}, indentationBuilderDefaultOptions), options);
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
    buildTokens(grammar, options) {
        const tokenTypes = super.buildTokens(grammar, options);
        if (!isTokenTypeArray(tokenTypes)) {
            throw new Error('Invalid tokens built by default builder');
        }
        const { indentTokenName, dedentTokenName, whitespaceTokenName, ignoreIndentationDelimiters } = this.options;
        // Rearrange tokens because whitespace (which is ignored) goes to the beginning by default, consuming indentation as well
        // Order should be: dedent, indent, spaces
        let dedent;
        let indent;
        let ws;
        const otherTokens = [];
        for (const tokenType of tokenTypes) {
            for (const [begin, end] of ignoreIndentationDelimiters) {
                if (tokenType.name === begin) {
                    tokenType.PUSH_MODE = LexingMode.IGNORE_INDENTATION;
                }
                else if (tokenType.name === end) {
                    tokenType.POP_MODE = true;
                }
            }
            if (tokenType.name === dedentTokenName) {
                dedent = tokenType;
            }
            else if (tokenType.name === indentTokenName) {
                indent = tokenType;
            }
            else if (tokenType.name === whitespaceTokenName) {
                ws = tokenType;
            }
            else {
                otherTokens.push(tokenType);
            }
        }
        if (!dedent || !indent || !ws) {
            throw new Error('Some indentation/whitespace tokens not found!');
        }
        if (ignoreIndentationDelimiters.length > 0) {
            const multiModeLexerDef = {
                modes: {
                    [LexingMode.REGULAR]: [dedent, indent, ...otherTokens, ws],
                    [LexingMode.IGNORE_INDENTATION]: [...otherTokens, ws],
                },
                defaultMode: LexingMode.REGULAR,
            };
            return multiModeLexerDef;
        }
        else {
            return [dedent, indent, ws, ...otherTokens];
        }
    }
    flushLexingReport(text) {
        const result = super.flushLexingReport(text);
        return Object.assign(Object.assign({}, result), { remainingDedents: this.flushRemainingDedents(text) });
    }
    /**
     * Helper function to check if the current position is the start of a new line.
     *
     * @param text The full input string.
     * @param offset The current position at which to check
     * @returns Whether the current position is the start of a new line
     */
    isStartOfLine(text, offset) {
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
    matchWhitespace(text, offset, tokens, groups) {
        var _a;
        this.whitespaceRegExp.lastIndex = offset;
        const match = this.whitespaceRegExp.exec(text);
        return {
            currIndentLevel: (_a = match === null || match === void 0 ? void 0 : match[0].length) !== null && _a !== void 0 ? _a : 0,
            prevIndentLevel: this.indentationStack.at(-1),
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
    createIndentationTokenInstance(tokenType, text, image, offset) {
        const lineNumber = this.getLineNumber(text, offset);
        return createTokenInstance(tokenType, image, offset, offset + image.length, lineNumber, lineNumber, 1, image.length);
    }
    /**
     * Helper function to get the line number at a given offset.
     *
     * @param text Full input string, used to calculate the line number
     * @param offset Current position in the input string
     * @returns The line number at the given offset
     */
    getLineNumber(text, offset) {
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
    indentMatcher(text, offset, tokens, groups) {
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
    dedentMatcher(text, offset, tokens, groups) {
        var _a, _b, _c, _d;
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
                length: (_b = (_a = match === null || match === void 0 ? void 0 : match[0]) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0,
                line: this.getLineNumber(text, offset),
                column: 1
            });
            return null;
        }
        const numberOfDedents = this.indentationStack.length - matchIndentIndex - 1;
        const newlinesBeforeDedent = (_d = (_c = text.substring(0, offset).match(/[\r\n]+$/)) === null || _c === void 0 ? void 0 : _c[0].length) !== null && _d !== void 0 ? _d : 1;
        for (let i = 0; i < numberOfDedents; i++) {
            const token = this.createIndentationTokenInstance(this.dedentTokenType, text, '', // Dedents are 0-width tokens
            offset - (newlinesBeforeDedent - 1));
            tokens.push(token);
            this.indentationStack.pop();
        }
        // Token already added, let the dedentation now be consumed as whitespace (if any) and ignored
        return null;
    }
    buildTerminalToken(terminal) {
        const tokenType = super.buildTerminalToken(terminal);
        const { indentTokenName, dedentTokenName, whitespaceTokenName } = this.options;
        if (tokenType.name === indentTokenName) {
            return this.indentTokenType;
        }
        else if (tokenType.name === dedentTokenName) {
            return this.dedentTokenType;
        }
        else if (tokenType.name === whitespaceTokenName) {
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
    flushRemainingDedents(text) {
        const remainingDedents = [];
        while (this.indentationStack.length > 1) {
            remainingDedents.push(this.createIndentationTokenInstance(this.dedentTokenType, text, '', text.length));
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
    constructor(services) {
        super(services);
        if (services.parser.TokenBuilder instanceof IndentationAwareTokenBuilder) {
            this.indentationTokenBuilder = services.parser.TokenBuilder;
        }
        else {
            throw new Error('IndentationAwareLexer requires an accompanying IndentationAwareTokenBuilder');
        }
    }
    tokenize(text, options = DEFAULT_TOKENIZE_OPTIONS) {
        const result = super.tokenize(text);
        // consuming all remaining dedents and remove them as they might not be serializable
        const report = result.report;
        if ((options === null || options === void 0 ? void 0 : options.mode) === 'full') {
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
        const cleanTokens = [];
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
//# sourceMappingURL=indentation-aware.js.map