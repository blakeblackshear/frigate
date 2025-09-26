/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { SymbolKind } from 'vscode-languageserver';
import { findDeclarationNodeAtOffset } from '../utils/cst-utils.js';
import { URI } from '../utils/uri-utils.js';
export class AbstractCallHierarchyProvider {
    constructor(services) {
        this.grammarConfig = services.parser.GrammarConfig;
        this.nameProvider = services.references.NameProvider;
        this.documents = services.shared.workspace.LangiumDocuments;
        this.references = services.references.References;
    }
    prepareCallHierarchy(document, params) {
        const rootNode = document.parseResult.value;
        const targetNode = findDeclarationNodeAtOffset(rootNode.$cstNode, document.textDocument.offsetAt(params.position), this.grammarConfig.nameRegexp);
        if (!targetNode) {
            return undefined;
        }
        const declarationNode = this.references.findDeclarationNode(targetNode);
        if (!declarationNode) {
            return undefined;
        }
        return this.getCallHierarchyItems(declarationNode.astNode, document);
    }
    getCallHierarchyItems(targetNode, document) {
        const nameNode = this.nameProvider.getNameNode(targetNode);
        const name = this.nameProvider.getName(targetNode);
        if (!nameNode || !targetNode.$cstNode || name === undefined) {
            return undefined;
        }
        return [Object.assign({ kind: SymbolKind.Method, name, range: targetNode.$cstNode.range, selectionRange: nameNode.range, uri: document.uri.toString() }, this.getCallHierarchyItem(targetNode))];
    }
    getCallHierarchyItem(_targetNode) {
        return undefined;
    }
    async incomingCalls(params) {
        const document = await this.documents.getOrCreateDocument(URI.parse(params.item.uri));
        const rootNode = document.parseResult.value;
        const targetNode = findDeclarationNodeAtOffset(rootNode.$cstNode, document.textDocument.offsetAt(params.item.range.start), this.grammarConfig.nameRegexp);
        if (!targetNode) {
            return undefined;
        }
        const references = this.references.findReferences(targetNode.astNode, {
            includeDeclaration: false
        });
        return this.getIncomingCalls(targetNode.astNode, references);
    }
    async outgoingCalls(params) {
        const document = await this.documents.getOrCreateDocument(URI.parse(params.item.uri));
        const rootNode = document.parseResult.value;
        const targetNode = findDeclarationNodeAtOffset(rootNode.$cstNode, document.textDocument.offsetAt(params.item.range.start), this.grammarConfig.nameRegexp);
        if (!targetNode) {
            return undefined;
        }
        return this.getOutgoingCalls(targetNode.astNode);
    }
}
//# sourceMappingURL=call-hierarchy-provider.js.map