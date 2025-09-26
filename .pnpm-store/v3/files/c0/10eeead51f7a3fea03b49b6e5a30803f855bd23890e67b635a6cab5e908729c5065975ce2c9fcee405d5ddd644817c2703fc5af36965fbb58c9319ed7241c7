/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { URI } from 'vscode-uri';
import type { CommentProvider } from '../documentation/comment-provider.js';
import type { NameProvider } from '../references/name-provider.js';
import type { LangiumCoreServices } from '../services.js';
import type { AstNode, GenericAstNode, Reference } from '../syntax-tree.js';
import type { AstNodeLocator } from '../workspace/ast-node-locator.js';
import type { DocumentSegment, LangiumDocument, LangiumDocuments } from '../workspace/documents.js';
export interface JsonSerializeOptions {
    /** The space parameter for `JSON.stringify`, controlling whether and how to pretty-print the output. */
    space?: string | number;
    /** Whether to include the `$refText` property for references (the name used to identify the target node). */
    refText?: boolean;
    /** Whether to include the `$sourceText` property, which holds the full source text from which an AST node was parsed. */
    sourceText?: boolean;
    /** Whether to include the `$textRegion` property, which holds information to trace AST node properties to their respective source text regions. */
    textRegions?: boolean;
    /** Whether to include the `$comment` property, which holds comments according to the CommentProvider service. */
    comments?: boolean;
    /** The replacer parameter for `JSON.stringify`; the default replacer given as parameter should be used to apply basic replacements. */
    replacer?: (key: string, value: unknown, defaultReplacer: (key: string, value: unknown) => unknown) => unknown;
    /** Used to convert and serialize URIs when the target of a cross-reference is in a different document. */
    uriConverter?: (uri: URI, reference: Reference) => string;
}
export interface JsonDeserializeOptions {
    /** Used to parse and convert URIs when the target of a cross-reference is in a different document. */
    uriConverter?: (uri: string) => URI;
}
/**
 * {@link AstNode}s that may carry information on their definition area within the DSL text.
 */
export interface AstNodeWithTextRegion extends AstNode {
    $sourceText?: string;
    $textRegion?: AstNodeRegionWithAssignments;
}
/**
 * {@link AstNode}s that may carry a semantically relevant comment.
 */
export interface AstNodeWithComment extends AstNode {
    $comment?: string;
}
export declare function isAstNodeWithComment(node: AstNode): node is AstNodeWithComment;
/**
 * A {@link DocumentSegment} representing the definition area of an AstNode within the DSL text.
 * Usually contains text region information on all assigned property values of the AstNode,
 * and may contain the defining file's URI as string.
 */
export interface AstNodeRegionWithAssignments extends DocumentSegment {
    /**
     * A record containing an entry for each assigned property of the AstNode.
     * The key is equal to the property name and the value is an array of the property values'
     * text regions, regardless of whether the property is a single value or list property.
     */
    assignments?: Record<string, DocumentSegment[]>;
    /**
     * The AstNode defining file's URI as string
     */
    documentURI?: string;
}
/**
 * Utility service for transforming an `AstNode` into a JSON string and vice versa.
 */
export interface JsonSerializer {
    /**
     * Serialize an `AstNode` into a JSON `string`.
     * @param node The `AstNode` to be serialized.
     * @param options Serialization options
     */
    serialize(node: AstNode, options?: JsonSerializeOptions): string;
    /**
     * Deserialize (parse) a JSON `string` into an `AstNode`.
     */
    deserialize<T extends AstNode = AstNode>(content: string, options?: JsonDeserializeOptions): T;
}
/**
 * A cross-reference in the serialized JSON representation of an AstNode.
 */
interface IntermediateReference {
    /** URI pointing to the target element. This is either `#${path}` if the target is in the same document, or `${documentURI}#${path}` otherwise. */
    $ref?: string;
    /** The actual text used to look up the reference target in the surrounding scope. */
    $refText?: string;
    /** If any problem occurred while resolving the reference, it is described by this property. */
    $error?: string;
}
export declare class DefaultJsonSerializer implements JsonSerializer {
    /** The set of AstNode properties to be ignored by the serializer. */
    ignoreProperties: Set<string>;
    /** The document that is currently processed by the serializer; this is used by the replacer function.  */
    protected currentDocument: LangiumDocument | undefined;
    protected readonly langiumDocuments: LangiumDocuments;
    protected readonly astNodeLocator: AstNodeLocator;
    protected readonly nameProvider: NameProvider;
    protected readonly commentProvider: CommentProvider;
    constructor(services: LangiumCoreServices);
    serialize(node: AstNode, options?: JsonSerializeOptions): string;
    deserialize<T extends AstNode = AstNode>(content: string, options?: JsonDeserializeOptions): T;
    protected replacer(key: string, value: unknown, { refText, sourceText, textRegions, comments, uriConverter }: JsonSerializeOptions): unknown;
    protected addAstNodeRegionWithAssignmentsTo(node: AstNodeWithTextRegion): AstNodeWithTextRegion | undefined;
    protected linkNode(node: GenericAstNode, root: AstNode, options: JsonDeserializeOptions, container?: AstNode, containerProperty?: string, containerIndex?: number): void;
    protected reviveReference(container: AstNode, property: string, root: AstNode, reference: IntermediateReference, options: JsonDeserializeOptions): Reference | undefined;
    protected getRefNode(root: AstNode, uri: string, uriConverter?: (uri: string) => URI): AstNode | string;
}
export {};
//# sourceMappingURL=json-serializer.d.ts.map