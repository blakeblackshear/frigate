/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { CompositeGeneratorNode, IndentNode, NewLineNode } from './generator-node.js';
import { getSourceRegion } from './generator-tracing.js';
class Context {
    constructor(defaultIndent) {
        this.defaultIndentation = '    ';
        this.pendingIndent = true;
        this.currentIndents = [];
        this.recentNonImmediateIndents = [];
        this.traceData = [];
        this.lines = [[]];
        this.length = 0;
        if (typeof defaultIndent === 'string') {
            this.defaultIndentation = defaultIndent;
        }
        else if (typeof defaultIndent === 'number') {
            this.defaultIndentation = ''.padStart(defaultIndent);
        }
    }
    get content() {
        return this.lines.map(e => e.join('')).join('');
    }
    get contentLength() {
        return this.length;
    }
    get currentLineNumber() {
        return this.lines.length - 1;
    }
    get currentLineContent() {
        return this.lines[this.currentLineNumber].join('');
    }
    get currentPosition() {
        return {
            offset: this.contentLength,
            line: this.currentLineNumber,
            character: this.currentLineContent.length
        };
    }
    append(value, isIndent) {
        if (value.length > 0) {
            const beforePos = isIndent && this.currentPosition;
            this.lines[this.currentLineNumber].push(value);
            this.length += value.length;
            if (beforePos) {
                this.indentPendingTraceRegions(beforePos);
            }
        }
    }
    indentPendingTraceRegions(before) {
        for (let i = this.traceData.length - 1; i >= 0; i--) {
            const tr = this.traceData[i];
            if (tr.targetStart && tr.targetStart.offset === before.offset /* tr.targetStart.line == before.line && tr.targetStart.character === before.character*/)
                tr.targetStart = this.currentPosition;
        }
    }
    increaseIndent(node) {
        this.currentIndents.push(node);
        if (!node.indentImmediately) {
            this.recentNonImmediateIndents.push(node);
        }
    }
    decreaseIndent() {
        this.currentIndents.pop();
    }
    get relevantIndents() {
        return this.currentIndents.filter(i => !this.recentNonImmediateIndents.includes(i));
    }
    resetCurrentLine() {
        this.length -= this.lines[this.currentLineNumber].join('').length;
        this.lines[this.currentLineNumber] = [];
        this.pendingIndent = true;
    }
    addNewLine() {
        this.pendingIndent = true;
        this.lines.push([]);
        this.recentNonImmediateIndents.length = 0;
    }
    pushTraceRegion(sourceRegion) {
        const region = createTraceRegion(sourceRegion, this.currentPosition, it => { var _a, _b; return (_b = (_a = this.traceData[this.traceData.length - 1]) === null || _a === void 0 ? void 0 : _a.children) === null || _b === void 0 ? void 0 : _b.push(it); });
        this.traceData.push(region);
        return region;
    }
    popTraceRegion(expected) {
        const traceRegion = this.traceData.pop();
        // the following assertion can be dropped once the tracing is considered stable
        this.assertTrue(traceRegion === expected, 'Trace region mismatch!');
        return traceRegion;
    }
    getParentTraceSourceFileURI() {
        var _a;
        for (let i = this.traceData.length - 1; i > -1; i--) {
            const fileUri = (_a = this.traceData[i].sourceRegion) === null || _a === void 0 ? void 0 : _a.fileURI;
            if (fileUri)
                return fileUri;
        }
        return undefined;
    }
    assertTrue(condition, msg) {
        if (!condition) {
            throw new Error(msg);
        }
    }
}
function createTraceRegion(sourceRegion, targetStart, accept) {
    const result = {
        sourceRegion,
        targetRegion: undefined,
        children: [],
        targetStart,
        complete: (targetEnd) => {
            var _a, _b;
            result.targetRegion = {
                offset: result.targetStart.offset,
                end: targetEnd.offset,
                length: targetEnd.offset - result.targetStart.offset,
                range: {
                    start: {
                        line: result.targetStart.line,
                        character: result.targetStart.character
                    },
                    end: {
                        line: targetEnd.line,
                        character: targetEnd.character
                    },
                }
            };
            delete result.targetStart;
            if (((_a = result.children) === null || _a === void 0 ? void 0 : _a.length) === 0) {
                delete result.children;
            }
            if ((_b = result.targetRegion) === null || _b === void 0 ? void 0 : _b.length) {
                accept(result);
            }
            delete result.complete;
            return result;
        }
    };
    return result;
}
export function processGeneratorNode(node, defaultIndentation) {
    const context = new Context(defaultIndentation);
    const trace = context.pushTraceRegion(undefined);
    processNodeInternal(node, context);
    context.popTraceRegion(trace);
    trace.complete && trace.complete(context.currentPosition);
    const singleChild = trace.children && trace.children.length === 1 ? trace.children[0] : undefined;
    const singleChildTargetRegion = singleChild === null || singleChild === void 0 ? void 0 : singleChild.targetRegion;
    const rootTargetRegion = trace.targetRegion;
    if (singleChildTargetRegion && singleChild.sourceRegion
        && singleChildTargetRegion.offset === rootTargetRegion.offset
        && singleChildTargetRegion.length === rootTargetRegion.length) {
        // some optimization:
        // if (the root) `node` is traced (`singleChild.sourceRegion` !== undefined) and spans the entire `context.content`
        //  we skip the wrapping root trace object created above at the beginning of this method
        return { text: context.content, trace: singleChild };
    }
    else {
        return { text: context.content, trace };
    }
}
function processNodeInternal(node, context) {
    if (typeof (node) === 'string') {
        processStringNode(node, context);
    }
    else if (node instanceof IndentNode) {
        processIndentNode(node, context);
    }
    else if (node instanceof CompositeGeneratorNode) {
        processCompositeNode(node, context);
    }
    else if (node instanceof NewLineNode) {
        processNewLineNode(node, context);
    }
}
function hasContent(node, ctx) {
    if (typeof (node) === 'string') {
        return node.length !== 0; // cs: do not ignore ws only content here, enclosed within other nodes it will matter!
    }
    else if (node instanceof CompositeGeneratorNode) {
        return node.contents.some(e => hasContent(e, ctx));
    }
    else if (node instanceof NewLineNode) {
        return !(node.ifNotEmpty && ctx.currentLineContent.length === 0);
    }
    else {
        return false;
    }
}
function processStringNode(node, context) {
    if (node) {
        if (context.pendingIndent) {
            handlePendingIndent(context, false);
        }
        context.append(node);
    }
}
function handlePendingIndent(ctx, endOfLine) {
    var _a;
    let indent = '';
    for (const indentNode of ctx.relevantIndents.filter(e => e.indentEmptyLines || !endOfLine)) {
        indent += (_a = indentNode.indentation) !== null && _a !== void 0 ? _a : ctx.defaultIndentation;
    }
    ctx.append(indent, true);
    ctx.pendingIndent = false;
}
function processCompositeNode(node, context) {
    let traceRegion = undefined;
    const sourceRegion = getSourceRegion(node.tracedSource);
    if (sourceRegion) {
        traceRegion = context.pushTraceRegion(sourceRegion);
    }
    for (const child of node.contents) {
        processNodeInternal(child, context);
    }
    if (traceRegion) {
        context.popTraceRegion(traceRegion);
        const parentsFileURI = context.getParentTraceSourceFileURI();
        if (parentsFileURI && (sourceRegion === null || sourceRegion === void 0 ? void 0 : sourceRegion.fileURI) === parentsFileURI) {
            // if some parent's sourceRegion refers to the same source file uri (and no other source file was referenced inbetween)
            // we can drop the file uri in order to reduce repeated strings
            delete sourceRegion.fileURI;
        }
        traceRegion.complete && traceRegion.complete(context.currentPosition);
    }
}
function processIndentNode(node, context) {
    var _a;
    if (hasContent(node, context)) {
        if (node.indentImmediately && !context.pendingIndent) {
            context.append((_a = node.indentation) !== null && _a !== void 0 ? _a : context.defaultIndentation, true);
        }
        try {
            context.increaseIndent(node);
            processCompositeNode(node, context);
        }
        finally {
            context.decreaseIndent();
        }
    }
}
function processNewLineNode(node, context) {
    if (node.ifNotEmpty && !hasNonWhitespace(context.currentLineContent)) {
        context.resetCurrentLine();
    }
    else {
        if (context.pendingIndent) {
            handlePendingIndent(context, true);
        }
        context.append(node.lineDelimiter);
        context.addNewLine();
    }
}
function hasNonWhitespace(text) {
    return text.trimStart() !== '';
}
//# sourceMappingURL=node-processor.js.map