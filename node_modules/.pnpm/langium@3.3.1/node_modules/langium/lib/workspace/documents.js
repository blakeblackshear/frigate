/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
/**
 * Re-export 'TextDocument' from 'vscode-languageserver-textdocument' for convenience,
 *  including both type _and_ symbol (namespace), as we here and there also refer to the symbol,
 *  the overhead is very small, just a few kilobytes.
 * Everything else of that package (at the time contributing) is also defined
 *  in 'vscode-languageserver-protocol' or 'vscode-languageserver-types'.
 */
export { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocument } from './documents.js';
import { CancellationToken } from '../utils/cancellation.js';
import { stream } from '../utils/stream.js';
import { URI } from '../utils/uri-utils.js';
/**
 * A document is subject to several phases that are run in predefined order. Any state value implies that
 * smaller state values are finished as well.
 */
export var DocumentState;
(function (DocumentState) {
    /**
     * The text content has changed and needs to be parsed again. The AST held by this outdated
     * document instance is no longer valid.
     */
    DocumentState[DocumentState["Changed"] = 0] = "Changed";
    /**
     * An AST has been created from the text content. The document structure can be traversed,
     * but cross-references cannot be resolved yet. If necessary, the structure can be manipulated
     * at this stage as a preprocessing step.
     */
    DocumentState[DocumentState["Parsed"] = 1] = "Parsed";
    /**
     * The `IndexManager` service has processed AST nodes of this document. This means the
     * exported symbols are available in the global scope and can be resolved from other documents.
     */
    DocumentState[DocumentState["IndexedContent"] = 2] = "IndexedContent";
    /**
     * The `ScopeComputation` service has processed this document. This means the local symbols
     * are stored in a MultiMap so they can be looked up by the `ScopeProvider` service.
     * Once a document has reached this state, you may follow every reference - it will lazily
     * resolve its `ref` property and yield either the target AST node or `undefined` in case
     * the target is not in scope.
     */
    DocumentState[DocumentState["ComputedScopes"] = 3] = "ComputedScopes";
    /**
     * The `Linker` service has processed this document. All outgoing references have been
     * resolved or marked as erroneous.
     */
    DocumentState[DocumentState["Linked"] = 4] = "Linked";
    /**
     * The `IndexManager` service has processed AST node references of this document. This is
     * necessary to determine which documents are affected by a change in one of the workspace
     * documents.
     */
    DocumentState[DocumentState["IndexedReferences"] = 5] = "IndexedReferences";
    /**
     * The `DocumentValidator` service has processed this document. The language server listens
     * to the results of this phase and sends diagnostics to the client.
     */
    DocumentState[DocumentState["Validated"] = 6] = "Validated";
})(DocumentState || (DocumentState = {}));
export class DefaultLangiumDocumentFactory {
    constructor(services) {
        this.serviceRegistry = services.ServiceRegistry;
        this.textDocuments = services.workspace.TextDocuments;
        this.fileSystemProvider = services.workspace.FileSystemProvider;
    }
    async fromUri(uri, cancellationToken = CancellationToken.None) {
        const content = await this.fileSystemProvider.readFile(uri);
        return this.createAsync(uri, content, cancellationToken);
    }
    fromTextDocument(textDocument, uri, token) {
        uri = uri !== null && uri !== void 0 ? uri : URI.parse(textDocument.uri);
        if (CancellationToken.is(token)) {
            return this.createAsync(uri, textDocument, token);
        }
        else {
            return this.create(uri, textDocument, token);
        }
    }
    fromString(text, uri, token) {
        if (CancellationToken.is(token)) {
            return this.createAsync(uri, text, token);
        }
        else {
            return this.create(uri, text, token);
        }
    }
    fromModel(model, uri) {
        return this.create(uri, { $model: model });
    }
    create(uri, content, options) {
        if (typeof content === 'string') {
            const parseResult = this.parse(uri, content, options);
            return this.createLangiumDocument(parseResult, uri, undefined, content);
        }
        else if ('$model' in content) {
            const parseResult = { value: content.$model, parserErrors: [], lexerErrors: [] };
            return this.createLangiumDocument(parseResult, uri);
        }
        else {
            const parseResult = this.parse(uri, content.getText(), options);
            return this.createLangiumDocument(parseResult, uri, content);
        }
    }
    async createAsync(uri, content, cancelToken) {
        if (typeof content === 'string') {
            const parseResult = await this.parseAsync(uri, content, cancelToken);
            return this.createLangiumDocument(parseResult, uri, undefined, content);
        }
        else {
            const parseResult = await this.parseAsync(uri, content.getText(), cancelToken);
            return this.createLangiumDocument(parseResult, uri, content);
        }
    }
    /**
     * Create a LangiumDocument from a given parse result.
     *
     * A TextDocument is created on demand if it is not provided as argument here. Usually this
     * should not be necessary because the main purpose of the TextDocument is to convert between
     * text ranges and offsets, which is done solely in LSP request handling.
     *
     * With the introduction of {@link update} below this method is supposed to be mainly called
     * during workspace initialization and on addition/recognition of new files, while changes in
     * existing documents are processed via {@link update}.
     */
    createLangiumDocument(parseResult, uri, textDocument, text) {
        let document;
        if (textDocument) {
            document = {
                parseResult,
                uri,
                state: DocumentState.Parsed,
                references: [],
                textDocument
            };
        }
        else {
            const textDocumentGetter = this.createTextDocumentGetter(uri, text);
            document = {
                parseResult,
                uri,
                state: DocumentState.Parsed,
                references: [],
                get textDocument() {
                    return textDocumentGetter();
                }
            };
        }
        parseResult.value.$document = document;
        return document;
    }
    async update(document, cancellationToken) {
        var _a, _b;
        // The CST full text property contains the original text that was used to create the AST.
        const oldText = (_a = document.parseResult.value.$cstNode) === null || _a === void 0 ? void 0 : _a.root.fullText;
        const textDocument = (_b = this.textDocuments) === null || _b === void 0 ? void 0 : _b.get(document.uri.toString());
        const text = textDocument ? textDocument.getText() : await this.fileSystemProvider.readFile(document.uri);
        if (textDocument) {
            Object.defineProperty(document, 'textDocument', {
                value: textDocument
            });
        }
        else {
            const textDocumentGetter = this.createTextDocumentGetter(document.uri, text);
            Object.defineProperty(document, 'textDocument', {
                get: textDocumentGetter
            });
        }
        // Some of these documents can be pretty large, so parsing them again can be quite expensive.
        // Therefore, we only parse if the text has actually changed.
        if (oldText !== text) {
            document.parseResult = await this.parseAsync(document.uri, text, cancellationToken);
            document.parseResult.value.$document = document;
        }
        document.state = DocumentState.Parsed;
        return document;
    }
    parse(uri, text, options) {
        const services = this.serviceRegistry.getServices(uri);
        return services.parser.LangiumParser.parse(text, options);
    }
    parseAsync(uri, text, cancellationToken) {
        const services = this.serviceRegistry.getServices(uri);
        return services.parser.AsyncParser.parse(text, cancellationToken);
    }
    createTextDocumentGetter(uri, text) {
        const serviceRegistry = this.serviceRegistry;
        let textDoc = undefined;
        return () => {
            return textDoc !== null && textDoc !== void 0 ? textDoc : (textDoc = TextDocument.create(uri.toString(), serviceRegistry.getServices(uri).LanguageMetaData.languageId, 0, text !== null && text !== void 0 ? text : ''));
        };
    }
}
export class DefaultLangiumDocuments {
    constructor(services) {
        this.documentMap = new Map();
        this.langiumDocumentFactory = services.workspace.LangiumDocumentFactory;
        this.serviceRegistry = services.ServiceRegistry;
    }
    get all() {
        return stream(this.documentMap.values());
    }
    addDocument(document) {
        const uriString = document.uri.toString();
        if (this.documentMap.has(uriString)) {
            throw new Error(`A document with the URI '${uriString}' is already present.`);
        }
        this.documentMap.set(uriString, document);
    }
    getDocument(uri) {
        const uriString = uri.toString();
        return this.documentMap.get(uriString);
    }
    async getOrCreateDocument(uri, cancellationToken) {
        let document = this.getDocument(uri);
        if (document) {
            return document;
        }
        document = await this.langiumDocumentFactory.fromUri(uri, cancellationToken);
        this.addDocument(document);
        return document;
    }
    createDocument(uri, text, cancellationToken) {
        if (cancellationToken) {
            return this.langiumDocumentFactory.fromString(text, uri, cancellationToken).then(document => {
                this.addDocument(document);
                return document;
            });
        }
        else {
            const document = this.langiumDocumentFactory.fromString(text, uri);
            this.addDocument(document);
            return document;
        }
    }
    hasDocument(uri) {
        return this.documentMap.has(uri.toString());
    }
    invalidateDocument(uri) {
        const uriString = uri.toString();
        const langiumDoc = this.documentMap.get(uriString);
        if (langiumDoc) {
            const linker = this.serviceRegistry.getServices(uri).references.Linker;
            linker.unlink(langiumDoc);
            langiumDoc.state = DocumentState.Changed;
            langiumDoc.precomputedScopes = undefined;
            langiumDoc.diagnostics = undefined;
        }
        return langiumDoc;
    }
    deleteDocument(uri) {
        const uriString = uri.toString();
        const langiumDoc = this.documentMap.get(uriString);
        if (langiumDoc) {
            langiumDoc.state = DocumentState.Changed;
            this.documentMap.delete(uriString);
        }
        return langiumDoc;
    }
}
//# sourceMappingURL=documents.js.map