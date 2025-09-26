/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { isCompositeCstNode, isLeafCstNode, isRootCstNode } from '../syntax-tree.js';
import { TreeStreamImpl } from './stream.js';
/**
 * Create a stream of all CST nodes that are directly and indirectly contained in the given root node,
 * including the root node itself.
 */
export function streamCst(node) {
    return new TreeStreamImpl(node, element => {
        if (isCompositeCstNode(element)) {
            return element.content;
        }
        else {
            return [];
        }
    }, { includeRoot: true });
}
/**
 * Create a stream of all leaf nodes that are directly and indirectly contained in the given root node.
 */
export function flattenCst(node) {
    return streamCst(node).filter(isLeafCstNode);
}
/**
 * Determines whether the specified cst node is a child of the specified parent node.
 */
export function isChildNode(child, parent) {
    while (child.container) {
        child = child.container;
        if (child === parent) {
            return true;
        }
    }
    return false;
}
export function tokenToRange(token) {
    // Chevrotain uses 1-based indices everywhere
    // So we subtract 1 from every value to align with the LSP
    return {
        start: {
            character: token.startColumn - 1,
            line: token.startLine - 1
        },
        end: {
            character: token.endColumn, // endColumn uses the correct index
            line: token.endLine - 1
        }
    };
}
export function toDocumentSegment(node) {
    if (!node) {
        return undefined;
    }
    const { offset, end, range } = node;
    return {
        range,
        offset,
        end,
        length: end - offset
    };
}
export var RangeComparison;
(function (RangeComparison) {
    RangeComparison[RangeComparison["Before"] = 0] = "Before";
    RangeComparison[RangeComparison["After"] = 1] = "After";
    RangeComparison[RangeComparison["OverlapFront"] = 2] = "OverlapFront";
    RangeComparison[RangeComparison["OverlapBack"] = 3] = "OverlapBack";
    RangeComparison[RangeComparison["Inside"] = 4] = "Inside";
    RangeComparison[RangeComparison["Outside"] = 5] = "Outside";
})(RangeComparison || (RangeComparison = {}));
export function compareRange(range, to) {
    if (range.end.line < to.start.line || (range.end.line === to.start.line && range.end.character <= to.start.character)) {
        return RangeComparison.Before;
    }
    else if (range.start.line > to.end.line || (range.start.line === to.end.line && range.start.character >= to.end.character)) {
        return RangeComparison.After;
    }
    const startInside = range.start.line > to.start.line || (range.start.line === to.start.line && range.start.character >= to.start.character);
    const endInside = range.end.line < to.end.line || (range.end.line === to.end.line && range.end.character <= to.end.character);
    if (startInside && endInside) {
        return RangeComparison.Inside;
    }
    else if (startInside) {
        return RangeComparison.OverlapBack;
    }
    else if (endInside) {
        return RangeComparison.OverlapFront;
    }
    else {
        return RangeComparison.Outside;
    }
}
export function inRange(range, to) {
    const comparison = compareRange(range, to);
    return comparison > RangeComparison.After;
}
// The \p{L} regex matches any unicode letter character, i.e. characters from non-english alphabets
// Together with \w it matches any kind of character which can commonly appear in IDs
export const DefaultNameRegexp = /^[\w\p{L}]$/u;
/**
 * Performs `findLeafNodeAtOffset` with a minor difference: When encountering a character that matches the `nameRegexp` argument,
 * it will instead return the leaf node at the `offset - 1` position.
 *
 * For LSP services, users expect that the declaration of an element is available if the cursor is directly after the element.
 */
export function findDeclarationNodeAtOffset(cstNode, offset, nameRegexp = DefaultNameRegexp) {
    if (cstNode) {
        if (offset > 0) {
            const localOffset = offset - cstNode.offset;
            const textAtOffset = cstNode.text.charAt(localOffset);
            if (!nameRegexp.test(textAtOffset)) {
                offset--;
            }
        }
        return findLeafNodeAtOffset(cstNode, offset);
    }
    return undefined;
}
export function findCommentNode(cstNode, commentNames) {
    if (cstNode) {
        const previous = getPreviousNode(cstNode, true);
        if (previous && isCommentNode(previous, commentNames)) {
            return previous;
        }
        if (isRootCstNode(cstNode)) {
            // Go from the first non-hidden node through all nodes in reverse order
            // We do this to find the comment node which directly precedes the root node
            const endIndex = cstNode.content.findIndex(e => !e.hidden);
            for (let i = endIndex - 1; i >= 0; i--) {
                const child = cstNode.content[i];
                if (isCommentNode(child, commentNames)) {
                    return child;
                }
            }
        }
    }
    return undefined;
}
export function isCommentNode(cstNode, commentNames) {
    return isLeafCstNode(cstNode) && commentNames.includes(cstNode.tokenType.name);
}
/**
 * Finds the leaf CST node at the specified 0-based string offset.
 * Note that the given offset will be within the range of the returned leaf node.
 *
 * If the offset does not point to a CST node (but just white space), this method will return `undefined`.
 *
 * @param node The CST node to search through.
 * @param offset The specified offset.
 * @returns The CST node at the specified offset.
 */
export function findLeafNodeAtOffset(node, offset) {
    if (isLeafCstNode(node)) {
        return node;
    }
    else if (isCompositeCstNode(node)) {
        const searchResult = binarySearch(node, offset, false);
        if (searchResult) {
            return findLeafNodeAtOffset(searchResult, offset);
        }
    }
    return undefined;
}
/**
 * Finds the leaf CST node at the specified 0-based string offset.
 * If no CST node exists at the specified position, it will return the leaf node before it.
 *
 * If there is no leaf node before the specified offset, this method will return `undefined`.
 *
 * @param node The CST node to search through.
 * @param offset The specified offset.
 * @returns The CST node closest to the specified offset.
 */
export function findLeafNodeBeforeOffset(node, offset) {
    if (isLeafCstNode(node)) {
        return node;
    }
    else if (isCompositeCstNode(node)) {
        const searchResult = binarySearch(node, offset, true);
        if (searchResult) {
            return findLeafNodeBeforeOffset(searchResult, offset);
        }
    }
    return undefined;
}
function binarySearch(node, offset, closest) {
    let left = 0;
    let right = node.content.length - 1;
    let closestNode = undefined;
    while (left <= right) {
        const middle = Math.floor((left + right) / 2);
        const middleNode = node.content[middle];
        if (middleNode.offset <= offset && middleNode.end > offset) {
            // Found an exact match
            return middleNode;
        }
        if (middleNode.end <= offset) {
            // Update the closest node (less than offset) and move to the right half
            closestNode = closest ? middleNode : undefined;
            left = middle + 1;
        }
        else {
            // Move to the left half
            right = middle - 1;
        }
    }
    return closestNode;
}
export function getPreviousNode(node, hidden = true) {
    while (node.container) {
        const parent = node.container;
        let index = parent.content.indexOf(node);
        while (index > 0) {
            index--;
            const previous = parent.content[index];
            if (hidden || !previous.hidden) {
                return previous;
            }
        }
        node = parent;
    }
    return undefined;
}
export function getNextNode(node, hidden = true) {
    while (node.container) {
        const parent = node.container;
        let index = parent.content.indexOf(node);
        const last = parent.content.length - 1;
        while (index < last) {
            index++;
            const next = parent.content[index];
            if (hidden || !next.hidden) {
                return next;
            }
        }
        node = parent;
    }
    return undefined;
}
export function getStartlineNode(node) {
    if (node.range.start.character === 0) {
        return node;
    }
    const line = node.range.start.line;
    let last = node;
    let index;
    while (node.container) {
        const parent = node.container;
        const selfIndex = index !== null && index !== void 0 ? index : parent.content.indexOf(node);
        if (selfIndex === 0) {
            node = parent;
            index = undefined;
        }
        else {
            index = selfIndex - 1;
            node = parent.content[index];
        }
        if (node.range.start.line !== line) {
            break;
        }
        last = node;
    }
    return last;
}
export function getInteriorNodes(start, end) {
    const commonParent = getCommonParent(start, end);
    if (!commonParent) {
        return [];
    }
    return commonParent.parent.content.slice(commonParent.a + 1, commonParent.b);
}
function getCommonParent(a, b) {
    const aParents = getParentChain(a);
    const bParents = getParentChain(b);
    let current;
    for (let i = 0; i < aParents.length && i < bParents.length; i++) {
        const aParent = aParents[i];
        const bParent = bParents[i];
        if (aParent.parent === bParent.parent) {
            current = {
                parent: aParent.parent,
                a: aParent.index,
                b: bParent.index
            };
        }
        else {
            break;
        }
    }
    return current;
}
function getParentChain(node) {
    const chain = [];
    while (node.container) {
        const parent = node.container;
        const index = parent.content.indexOf(node);
        chain.push({
            parent,
            index
        });
        node = parent;
    }
    return chain.reverse();
}
//# sourceMappingURL=cst-utils.js.map