/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { Range } from 'vscode-languageserver-types';
import { CompletionItemKind } from 'vscode-languageserver-types';
import type { NextFeature } from '../../lsp/completion/follow-element-computation.js';
import { DefaultCompletionProvider, type CompletionAcceptor, type CompletionContext } from '../../lsp/completion/completion-provider.js';
import type { MaybePromise } from '../../utils/promise-utils.js';
import { getContainerOfType } from '../../utils/ast-utils.js';
import type { LangiumDocument, LangiumDocuments } from '../../workspace/documents.js';
import type { AbstractElement } from '../../languages/generated/ast.js';
import { isAssignment } from '../../languages/generated/ast.js';
import { UriUtils } from '../../utils/uri-utils.js';
import type { LangiumServices } from '../../lsp/lsp-services.js';

export class LangiumGrammarCompletionProvider extends DefaultCompletionProvider {

    private readonly documents: () => LangiumDocuments;

    constructor(services: LangiumServices) {
        super(services);
        this.documents = () => services.shared.workspace.LangiumDocuments;
    }

    protected override completionFor(context: CompletionContext, next: NextFeature<AbstractElement>, acceptor: CompletionAcceptor): MaybePromise<void> {
        const assignment = getContainerOfType(next.feature, isAssignment);
        if (assignment?.feature === 'path') {
            this.completeImportPath(context, acceptor);
        } else {
            return super.completionFor(context, next, acceptor);
        }
    }

    private completeImportPath(context: CompletionContext, acceptor: CompletionAcceptor): void {
        const text = context.textDocument.getText();
        const existingText = text.substring(context.tokenOffset, context.offset);
        let allPaths = this.getAllFiles(context.document);
        let range: Range = {
            start: context.position,
            end: context.position
        };
        if (existingText.length > 0) {
            const existingPath = existingText.substring(1);
            allPaths = allPaths.filter(path => path.startsWith(existingPath));
            // Completely replace the current token
            const start = context.textDocument.positionAt(context.tokenOffset + 1);
            const end = context.textDocument.positionAt(context.tokenEndOffset - 1);
            range = {
                start,
                end
            };
        }
        for (const path of allPaths) {
            // Only insert quotes if there is no `path` token yet.
            const delimiter = existingText.length > 0 ? '' : '"';
            const completionValue = `${delimiter}${path}${delimiter}`;
            acceptor(context, {
                label: path,
                textEdit: {
                    newText: completionValue,
                    range
                },
                kind: CompletionItemKind.File,
                sortText: '0'
            });
        }
    }

    private getAllFiles(document: LangiumDocument): string[] {
        const documents = this.documents().all;
        const uri = document.uri.toString();
        const dirname = UriUtils.dirname(document.uri).toString();
        const paths: string[] = [];
        for (const doc of documents) {
            if (!UriUtils.equals(doc.uri, uri)) {
                const docUri = doc.uri.toString();
                const uriWithoutExt = docUri.substring(0, docUri.length - UriUtils.extname(doc.uri).length);
                let relativePath = UriUtils.relative(dirname, uriWithoutExt);
                if (!relativePath.startsWith('.')) {
                    relativePath = `./${relativePath}`;
                }
                paths.push(relativePath);
            }
        }
        return paths;
    }

}
