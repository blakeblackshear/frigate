/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { LocationLink, TypeDefinitionParams } from 'vscode-languageserver';
import type { References } from '../references/references.js';
import type { LangiumServices } from './lsp-services.js';
import type { AstNode } from '../syntax-tree.js';
import type { MaybePromise } from '../utils/promise-utils.js';
import type { LangiumDocument } from '../workspace/documents.js';
import { CancellationToken } from '../utils/cancellation.js';
/**
 * Language-specific service for handling go to type requests.
 */
export interface TypeDefinitionProvider {
    /**
     * Handles a go to type definition request.
     */
    getTypeDefinition(document: LangiumDocument, params: TypeDefinitionParams, cancelToken?: CancellationToken): MaybePromise<LocationLink[] | undefined>;
}
export declare abstract class AbstractTypeDefinitionProvider implements TypeDefinitionProvider {
    protected readonly references: References;
    constructor(services: LangiumServices);
    getTypeDefinition(document: LangiumDocument, params: TypeDefinitionParams, cancelToken?: CancellationToken): MaybePromise<LocationLink[] | undefined>;
    /**
     * Override this method to implement the logic to generate the expected LocationLink[] for a go to type request for your language.
     */
    abstract collectGoToTypeLocationLinks(element: AstNode, cancelToken: CancellationToken): MaybePromise<LocationLink[] | undefined>;
}
//# sourceMappingURL=type-provider.d.ts.map