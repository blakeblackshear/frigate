/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { DocumentSymbol, DocumentSymbolParams } from 'vscode-languageserver';
import type { CancellationToken } from '../utils/cancellation.js';
import type { NameProvider } from '../references/name-provider.js';
import type { LangiumServices } from './lsp-services.js';
import type { AstNode } from '../syntax-tree.js';
import type { MaybePromise } from '../utils/promise-utils.js';
import type { LangiumDocument } from '../workspace/documents.js';
import type { NodeKindProvider } from './node-kind-provider.js';
/**
 * Language-specific service for handling document symbols requests.
 */
export interface DocumentSymbolProvider {
    /**
     * Handle a document symbols request.
     *
     * @param document The document in the workspace.
     * @param params The parameters of the request.
     * @param cancelToken A cancellation token that migh be used to cancel the request.
     * @returns The symbols for the given document.
     *
     * @throws `OperationCancelled` if cancellation is detected during execution
     * @throws `ResponseError` if an error is detected that should be sent as response to the client
     */
    getSymbols(document: LangiumDocument, params: DocumentSymbolParams, cancelToken?: CancellationToken): MaybePromise<DocumentSymbol[]>;
}
export declare class DefaultDocumentSymbolProvider implements DocumentSymbolProvider {
    protected readonly nameProvider: NameProvider;
    protected readonly nodeKindProvider: NodeKindProvider;
    constructor(services: LangiumServices);
    getSymbols(document: LangiumDocument, _params: DocumentSymbolParams, _cancelToken?: CancellationToken): MaybePromise<DocumentSymbol[]>;
    protected getSymbol(document: LangiumDocument, astNode: AstNode): DocumentSymbol[];
    protected getChildSymbols(document: LangiumDocument, astNode: AstNode): DocumentSymbol[] | undefined;
}
//# sourceMappingURL=document-symbol-provider.d.ts.map