/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { TokenType } from 'chevrotain';
import type { URI } from './utils/uri-utils.js';
import type { AbstractElement } from './languages/generated/ast.js';
import type { DocumentSegment, LangiumDocument } from './workspace/documents.js';

/**
 * A node in the Abstract Syntax Tree (AST).
 */
export interface AstNode {
    /** Every AST node has a type corresponding to what was specified in the grammar declaration. */
    readonly $type: string;
    /** The container node in the AST; every node except the root node has a container. */
    readonly $container?: AstNode;
    /** The property of the `$container` node that contains this node. This is either a direct reference or an array. */
    readonly $containerProperty?: string;
    /** In case `$containerProperty` is an array, the array index is stored here. */
    readonly $containerIndex?: number;
    /** The Concrete Syntax Tree (CST) node of the text range from which this node was parsed. */
    readonly $cstNode?: CstNode;
    /** The document containing the AST; only the root node has a direct reference to the document. */
    readonly $document?: LangiumDocument;
}

export function isAstNode(obj: unknown): obj is AstNode {
    return typeof obj === 'object' && obj !== null && typeof (obj as AstNode).$type === 'string';
}

export interface GenericAstNode extends AstNode {
    [key: string]: unknown
}

type SpecificNodeProperties<N extends AstNode> = keyof Omit<N, keyof AstNode | number | symbol>;

/**
 * The property names of a given AST node type.
 */
export type Properties<N extends AstNode> = SpecificNodeProperties<N> extends never ? string : SpecificNodeProperties<N>

/**
 * A cross-reference in the AST. Cross-references may or may not be successfully resolved.
 */
export interface Reference<T extends AstNode = AstNode> {
    /**
     * The target AST node of this reference. Accessing this property may trigger cross-reference
     * resolution by the `Linker` in case it has not been done yet. If the reference cannot be resolved,
     * the value is `undefined`.
     */
    readonly ref?: T;

    /** If any problem occurred while resolving the reference, it is described by this property. */
    readonly error?: LinkingError;
    /** The CST node from which the reference was parsed */
    readonly $refNode?: CstNode;
    /** The actual text used to look up in the surrounding scope */
    readonly $refText: string;
    /** The node description for the AstNode returned by `ref`  */
    readonly $nodeDescription?: AstNodeDescription;
}

export function isReference(obj: unknown): obj is Reference {
    return typeof obj === 'object' && obj !== null && typeof (obj as Reference).$refText === 'string';
}

export type ResolvedReference<T extends AstNode = AstNode> = Reference<T> & {
    readonly ref: T;
}

/**
 * A description of an AST node is used when constructing scopes and looking up cross-reference targets.
 */
export interface AstNodeDescription {
    /** The target node; should be present only for local references (linking to the same document). */
    node?: AstNode;
    /**
     * The document segment that represents the range of the name of the AST node.
     */
    nameSegment?: DocumentSegment;
    /**
     * The document segment that represents the full range of the AST node.
     */
    selectionSegment?: DocumentSegment;
    /** `$type` property value of the AST node */
    type: string;
    /** Name of the AST node; this is usually determined by the `NameProvider` service. */
    name: string;
    /** URI to the document containing the AST node */
    documentUri: URI;
    /** Navigation path inside the document */
    path: string;
}

export function isAstNodeDescription(obj: unknown): obj is AstNodeDescription {
    return typeof obj === 'object' && obj !== null
        && typeof (obj as AstNodeDescription).name === 'string'
        && typeof (obj as AstNodeDescription).type === 'string'
        && typeof (obj as AstNodeDescription).path === 'string';
}

/**
 * Information about a cross-reference. This is used when traversing references in an AST or to describe
 * unresolved references.
 */
export interface ReferenceInfo {
    reference: Reference
    container: AstNode
    property: string
    index?: number
}

/**
 * Used to collect information when the `Linker` service fails to resolve a cross-reference.
 */
export interface LinkingError extends ReferenceInfo {
    message: string;
    targetDescription?: AstNodeDescription;
}

export function isLinkingError(obj: unknown): obj is LinkingError {
    return typeof obj === 'object' && obj !== null
        && isAstNode((obj as LinkingError).container)
        && isReference((obj as LinkingError).reference)
        && typeof (obj as LinkingError).message === 'string';
}

/**
 * Service used for generic access to the structure of the AST. This service is shared between
 * all involved languages, so it operates on the superset of types of these languages.
 */
export interface AstReflection {
    getAllTypes(): string[]
    getAllSubTypes(type: string): string[]
    getReferenceType(refInfo: ReferenceInfo): string
    getTypeMetaData(type: string): TypeMetaData
    isInstance(node: unknown, type: string): boolean
    isSubtype(subtype: string, supertype: string): boolean
}

/**
 * An abstract implementation of the {@link AstReflection} interface.
 * Serves to cache subtype computation results to improve performance throughout different parts of Langium.
 */
export abstract class AbstractAstReflection implements AstReflection {

    protected subtypes: Record<string, Record<string, boolean | undefined>> = {};
    protected allSubtypes: Record<string, string[] | undefined> = {};

    abstract getAllTypes(): string[];
    abstract getReferenceType(refInfo: ReferenceInfo): string;
    abstract getTypeMetaData(type: string): TypeMetaData;
    protected abstract computeIsSubtype(subtype: string, supertype: string): boolean;

    isInstance(node: unknown, type: string): boolean {
        return isAstNode(node) && this.isSubtype(node.$type, type);
    }

    isSubtype(subtype: string, supertype: string): boolean {
        if (subtype === supertype) {
            return true;
        }
        let nested = this.subtypes[subtype];
        if (!nested) {
            nested = this.subtypes[subtype] = {};
        }
        const existing = nested[supertype];
        if (existing !== undefined) {
            return existing;
        } else {
            const result = this.computeIsSubtype(subtype, supertype);
            nested[supertype] = result;
            return result;
        }
    }

    getAllSubTypes(type: string): string[] {
        const existing = this.allSubtypes[type];
        if (existing) {
            return existing;
        } else {
            const allTypes = this.getAllTypes();
            const types: string[] = [];
            for (const possibleSubType of allTypes) {
                if (this.isSubtype(possibleSubType, type)) {
                    types.push(possibleSubType);
                }
            }
            this.allSubtypes[type] = types;
            return types;
        }
    }
}

/**
 * Represents runtime meta data about a meta model type.
 */
export interface TypeMetaData {
    /** The name of this meta model type. Corresponds to the `AstNode.$type` value. */
    name: string
    /** A list of properties. They can contain default values for their respective property in the AST. */
    properties: TypeProperty[]
}

/**
 * Describes the meta data of a property of an AST node.
 *
 * The optional `defaultValue` indicates that the property is mandatory in the AST node.
 * For example, if an AST node contains an array, but no elements of this array have been parsed, we still expect an empty array instead of `undefined`.
 */
export interface TypeProperty {
    name: string
    defaultValue?: PropertyType
}

/**
 * Represents a default value for an AST property.
 */
export type PropertyType = number | string | boolean | PropertyType[];

/**
 * A node in the Concrete Syntax Tree (CST).
 */
export interface CstNode extends DocumentSegment {
    /** The container node in the CST */
    readonly container?: CompositeCstNode;
    /** @deprecated use `container` instead. */
    readonly parent?: CompositeCstNode;
    /** The actual text */
    readonly text: string;
    /** The root CST node */
    readonly root: RootCstNode;
    /** The grammar element from which this node was parsed */
    readonly grammarSource?: AbstractElement;
    /** @deprecated use `grammarSource` instead. */
    readonly feature?: AbstractElement;
    /** The AST node created from this CST node */
    readonly astNode: AstNode;
    /** @deprecated use `astNode` instead. */
    readonly element: AstNode;
    /** Whether the token is hidden, i.e. not explicitly part of the containing grammar rule */
    readonly hidden: boolean;
}

/**
 * A composite CST node contains other nodes, but no directly associated token.
 */
export interface CompositeCstNode extends CstNode {
    readonly content: CstNode[];
    /** @deprecated use `content` instead. */
    readonly children: CstNode[];
}

export function isCompositeCstNode(node: unknown): node is CompositeCstNode {
    return typeof node === 'object' && node !== null && Array.isArray((node as CompositeCstNode).content);
}

/**
 * A leaf CST node corresponds to a token in the input token stream.
 */
export interface LeafCstNode extends CstNode {
    readonly tokenType: TokenType;
}

export function isLeafCstNode(node: unknown): node is LeafCstNode {
    return typeof node === 'object' && node !== null && typeof (node as LeafCstNode).tokenType === 'object';
}

export interface RootCstNode extends CompositeCstNode {
    readonly fullText: string
}

export function isRootCstNode(node: unknown): node is RootCstNode {
    return isCompositeCstNode(node) && typeof (node as RootCstNode).fullText === 'string';
}

/**
 * Returns a type to have only properties names (!) of a type T whose property value is of a certain type K.
 */
type ExtractKeysOfValueType<T, K> = { [I in keyof T]: T[I] extends K ? I : never }[keyof T];

/**
 * Returns the property names (!) of an AstNode that are cross-references.
 * Meant to be used during cross-reference resolution in combination with `assertUnreachable(context.property)`.
 */
export type CrossReferencesOfAstNodeType<N extends AstNode> = (
    ExtractKeysOfValueType<N, Reference|undefined>
    | ExtractKeysOfValueType<N, Array<Reference|undefined>|undefined>
// eslint-disable-next-line @typescript-eslint/ban-types
) & {};

/**
 * Represents the enumeration-like type, that lists all AstNode types of your grammar.
 */
export type AstTypeList<T> = Record<keyof T, AstNode>;

/**
 * Returns all types that contain cross-references, A is meant to be the interface `XXXAstType` fromm your generated `ast.ts` file.
 * Meant to be used during cross-reference resolution in combination with `assertUnreachable(context.container)`.
 */
export type AstNodeTypesWithCrossReferences<A extends AstTypeList<A>> = {
    [T in keyof A]: CrossReferencesOfAstNodeType<A[T]> extends never ? never : A[T]
}[keyof A];

export type Mutable<T> = {
    -readonly [P in keyof T]: T[P]
};
