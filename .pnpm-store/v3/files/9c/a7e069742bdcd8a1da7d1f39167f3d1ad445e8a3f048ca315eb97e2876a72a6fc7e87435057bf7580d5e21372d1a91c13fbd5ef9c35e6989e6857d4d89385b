/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { Position, Range } from 'vscode-languageserver-types';
import { NEWLINE_REGEXP, escapeRegExp } from '../utils/regexp-utils.js';
import { URI } from '../utils/uri-utils.js';
export function parseJSDoc(node, start, options) {
    let opts;
    let position;
    if (typeof node === 'string') {
        position = start;
        opts = options;
    }
    else {
        position = node.range.start;
        opts = start;
    }
    if (!position) {
        position = Position.create(0, 0);
    }
    const lines = getLines(node);
    const normalizedOptions = normalizeOptions(opts);
    const tokens = tokenize({
        lines,
        position,
        options: normalizedOptions
    });
    return parseJSDocComment({
        index: 0,
        tokens,
        position
    });
}
export function isJSDoc(node, options) {
    const normalizedOptions = normalizeOptions(options);
    const lines = getLines(node);
    if (lines.length === 0) {
        return false;
    }
    const first = lines[0];
    const last = lines[lines.length - 1];
    const firstRegex = normalizedOptions.start;
    const lastRegex = normalizedOptions.end;
    return Boolean(firstRegex === null || firstRegex === void 0 ? void 0 : firstRegex.exec(first)) && Boolean(lastRegex === null || lastRegex === void 0 ? void 0 : lastRegex.exec(last));
}
function getLines(node) {
    let content = '';
    if (typeof node === 'string') {
        content = node;
    }
    else {
        content = node.text;
    }
    const lines = content.split(NEWLINE_REGEXP);
    return lines;
}
const tagRegex = /\s*(@([\p{L}][\p{L}\p{N}]*)?)/uy;
const inlineTagRegex = /\{(@[\p{L}][\p{L}\p{N}]*)(\s*)([^\r\n}]+)?\}/gu;
function tokenize(context) {
    var _a, _b, _c;
    const tokens = [];
    let currentLine = context.position.line;
    let currentCharacter = context.position.character;
    for (let i = 0; i < context.lines.length; i++) {
        const first = i === 0;
        const last = i === context.lines.length - 1;
        let line = context.lines[i];
        let index = 0;
        if (first && context.options.start) {
            const match = (_a = context.options.start) === null || _a === void 0 ? void 0 : _a.exec(line);
            if (match) {
                index = match.index + match[0].length;
            }
        }
        else {
            const match = (_b = context.options.line) === null || _b === void 0 ? void 0 : _b.exec(line);
            if (match) {
                index = match.index + match[0].length;
            }
        }
        if (last) {
            const match = (_c = context.options.end) === null || _c === void 0 ? void 0 : _c.exec(line);
            if (match) {
                line = line.substring(0, match.index);
            }
        }
        line = line.substring(0, lastCharacter(line));
        const whitespaceEnd = skipWhitespace(line, index);
        if (whitespaceEnd >= line.length) {
            // Only create a break token when we already have previous tokens
            if (tokens.length > 0) {
                const position = Position.create(currentLine, currentCharacter);
                tokens.push({
                    type: 'break',
                    content: '',
                    range: Range.create(position, position)
                });
            }
        }
        else {
            tagRegex.lastIndex = index;
            const tagMatch = tagRegex.exec(line);
            if (tagMatch) {
                const fullMatch = tagMatch[0];
                const value = tagMatch[1];
                const start = Position.create(currentLine, currentCharacter + index);
                const end = Position.create(currentLine, currentCharacter + index + fullMatch.length);
                tokens.push({
                    type: 'tag',
                    content: value,
                    range: Range.create(start, end)
                });
                index += fullMatch.length;
                index = skipWhitespace(line, index);
            }
            if (index < line.length) {
                const rest = line.substring(index);
                const inlineTagMatches = Array.from(rest.matchAll(inlineTagRegex));
                tokens.push(...buildInlineTokens(inlineTagMatches, rest, currentLine, currentCharacter + index));
            }
        }
        currentLine++;
        currentCharacter = 0;
    }
    // Remove last break token if there is one
    if (tokens.length > 0 && tokens[tokens.length - 1].type === 'break') {
        return tokens.slice(0, -1);
    }
    return tokens;
}
function buildInlineTokens(tags, line, lineIndex, characterIndex) {
    const tokens = [];
    if (tags.length === 0) {
        const start = Position.create(lineIndex, characterIndex);
        const end = Position.create(lineIndex, characterIndex + line.length);
        tokens.push({
            type: 'text',
            content: line,
            range: Range.create(start, end)
        });
    }
    else {
        let lastIndex = 0;
        for (const match of tags) {
            const matchIndex = match.index;
            const startContent = line.substring(lastIndex, matchIndex);
            if (startContent.length > 0) {
                tokens.push({
                    type: 'text',
                    content: line.substring(lastIndex, matchIndex),
                    range: Range.create(Position.create(lineIndex, lastIndex + characterIndex), Position.create(lineIndex, matchIndex + characterIndex))
                });
            }
            let offset = startContent.length + 1;
            const tagName = match[1];
            tokens.push({
                type: 'inline-tag',
                content: tagName,
                range: Range.create(Position.create(lineIndex, lastIndex + offset + characterIndex), Position.create(lineIndex, lastIndex + offset + tagName.length + characterIndex))
            });
            offset += tagName.length;
            if (match.length === 4) {
                offset += match[2].length;
                const value = match[3];
                tokens.push({
                    type: 'text',
                    content: value,
                    range: Range.create(Position.create(lineIndex, lastIndex + offset + characterIndex), Position.create(lineIndex, lastIndex + offset + value.length + characterIndex))
                });
            }
            else {
                tokens.push({
                    type: 'text',
                    content: '',
                    range: Range.create(Position.create(lineIndex, lastIndex + offset + characterIndex), Position.create(lineIndex, lastIndex + offset + characterIndex))
                });
            }
            lastIndex = matchIndex + match[0].length;
        }
        const endContent = line.substring(lastIndex);
        if (endContent.length > 0) {
            tokens.push({
                type: 'text',
                content: endContent,
                range: Range.create(Position.create(lineIndex, lastIndex + characterIndex), Position.create(lineIndex, lastIndex + characterIndex + endContent.length))
            });
        }
    }
    return tokens;
}
const nonWhitespaceRegex = /\S/;
const whitespaceEndRegex = /\s*$/;
function skipWhitespace(line, index) {
    const match = line.substring(index).match(nonWhitespaceRegex);
    if (match) {
        return index + match.index;
    }
    else {
        return line.length;
    }
}
function lastCharacter(line) {
    const match = line.match(whitespaceEndRegex);
    if (match && typeof match.index === 'number') {
        return match.index;
    }
    return undefined;
}
// Parsing
function parseJSDocComment(context) {
    var _a, _b, _c, _d;
    const startPosition = Position.create(context.position.line, context.position.character);
    if (context.tokens.length === 0) {
        return new JSDocCommentImpl([], Range.create(startPosition, startPosition));
    }
    const elements = [];
    while (context.index < context.tokens.length) {
        const element = parseJSDocElement(context, elements[elements.length - 1]);
        if (element) {
            elements.push(element);
        }
    }
    const start = (_b = (_a = elements[0]) === null || _a === void 0 ? void 0 : _a.range.start) !== null && _b !== void 0 ? _b : startPosition;
    const end = (_d = (_c = elements[elements.length - 1]) === null || _c === void 0 ? void 0 : _c.range.end) !== null && _d !== void 0 ? _d : startPosition;
    return new JSDocCommentImpl(elements, Range.create(start, end));
}
function parseJSDocElement(context, last) {
    const next = context.tokens[context.index];
    if (next.type === 'tag') {
        return parseJSDocTag(context, false);
    }
    else if (next.type === 'text' || next.type === 'inline-tag') {
        return parseJSDocText(context);
    }
    else {
        appendEmptyLine(next, last);
        context.index++;
        return undefined;
    }
}
function appendEmptyLine(token, element) {
    if (element) {
        const line = new JSDocLineImpl('', token.range);
        if ('inlines' in element) {
            element.inlines.push(line);
        }
        else {
            element.content.inlines.push(line);
        }
    }
}
function parseJSDocText(context) {
    let token = context.tokens[context.index];
    const firstToken = token;
    let lastToken = token;
    const lines = [];
    while (token && token.type !== 'break' && token.type !== 'tag') {
        lines.push(parseJSDocInline(context));
        lastToken = token;
        token = context.tokens[context.index];
    }
    return new JSDocTextImpl(lines, Range.create(firstToken.range.start, lastToken.range.end));
}
function parseJSDocInline(context) {
    const token = context.tokens[context.index];
    if (token.type === 'inline-tag') {
        return parseJSDocTag(context, true);
    }
    else {
        return parseJSDocLine(context);
    }
}
function parseJSDocTag(context, inline) {
    const tagToken = context.tokens[context.index++];
    const name = tagToken.content.substring(1);
    const nextToken = context.tokens[context.index];
    if ((nextToken === null || nextToken === void 0 ? void 0 : nextToken.type) === 'text') {
        if (inline) {
            const docLine = parseJSDocLine(context);
            return new JSDocTagImpl(name, new JSDocTextImpl([docLine], docLine.range), inline, Range.create(tagToken.range.start, docLine.range.end));
        }
        else {
            const textDoc = parseJSDocText(context);
            return new JSDocTagImpl(name, textDoc, inline, Range.create(tagToken.range.start, textDoc.range.end));
        }
    }
    else {
        const range = tagToken.range;
        return new JSDocTagImpl(name, new JSDocTextImpl([], range), inline, range);
    }
}
function parseJSDocLine(context) {
    const token = context.tokens[context.index++];
    return new JSDocLineImpl(token.content, token.range);
}
function normalizeOptions(options) {
    if (!options) {
        return normalizeOptions({
            start: '/**',
            end: '*/',
            line: '*'
        });
    }
    const { start, end, line } = options;
    return {
        start: normalizeOption(start, true),
        end: normalizeOption(end, false),
        line: normalizeOption(line, true)
    };
}
function normalizeOption(option, start) {
    if (typeof option === 'string' || typeof option === 'object') {
        const escaped = typeof option === 'string' ? escapeRegExp(option) : option.source;
        if (start) {
            return new RegExp(`^\\s*${escaped}`);
        }
        else {
            return new RegExp(`\\s*${escaped}\\s*$`);
        }
    }
    else {
        return option;
    }
}
class JSDocCommentImpl {
    constructor(elements, range) {
        this.elements = elements;
        this.range = range;
    }
    getTag(name) {
        return this.getAllTags().find(e => e.name === name);
    }
    getTags(name) {
        return this.getAllTags().filter(e => e.name === name);
    }
    getAllTags() {
        return this.elements.filter((e) => 'name' in e);
    }
    toString() {
        let value = '';
        for (const element of this.elements) {
            if (value.length === 0) {
                value = element.toString();
            }
            else {
                const text = element.toString();
                value += fillNewlines(value) + text;
            }
        }
        return value.trim();
    }
    toMarkdown(options) {
        let value = '';
        for (const element of this.elements) {
            if (value.length === 0) {
                value = element.toMarkdown(options);
            }
            else {
                const text = element.toMarkdown(options);
                value += fillNewlines(value) + text;
            }
        }
        return value.trim();
    }
}
class JSDocTagImpl {
    constructor(name, content, inline, range) {
        this.name = name;
        this.content = content;
        this.inline = inline;
        this.range = range;
    }
    toString() {
        let text = `@${this.name}`;
        const content = this.content.toString();
        if (this.content.inlines.length === 1) {
            text = `${text} ${content}`;
        }
        else if (this.content.inlines.length > 1) {
            text = `${text}\n${content}`;
        }
        if (this.inline) {
            // Inline tags are surrounded by curly braces
            return `{${text}}`;
        }
        else {
            return text;
        }
    }
    toMarkdown(options) {
        var _a, _b;
        return (_b = (_a = options === null || options === void 0 ? void 0 : options.renderTag) === null || _a === void 0 ? void 0 : _a.call(options, this)) !== null && _b !== void 0 ? _b : this.toMarkdownDefault(options);
    }
    toMarkdownDefault(options) {
        const content = this.content.toMarkdown(options);
        if (this.inline) {
            const rendered = renderInlineTag(this.name, content, options !== null && options !== void 0 ? options : {});
            if (typeof rendered === 'string') {
                return rendered;
            }
        }
        let marker = '';
        if ((options === null || options === void 0 ? void 0 : options.tag) === 'italic' || (options === null || options === void 0 ? void 0 : options.tag) === undefined) {
            marker = '*';
        }
        else if ((options === null || options === void 0 ? void 0 : options.tag) === 'bold') {
            marker = '**';
        }
        else if ((options === null || options === void 0 ? void 0 : options.tag) === 'bold-italic') {
            marker = '***';
        }
        let text = `${marker}@${this.name}${marker}`;
        if (this.content.inlines.length === 1) {
            text = `${text} — ${content}`;
        }
        else if (this.content.inlines.length > 1) {
            text = `${text}\n${content}`;
        }
        if (this.inline) {
            // Inline tags are surrounded by curly braces
            return `{${text}}`;
        }
        else {
            return text;
        }
    }
}
function renderInlineTag(tag, content, options) {
    var _a, _b;
    if (tag === 'linkplain' || tag === 'linkcode' || tag === 'link') {
        const index = content.indexOf(' ');
        let display = content;
        if (index > 0) {
            const displayStart = skipWhitespace(content, index);
            display = content.substring(displayStart);
            content = content.substring(0, index);
        }
        if (tag === 'linkcode' || (tag === 'link' && options.link === 'code')) {
            // Surround the display value in a markdown inline code block
            display = `\`${display}\``;
        }
        const renderedLink = (_b = (_a = options.renderLink) === null || _a === void 0 ? void 0 : _a.call(options, content, display)) !== null && _b !== void 0 ? _b : renderLinkDefault(content, display);
        return renderedLink;
    }
    return undefined;
}
function renderLinkDefault(content, display) {
    try {
        URI.parse(content, true);
        return `[${display}](${content})`;
    }
    catch (_a) {
        return content;
    }
}
class JSDocTextImpl {
    constructor(lines, range) {
        this.inlines = lines;
        this.range = range;
    }
    toString() {
        let text = '';
        for (let i = 0; i < this.inlines.length; i++) {
            const inline = this.inlines[i];
            const next = this.inlines[i + 1];
            text += inline.toString();
            if (next && next.range.start.line > inline.range.start.line) {
                text += '\n';
            }
        }
        return text;
    }
    toMarkdown(options) {
        let text = '';
        for (let i = 0; i < this.inlines.length; i++) {
            const inline = this.inlines[i];
            const next = this.inlines[i + 1];
            text += inline.toMarkdown(options);
            if (next && next.range.start.line > inline.range.start.line) {
                text += '\n';
            }
        }
        return text;
    }
}
class JSDocLineImpl {
    constructor(text, range) {
        this.text = text;
        this.range = range;
    }
    toString() {
        return this.text;
    }
    toMarkdown() {
        return this.text;
    }
}
function fillNewlines(text) {
    if (text.endsWith('\n')) {
        return '\n';
    }
    else {
        return '\n\n';
    }
}
//# sourceMappingURL=jsdoc.js.map