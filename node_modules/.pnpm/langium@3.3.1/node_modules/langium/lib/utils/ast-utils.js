/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { isAstNode, isReference } from '../syntax-tree.js';
import { DONE_RESULT, stream, StreamImpl, TreeStreamImpl } from './stream.js';
import { inRange } from './cst-utils.js';
/**
 * Link the `$container` and other related properties of every AST node that is directly contained
 * in the given `node`.
 */
export function linkContentToContainer(node) {
    for (const [name, value] of Object.entries(node)) {
        if (!name.startsWith('$')) {
            if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    if (isAstNode(item)) {
                        item.$container = node;
                        item.$containerProperty = name;
                        item.$containerIndex = index;
                    }
                });
            }
            else if (isAstNode(value)) {
                value.$container = node;
                value.$containerProperty = name;
            }
        }
    }
}
/**
 * Walk along the hierarchy of containers from the given AST node to the root and return the first
 * node that matches the type predicate. If the start node itself matches, it is returned.
 * If no container matches, `undefined` is returned.
 */
export function getContainerOfType(node, typePredicate) {
    let item = node;
    while (item) {
        if (typePredicate(item)) {
            return item;
        }
        item = item.$container;
    }
    return undefined;
}
/**
 * Walk along the hierarchy of containers from the given AST node to the root and check for existence
 * of a container that matches the given predicate. The start node is included in the checks.
 */
export function hasContainerOfType(node, predicate) {
    let item = node;
    while (item) {
        if (predicate(item)) {
            return true;
        }
        item = item.$container;
    }
    return false;
}
/**
 * Retrieve the document in which the given AST node is contained. A reference to the document is
 * usually held by the root node of the AST.
 *
 * @throws an error if the node is not contained in a document.
 */
export function getDocument(node) {
    const rootNode = findRootNode(node);
    const result = rootNode.$document;
    if (!result) {
        throw new Error('AST node has no document.');
    }
    return result;
}
/**
 * Returns the root node of the given AST node by following the `$container` references.
 */
export function findRootNode(node) {
    while (node.$container) {
        node = node.$container;
    }
    return node;
}
/**
 * Create a stream of all AST nodes that are directly contained in the given node. This includes
 * single-valued as well as multi-valued (array) properties.
 */
export function streamContents(node, options) {
    if (!node) {
        throw new Error('Node must be an AstNode.');
    }
    const range = options === null || options === void 0 ? void 0 : options.range;
    return new StreamImpl(() => ({
        keys: Object.keys(node),
        keyIndex: 0,
        arrayIndex: 0
    }), state => {
        while (state.keyIndex < state.keys.length) {
            const property = state.keys[state.keyIndex];
            if (!property.startsWith('$')) {
                const value = node[property];
                if (isAstNode(value)) {
                    state.keyIndex++;
                    if (isAstNodeInRange(value, range)) {
                        return { done: false, value };
                    }
                }
                else if (Array.isArray(value)) {
                    while (state.arrayIndex < value.length) {
                        const index = state.arrayIndex++;
                        const element = value[index];
                        if (isAstNode(element) && isAstNodeInRange(element, range)) {
                            return { done: false, value: element };
                        }
                    }
                    state.arrayIndex = 0;
                }
            }
            state.keyIndex++;
        }
        return DONE_RESULT;
    });
}
/**
 * Create a stream of all AST nodes that are directly and indirectly contained in the given root node.
 * This does not include the root node itself.
 */
export function streamAllContents(root, options) {
    if (!root) {
        throw new Error('Root node must be an AstNode.');
    }
    return new TreeStreamImpl(root, node => streamContents(node, options));
}
/**
 * Create a stream of all AST nodes that are directly and indirectly contained in the given root node,
 * including the root node itself.
 */
export function streamAst(root, options) {
    if (!root) {
        throw new Error('Root node must be an AstNode.');
    }
    else if ((options === null || options === void 0 ? void 0 : options.range) && !isAstNodeInRange(root, options.range)) {
        // Return an empty stream if the root node isn't in range
        return new TreeStreamImpl(root, () => []);
    }
    return new TreeStreamImpl(root, node => streamContents(node, options), { includeRoot: true });
}
function isAstNodeInRange(astNode, range) {
    var _a;
    if (!range) {
        return true;
    }
    const nodeRange = (_a = astNode.$cstNode) === null || _a === void 0 ? void 0 : _a.range;
    if (!nodeRange) {
        return false;
    }
    return inRange(nodeRange, range);
}
/**
 * Create a stream of all cross-references that are held by the given AST node. This includes
 * single-valued as well as multi-valued (array) properties.
 */
export function streamReferences(node) {
    return new StreamImpl(() => ({
        keys: Object.keys(node),
        keyIndex: 0,
        arrayIndex: 0
    }), state => {
        while (state.keyIndex < state.keys.length) {
            const property = state.keys[state.keyIndex];
            if (!property.startsWith('$')) {
                const value = node[property];
                if (isReference(value)) {
                    state.keyIndex++;
                    return { done: false, value: { reference: value, container: node, property } };
                }
                else if (Array.isArray(value)) {
                    while (state.arrayIndex < value.length) {
                        const index = state.arrayIndex++;
                        const element = value[index];
                        if (isReference(element)) {
                            return { done: false, value: { reference: element, container: node, property, index } };
                        }
                    }
                    state.arrayIndex = 0;
                }
            }
            state.keyIndex++;
        }
        return DONE_RESULT;
    });
}
/**
 * Returns a Stream of references to the target node from the AstNode tree
 *
 * @param targetNode AstNode we are looking for
 * @param lookup AstNode where we search for references. If not provided, the root node of the document is used as the default value
 */
export function findLocalReferences(targetNode, lookup = getDocument(targetNode).parseResult.value) {
    const refs = [];
    streamAst(lookup).forEach(node => {
        streamReferences(node).forEach(refInfo => {
            if (refInfo.reference.ref === targetNode) {
                refs.push(refInfo.reference);
            }
        });
    });
    return stream(refs);
}
/**
 * Assigns all mandatory AST properties to the specified node.
 *
 * @param reflection Reflection object used to gather mandatory properties for the node.
 * @param node Specified node is modified in place and properties are directly assigned.
 */
export function assignMandatoryProperties(reflection, node) {
    const typeMetaData = reflection.getTypeMetaData(node.$type);
    const genericNode = node;
    for (const property of typeMetaData.properties) {
        // Only set the value if the property is not already set and if it has a default value
        if (property.defaultValue !== undefined && genericNode[property.name] === undefined) {
            genericNode[property.name] = copyDefaultValue(property.defaultValue);
        }
    }
}
function copyDefaultValue(propertyType) {
    if (Array.isArray(propertyType)) {
        return [...propertyType.map(copyDefaultValue)];
    }
    else {
        return propertyType;
    }
}
/**
 * Creates a deep copy of the specified AST node.
 * The resulting copy will only contain semantically relevant information, such as the `$type` property and AST properties.
 *
 * References are copied without resolved cross reference. The specified function is used to rebuild them.
 */
export function copyAstNode(node, buildReference) {
    const copy = { $type: node.$type };
    for (const [name, value] of Object.entries(node)) {
        if (!name.startsWith('$')) {
            if (isAstNode(value)) {
                copy[name] = copyAstNode(value, buildReference);
            }
            else if (isReference(value)) {
                copy[name] = buildReference(copy, name, value.$refNode, value.$refText);
            }
            else if (Array.isArray(value)) {
                const copiedArray = [];
                for (const element of value) {
                    if (isAstNode(element)) {
                        copiedArray.push(copyAstNode(element, buildReference));
                    }
                    else if (isReference(element)) {
                        copiedArray.push(buildReference(copy, name, element.$refNode, element.$refText));
                    }
                    else {
                        copiedArray.push(element);
                    }
                }
                copy[name] = copiedArray;
            }
            else {
                copy[name] = value;
            }
        }
    }
    linkContentToContainer(copy);
    return copy;
}
//# sourceMappingURL=ast-utils.js.map