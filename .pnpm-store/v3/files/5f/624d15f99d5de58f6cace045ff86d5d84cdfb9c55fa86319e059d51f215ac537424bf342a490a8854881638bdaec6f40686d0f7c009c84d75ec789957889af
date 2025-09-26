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
import { findDeclarationNodeAtOffset } from '../utils/cst-utils.js';

/**
 * Language-specific service for handling go to type requests.
 */
export interface TypeDefinitionProvider {
    /**
     * Handles a go to type definition request.
     */
    getTypeDefinition(document: LangiumDocument, params: TypeDefinitionParams, cancelToken?: CancellationToken): MaybePromise<LocationLink[] | undefined>;
}

export abstract class AbstractTypeDefinitionProvider implements TypeDefinitionProvider {

    protected readonly references: References;

    constructor(services: LangiumServices) {
        this.references = services.references.References;
    }

    getTypeDefinition(document: LangiumDocument, params: TypeDefinitionParams, cancelToken = CancellationToken.None): MaybePromise<LocationLink[] | undefined> {
        const rootNode = document.parseResult.value;
        if (rootNode.$cstNode) {
            const sourceCstNode = findDeclarationNodeAtOffset(rootNode.$cstNode, document.textDocument.offsetAt(params.position));
            if (sourceCstNode) {
                const nodeDeclaration = this.references.findDeclaration(sourceCstNode);
                if (nodeDeclaration) {
                    return this.collectGoToTypeLocationLinks(nodeDeclaration, cancelToken);
                }
            }
        }
        return undefined;
    }

    /**
     * Override this method to implement the logic to generate the expected LocationLink[] for a go to type request for your language.
     */
    abstract collectGoToTypeLocationLinks(element: AstNode, cancelToken: CancellationToken): MaybePromise<LocationLink[] | undefined>;
}
