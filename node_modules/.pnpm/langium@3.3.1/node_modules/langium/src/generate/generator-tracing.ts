/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { Range } from 'vscode-languageserver-textdocument';
import type { AstNodeRegionWithAssignments, AstNodeWithTextRegion } from '../serializer/json-serializer.js';
import type { AstNode, CstNode, GenericAstNode } from '../syntax-tree.js';
import { getDocument } from '../utils/ast-utils.js';
import { findNodesForProperty } from '../utils/grammar-utils.js';
import { TreeStreamImpl } from '../utils/stream.js';
import type { DocumentSegment } from '../workspace/documents.js';

export interface TraceSourceSpec {
    astNode: AstNode;
    property?: string;
    index?: number;
}

export type SourceRegion = TextRegion | TextRegion2 | DocumentSegmentWithFileURI

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

type SourceRegionPartial = Pick<DocumentSegmentWithFileURI, 'offset' | 'end'> & Partial<DocumentSegmentWithFileURI> // eslint-disable-next-line @typescript-eslint/indent
                           | Pick<DocumentSegmentWithFileURI, 'offset' | 'length'> & Partial<DocumentSegmentWithFileURI>;

export function getSourceRegion(sourceSpec: TraceSourceSpec | undefined | SourceRegion | SourceRegion[]): DocumentSegmentWithFileURI | CstNode | undefined {
    if (!sourceSpec) {
        return undefined;

    } else if ('astNode' in sourceSpec) {
        return getSourceRegionOfAstNode(sourceSpec);

    } else if (Array.isArray(sourceSpec)) {
        return sourceSpec.reduce( mergeDocumentSegment, undefined ); // apply mergeDocumentSegment for single entry sourcSpec lists, too, thus start with 'undefined' as initial value

    } else {
        // some special treatment of cstNodes for revealing the uri of the defining DSL text file
        //  is currently only done for single cstNode tracings, like "expandTracedToNode(source.$cstNode)`...`",
        //  is _not done_ for multi node tracings like below, see if case above
        //    joinTracedToNode( [
        //        findNodeForKeyword(source.$cstNode, '{')!,
        //        findNodeForKeyword(source.$cstNode, '}')!
        //    ] )(source.children, c => c.name)

        const sourceRegion: SourceRegionPartial = sourceSpec;

        const sourceFileURIviaCstNode = isCstNode(sourceRegion)
            ? getDocumentURIOrUndefined(sourceRegion?.root?.astNode ?? sourceRegion?.astNode) : undefined;

        return copyDocumentSegment(sourceRegion, sourceFileURIviaCstNode);
    }
}

function isCstNode(segment: object | undefined): segment is CstNode {
    return typeof segment !== 'undefined'  && 'element' in segment && 'text' in segment;
}

function getDocumentURIOrUndefined(astNode: AstNode): string | undefined {
    try {
        return getDocument(astNode).uri.toString();
    } catch (e) {
        return undefined;
    }
}

function getSourceRegionOfAstNode(sourceSpec: TraceSourceSpec): DocumentSegmentWithFileURI | undefined {
    const { astNode, property, index } = sourceSpec ?? {};
    const textRegion: AstNodeRegionWithAssignments | undefined = astNode?.$cstNode ?? (astNode as AstNodeWithTextRegion)?.$textRegion;

    if (astNode === undefined || textRegion === undefined) {
        return undefined;

    } else if (property === undefined) {
        return copyDocumentSegment(textRegion, getDocumentURI(astNode));

    } else {
        const getSingleOrCompoundRegion = (regions: SourceRegion[]): SourceRegion | undefined => {
            if (index !== undefined && index > -1 && Array.isArray((astNode as GenericAstNode)[property])) {
                return index < regions.length ? regions[index] : undefined;

            } else {
                return regions.reduce(mergeDocumentSegment, undefined);
            }
        };

        if (textRegion.assignments?.[property]) {
            const region = getSingleOrCompoundRegion(
                textRegion.assignments[property]
            );
            return region && copyDocumentSegment(region, getDocumentURI(astNode));

        } else if (astNode.$cstNode) {
            const region = getSingleOrCompoundRegion(
                findNodesForProperty(astNode.$cstNode, property)
            );
            return region && copyDocumentSegment(region, getDocumentURI(astNode));

        } else {
            return undefined;
        }
    }
}

function getDocumentURI(astNode: AstNodeWithTextRegion): string | undefined {
    if (astNode.$cstNode) {
        return getDocument(astNode)?.uri?.toString();

    } else if (astNode.$textRegion) {
        return astNode.$textRegion.documentURI
            || new TreeStreamImpl(astNode, n => n.$container ? [ n.$container ] : []).find( n => n.$textRegion?.documentURI )?.$textRegion?.documentURI;

    } else {
        return undefined;
    }
}

function copyDocumentSegment(region: SourceRegionPartial, fileURI?: string): DocumentSegmentWithFileURI {
    const result = <DocumentSegmentWithFileURI>{
        offset: region.offset,
        end:    region.end ?? region.offset + region.length!,
        length: region.length ?? region.end! - region.offset,
    };

    if (region.range) {
        result.range = region.range;
    }

    fileURI ??= region.fileURI;
    if (fileURI) {
        result.fileURI = fileURI;
    }

    return result;
}

function mergeDocumentSegment(prev: SourceRegionPartial | undefined, curr: SourceRegionPartial): DocumentSegmentWithFileURI {
    if (!prev) {
        return curr && copyDocumentSegment(curr);
    } else if (!curr) {
        return prev && copyDocumentSegment(prev);
    }

    const prevEnd = prev.end ?? prev.offset + prev.length!;
    const currEnd = curr.end ?? curr.offset + curr.length!;
    const offset = Math.min(prev.offset, curr.offset);
    const end = Math.max(prevEnd, currEnd);
    const length = end - offset;

    const result = <DocumentSegmentWithFileURI>{
        offset, end, length,
    };

    if (prev.range && curr.range) {
        result.range = <Range>{
            start: curr.range.start.line < prev.range.start.line
                    || curr.range.start.line === prev.range.start.line && curr.range.start.character < prev.range.start.character
                ? curr.range.start : prev.range.start,
            end: curr.range.end.line > prev.range.end.line
                    || curr.range.end.line === prev.range.end.line && curr.range.end.character > prev.range.end.character
                ? curr.range.end : prev.range.end
        };
    }

    if (prev.fileURI || curr.fileURI) {
        const prevURI = prev.fileURI;
        const currURI = curr.fileURI;
        const fileURI = prevURI && currURI && prevURI !== currURI ? `<unmergable text regions of ${prevURI}, ${currURI}>` : prevURI ?? currURI;
        result.fileURI = fileURI;
    }
    return result;
}
