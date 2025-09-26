/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { getDocument } from '../utils/ast-utils.js';
import { isJSDoc, parseJSDoc } from './jsdoc.js';
export class JSDocDocumentationProvider {
    constructor(services) {
        this.indexManager = services.shared.workspace.IndexManager;
        this.commentProvider = services.documentation.CommentProvider;
    }
    getDocumentation(node) {
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
    documentationLinkRenderer(node, name, display) {
        var _a;
        const description = (_a = this.findNameInPrecomputedScopes(node, name)) !== null && _a !== void 0 ? _a : this.findNameInGlobalScope(node, name);
        if (description && description.nameSegment) {
            const line = description.nameSegment.range.start.line + 1;
            const character = description.nameSegment.range.start.character + 1;
            const uri = description.documentUri.with({ fragment: `L${line},${character}` });
            return `[${display}](${uri.toString()})`;
        }
        else {
            return undefined;
        }
    }
    documentationTagRenderer(_node, _tag) {
        // Fall back to the default tag rendering
        return undefined;
    }
    findNameInPrecomputedScopes(node, name) {
        const document = getDocument(node);
        const precomputed = document.precomputedScopes;
        if (!precomputed) {
            return undefined;
        }
        let currentNode = node;
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
    findNameInGlobalScope(node, name) {
        const description = this.indexManager.allElements().find(e => e.name === name);
        return description;
    }
}
//# sourceMappingURL=documentation-provider.js.map