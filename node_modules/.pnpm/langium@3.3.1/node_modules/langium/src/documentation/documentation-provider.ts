/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { LangiumCoreServices } from '../services.js';
import type { AstNode, AstNodeDescription } from '../syntax-tree.js';
import type { IndexManager } from '../workspace/index-manager.js';
import type { CommentProvider } from './comment-provider.js';
import type { JSDocTag } from './jsdoc.js';
import { getDocument } from '../utils/ast-utils.js';
import { isJSDoc, parseJSDoc } from './jsdoc.js';

/**
 * Provides documentation for AST nodes.
 */
export interface DocumentationProvider {
    /**
     * Returns a markdown documentation string for the specified AST node.
     *
     * The default implementation `JSDocDocumentationProvider` will inspect the comment associated with the specified node.
     */
    getDocumentation(node: AstNode): string | undefined;
}

export class JSDocDocumentationProvider implements DocumentationProvider {

    protected readonly indexManager: IndexManager;
    protected readonly commentProvider: CommentProvider;

    constructor(services: LangiumCoreServices) {
        this.indexManager = services.shared.workspace.IndexManager;
        this.commentProvider = services.documentation.CommentProvider;
    }

    getDocumentation(node: AstNode): string | undefined {
        const comment = this.commentProvider.getComment(node);
        if (comment && isJSDoc(comment)) {
            const parsedJSDoc = parseJSDoc(comment);
            return parsedJSDoc.toMarkdown({
                renderLink: (link, display) => {
                    return this.documentationLinkRenderer(node, link, display);
                },
                renderTag: (tag) => {
                    return this.documentationTagRenderer(node, tag);
                }
            });
        }
        return undefined;
    }

    protected documentationLinkRenderer(node: AstNode, name: string, display: string): string | undefined {
        const description = this.findNameInPrecomputedScopes(node, name) ?? this.findNameInGlobalScope(node, name);
        if (description && description.nameSegment) {
            const line = description.nameSegment.range.start.line + 1;
            const character = description.nameSegment.range.start.character + 1;
            const uri = description.documentUri.with({ fragment: `L${line},${character}` });
            return `[${display}](${uri.toString()})`;
        } else {
            return undefined;
        }
    }

    protected documentationTagRenderer(_node: AstNode, _tag: JSDocTag): string | undefined {
        // Fall back to the default tag rendering
        return undefined;
    }

    protected findNameInPrecomputedScopes(node: AstNode, name: string): AstNodeDescription | undefined {
        const document = getDocument(node);
        const precomputed = document.precomputedScopes;
        if (!precomputed) {
            return undefined;
        }
        let currentNode: AstNode | undefined = node;
        do {
            const allDescriptions = precomputed.get(currentNode);
            const description = allDescriptions.find(e => e.name === name);
            if (description) {
                return description;
            }
            currentNode = currentNode.$container;
        } while (currentNode);

        return undefined;
    }

    protected findNameInGlobalScope(node: AstNode, name: string): AstNodeDescription | undefined {
        const description = this.indexManager.allElements().find(e => e.name === name);
        return description;
    }
}
