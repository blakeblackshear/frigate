/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { TextEdit } from 'vscode-languageserver-types';
import { isNamed } from '../references/name-provider.js';
import { findDeclarationNodeAtOffset } from '../utils/cst-utils.js';
export class DefaultRenameProvider {
    constructor(services) {
        this.references = services.references.References;
        this.nameProvider = services.references.NameProvider;
        this.grammarConfig = services.parser.GrammarConfig;
    }
    async rename(document, params, _cancelToken) {
        const changes = {};
        const rootNode = document.parseResult.value.$cstNode;
        if (!rootNode)
            return undefined;
        const offset = document.textDocument.offsetAt(params.position);
        const leafNode = findDeclarationNodeAtOffset(rootNode, offset, this.grammarConfig.nameRegexp);
        if (!leafNode)
            return undefined;
        const targetNode = this.references.findDeclaration(leafNode);
        if (!targetNode)
            return undefined;
        const options = { onlyLocal: false, includeDeclaration: true };
        const references = this.references.findReferences(targetNode, options);
        references.forEach(ref => {
            const change = TextEdit.replace(ref.segment.range, params.newName);
            const uri = ref.sourceUri.toString();
            if (changes[uri]) {
                changes[uri].push(change);
            }
            else {
                changes[uri] = [change];
            }
        });
        return { changes };
    }
    prepareRename(document, params, _cancelToken) {
        return this.renameNodeRange(document, params.position);
    }
    renameNodeRange(doc, position) {
        const rootNode = doc.parseResult.value.$cstNode;
        const offset = doc.textDocument.offsetAt(position);
        if (rootNode && offset) {
            const leafNode = findDeclarationNodeAtOffset(rootNode, offset, this.grammarConfig.nameRegexp);
            if (!leafNode) {
                return undefined;
            }
            const isCrossRef = this.references.findDeclaration(leafNode);
            // return range if selected CstNode is the name node or it is a crosslink which points to a declaration
            if (isCrossRef || this.isNameNode(leafNode)) {
                return leafNode.range;
            }
        }
        return undefined;
    }
    isNameNode(leafNode) {
        return (leafNode === null || leafNode === void 0 ? void 0 : leafNode.astNode) && isNamed(leafNode.astNode) && leafNode === this.nameProvider.getNameNode(leafNode.astNode);
    }
}
//# sourceMappingURL=rename-provider.js.map