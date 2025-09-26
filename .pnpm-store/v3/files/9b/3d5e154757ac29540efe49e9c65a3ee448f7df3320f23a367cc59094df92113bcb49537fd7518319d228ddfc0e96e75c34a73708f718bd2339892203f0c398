/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { LocationLink } from 'vscode-languageserver';
import { getDocument } from '../utils/ast-utils.js';
import { findDeclarationNodeAtOffset } from '../utils/cst-utils.js';
export class DefaultDefinitionProvider {
    constructor(services) {
        this.nameProvider = services.references.NameProvider;
        this.references = services.references.References;
        this.grammarConfig = services.parser.GrammarConfig;
    }
    getDefinition(document, params, _cancelToken) {
        const rootNode = document.parseResult.value;
        if (rootNode.$cstNode) {
            const cst = rootNode.$cstNode;
            const sourceCstNode = findDeclarationNodeAtOffset(cst, document.textDocument.offsetAt(params.position), this.grammarConfig.nameRegexp);
            if (sourceCstNode) {
                return this.collectLocationLinks(sourceCstNode, params);
            }
        }
        return undefined;
    }
    collectLocationLinks(sourceCstNode, _params) {
        var _a;
        const goToLink = this.findLink(sourceCstNode);
        if (goToLink) {
            return [LocationLink.create(goToLink.targetDocument.textDocument.uri, ((_a = goToLink.target.astNode.$cstNode) !== null && _a !== void 0 ? _a : goToLink.target).range, goToLink.target.range, goToLink.source.range)];
        }
        return undefined;
    }
    findLink(source) {
        const target = this.references.findDeclarationNode(source);
        if (target === null || target === void 0 ? void 0 : target.astNode) {
            const targetDocument = getDocument(target.astNode);
            if (target && targetDocument) {
                return { source, target, targetDocument };
            }
        }
        return undefined;
    }
}
//# sourceMappingURL=definition-provider.js.map