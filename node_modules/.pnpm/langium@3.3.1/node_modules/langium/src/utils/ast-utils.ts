/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { Range } from 'vscode-languageserver-types';
import type { AstNode, AstReflection, CstNode, GenericAstNode, Mutable, PropertyType, Reference, ReferenceInfo } from '../syntax-tree.js';
import type { Stream, TreeStream } from './stream.js';
import type { LangiumDocument } from '../workspace/documents.js';
import { isAstNode, isReference } from '../syntax-tree.js';
import { DONE_RESULT, stream, StreamImpl, TreeStreamImpl } from './stream.js';
import { inRange } from './cst-utils.js';

/**
 * Link the `$container` and other related properties of every AST node that is directly contained
 * in the given `node`.
 */
export function linkContentToContainer(node: AstNode): void {
    for (const [name, value] of Object.entries(node)) {
        if (!name.startsWith('$')) {
            if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    if (isAstNode(item)) {
                        (item as Mutable<AstNode>).$container = node;
                        (item as Mutable<AstNode>).$containerProperty = name;
                        (item as Mutable<AstNode>).$containerIndex = index;
                    }
                });
            } else if (isAstNode(value)) {
                (value as Mutable<AstNode>).$container = node;
                (value as Mutable<AstNode>).$containerProperty = name;
            }
        }
    }
}

/**
 * Walk along the hierarchy of containers from the given AST node to the root and return the first
 * node that matches the type predicate. If the start node itself matches, it is returned.
 * If no container matches, `undefined` is returned.
 */
export function getContainerOfType<T extends AstNode>(node: AstNode | undefined, typePredicate: (n: AstNode) => n is T): T | undefined {
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
export function hasContainerOfType(node: AstNode | undefined, predicate: (n: AstNode) => boolean): boolean {
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
export function getDocument<T extends AstNode = AstNode>(node: AstNode): LangiumDocument<T> {
    const rootNode = findRootNode(node);
    const result = rootNode.$document;
    if (!result) {
        throw new Error('AST node has no document.');
    }
    return result as LangiumDocument<T>;
}

/**
 * Returns the root node of the given AST node by following the `$container` references.
 */
export function findRootNode(node: AstNode): AstNode {
    while (node.$container) {
        node = node.$container;
    }
    return node;
}

export interface AstStreamOptions {
    /**
     * Optional target range that the nodes in the stream need to intersect
     */
    range?: Range
}

/**
 * Create a stream of all AST nodes that are directly contained in the given node. This includes
 * single-valued as well as multi-valued (array) properties.
 */
export function streamContents(node: AstNode, options?: AstStreamOptions): Stream<AstNode> {
    if (!node) {
        throw new Error('Node must be an AstNode.');
    }
    const range = options?.range;
    type State = { keys: string[], keyIndex: number, arrayIndex: number };
    return new StreamImpl<State, AstNode>(() => ({
        keys: Object.keys(node),
        keyIndex: 0,
        arrayIndex: 0
    }), state => {
        while (state.keyIndex < state.keys.length) {
            const property = state.keys[state.keyIndex];
            if (!property.startsWith('$')) {
                const value = (node as GenericAstNode)[property];
                if (isAstNode(value)) {
                    state.keyIndex++;
                    if (isAstNodeInRange(value, range)) {
                        return { done: false, value };
                    }
                } else if (Array.isArray(value)) {
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
export function streamAllContents(root: AstNode, options?: AstStreamOptions): TreeStream<AstNode> {
    if (!root) {
        throw new Error('Root node must be an AstNode.');
    }
    return new TreeStreamImpl(root, node => streamContents(node, options));
}

/**
 * Create a stream of all AST nodes that are directly and indirectly contained in the given root node,
 * including the root node itself.
 */
export function streamAst(root: AstNode, options?: AstStreamOptions): TreeStream<AstNode> {
    if (!root) {
        throw new Error('Root node must be an AstNode.');
    } else if (options?.range && !isAstNodeInRange(root, options.range)) {
        // Return an empty stream if the root node isn't in range
        return new TreeStreamImpl(root, () => []);
    }
    return new TreeStreamImpl(root, node => streamContents(node, options), { includeRoot: true });
}

function isAstNodeInRange(astNode: AstNode, range?: Range): boolean {
    if (!range) {
        return true;
    }
    const nodeRange = astNode.$cstNode?.range;
    if (!nodeRange) {
        return false;
    }
    return inRange(nodeRange, range);
}

/**
 * Create a stream of all cross-references that are held by the given AST node. This includes
 * single-valued as well as multi-valued (array) properties.
 */
export function streamReferences(node: AstNode): Stream<ReferenceInfo> {
    type State = { keys: string[], keyIndex: number, arrayIndex: number };
    return new StreamImpl<State, ReferenceInfo>(() => ({
        keys: Object.keys(node),
        keyIndex: 0,
        arrayIndex: 0
    }), state => {
        while (state.keyIndex < state.keys.length) {
            const property = state.keys[state.keyIndex];
            if (!property.startsWith('$')) {
                const value = (node as GenericAstNode)[property];
                if (isReference(value)) {
                    state.keyIndex++;
                    return { done: false, value: { reference: value, container: node, property } };
                } else if (Array.isArray(value)) {
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
export function findLocalReferences(targetNode: AstNode, lookup = getDocument(targetNode).parseResult.value): Stream<Reference> {
    const refs: Reference[] = [];
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
export function assignMandatoryProperties(reflection: AstReflection, node: AstNode): void {
    const typeMetaData = reflection.getTypeMetaData(node.$type);
    const genericNode = node as GenericAstNode;
    for (const property of typeMetaData.properties) {
        // Only set the value if the property is not already set and if it has a default value
        if (property.defaultValue !== undefined && genericNode[property.name] === undefined) {
            genericNode[property.name] = copyDefaultValue(property.defaultValue);
        }
    }
}

function copyDefaultValue(propertyType: PropertyType): PropertyType {
    if (Array.isArray(propertyType)) {
        return [...propertyType.map(copyDefaultValue)];
    } else {
        return propertyType;
    }
}

/**
 * Creates a deep copy of the specified AST node.
 * The resulting copy will only contain semantically relevant information, such as the `$type` property and AST properties.
 *
 * References are copied without resolved cross reference. The specified function is used to rebuild them.
 */
export function copyAstNode<T extends AstNode = AstNode>(node: T, buildReference: (node: AstNode, property: string, refNode: CstNode | undefined, refText: string) => Reference<AstNode>): T {
    const copy: GenericAstNode = { $type: node.$type };

    for (const [name, value] of Object.entries(node)) {
        if (!name.startsWith('$')) {
            if (isAstNode(value)) {
                copy[name] = copyAstNode(value, buildReference);
            } else if (isReference(value)) {
                copy[name] = buildReference(
                    copy,
                    name,
                    value.$refNode,
                    value.$refText
                );
            } else if (Array.isArray(value)) {
                const copiedArray: unknown[] = [];
                for (const element of value) {
                    if (isAstNode(element)) {
                        copiedArray.push(copyAstNode(element, buildReference));
                    } else if (isReference(element)) {
                        copiedArray.push(
                            buildReference(
                                copy,
                                name,
                                element.$refNode,
                                element.$refText
                            )
                        );
                    } else {
                        copiedArray.push(element);
                    }
                }
                copy[name] = copiedArray;
            } else {
                copy[name] = value;
            }
        }
    }

    linkContentToContainer(copy);
    return copy as unknown as T;
}
