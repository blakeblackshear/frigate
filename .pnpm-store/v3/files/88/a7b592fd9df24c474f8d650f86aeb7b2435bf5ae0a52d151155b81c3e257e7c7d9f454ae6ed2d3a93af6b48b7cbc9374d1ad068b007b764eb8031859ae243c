/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { Position, Range, RenameParams, TextDocumentPositionParams, WorkspaceEdit } from 'vscode-languageserver-protocol';
import type { CancellationToken } from '../utils/cancellation.js';
import type { GrammarConfig } from '../languages/grammar-config.js';
import type { NameProvider } from '../references/name-provider.js';
import type { References } from '../references/references.js';
import type { LangiumServices } from './lsp-services.js';
import type { CstNode } from '../syntax-tree.js';
import type { MaybePromise } from '../utils/promise-utils.js';
import type { LangiumDocument } from '../workspace/documents.js';
import { TextEdit } from 'vscode-languageserver-types';
import { isNamed } from '../references/name-provider.js';
import { findDeclarationNodeAtOffset } from '../utils/cst-utils.js';

/**
 * Language-specific service for handling rename requests and prepare rename requests.
 */
export interface RenameProvider {
    /**
     * Handle a rename request.
     *
     * @param document The document in which the rename request was triggered.
     * @param params The rename parameters.
     * @param cancelToken A cancellation token that can be used to cancel the request.
     * @returns A workspace edit that describes the changes to be applied to the workspace.
     *
     * @throws `OperationCancelled` if cancellation is detected during execution
     * @throws `ResponseError` if an error is detected that should be sent as response to the client
     */
    rename(document: LangiumDocument, params: RenameParams, cancelToken?: CancellationToken): MaybePromise<WorkspaceEdit | undefined>;

    /**
     * Handle a prepare rename request.
     *
     * @param document The document in which the prepare rename request was triggered.
     * @param params The prepare rename parameters.
     * @param cancelToken A cancellation token that can be used to cancel the request.
     * @returns A range that describes the range of the symbol to be renamed.
     *
     * @throws `OperationCancelled` if cancellation is detected during execution
     * @throws `ResponseError` if an error is detected that should be sent as response to the client
     */
    prepareRename(document: LangiumDocument, params: TextDocumentPositionParams, cancelToken?: CancellationToken): MaybePromise<Range | undefined>;
}

export class DefaultRenameProvider implements RenameProvider {

    protected readonly references: References;
    protected readonly nameProvider: NameProvider;
    protected readonly grammarConfig: GrammarConfig;

    constructor(services: LangiumServices) {
        this.references = services.references.References;
        this.nameProvider = services.references.NameProvider;
        this.grammarConfig = services.parser.GrammarConfig;
    }

    async rename(document: LangiumDocument, params: RenameParams, _cancelToken?: CancellationToken): Promise<WorkspaceEdit | undefined> {
        const changes: Record<string, TextEdit[]> = {};
        const rootNode = document.parseResult.value.$cstNode;
        if (!rootNode) return undefined;
        const offset = document.textDocument.offsetAt(params.position);
        const leafNode = findDeclarationNodeAtOffset(rootNode, offset, this.grammarConfig.nameRegexp);
        if (!leafNode) return undefined;
        const targetNode = this.references.findDeclaration(leafNode);
        if (!targetNode) return undefined;
        const options = { onlyLocal: false, includeDeclaration: true };
        const references = this.references.findReferences(targetNode, options);
        references.forEach(ref => {
            const change = TextEdit.replace(ref.segment.range, params.newName);
            const uri = ref.sourceUri.toString();
            if (changes[uri]) {
                changes[uri].push(change);
            } else {
                changes[uri] = [change];
            }
        });
        return { changes };
    }

    prepareRename(document: LangiumDocument, params: TextDocumentPositionParams, _cancelToken?: CancellationToken): MaybePromise<Range | undefined> {
        return this.renameNodeRange(document, params.position);
    }

    protected renameNodeRange(doc: LangiumDocument, position: Position): Range | undefined {
        const rootNode = doc.parseResult.value.$cstNode;
        const offset = doc.textDocument.offsetAt(position);
        if (rootNode && offset) {
            const leafNode = findDeclarationNodeAtOffset(rootNode, offset, this.grammarConfig.nameRegexp);
            if (!leafNode) {
                return undefined;
            }
            const isCrossRef = this.references.findDeclaration(leafNode);
            // return range if selected CstNode is the name node or it is a crosslink which points to a declaration
            if (isCrossRef || this.isNameNode(leafNode)) {
                return leafNode.range;
            }
        }
        return undefined;
    }

    protected isNameNode(leafNode: CstNode | undefined): boolean | undefined {
        return leafNode?.astNode && isNamed(leafNode.astNode) && leafNode === this.nameProvider.getNameNode(leafNode.astNode);
    }
}
