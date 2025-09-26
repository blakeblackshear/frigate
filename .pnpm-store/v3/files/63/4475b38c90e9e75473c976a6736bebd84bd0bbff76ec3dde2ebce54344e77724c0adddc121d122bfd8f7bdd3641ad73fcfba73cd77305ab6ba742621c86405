/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { ImplementationParams, LocationLink } from 'vscode-languageserver';
import type { GrammarConfig } from '../languages/grammar-config.js';
import type { References } from '../references/references.js';
import type { LangiumServices } from './lsp-services.js';
import type { AstNode } from '../syntax-tree.js';
import type { MaybePromise } from '../utils/promise-utils.js';
import type { LangiumDocument } from '../workspace/documents.js';
import { CancellationToken } from '../utils/cancellation.js';
/**
 * Language-specific service for handling go to implementation requests.
 */
export interface ImplementationProvider {
    /**
     * Handles a go to implementation request.
     */
    getImplementation(document: LangiumDocument, params: ImplementationParams, cancelToken?: CancellationToken): MaybePromise<LocationLink[] | undefined>;
}
export declare abstract class AbstractGoToImplementationProvider implements ImplementationProvider {
    protected readonly references: References;
    protected readonly grammarConfig: GrammarConfig;
    constructor(services: LangiumServices);
    getImplementation(document: LangiumDocument<AstNode>, params: ImplementationParams, cancelToken?: CancellationToken): MaybePromise<LocationLink[] | undefined>;
    abstract collectGoToImplementationLocationLinks(element: AstNode, cancelToken: CancellationToken): MaybePromise<LocationLink[] | undefined>;
}
//# sourceMappingURL=implementation-provider.d.ts.map