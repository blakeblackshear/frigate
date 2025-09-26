/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { Position, Range } from 'vscode-languageserver-textdocument';
import type { GeneratorNode } from './generator-node.js';
import type { SourceRegion, TextRegion, TraceRegion } from './generator-tracing.js';
import { CompositeGeneratorNode, IndentNode, NewLineNode } from './generator-node.js';
import { getSourceRegion } from './generator-tracing.js';

type OffsetAndPosition = { offset: number } & Position

class Context {

    defaultIndentation = '    ';
    pendingIndent = true;
    readonly currentIndents: IndentNode[] = [];
    readonly recentNonImmediateIndents: IndentNode[] = [];

    private traceData: InternalTraceRegion[] = [];

    private lines: string[][] = [[]];
    private length: number = 0;

    constructor(defaultIndent?: string | number) {
        if (typeof defaultIndent === 'string') {
            this.defaultIndentation = defaultIndent;
        } else if (typeof defaultIndent === 'number') {
            this.defaultIndentation = ''.padStart(defaultIndent);
        }
    }

    get content(): string {
        return this.lines.map(e => e.join('')).join('');
    }

    get contentLength(): number {
        return this.length;
    }

    get currentLineNumber(): number {
        return this.lines.length - 1;
    }

    get currentLineContent(): string {
        return this.lines[this.currentLineNumber].join('');
    }

    get currentPosition(): OffsetAndPosition {
        return {
            offset: this.contentLength,
            line: this.currentLineNumber,
            character: this.currentLineContent.length
        };
    }

    append(value: string, isIndent?: boolean) {
        if (value.length > 0) {
            const beforePos = isIndent && this.currentPosition;
            this.lines[this.currentLineNumber].push(value);
            this.length += value.length;
            if (beforePos) {
                this.indentPendingTraceRegions(beforePos);
            }
        }
    }

    private indentPendingTraceRegions(before: OffsetAndPosition) {
        for (let i = this.traceData.length - 1; i >= 0; i--) {
            const tr = this.traceData[i];
            if (tr.targetStart && tr.targetStart.offset === before.offset /* tr.targetStart.line == before.line && tr.targetStart.character === before.character*/)
                tr.targetStart = this.currentPosition;
        }
    }

    increaseIndent(node: IndentNode) {
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

    pushTraceRegion(sourceRegion: SourceRegion | undefined): InternalTraceRegion {
        const region = createTraceRegion(
            sourceRegion,
            this.currentPosition,
            it => this.traceData[this.traceData.length - 1]?.children?.push(it));
        this.traceData.push(region);
        return region;
    }

    popTraceRegion(expected: TraceRegion): InternalTraceRegion {
        const traceRegion = this.traceData.pop()!;
        // the following assertion can be dropped once the tracing is considered stable
        this.assertTrue(traceRegion === expected, 'Trace region mismatch!');

        return traceRegion;
    }

    getParentTraceSourceFileURI() {
        for (let i = this.traceData.length - 1; i > -1; i--) {
            const fileUri = this.traceData[i].sourceRegion?.fileURI;
            if (fileUri)
                return fileUri;
        }
        return undefined;
    }

    private assertTrue(condition: boolean, msg: string): asserts condition is true {
        if (!condition) {
            throw new Error(msg);
        }
    }
}

interface InternalTraceRegion extends TraceRegion {
    targetStart?: OffsetAndPosition;
    complete?: (targetEnd: OffsetAndPosition) => TraceRegion;
}

function createTraceRegion(sourceRegion: SourceRegion | undefined, targetStart: OffsetAndPosition, accept: (it: TraceRegion) => void): TraceRegion {
    const result = <InternalTraceRegion>{
        sourceRegion,
        targetRegion: undefined!,
        children: [],
        targetStart,
        complete: (targetEnd: OffsetAndPosition) => {
            result.targetRegion = <TextRegion>{
                offset: result.targetStart!.offset,
                end: targetEnd.offset,
                length: targetEnd.offset - result.targetStart!.offset,
                range: <Range>{
                    start: {
                        line: result.targetStart!.line,
                        character: result.targetStart!.character
                    },
                    end: {
                        line: targetEnd.line,
                        character: targetEnd.character
                    },
                }
            };
            delete result.targetStart;
            if (result.children?.length === 0) {
                delete result.children;
            }
            if (result.targetRegion?.length) {
                accept(result);
            }
            delete result.complete;
            return result;
        }
    };
    return result;
}

export function processGeneratorNode(node: GeneratorNode, defaultIndentation?: string | number): { text: string, trace: TraceRegion } {
    const context = new Context(defaultIndentation);
    const trace = context.pushTraceRegion(undefined);

    processNodeInternal(node, context);

    context.popTraceRegion(trace);
    trace.complete && trace.complete(context.currentPosition);

    const singleChild = trace.children && trace.children.length === 1 ? trace.children[0] : undefined;
    const singleChildTargetRegion = singleChild?.targetRegion;
    const rootTargetRegion = trace.targetRegion;

    if (singleChildTargetRegion && singleChild.sourceRegion
            && singleChildTargetRegion.offset === rootTargetRegion.offset
            && singleChildTargetRegion.length === rootTargetRegion.length) {
        // some optimization:
        // if (the root) `node` is traced (`singleChild.sourceRegion` !== undefined) and spans the entire `context.content`
        //  we skip the wrapping root trace object created above at the beginning of this method
        return { text: context.content, trace: singleChild };

    } else {
        return { text: context.content, trace };
    }
}

function processNodeInternal(node: GeneratorNode | string, context: Context) {
    if (typeof(node) === 'string') {
        processStringNode(node, context);
    } else if (node instanceof IndentNode) {
        processIndentNode(node, context);
    } else if (node instanceof CompositeGeneratorNode) {
        processCompositeNode(node, context);
    } else if (node instanceof NewLineNode) {
        processNewLineNode(node, context);
    }
}

function hasContent(node: GeneratorNode | string, ctx: Context): boolean {
    if (typeof(node) === 'string') {
        return node.length !== 0; // cs: do not ignore ws only content here, enclosed within other nodes it will matter!
    } else if (node instanceof CompositeGeneratorNode) {
        return node.contents.some(e => hasContent(e, ctx));
    } else if (node instanceof NewLineNode) {
        return !(node.ifNotEmpty && ctx.currentLineContent.length === 0);
    } else {
        return false;
    }
}

function processStringNode(node: string, context: Context) {
    if (node) {
        if (context.pendingIndent) {
            handlePendingIndent(context, false);
        }
        context.append(node);
    }
}

function handlePendingIndent(ctx: Context, endOfLine: boolean) {
    let indent = '';
    for (const indentNode of ctx.relevantIndents.filter(e => e.indentEmptyLines || !endOfLine)) {
        indent += indentNode.indentation ?? ctx.defaultIndentation;
    }
    ctx.append(indent, true);
    ctx.pendingIndent = false;
}

function processCompositeNode(node: CompositeGeneratorNode, context: Context) {
    let traceRegion: InternalTraceRegion | undefined = undefined;

    const sourceRegion: SourceRegion | undefined = getSourceRegion(node.tracedSource);
    if (sourceRegion) {
        traceRegion = context.pushTraceRegion(sourceRegion);
    }

    for (const child of node.contents) {
        processNodeInternal(child, context);
    }

    if (traceRegion) {
        context.popTraceRegion(traceRegion);

        const parentsFileURI = context.getParentTraceSourceFileURI();
        if (parentsFileURI && sourceRegion?.fileURI === parentsFileURI) {
            // if some parent's sourceRegion refers to the same source file uri (and no other source file was referenced inbetween)
            // we can drop the file uri in order to reduce repeated strings
            delete sourceRegion.fileURI;
        }

        traceRegion.complete && traceRegion.complete(context.currentPosition);
    }
}

function processIndentNode(node: IndentNode, context: Context) {
    if (hasContent(node, context)) {
        if (node.indentImmediately && !context.pendingIndent) {
            context.append(node.indentation ?? context.defaultIndentation, true);
        }
        try {
            context.increaseIndent(node);
            processCompositeNode(node, context);
        } finally {
            context.decreaseIndent();
        }
    }
}

function processNewLineNode(node: NewLineNode, context: Context) {
    if (node.ifNotEmpty && !hasNonWhitespace(context.currentLineContent)) {
        context.resetCurrentLine();
    } else {
        if (context.pendingIndent) {
            handlePendingIndent(context, true);
        }
        context.append(node.lineDelimiter);
        context.addNewLine();
    }
}

function hasNonWhitespace(text: string) {
    return text.trimStart() !== '';
}
