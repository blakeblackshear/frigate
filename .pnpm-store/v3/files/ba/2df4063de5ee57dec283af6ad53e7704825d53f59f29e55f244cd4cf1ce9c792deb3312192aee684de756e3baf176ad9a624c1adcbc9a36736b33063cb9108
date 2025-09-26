/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { ReferenceParams } from 'vscode-languageserver';
import type { CancellationToken } from '../utils/cancellation.js';
import type { NameProvider } from '../references/name-provider.js';
import type { References } from '../references/references.js';
import type { LeafCstNode } from '../syntax-tree.js';
import type { LangiumServices } from './lsp-services.js';
import type { MaybePromise } from '../utils/promise-utils.js';
import type { LangiumDocument } from '../workspace/documents.js';
import type { GrammarConfig } from '../languages/grammar-config.js';
import { Location } from 'vscode-languageserver';
import { findDeclarationNodeAtOffset } from '../utils/cst-utils.js';

/**
 * Language-specific service for handling find references requests.
 */
export interface ReferencesProvider {
    /**
     * Handle a find references request.
     *
     * @param document The document in which to search for references.
     * @param params The parameters of the find references request.
     * @param cancelToken A cancellation token that can be used to cancel the request.
     * @returns The locations of the references.
     *
     * @throws `OperationCancelled` if cancellation is detected during execution
     * @throws `ResponseError` if an error is detected that should be sent as response to the client
     */
    findReferences(document: LangiumDocument, params: ReferenceParams, cancelToken?: CancellationToken): MaybePromise<Location[]>;
}

export class DefaultReferencesProvider implements ReferencesProvider {
    protected readonly nameProvider: NameProvider;
    protected readonly references: References;
    protected readonly grammarConfig: GrammarConfig;

    constructor(services: LangiumServices) {
        this.nameProvider = services.references.NameProvider;
        this.references = services.references.References;
        this.grammarConfig = services.parser.GrammarConfig;
    }

    findReferences(document: LangiumDocument, params: ReferenceParams, _cancelToken?: CancellationToken): MaybePromise<Location[]> {
        const rootNode = document.parseResult.value.$cstNode;
        if (!rootNode) {
            return [];
        }

        const selectedNode = findDeclarationNodeAtOffset(rootNode, document.textDocument.offsetAt(params.position), this.grammarConfig.nameRegexp);
        if (!selectedNode) {
            return [];
        }

        return this.getReferences(selectedNode, params, document);
    }

    protected getReferences(selectedNode: LeafCstNode, params: ReferenceParams, _document: LangiumDocument): Location[] {
        const locations: Location[] = [];
        const targetAstNode = this.references.findDeclaration(selectedNode);
        if (targetAstNode) {
            const options = { includeDeclaration: params.context.includeDeclaration };
            this.references.findReferences(targetAstNode, options).forEach(reference => {
                locations.push(Location.create(reference.sourceUri.toString(), reference.segment.range));
            });
        }
        return locations;
    }
}
