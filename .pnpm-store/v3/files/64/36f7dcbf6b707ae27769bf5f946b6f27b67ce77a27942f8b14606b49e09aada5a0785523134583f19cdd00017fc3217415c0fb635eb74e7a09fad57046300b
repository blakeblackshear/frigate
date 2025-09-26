/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { WorkspaceSymbol, WorkspaceSymbolParams } from 'vscode-languageserver';
import type { LangiumSharedServices } from './lsp-services.js';
import type { IndexManager } from '../workspace/index-manager.js';
import type { MaybePromise } from '../utils/promise-utils.js';
import type { AstNodeDescription } from '../syntax-tree.js';
import type { NodeKindProvider } from './node-kind-provider.js';
import type { FuzzyMatcher } from './fuzzy-matcher.js';
import { CancellationToken } from '../utils/cancellation.js';
/**
 * Shared service for handling workspace symbols requests.
 */
export interface WorkspaceSymbolProvider {
    /**
     * Handle a workspace symbols request.
     *
     * @param params workspaces symbols request parameters
     * @param cancelToken a cancellation token tha can be used to cancel the request
     * @returns a list of workspace symbols
     *
     * @throws `OperationCancelled` if cancellation is detected during execution
     * @throws `ResponseError` if an error is detected that should be sent as response to the client
     */
    getSymbols(params: WorkspaceSymbolParams, cancelToken?: CancellationToken): MaybePromise<WorkspaceSymbol[]>;
    /**
     * Handle a resolve request for a workspace symbol.
     *
     * @param symbol the workspace symbol to resolve
     * @param cancelToken a cancellation token tha can be used to cancel the request
     * @returns the resolved workspace symbol
     *
     * @throws `OperationCancelled` if cancellation is detected during execution
     * @throws `ResponseError` if an error is detected that should be sent as response to the client
     */
    resolveSymbol?(symbol: WorkspaceSymbol, cancelToken?: CancellationToken): MaybePromise<WorkspaceSymbol>;
}
export declare class DefaultWorkspaceSymbolProvider implements WorkspaceSymbolProvider {
    protected readonly indexManager: IndexManager;
    protected readonly nodeKindProvider: NodeKindProvider;
    protected readonly fuzzyMatcher: FuzzyMatcher;
    constructor(services: LangiumSharedServices);
    getSymbols(params: WorkspaceSymbolParams, cancelToken?: CancellationToken): Promise<WorkspaceSymbol[]>;
    protected getWorkspaceSymbol(astDescription: AstNodeDescription): WorkspaceSymbol | undefined;
}
//# sourceMappingURL=workspace-symbol-provider.d.ts.map