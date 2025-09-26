"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toMatcher = exports.toRegex = void 0;
const escapeRe = (ch) => (/[.^$+{}()|\\]/.test(ch) ? `\\${ch}` : ch);
/**
 * Convert a glob pattern to a regular expression
 *
 * Supports:
 * - `/` to separate path segments
 * - `*` to match zero or more characters in a path segment
 * - `?` to match one character in a path segment
 * - `**` to match any number of path segments, including none
 * - `{}` to group conditions (e.g. `{html,txt}`)
 * - `[abc]`, `[a-z]`, `[!a-z]`, `[!abc]` character classes
 */
const toRegex = (pattern) => {
    let regexStr = '';
    let i = 0;
    // Helper to parse a brace group like {a,b,c}. No nesting support.
    const parseBraceGroup = () => {
        // Assume current char is '{'
        i++; // skip '{'
        const parts = [];
        let cur = '';
        let closed = false;
        while (i < pattern.length) {
            const ch = pattern[i];
            if (ch === '}') {
                parts.push(cur);
                i++; // consume '}'
                closed = true;
                break;
            }
            if (ch === ',') {
                parts.push(cur);
                cur = '';
                i++;
                continue;
            }
            cur += ch;
            i++;
        }
        if (!closed) {
            // treat as literal '{...'
            return '\\{' + escapeRe(cur);
        }
        // Convert each part recursively to support globs inside braces
        const alt = parts.map((p) => (0, exports.toRegex)(p).source.replace(/^\^/, '').replace(/\$$/, '')).join('|');
        return `(?:${alt})`;
    };
    while (i < pattern.length) {
        const char = pattern[i];
        switch (char) {
            case '*': {
                // Check for double star **
                if (pattern[i + 1] === '*') {
                    // Collapse consecutive * beyond two (e.g., *** -> **)
                    let j = i + 2;
                    while (pattern[j] === '*')
                        j++;
                    // If followed by a slash, make it optional to allow zero segments
                    if (pattern[j] === '/') {
                        regexStr += '(?:.*/)?';
                        i = j + 1; // consume **/
                    }
                    else {
                        regexStr += '.*';
                        i = j; // consume **
                    }
                }
                else {
                    regexStr += '[^/]*';
                    i++;
                }
                break;
            }
            case '?':
                regexStr += '[^/]';
                i++;
                break;
            case '[': {
                // Copy character class as-is with support for leading '!'
                let cls = '[';
                i++;
                if (i < pattern.length && pattern[i] === '!') {
                    cls += '^';
                    i++;
                }
                // if first after [ or [^ is ']' include it literally
                if (i < pattern.length && pattern[i] === ']') {
                    cls += ']';
                    i++;
                }
                while (i < pattern.length && pattern[i] !== ']') {
                    const ch = pattern[i];
                    // Escape backslash inside class
                    cls += ch === '\\' ? '\\\\' : ch;
                    i++;
                }
                if (i < pattern.length && pattern[i] === ']') {
                    cls += ']';
                    i++;
                }
                else {
                    // Unclosed class -> treat '[' literally
                    regexStr += '\\[';
                    continue;
                }
                regexStr += cls;
                break;
            }
            case '{': {
                regexStr += parseBraceGroup();
                break;
            }
            case '/':
                regexStr += '/';
                i++;
                break;
            case '.':
            case '^':
            case '$':
            case '+':
            case '(':
            case ')':
            case '|':
            case '\\':
                regexStr += `\\${char}`;
                i++;
                break;
            default:
                regexStr += char;
                i++;
                break;
        }
    }
    return new RegExp('^' + regexStr + '$');
};
exports.toRegex = toRegex;
const isRegExp = /^\/(.{1,4096})\/([gimsuy]{0,6})$/;
const toMatcher = (pattern) => {
    const regexes = [];
    const patterns = Array.isArray(pattern) ? pattern : [pattern];
    for (const pat of patterns) {
        if (typeof pat === 'string') {
            const match = isRegExp.exec(pat);
            if (match) {
                const [, expr, flags] = match;
                regexes.push(new RegExp(expr, flags));
            }
            else {
                regexes.push((0, exports.toRegex)(pat));
            }
        }
        else {
            regexes.push(pat);
        }
    }
    const length = regexes.length;
    return (path) => {
        for (let i = 0; i < length; i++)
            if (regexes[i].test(path))
                return true;
        return false;
    };
};
exports.toMatcher = toMatcher;
