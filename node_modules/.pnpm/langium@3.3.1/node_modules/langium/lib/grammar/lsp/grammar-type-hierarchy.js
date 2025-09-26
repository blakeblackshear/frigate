/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { AbstractTypeHierarchyProvider } from '../../lsp/type-hierarchy-provider.js';
import { getDocument } from '../../utils/ast-utils.js';
import { findLeafNodeAtOffset } from '../../utils/cst-utils.js';
import { isInterface } from '../../languages/generated/ast.js';
export class LangiumGrammarTypeHierarchyProvider extends AbstractTypeHierarchyProvider {
    getSupertypes(node) {
        if (!isInterface(node)) {
            return undefined;
        }
        const items = node.superTypes.flatMap(superType => {
            var _a;
            const ref = superType.ref;
            if (!ref) {
                return [];
            }
            return (_a = this.getTypeHierarchyItems(ref, getDocument(ref))) !== null && _a !== void 0 ? _a : [];
        });
        return items.length === 0 ? undefined : items;
    }
    getSubtypes(node) {
        if (!isInterface(node)) {
            return undefined;
        }
        const items = this.references
            .findReferences(node, { includeDeclaration: false })
            .flatMap(ref => {
            var _a;
            const document = this.documents.getDocument(ref.sourceUri);
            if (!document) {
                return [];
            }
            const rootNode = document.parseResult.value;
            if (!rootNode.$cstNode) {
                return [];
            }
            const refCstNode = findLeafNodeAtOffset(rootNode.$cstNode, ref.segment.offset);
            if (!refCstNode) {
                return [];
            }
            // Only consider references that occur as a superType of an interface
            const refNode = refCstNode.astNode;
            if (!isInterface(refNode) || refNode.superTypes.every(superType => superType.$refNode !== refCstNode)) {
                return [];
            }
            return (_a = this.getTypeHierarchyItems(refNode, document)) !== null && _a !== void 0 ? _a : [];
        })
            .toArray();
        return items.length === 0 ? undefined : items;
    }
}
//# sourceMappingURL=grammar-type-hierarchy.js.map