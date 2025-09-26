/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { CancellationToken } from '../utils/cancellation.js';
import { findDeclarationNodeAtOffset } from '../utils/cst-utils.js';
export class AbstractGoToImplementationProvider {
    constructor(services) {
        this.references = services.references.References;
        this.grammarConfig = services.parser.GrammarConfig;
    }
    getImplementation(document, params, cancelToken = CancellationToken.None) {
        const rootNode = document.parseResult.value;
        if (rootNode.$cstNode) {
            const sourceCstNode = findDeclarationNodeAtOffset(rootNode.$cstNode, document.textDocument.offsetAt(params.position), this.grammarConfig.nameRegexp);
            if (sourceCstNode) {
                const nodeDeclaration = this.references.findDeclaration(sourceCstNode);
                if (nodeDeclaration) {
                    return this.collectGoToImplementationLocationLinks(nodeDeclaration, cancelToken);
                }
            }
        }
        return undefined;
    }
}
//# sourceMappingURL=implementation-provider.js.map