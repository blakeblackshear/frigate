/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { DocumentHighlight } from 'vscode-languageserver';
import { getDocument } from '../utils/ast-utils.js';
import { findDeclarationNodeAtOffset } from '../utils/cst-utils.js';
import { UriUtils } from '../utils/uri-utils.js';
export class DefaultDocumentHighlightProvider {
    constructor(services) {
        this.references = services.references.References;
        this.nameProvider = services.references.NameProvider;
        this.grammarConfig = services.parser.GrammarConfig;
    }
    getDocumentHighlight(document, params, _cancelToken) {
        const rootNode = document.parseResult.value.$cstNode;
        if (!rootNode) {
            return undefined;
        }
        const selectedNode = findDeclarationNodeAtOffset(rootNode, document.textDocument.offsetAt(params.position), this.grammarConfig.nameRegexp);
        if (!selectedNode) {
            return undefined;
        }
        const targetAstNode = this.references.findDeclaration(selectedNode);
        if (targetAstNode) {
            const includeDeclaration = UriUtils.equals(getDocument(targetAstNode).uri, document.uri);
            const options = { documentUri: document.uri, includeDeclaration };
            const references = this.references.findReferences(targetAstNode, options);
            return references.map(ref => this.createDocumentHighlight(ref)).toArray();
        }
        return undefined;
    }
    /**
    * Override this method to determine the highlight kind of the given reference.
    */
    createDocumentHighlight(reference) {
        return DocumentHighlight.create(reference.segment.range);
    }
}
//# sourceMappingURL=document-highlight-provider.js.map