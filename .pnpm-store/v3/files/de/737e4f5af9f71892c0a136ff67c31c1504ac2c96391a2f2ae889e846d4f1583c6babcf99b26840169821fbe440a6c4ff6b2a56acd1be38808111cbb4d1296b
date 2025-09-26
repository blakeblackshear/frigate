/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { CancellationToken } from '../utils/cancellation.js';
import { interruptAndCheck } from '../utils/promise-utils.js';
export class DefaultWorkspaceSymbolProvider {
    constructor(services) {
        this.indexManager = services.workspace.IndexManager;
        this.nodeKindProvider = services.lsp.NodeKindProvider;
        this.fuzzyMatcher = services.lsp.FuzzyMatcher;
    }
    async getSymbols(params, cancelToken = CancellationToken.None) {
        const workspaceSymbols = [];
        const query = params.query.toLowerCase();
        for (const description of this.indexManager.allElements()) {
            await interruptAndCheck(cancelToken);
            if (this.fuzzyMatcher.match(query, description.name)) {
                const symbol = this.getWorkspaceSymbol(description);
                if (symbol) {
                    workspaceSymbols.push(symbol);
                }
            }
        }
        return workspaceSymbols;
    }
    getWorkspaceSymbol(astDescription) {
        const nameSegment = astDescription.nameSegment;
        if (nameSegment) {
            return {
                kind: this.nodeKindProvider.getSymbolKind(astDescription),
                name: astDescription.name,
                location: {
                    range: nameSegment.range,
                    uri: astDescription.documentUri.toString()
                }
            };
        }
        else {
            return undefined;
        }
    }
}
//# sourceMappingURL=workspace-symbol-provider.js.map