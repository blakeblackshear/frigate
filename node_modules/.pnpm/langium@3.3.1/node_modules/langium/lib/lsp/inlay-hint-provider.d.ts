/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { InlayHint, InlayHintParams } from 'vscode-languageserver';
import type { AstNode } from '../syntax-tree.js';
import { CancellationToken } from '../utils/cancellation.js';
import type { MaybePromise } from '../utils/promise-utils.js';
import type { LangiumDocument } from '../workspace/documents.js';
export type InlayHintAcceptor = (inlayHint: InlayHint) => void;
/**
 * Provider for the inlay hint LSP type.
 */
export interface InlayHintProvider {
    /**
     * Handle the `textDocument.inlayHint` language server request.
     *
     * @throws `OperationCancelled` if cancellation is detected during execution
     * @throws `ResponseError` if an error is detected that should be sent as response to the client
     */
    getInlayHints(document: LangiumDocument, params: InlayHintParams, cancelToken?: CancellationToken): MaybePromise<InlayHint[] | undefined>;
}
export declare abstract class AbstractInlayHintProvider implements InlayHintProvider {
    getInlayHints(document: LangiumDocument, params: InlayHintParams, cancelToken?: CancellationToken): Promise<InlayHint[] | undefined>;
    abstract computeInlayHint(astNode: AstNode, acceptor: InlayHintAcceptor): void;
}
//# sourceMappingURL=inlay-hint-provider.d.ts.map