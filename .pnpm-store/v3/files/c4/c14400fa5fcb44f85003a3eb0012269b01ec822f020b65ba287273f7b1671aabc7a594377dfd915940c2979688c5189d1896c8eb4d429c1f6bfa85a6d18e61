/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { findDeclarationNodeAtOffset } from '../utils/cst-utils.js';
export class AstNodeHoverProvider {
    constructor(services) {
        this.references = services.references.References;
        this.grammarConfig = services.parser.GrammarConfig;
    }
    getHoverContent(document, params) {
        var _a, _b;
        const rootNode = (_b = (_a = document.parseResult) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b.$cstNode;
        if (rootNode) {
            const offset = document.textDocument.offsetAt(params.position);
            const cstNode = findDeclarationNodeAtOffset(rootNode, offset, this.grammarConfig.nameRegexp);
            if (cstNode && cstNode.offset + cstNode.length > offset) {
                const targetNode = this.references.findDeclaration(cstNode);
                if (targetNode) {
                    return this.getAstNodeHoverContent(targetNode);
                }
            }
        }
        return undefined;
    }
}
export class MultilineCommentHoverProvider extends AstNodeHoverProvider {
    constructor(services) {
        super(services);
        this.documentationProvider = services.documentation.DocumentationProvider;
    }
    getAstNodeHoverContent(node) {
        const content = this.documentationProvider.getDocumentation(node);
        if (content) {
            return {
                contents: {
                    kind: 'markdown',
                    value: content
                }
            };
        }
        return undefined;
    }
}
//# sourceMappingURL=hover-provider.js.map