/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { DocumentHighlightParams } from 'vscode-languageserver';
import type { CancellationToken } from '../utils/cancellation.js';
import type { GrammarConfig } from '../languages/grammar-config.js';
import type { NameProvider } from '../references/name-provider.js';
import type { References } from '../references/references.js';
import type { LangiumServices } from './lsp-services.js';
import type { MaybePromise } from '../utils/promise-utils.js';
import type { ReferenceDescription } from '../workspace/ast-descriptions.js';
import type { LangiumDocument } from '../workspace/documents.js';
import { DocumentHighlight } from 'vscode-languageserver';
/**
 * Language-specific service for handling document highlight requests.
 */
export interface DocumentHighlightProvider {
    /**
     * Handle a document highlight request.
     *
     * @param document The document in which the request was received.
     * @param params The parameters of the document highlight request.
     * @param cancelToken A cancellation token that can be used to cancel the request.
     * @returns The document highlights or `undefined` if no highlights are available.
     * @throws `OperationCancelled` if cancellation is detected during execution
     * @throws `ResponseError` if an error is detected that should be sent as response to the client
     */
    getDocumentHighlight(document: LangiumDocument, params: DocumentHighlightParams, cancelToken?: CancellationToken): MaybePromise<DocumentHighlight[] | undefined>;
}
export declare class DefaultDocumentHighlightProvider implements DocumentHighlightProvider {
    protected readonly references: References;
    protected readonly nameProvider: NameProvider;
    protected readonly grammarConfig: GrammarConfig;
    constructor(services: LangiumServices);
    getDocumentHighlight(document: LangiumDocument, params: DocumentHighlightParams, _cancelToken?: CancellationToken): MaybePromise<DocumentHighlight[] | undefined>;
    /**
    * Override this method to determine the highlight kind of the given reference.
    */
    protected createDocumentHighlight(reference: ReferenceDescription): DocumentHighlight;
}
//# sourceMappingURL=document-highlight-provider.d.ts.map