/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { getDocument } from '../utils/ast-utils.js';
import { findNodesForProperty } from '../utils/grammar-utils.js';
import { TreeStreamImpl } from '../utils/stream.js';
export function getSourceRegion(sourceSpec) {
    var _a, _b;
    if (!sourceSpec) {
        return undefined;
    }
    else if ('astNode' in sourceSpec) {
        return getSourceRegionOfAstNode(sourceSpec);
    }
    else if (Array.isArray(sourceSpec)) {
        return sourceSpec.reduce(mergeDocumentSegment, undefined); // apply mergeDocumentSegment for single entry sourcSpec lists, too, thus start with 'undefined' as initial value
    }
    else {
        // some special treatment of cstNodes for revealing the uri of the defining DSL text file
        //  is currently only done for single cstNode tracings, like "expandTracedToNode(source.$cstNode)`...`",
        //  is _not done_ for multi node tracings like below, see if case above
        //    joinTracedToNode( [
        //        findNodeForKeyword(source.$cstNode, '{')!,
        //        findNodeForKeyword(source.$cstNode, '}')!
        //    ] )(source.children, c => c.name)
        const sourceRegion = sourceSpec;
        const sourceFileURIviaCstNode = isCstNode(sourceRegion)
            ? getDocumentURIOrUndefined((_b = (_a = sourceRegion === null || sourceRegion === void 0 ? void 0 : sourceRegion.root) === null || _a === void 0 ? void 0 : _a.astNode) !== null && _b !== void 0 ? _b : sourceRegion === null || sourceRegion === void 0 ? void 0 : sourceRegion.astNode) : undefined;
        return copyDocumentSegment(sourceRegion, sourceFileURIviaCstNode);
    }
}
function isCstNode(segment) {
    return typeof segment !== 'undefined' && 'element' in segment && 'text' in segment;
}
function getDocumentURIOrUndefined(astNode) {
    try {
        return getDocument(astNode).uri.toString();
    }
    catch (e) {
        return undefined;
    }
}
function getSourceRegionOfAstNode(sourceSpec) {
    var _a, _b;
    const { astNode, property, index } = sourceSpec !== null && sourceSpec !== void 0 ? sourceSpec : {};
    const textRegion = (_a = astNode === null || astNode === void 0 ? void 0 : astNode.$cstNode) !== null && _a !== void 0 ? _a : astNode === null || astNode === void 0 ? void 0 : astNode.$textRegion;
    if (astNode === undefined || textRegion === undefined) {
        return undefined;
    }
    else if (property === undefined) {
        return copyDocumentSegment(textRegion, getDocumentURI(astNode));
    }
    else {
        const getSingleOrCompoundRegion = (regions) => {
            if (index !== undefined && index > -1 && Array.isArray(astNode[property])) {
                return index < regions.length ? regions[index] : undefined;
            }
            else {
                return regions.reduce(mergeDocumentSegment, undefined);
            }
        };
        if ((_b = textRegion.assignments) === null || _b === void 0 ? void 0 : _b[property]) {
            const region = getSingleOrCompoundRegion(textRegion.assignments[property]);
            return region && copyDocumentSegment(region, getDocumentURI(astNode));
        }
        else if (astNode.$cstNode) {
            const region = getSingleOrCompoundRegion(findNodesForProperty(astNode.$cstNode, property));
            return region && copyDocumentSegment(region, getDocumentURI(astNode));
        }
        else {
            return undefined;
        }
    }
}
function getDocumentURI(astNode) {
    var _a, _b, _c, _d;
    if (astNode.$cstNode) {
        return (_b = (_a = getDocument(astNode)) === null || _a === void 0 ? void 0 : _a.uri) === null || _b === void 0 ? void 0 : _b.toString();
    }
    else if (astNode.$textRegion) {
        return astNode.$textRegion.documentURI
            || ((_d = (_c = new TreeStreamImpl(astNode, n => n.$container ? [n.$container] : []).find(n => { var _a; return (_a = n.$textRegion) === null || _a === void 0 ? void 0 : _a.documentURI; })) === null || _c === void 0 ? void 0 : _c.$textRegion) === null || _d === void 0 ? void 0 : _d.documentURI);
    }
    else {
        return undefined;
    }
}
function copyDocumentSegment(region, fileURI) {
    var _a, _b;
    const result = {
        offset: region.offset,
        end: (_a = region.end) !== null && _a !== void 0 ? _a : region.offset + region.length,
        length: (_b = region.length) !== null && _b !== void 0 ? _b : region.end - region.offset,
    };
    if (region.range) {
        result.range = region.range;
    }
    fileURI !== null && fileURI !== void 0 ? fileURI : (fileURI = region.fileURI);
    if (fileURI) {
        result.fileURI = fileURI;
    }
    return result;
}
function mergeDocumentSegment(prev, curr) {
    var _a, _b;
    if (!prev) {
        return curr && copyDocumentSegment(curr);
    }
    else if (!curr) {
        return prev && copyDocumentSegment(prev);
    }
    const prevEnd = (_a = prev.end) !== null && _a !== void 0 ? _a : prev.offset + prev.length;
    const currEnd = (_b = curr.end) !== null && _b !== void 0 ? _b : curr.offset + curr.length;
    const offset = Math.min(prev.offset, curr.offset);
    const end = Math.max(prevEnd, currEnd);
    const length = end - offset;
    const result = {
        offset, end, length,
    };
    if (prev.range && curr.range) {
        result.range = {
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
        const fileURI = prevURI && currURI && prevURI !== currURI ? `<unmergable text regions of ${prevURI}, ${currURI}>` : prevURI !== null && prevURI !== void 0 ? prevURI : currURI;
        result.fileURI = fileURI;
    }
    return result;
}
//# sourceMappingURL=generator-tracing.js.map