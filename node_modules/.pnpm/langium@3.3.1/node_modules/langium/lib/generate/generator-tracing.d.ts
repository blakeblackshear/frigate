/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { Range } from 'vscode-languageserver-textdocument';
import type { AstNode, CstNode } from '../syntax-tree.js';
import type { DocumentSegment } from '../workspace/documents.js';
export interface TraceSourceSpec {
    astNode: AstNode;
    property?: string;
    index?: number;
}
export type SourceRegion = TextRegion | TextRegion2 | DocumentSegmentWithFileURI;
export interface TextRegion {
    fileURI?: string;
    offset: number;
    end: number;
    length?: number;
    range?: Range;
}
interface TextRegion2 {
    fileURI?: string;
    offset: number;
    length: number;
    end?: number;
    range?: Range;
}
export interface TraceRegion {
    sourceRegion?: TextRegion;
    targetRegion: TextRegion;
    children?: TraceRegion[];
}
interface DocumentSegmentWithFileURI extends Omit<DocumentSegment, 'range'> {
    fileURI?: string;
    range?: Range;
}
export declare function getSourceRegion(sourceSpec: TraceSourceSpec | undefined | SourceRegion | SourceRegion[]): DocumentSegmentWithFileURI | CstNode | undefined;
export {};
//# sourceMappingURL=generator-tracing.d.ts.map