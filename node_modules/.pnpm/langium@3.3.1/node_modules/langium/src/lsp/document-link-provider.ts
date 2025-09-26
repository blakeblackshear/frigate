/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { DocumentLink, DocumentLinkParams } from 'vscode-languageserver';
import type { CancellationToken } from '../utils/cancellation.js';
import type { MaybePromise } from '../utils/promise-utils.js';
import type { LangiumDocument } from '../workspace/documents.js';

/**
 * Language-specific service for handling document link requests.
 */
export interface DocumentLinkProvider {
    /**
     * Handle a document links request.
     *
     * @throws `OperationCancelled` if cancellation is detected during execution
     * @throws `ResponseError` if an error is detected that should be sent as response to the client
     */
    getDocumentLinks(document: LangiumDocument, params: DocumentLinkParams, cancelToken?: CancellationToken): MaybePromise<DocumentLink[]>;
}
