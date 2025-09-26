/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { SymbolKind } from 'vscode-languageserver';
import { findDeclarationNodeAtOffset } from '../utils/cst-utils.js';
import { URI } from '../utils/uri-utils.js';
export class AbstractTypeHierarchyProvider {
    constructor(services) {
        this.grammarConfig = services.parser.GrammarConfig;
        this.nameProvider = services.references.NameProvider;
        this.documents = services.shared.workspace.LangiumDocuments;
        this.references = services.references.References;
    }
    prepareTypeHierarchy(document, params, _cancelToken) {
        const rootNode = document.parseResult.value;
        const targetNode = findDeclarationNodeAtOffset(rootNode.$cstNode, document.textDocument.offsetAt(params.position), this.grammarConfig.nameRegexp);
        if (!targetNode) {
            return undefined;
        }
        const declarationNode = this.references.findDeclarationNode(targetNode);
        if (!declarationNode) {
            return undefined;
        }
        return this.getTypeHierarchyItems(declarationNode.astNode, document);
    }
    getTypeHierarchyItems(targetNode, document) {
        const nameNode = this.nameProvider.getNameNode(targetNode);
        const name = this.nameProvider.getName(targetNode);
        if (!nameNode || !targetNode.$cstNode || name === undefined) {
            return undefined;
        }
        return [
            Object.assign({ kind: SymbolKind.Class, name, range: targetNode.$cstNode.range, selectionRange: nameNode.range, uri: document.uri.toString() }, this.getTypeHierarchyItem(targetNode)),
        ];
    }
    /**
     * Override this method to change default properties of the type hierarchy item or add additional ones like `tags`
     * or `details`.
     *
     * @example
     * // Change the node kind to SymbolKind.Interface
     * return { kind: SymbolKind.Interface }
     *
     * @see NodeKindProvider
     */
    getTypeHierarchyItem(_targetNode) {
        return undefined;
    }
    async supertypes(params, _cancelToken) {
        const document = await this.documents.getOrCreateDocument(URI.parse(params.item.uri));
        const rootNode = document.parseResult.value;
        const targetNode = findDeclarationNodeAtOffset(rootNode.$cstNode, document.textDocument.offsetAt(params.item.range.start), this.grammarConfig.nameRegexp);
        if (!targetNode) {
            return undefined;
        }
        return this.getSupertypes(targetNode.astNode);
    }
    async subtypes(params, _cancelToken) {
        const document = await this.documents.getOrCreateDocument(URI.parse(params.item.uri));
        const rootNode = document.parseResult.value;
        const targetNode = findDeclarationNodeAtOffset(rootNode.$cstNode, document.textDocument.offsetAt(params.item.range.start), this.grammarConfig.nameRegexp);
        if (!targetNode) {
            return undefined;
        }
        return this.getSubtypes(targetNode.astNode);
    }
}
//# sourceMappingURL=type-hierarchy-provider.js.map