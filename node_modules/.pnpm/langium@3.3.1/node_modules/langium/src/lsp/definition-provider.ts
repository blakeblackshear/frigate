/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { DefinitionParams } from 'vscode-languageserver';
import type { CancellationToken } from '../utils/cancellation.js';
import type { GrammarConfig } from '../languages/grammar-config.js';
import type { NameProvider } from '../references/name-provider.js';
import type { References } from '../references/references.js';
import type { LangiumServices } from './lsp-services.js';
import type { CstNode } from '../syntax-tree.js';
import type { MaybePromise } from '../utils/promise-utils.js';
import type { LangiumDocument } from '../workspace/documents.js';
import { LocationLink } from 'vscode-languageserver';
import { getDocument } from '../utils/ast-utils.js';
import { findDeclarationNodeAtOffset } from '../utils/cst-utils.js';

/**
 * Language-specific service for handling go to definition requests.
 */
export interface DefinitionProvider {
    /**
     * Handle a go to definition request.
     *
     * @param document The document in which the request was triggered.
     * @param params The parameters of the request.
     * @param cancelToken A cancellation token that can be used to cancel the request.
     * @returns A list of location links to the definition(s) of the symbol at the given position.
     *
     * @throws `OperationCancelled` if cancellation is detected during execution
     * @throws `ResponseError` if an error is detected that should be sent as response to the client
     */
    getDefinition(document: LangiumDocument, params: DefinitionParams, cancelToken?: CancellationToken): MaybePromise<LocationLink[] | undefined>;
}

export interface GoToLink {
    source: CstNode
    target: CstNode
    targetDocument: LangiumDocument
}

export class DefaultDefinitionProvider implements DefinitionProvider {

    protected readonly nameProvider: NameProvider;
    protected readonly references: References;
    protected readonly grammarConfig: GrammarConfig;

    constructor(services: LangiumServices) {
        this.nameProvider = services.references.NameProvider;
        this.references = services.references.References;
        this.grammarConfig = services.parser.GrammarConfig;
    }

    getDefinition(document: LangiumDocument, params: DefinitionParams, _cancelToken?: CancellationToken): MaybePromise<LocationLink[] | undefined> {
        const rootNode = document.parseResult.value;
        if (rootNode.$cstNode) {
            const cst = rootNode.$cstNode;
            const sourceCstNode = findDeclarationNodeAtOffset(cst, document.textDocument.offsetAt(params.position), this.grammarConfig.nameRegexp);
            if (sourceCstNode) {
                return this.collectLocationLinks(sourceCstNode, params);
            }
        }
        return undefined;
    }

    protected collectLocationLinks(sourceCstNode: CstNode, _params: DefinitionParams): MaybePromise<LocationLink[] | undefined> {
        const goToLink = this.findLink(sourceCstNode);
        if (goToLink) {
            return [LocationLink.create(
                goToLink.targetDocument.textDocument.uri,
                (goToLink.target.astNode.$cstNode ?? goToLink.target).range,
                goToLink.target.range,
                goToLink.source.range
            )];
        }
        return undefined;
    }

    protected findLink(source: CstNode): GoToLink | undefined {
        const target = this.references.findDeclarationNode(source);
        if (target?.astNode) {
            const targetDocument = getDocument(target.astNode);
            if (target && targetDocument) {
                return { source, target, targetDocument };
            }
        }
        return undefined;
    }
}
