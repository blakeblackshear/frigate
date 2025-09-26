/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { Hover, HoverParams } from 'vscode-languageserver';
import type { CancellationToken } from '../utils/cancellation.js';
import type { GrammarConfig } from '../languages/grammar-config.js';
import type { References } from '../references/references.js';
import type { LangiumServices } from './lsp-services.js';
import type { AstNode } from '../syntax-tree.js';
import type { MaybePromise } from '../utils/promise-utils.js';
import type { LangiumDocument } from '../workspace/documents.js';
import type { DocumentationProvider } from '../documentation/documentation-provider.js';
/**
 * Language-specific service for handling hover requests.
 */
export interface HoverProvider {
    /**
     * Handle a hover request.
     *
     * @throws `OperationCancelled` if cancellation is detected during execution
     * @throws `ResponseError` if an error is detected that should be sent as response to the client
     */
    getHoverContent(document: LangiumDocument, params: HoverParams, cancelToken?: CancellationToken): MaybePromise<Hover | undefined>;
}
export declare abstract class AstNodeHoverProvider implements HoverProvider {
    protected readonly references: References;
    protected readonly grammarConfig: GrammarConfig;
    constructor(services: LangiumServices);
    getHoverContent(document: LangiumDocument, params: HoverParams): MaybePromise<Hover | undefined>;
    protected abstract getAstNodeHoverContent(node: AstNode): MaybePromise<Hover | undefined>;
}
export declare class MultilineCommentHoverProvider extends AstNodeHoverProvider {
    protected readonly documentationProvider: DocumentationProvider;
    constructor(services: LangiumServices);
    protected getAstNodeHoverContent(node: AstNode): MaybePromise<Hover | undefined>;
}
//# sourceMappingURL=hover-provider.d.ts.map