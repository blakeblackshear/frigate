/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { AstNode } from '../../syntax-tree.js';
import type { TypeHierarchyItem } from 'vscode-languageserver';
import { AbstractTypeHierarchyProvider } from '../../lsp/type-hierarchy-provider.js';
import { getDocument } from '../../utils/ast-utils.js';
import { findLeafNodeAtOffset } from '../../utils/cst-utils.js';
import { isInterface } from '../../languages/generated/ast.js';

export class LangiumGrammarTypeHierarchyProvider extends AbstractTypeHierarchyProvider {
    protected getSupertypes(node: AstNode): TypeHierarchyItem[] | undefined {
        if (!isInterface(node)) {
            return undefined;
        }

        const items = node.superTypes.flatMap(superType => {
            const ref = superType.ref;
            if (!ref) {
                return [];
            }

            return this.getTypeHierarchyItems(ref, getDocument(ref)) ?? [];
        });

        return items.length === 0 ? undefined : items;
    }

    protected getSubtypes(node: AstNode): TypeHierarchyItem[] | undefined {
        if (!isInterface(node)) {
            return undefined;
        }

        const items = this.references
            .findReferences(node, {includeDeclaration: false})
            .flatMap(ref => {
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

                return this.getTypeHierarchyItems(refNode, document) ?? [];
            })
            .toArray();

        return items.length === 0 ? undefined : items;
    }
}
