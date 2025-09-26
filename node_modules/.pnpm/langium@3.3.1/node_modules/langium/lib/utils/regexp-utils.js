/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { RegExpParser, BaseRegExpVisitor } from '@chevrotain/regexp-to-ast';
export const NEWLINE_REGEXP = /\r?\n/gm;
const regexpParser = new RegExpParser();
/**
 * This class is in charge of heuristically identifying start/end tokens of terminals.
 *
 * The way this works is by doing the following:
 * 1. Traverse the regular expression in the "start state"
 * 2. Add any encountered sets/single characters to the "start regexp"
 * 3. Once we encounter any variable-length content (i.e. with quantifiers such as +/?/*), we enter the "end state"
 * 4. In the end state, any sets/single characters are added to an "end stack".
 * 5. If we re-encounter any variable-length content we reset the end stack
 * 6. We continue visiting the regex until the end, reseting the end stack and rebuilding it as necessary
 *
 * After traversing a regular expression the `startRegexp/endRegexp` properties allow access to the stored start/end of the terminal
 */
class TerminalRegExpVisitor extends BaseRegExpVisitor {
    constructor() {
        super(...arguments);
        this.isStarting = true;
        this.endRegexpStack = [];
        this.multiline = false;
    }
    get endRegex() {
        return this.endRegexpStack.join('');
    }
    reset(regex) {
        this.multiline = false;
        this.regex = regex;
        this.startRegexp = '';
        this.isStarting = true;
        this.endRegexpStack = [];
    }
    visitGroup(node) {
        if (node.quantifier) {
            this.isStarting = false;
            this.endRegexpStack = [];
        }
    }
    visitCharacter(node) {
        const char = String.fromCharCode(node.value);
        if (!this.multiline && char === '\n') {
            this.multiline = true;
        }
        if (node.quantifier) {
            this.isStarting = false;
            this.endRegexpStack = [];
        }
        else {
            const escapedChar = escapeRegExp(char);
            this.endRegexpStack.push(escapedChar);
            if (this.isStarting) {
                this.startRegexp += escapedChar;
            }
        }
    }
    visitSet(node) {
        if (!this.multiline) {
            const set = this.regex.substring(node.loc.begin, node.loc.end);
            const regex = new RegExp(set);
            this.multiline = Boolean('\n'.match(regex));
        }
        if (node.quantifier) {
            this.isStarting = false;
            this.endRegexpStack = [];
        }
        else {
            const set = this.regex.substring(node.loc.begin, node.loc.end);
            this.endRegexpStack.push(set);
            if (this.isStarting) {
                this.startRegexp += set;
            }
        }
    }
    visitChildren(node) {
        if (node.type === 'Group') {
            // Ignore children of groups with quantifier (+/*/?)
            // These groups are unrelated to start/end tokens of terminals
            const group = node;
            if (group.quantifier) {
                return;
            }
        }
        super.visitChildren(node);
    }
}
const visitor = new TerminalRegExpVisitor();
export function getTerminalParts(regexp) {
    try {
        if (typeof regexp !== 'string') {
            regexp = regexp.source;
        }
        regexp = `/${regexp}/`;
        const pattern = regexpParser.pattern(regexp);
        const parts = [];
        for (const alternative of pattern.value.value) {
            visitor.reset(regexp);
            visitor.visit(alternative);
            parts.push({
                start: visitor.startRegexp,
                end: visitor.endRegex
            });
        }
        return parts;
    }
    catch (_a) {
        return [];
    }
}
export function isMultilineComment(regexp) {
    try {
        if (typeof regexp === 'string') {
            regexp = new RegExp(regexp);
        }
        regexp = regexp.toString();
        visitor.reset(regexp);
        // Parsing the pattern might fail (since it's user code)
        visitor.visit(regexpParser.pattern(regexp));
        return visitor.multiline;
    }
    catch (_a) {
        return false;
    }
}
/**
 * A set of all characters that are considered whitespace by the '\s' RegExp character class.
 * Taken from [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Character_classes).
 */
export const whitespaceCharacters = ('\f\n\r\t\v\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007' +
    '\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff').split('');
export function isWhitespace(value) {
    const regexp = typeof value === 'string' ? new RegExp(value) : value;
    return whitespaceCharacters.some((ws) => regexp.test(ws));
}
export function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
export function getCaseInsensitivePattern(keyword) {
    return Array.prototype.map.call(keyword, letter => /\w/.test(letter) ? `[${letter.toLowerCase()}${letter.toUpperCase()}]` : escapeRegExp(letter)).join('');
}
/**
 * Determines whether the given input has a partial match with the specified regex.
 * @param regex The regex to partially match against
 * @param input The input string
 * @returns Whether any match exists.
 */
export function partialMatches(regex, input) {
    const partial = partialRegExp(regex);
    const match = input.match(partial);
    return !!match && match[0].length > 0;
}
/**
 * Builds a partial regex from the input regex. A partial regex is able to match incomplete input strings. E.g.
 * a partial regex constructed from `/ab/` is able to match the string `a` without needing a following `b` character. However it won't match `b` alone.
 * @param regex The input regex to be converted.
 * @returns A partial regex constructed from the input regex.
 */
export function partialRegExp(regex) {
    if (typeof regex === 'string') {
        regex = new RegExp(regex);
    }
    const re = regex, source = regex.source;
    let i = 0;
    function process() {
        let result = '', tmp;
        function appendRaw(nbChars) {
            result += source.substr(i, nbChars);
            i += nbChars;
        }
        function appendOptional(nbChars) {
            result += '(?:' + source.substr(i, nbChars) + '|$)';
            i += nbChars;
        }
        while (i < source.length) {
            switch (source[i]) {
                case '\\':
                    switch (source[i + 1]) {
                        case 'c':
                            appendOptional(3);
                            break;
                        case 'x':
                            appendOptional(4);
                            break;
                        case 'u':
                            if (re.unicode) {
                                if (source[i + 2] === '{') {
                                    appendOptional(source.indexOf('}', i) - i + 1);
                                }
                                else {
                                    appendOptional(6);
                                }
                            }
                            else {
                                appendOptional(2);
                            }
                            break;
                        case 'p':
                        case 'P':
                            if (re.unicode) {
                                appendOptional(source.indexOf('}', i) - i + 1);
                            }
                            else {
                                appendOptional(2);
                            }
                            break;
                        case 'k':
                            appendOptional(source.indexOf('>', i) - i + 1);
                            break;
                        default:
                            appendOptional(2);
                            break;
                    }
                    break;
                case '[':
                    tmp = /\[(?:\\.|.)*?\]/g;
                    tmp.lastIndex = i;
                    tmp = tmp.exec(source) || [];
                    appendOptional(tmp[0].length);
                    break;
                case '|':
                case '^':
                case '$':
                case '*':
                case '+':
                case '?':
                    appendRaw(1);
                    break;
                case '{':
                    tmp = /\{\d+,?\d*\}/g;
                    tmp.lastIndex = i;
                    tmp = tmp.exec(source);
                    if (tmp) {
                        appendRaw(tmp[0].length);
                    }
                    else {
                        appendOptional(1);
                    }
                    break;
                case '(':
                    if (source[i + 1] === '?') {
                        switch (source[i + 2]) {
                            case ':':
                                result += '(?:';
                                i += 3;
                                result += process() + '|$)';
                                break;
                            case '=':
                                result += '(?=';
                                i += 3;
                                result += process() + ')';
                                break;
                            case '!':
                                tmp = i;
                                i += 3;
                                process();
                                result += source.substr(tmp, i - tmp);
                                break;
                            case '<':
                                switch (source[i + 3]) {
                                    case '=':
                                    case '!':
                                        tmp = i;
                                        i += 4;
                                        process();
                                        result += source.substr(tmp, i - tmp);
                                        break;
                                    default:
                                        appendRaw(source.indexOf('>', i) - i + 1);
                                        result += process() + '|$)';
                                        break;
                                }
                                break;
                        }
                    }
                    else {
                        appendRaw(1);
                        result += process() + '|$)';
                    }
                    break;
                case ')':
                    ++i;
                    return result;
                default:
                    appendOptional(1);
                    break;
            }
        }
        return result;
    }
    return new RegExp(process(), regex.flags);
}
//# sourceMappingURL=regexp-utils.js.map