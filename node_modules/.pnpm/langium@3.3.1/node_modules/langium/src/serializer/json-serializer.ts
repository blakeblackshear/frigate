/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { URI } from 'vscode-uri';
import type { CommentProvider } from '../documentation/comment-provider.js';
import type { NameProvider } from '../references/name-provider.js';
import type { LangiumCoreServices } from '../services.js';
import type { AstNode, CstNode, GenericAstNode, Mutable, Reference } from '../syntax-tree.js';
import { isAstNode, isReference } from '../syntax-tree.js';
import { getDocument } from '../utils/ast-utils.js';
import { findNodesForProperty } from '../utils/grammar-utils.js';
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
    replacer?: (key: string, value: unknown, defaultReplacer: (key: string, value: unknown) => unknown) => unknown
    /** Used to convert and serialize URIs when the target of a cross-reference is in a different document. */
    uriConverter?: (uri: URI, reference: Reference) => string
}

export interface JsonDeserializeOptions {
    /** Used to parse and convert URIs when the target of a cross-reference is in a different document. */
    uriConverter?: (uri: string) => URI
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

export function isAstNodeWithComment(node: AstNode): node is AstNodeWithComment {
    return typeof (node as AstNodeWithComment).$comment === 'string';
}

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
    $ref?: string
    /** The actual text used to look up the reference target in the surrounding scope. */
    $refText?: string
    /** If any problem occurred while resolving the reference, it is described by this property. */
    $error?: string
}

function isIntermediateReference(obj: unknown): obj is IntermediateReference {
    return typeof obj === 'object' && !!obj && ('$ref' in obj || '$error' in obj);
}

export class DefaultJsonSerializer implements JsonSerializer {

    /** The set of AstNode properties to be ignored by the serializer. */
    ignoreProperties = new Set(['$container', '$containerProperty', '$containerIndex', '$document', '$cstNode']);

    /** The document that is currently processed by the serializer; this is used by the replacer function.  */
    protected currentDocument: LangiumDocument | undefined;

    protected readonly langiumDocuments: LangiumDocuments;
    protected readonly astNodeLocator: AstNodeLocator;
    protected readonly nameProvider: NameProvider;
    protected readonly commentProvider: CommentProvider;

    constructor(services: LangiumCoreServices) {
        this.langiumDocuments = services.shared.workspace.LangiumDocuments;
        this.astNodeLocator = services.workspace.AstNodeLocator;
        this.nameProvider = services.references.NameProvider;
        this.commentProvider = services.documentation.CommentProvider;
    }

    serialize(node: AstNode, options?: JsonSerializeOptions): string {
        const serializeOptions = options ?? {};
        const specificReplacer = options?.replacer;
        const defaultReplacer = (key: string, value: unknown) => this.replacer(key, value, serializeOptions);
        const replacer = specificReplacer ? (key: string, value: unknown) => specificReplacer(key, value, defaultReplacer) : defaultReplacer;

        try {
            this.currentDocument = getDocument(node);
            return JSON.stringify(node, replacer, options?.space);
        } finally {
            this.currentDocument = undefined;
        }
    }

    deserialize<T extends AstNode = AstNode>(content: string, options?: JsonDeserializeOptions): T {
        const deserializeOptions = options ?? {};
        const root = JSON.parse(content);
        this.linkNode(root, root, deserializeOptions);
        return root;
    }

    protected replacer(key: string, value: unknown, { refText, sourceText, textRegions, comments, uriConverter }: JsonSerializeOptions): unknown {
        if (this.ignoreProperties.has(key)) {
            return undefined;
        } else if (isReference(value)) {
            const refValue = value.ref;
            const $refText = refText ? value.$refText : undefined;
            if (refValue) {
                const targetDocument = getDocument(refValue);
                let targetUri = '';
                if (this.currentDocument && this.currentDocument !== targetDocument) {
                    if (uriConverter) {
                        targetUri = uriConverter(targetDocument.uri, value);
                    } else {
                        targetUri = targetDocument.uri.toString();
                    }
                }
                const targetPath = this.astNodeLocator.getAstNodePath(refValue);
                return {
                    $ref: `${targetUri}#${targetPath}`,
                    $refText
                } satisfies IntermediateReference;
            } else {
                return {
                    $error: value.error?.message ?? 'Could not resolve reference',
                    $refText
                } satisfies IntermediateReference;
            }
        } else if (isAstNode(value)) {
            let astNode: AstNodeWithTextRegion | undefined = undefined;
            if (textRegions) {
                astNode = this.addAstNodeRegionWithAssignmentsTo({ ...value });
                if ((!key || value.$document) && astNode?.$textRegion) {
                    // The document URI is added to the root node of the resulting JSON tree
                    astNode.$textRegion.documentURI = this.currentDocument?.uri.toString();
                }
            }
            if (sourceText && !key) {
                astNode ??= { ...value };
                astNode.$sourceText = value.$cstNode?.text;
            }
            if (comments) {
                astNode ??= { ...value };
                const comment = this.commentProvider.getComment(value);
                if (comment) {
                    (astNode as AstNodeWithComment).$comment = comment.replace(/\r/g, '');
                }
            }
            return astNode ?? value;
        } else {
            return value;
        }
    }

    protected addAstNodeRegionWithAssignmentsTo(node: AstNodeWithTextRegion) {
        const createDocumentSegment: (cstNode: CstNode) => AstNodeRegionWithAssignments = cstNode => <DocumentSegment>{
            offset: cstNode.offset,
            end: cstNode.end,
            length: cstNode.length,
            range: cstNode.range,
        };

        if (node.$cstNode) {
            const textRegion = node.$textRegion = createDocumentSegment(node.$cstNode);
            const assignments: Record<string, DocumentSegment[]> = textRegion.assignments = {};

            Object.keys(node).filter(key => !key.startsWith('$')).forEach(key => {
                const propertyAssignments = findNodesForProperty(node.$cstNode, key).map(createDocumentSegment);
                if (propertyAssignments.length !== 0) {
                    assignments[key] = propertyAssignments;
                }
            });

            return node;
        }
        return undefined;
    }

    protected linkNode(node: GenericAstNode, root: AstNode, options: JsonDeserializeOptions, container?: AstNode, containerProperty?: string, containerIndex?: number) {
        for (const [propertyName, item] of Object.entries(node)) {
            if (Array.isArray(item)) {
                for (let index = 0; index < item.length; index++) {
                    const element = item[index];
                    if (isIntermediateReference(element)) {
                        item[index] = this.reviveReference(node, propertyName, root, element, options);
                    } else if (isAstNode(element)) {
                        this.linkNode(element as GenericAstNode, root, options, node, propertyName, index);
                    }
                }
            } else if (isIntermediateReference(item)) {
                node[propertyName] = this.reviveReference(node, propertyName, root, item, options);
            } else if (isAstNode(item)) {
                this.linkNode(item as GenericAstNode, root, options, node, propertyName);
            }
        }
        const mutable = node as Mutable<AstNode>;
        mutable.$container = container;
        mutable.$containerProperty = containerProperty;
        mutable.$containerIndex = containerIndex;
    }

    protected reviveReference(container: AstNode, property: string, root: AstNode, reference: IntermediateReference, options: JsonDeserializeOptions): Reference | undefined {
        let refText = reference.$refText;
        let error = reference.$error;
        if (reference.$ref) {
            const ref = this.getRefNode(root, reference.$ref, options.uriConverter);
            if (isAstNode(ref)) {
                if (!refText) {
                    refText = this.nameProvider.getName(ref);
                }
                return {
                    $refText: refText ?? '',
                    ref
                };
            } else {
                error = ref;
            }
        }
        if (error) {
            const ref: Mutable<Reference> = {
                $refText: refText ?? ''
            };
            ref.error = {
                container,
                property,
                message: error,
                reference: ref
            };
            return ref;
        } else {
            return undefined;
        }
    }

    protected getRefNode(root: AstNode, uri: string, uriConverter?: (uri: string) => URI): AstNode | string {
        try {
            const fragmentIndex = uri.indexOf('#');
            if (fragmentIndex === 0) {
                const node = this.astNodeLocator.getAstNode(root, uri.substring(1));
                if (!node) {
                    return 'Could not resolve path: ' + uri;
                }
                return node;
            }
            if (fragmentIndex < 0) {
                const documentUri = uriConverter ? uriConverter(uri) : URI.parse(uri);
                const document = this.langiumDocuments.getDocument(documentUri);
                if (!document) {
                    return 'Could not find document for URI: ' + uri;
                }
                return document.parseResult.value;
            }
            const documentUri = uriConverter ? uriConverter(uri.substring(0, fragmentIndex)) : URI.parse(uri.substring(0, fragmentIndex));
            const document = this.langiumDocuments.getDocument(documentUri);
            if (!document) {
                return 'Could not find document for URI: ' + uri;
            }
            if (fragmentIndex === uri.length - 1) {
                return document.parseResult.value;
            }
            const node = this.astNodeLocator.getAstNode(document.parseResult.value, uri.substring(fragmentIndex + 1));
            if (!node) {
                return 'Could not resolve URI: ' + uri;
            }
            return node;
        } catch (err) {
            return String(err);
        }
    }

}
