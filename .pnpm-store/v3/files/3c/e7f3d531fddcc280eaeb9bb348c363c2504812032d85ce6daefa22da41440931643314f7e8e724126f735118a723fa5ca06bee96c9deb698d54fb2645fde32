/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { CompletionItemKind } from 'vscode-languageserver-types';
import { DefaultCompletionProvider } from '../../lsp/completion/completion-provider.js';
import { getContainerOfType } from '../../utils/ast-utils.js';
import { isAssignment } from '../../languages/generated/ast.js';
import { UriUtils } from '../../utils/uri-utils.js';
export class LangiumGrammarCompletionProvider extends DefaultCompletionProvider {
    constructor(services) {
        super(services);
        this.documents = () => services.shared.workspace.LangiumDocuments;
    }
    completionFor(context, next, acceptor) {
        const assignment = getContainerOfType(next.feature, isAssignment);
        if ((assignment === null || assignment === void 0 ? void 0 : assignment.feature) === 'path') {
            this.completeImportPath(context, acceptor);
        }
        else {
            return super.completionFor(context, next, acceptor);
        }
    }
    completeImportPath(context, acceptor) {
        const text = context.textDocument.getText();
        const existingText = text.substring(context.tokenOffset, context.offset);
        let allPaths = this.getAllFiles(context.document);
        let range = {
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
    getAllFiles(document) {
        const documents = this.documents().all;
        const uri = document.uri.toString();
        const dirname = UriUtils.dirname(document.uri).toString();
        const paths = [];
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
//# sourceMappingURL=grammar-completion-provider.js.map