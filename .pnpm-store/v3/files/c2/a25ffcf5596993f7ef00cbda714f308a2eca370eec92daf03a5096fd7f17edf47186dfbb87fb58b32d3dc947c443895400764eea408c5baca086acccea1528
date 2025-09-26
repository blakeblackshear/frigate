/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { Location } from 'vscode-languageserver';
import { findDeclarationNodeAtOffset } from '../utils/cst-utils.js';
export class DefaultReferencesProvider {
    constructor(services) {
        this.nameProvider = services.references.NameProvider;
        this.references = services.references.References;
        this.grammarConfig = services.parser.GrammarConfig;
    }
    findReferences(document, params, _cancelToken) {
        const rootNode = document.parseResult.value.$cstNode;
        if (!rootNode) {
            return [];
        }
        const selectedNode = findDeclarationNodeAtOffset(rootNode, document.textDocument.offsetAt(params.position), this.grammarConfig.nameRegexp);
        if (!selectedNode) {
            return [];
        }
        return this.getReferences(selectedNode, params, document);
    }
    getReferences(selectedNode, params, _document) {
        const locations = [];
        const targetAstNode = this.references.findDeclaration(selectedNode);
        if (targetAstNode) {
            const options = { includeDeclaration: params.context.includeDeclaration };
            this.references.findReferences(targetAstNode, options).forEach(reference => {
                locations.push(Location.create(reference.sourceUri.toString(), reference.segment.range));
            });
        }
        return locations;
    }
}
//# sourceMappingURL=references-provider.js.map