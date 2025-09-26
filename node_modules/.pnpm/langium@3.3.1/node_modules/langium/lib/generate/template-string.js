/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { NEWLINE_REGEXP } from '../utils/regexp-utils.js';
import { EOL, toString } from './generator-node.js';
export function expandToStringWithNL(staticParts, ...substitutions) {
    return expandToString(staticParts, ...substitutions) + EOL;
}
export function expandToStringLFWithNL(staticParts, ...substitutions) {
    return expandToStringLF(staticParts, ...substitutions) + '\n';
}
/**
 * A tag function that automatically aligns embedded multiline strings.
 * Multiple lines are joined with the platform-specific line separator.
 *
 * @param staticParts the static parts of a tagged template literal
 * @param substitutions the variable parts of a tagged template literal
 * @returns an aligned string that consists of the given parts
 */
export function expandToString(staticParts, ...substitutions) {
    return internalExpandToString(EOL, staticParts, ...substitutions);
}
/**
 * A tag function that automatically aligns embedded multiline strings.
 * Multiple lines are joined with the LINE_FEED (`\n`) line separator.
 *
 * @param staticParts the static parts of a tagged template literal
 * @param substitutions the variable parts of a tagged template literal
 * @returns an aligned string that consists of the given parts
 */
export function expandToStringLF(staticParts, ...substitutions) {
    return internalExpandToString('\n', staticParts, ...substitutions);
}
function internalExpandToString(lineSep, staticParts, ...substitutions) {
    let lines = substitutions
        // align substitutions and fuse them with static parts
        .reduce((acc, subst, i) => { var _a; return acc + (subst === undefined ? SNLE : align(toString(subst), acc)) + ((_a = staticParts[i + 1]) !== null && _a !== void 0 ? _a : ''); }, staticParts[0])
        // converts text to lines
        .split(NEWLINE_REGEXP)
        .filter(l => l.trim() !== SNLE)
        // whitespace-only lines are empty (preserving leading whitespace)
        .map(l => l.replace(SNLE, '').trimEnd());
    // in order to nicely handle single line templates with the leading and trailing termintators (``) on separate lines, like
    //   expandToString`foo
    //   `,
    //   expandToString`
    //      foo
    //   `,
    //   expandToString`
    //      foo`,
    // the same way as true single line templates like
    //   expandToString`foo`
    // ...
    // ... drop initial linebreak if the first line is empty or contains white space only, ...
    const containsLeadingLinebreak = lines.length > 1 && lines[0].trim().length === 0;
    lines = containsLeadingLinebreak ? lines.slice(1) : lines;
    // .. and drop the last linebreak if it's the last charactor or is followed by white space
    const containsTrailingLinebreak = lines.length !== 0 && lines[lines.length - 1].trimEnd().length === 0;
    lines = containsTrailingLinebreak ? lines.slice(0, lines.length - 1) : lines;
    // finds the minimum indentation
    const indent = findIndentation(lines);
    return lines
        // shifts lines to the left
        .map(line => line.slice(indent).trimEnd())
        // convert lines to string
        .join(lineSep);
}
export const SNLE = Object.freeze('__«SKIP^NEW^LINE^IF^EMPTY»__');
const nonWhitespace = /\S|$/;
// add the alignment of the previous static part to all lines of the following substitution
function align(subst, acc) {
    const length = Math.max(0, acc.length - acc.lastIndexOf('\n') - 1);
    const indent = ' '.repeat(length);
    return subst.replace(NEWLINE_REGEXP, EOL + indent);
}
// finds the indentation of a text block represented by a sequence of lines
export function findIndentation(lines) {
    const indents = lines.filter(line => line.length > 0).map(line => line.search(nonWhitespace));
    const min = indents.length === 0 ? 0 : Math.min(...indents); // min(...[]) = min() = Infinity
    return Math.max(0, min);
}
export function normalizeEOL(input) {
    return input.replace(NEWLINE_REGEXP, EOL);
}
//# sourceMappingURL=template-string.js.map