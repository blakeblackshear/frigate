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

import type { Diagnostic, Range } from 'vscode-languageserver-types';
import type { FileSystemProvider } from './file-system-provider.js';
import type { ParseResult, ParserOptions } from '../parser/langium-parser.js';
import type { ServiceRegistry } from '../service-registry.js';
import type { LangiumSharedCoreServices } from '../services.js';
import type { AstNode, AstNodeDescription, Mutable, Reference } from '../syntax-tree.js';
import type { MultiMap } from '../utils/collections.js';
import type { Stream } from '../utils/stream.js';
import { TextDocument } from './documents.js';
import { CancellationToken } from '../utils/cancellation.js';
import { stream } from '../utils/stream.js';
import { URI } from '../utils/uri-utils.js';

/**
 * A Langium document holds the parse result (AST and CST) and any additional state that is derived
 * from the AST, e.g. the result of scope precomputation.
 */
export interface LangiumDocument<T extends AstNode = AstNode> {
    /** The Uniform Resource Identifier (URI) of the document */
    readonly uri: URI;
    /** The text document used to convert between offsets and positions */
    readonly textDocument: TextDocument;
    /** The current state of the document */
    state: DocumentState;
    /** The parse result holds the Abstract Syntax Tree (AST) and potentially also parser / lexer errors */
    parseResult: ParseResult<T>;
    /** Result of the scope precomputation phase */
    precomputedScopes?: PrecomputedScopes;
    /** An array of all cross-references found in the AST while linking */
    references: Reference[];
    /** Result of the validation phase */
    diagnostics?: Diagnostic[]
}

/**
 * A document is subject to several phases that are run in predefined order. Any state value implies that
 * smaller state values are finished as well.
 */
export enum DocumentState {
    /**
     * The text content has changed and needs to be parsed again. The AST held by this outdated
     * document instance is no longer valid.
     */
    Changed = 0,
    /**
     * An AST has been created from the text content. The document structure can be traversed,
     * but cross-references cannot be resolved yet. If necessary, the structure can be manipulated
     * at this stage as a preprocessing step.
     */
    Parsed = 1,
    /**
     * The `IndexManager` service has processed AST nodes of this document. This means the
     * exported symbols are available in the global scope and can be resolved from other documents.
     */
    IndexedContent = 2,
    /**
     * The `ScopeComputation` service has processed this document. This means the local symbols
     * are stored in a MultiMap so they can be looked up by the `ScopeProvider` service.
     * Once a document has reached this state, you may follow every reference - it will lazily
     * resolve its `ref` property and yield either the target AST node or `undefined` in case
     * the target is not in scope.
     */
    ComputedScopes = 3,
    /**
     * The `Linker` service has processed this document. All outgoing references have been
     * resolved or marked as erroneous.
     */
    Linked = 4,
    /**
     * The `IndexManager` service has processed AST node references of this document. This is
     * necessary to determine which documents are affected by a change in one of the workspace
     * documents.
     */
    IndexedReferences = 5,
    /**
     * The `DocumentValidator` service has processed this document. The language server listens
     * to the results of this phase and sends diagnostics to the client.
     */
    Validated = 6
}

/**
 * Result of the scope precomputation phase (`ScopeComputation` service).
 * It maps every AST node to the set of symbols that are visible in the subtree of that node.
 */
export type PrecomputedScopes = MultiMap<AstNode, AstNodeDescription>

export interface DocumentSegment {
    readonly range: Range
    readonly offset: number
    readonly length: number
    readonly end: number
}

/**
 * Surrogate definition of the `TextDocuments` interface from the `vscode-languageserver` package.
 * No implementation object is expected to be offered by `LangiumCoreServices`, but only by `LangiumLSPServices`.
 */
export type TextDocumentProvider = {
    get(uri: string | URI): TextDocument | undefined
}

/**
 * Shared service for creating `LangiumDocument` instances.
 *
 * Register a custom implementation if special (additional) behavior is required for your language(s).
 * Note: If you specialize {@link fromString} or {@link fromTextDocument} you probably might want to
 * specialize {@link update}, too!
 */
export interface LangiumDocumentFactory {
    /**
     * Create a Langium document from a `TextDocument` (usually associated with a file).
     */
    fromTextDocument<T extends AstNode = AstNode>(textDocument: TextDocument, uri?: URI, options?: ParserOptions): LangiumDocument<T>;
    /**
     * Create a Langium document from a `TextDocument` asynchronously. This action can be cancelled if a cancellable parser implementation has been provided.
     */
    fromTextDocument<T extends AstNode = AstNode>(textDocument: TextDocument, uri: URI | undefined, cancellationToken: CancellationToken): Promise<LangiumDocument<T>>;

    /**
     * Create an Langium document from an in-memory string.
     */
    fromString<T extends AstNode = AstNode>(text: string, uri: URI, options?: ParserOptions): LangiumDocument<T>;
    /**
     * Create a Langium document from an in-memory string asynchronously. This action can be cancelled if a cancellable parser implementation has been provided.
     */
    fromString<T extends AstNode = AstNode>(text: string, uri: URI, cancellationToken: CancellationToken): Promise<LangiumDocument<T>>;

    /**
     * Create an Langium document from a model that has been constructed in memory.
     */
    fromModel<T extends AstNode = AstNode>(model: T, uri: URI): LangiumDocument<T>;

    /**
     * Create an Langium document from a specified `URI`. The factory will use the `FileSystemAccess` service to read the file.
     */
    fromUri<T extends AstNode = AstNode>(uri: URI, cancellationToken?: CancellationToken): Promise<LangiumDocument<T>>;

    /**
     * Update the given document after changes in the corresponding textual representation.
     * Method is called by the document builder after it has been requested to build an existing
     * document and the document's state is {@link DocumentState.Changed}.
     * The text parsing is expected to be done the same way as in {@link fromTextDocument}
     * and {@link fromString}.
     */
    update<T extends AstNode = AstNode>(document: LangiumDocument<T>, cancellationToken: CancellationToken): Promise<LangiumDocument<T>>
}

export class DefaultLangiumDocumentFactory implements LangiumDocumentFactory {

    protected readonly serviceRegistry: ServiceRegistry;
    protected readonly textDocuments?: TextDocumentProvider;
    protected readonly fileSystemProvider: FileSystemProvider;

    constructor(services: LangiumSharedCoreServices) {
        this.serviceRegistry = services.ServiceRegistry;
        this.textDocuments = services.workspace.TextDocuments;
        this.fileSystemProvider = services.workspace.FileSystemProvider;
    }

    async fromUri<T extends AstNode = AstNode>(uri: URI, cancellationToken = CancellationToken.None): Promise<LangiumDocument<T>> {
        const content = await this.fileSystemProvider.readFile(uri);
        return this.createAsync<T>(uri, content, cancellationToken);
    }

    fromTextDocument<T extends AstNode = AstNode>(textDocument: TextDocument, uri?: URI, options?: ParserOptions): LangiumDocument<T>;
    fromTextDocument<T extends AstNode = AstNode>(textDocument: TextDocument, uri: URI | undefined, cancellationToken: CancellationToken): Promise<LangiumDocument<T>>;
    fromTextDocument<T extends AstNode = AstNode>(textDocument: TextDocument, uri?: URI, token?: CancellationToken | ParserOptions): LangiumDocument<T> | Promise<LangiumDocument<T>> {
        uri = uri ?? URI.parse(textDocument.uri);
        if (CancellationToken.is(token)) {
            return this.createAsync<T>(uri, textDocument, token);
        } else {
            return this.create<T>(uri, textDocument, token);
        }
    }

    fromString<T extends AstNode = AstNode>(text: string, uri: URI, options?: ParserOptions): LangiumDocument<T>;
    fromString<T extends AstNode = AstNode>(text: string, uri: URI, cancellationToken: CancellationToken): Promise<LangiumDocument<T>>;
    fromString<T extends AstNode = AstNode>(text: string, uri: URI, token?: CancellationToken | ParserOptions): LangiumDocument<T> | Promise<LangiumDocument<T>> {
        if (CancellationToken.is(token)) {
            return this.createAsync<T>(uri, text, token);
        } else {
            return this.create<T>(uri, text, token);
        }
    }

    fromModel<T extends AstNode = AstNode>(model: T, uri: URI): LangiumDocument<T> {
        return this.create<T>(uri, { $model: model });
    }

    protected create<T extends AstNode = AstNode>(uri: URI, content: string | TextDocument | { $model: T }, options?: ParserOptions): LangiumDocument<T> {
        if (typeof content === 'string') {
            const parseResult = this.parse<T>(uri, content, options);
            return this.createLangiumDocument<T>(parseResult, uri, undefined, content);

        } else if ('$model' in content) {
            const parseResult = { value: content.$model, parserErrors: [], lexerErrors: [] };
            return this.createLangiumDocument<T>(parseResult, uri);

        } else {
            const parseResult = this.parse<T>(uri, content.getText(), options);
            return this.createLangiumDocument(parseResult, uri, content);
        }
    }

    protected async createAsync<T extends AstNode = AstNode>(uri: URI, content: string | TextDocument, cancelToken: CancellationToken): Promise<LangiumDocument<T>> {
        if (typeof content === 'string') {
            const parseResult = await this.parseAsync<T>(uri, content, cancelToken);
            return this.createLangiumDocument<T>(parseResult, uri, undefined, content);
        } else {
            const parseResult = await this.parseAsync<T>(uri, content.getText(), cancelToken);
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
    protected createLangiumDocument<T extends AstNode = AstNode>(parseResult: ParseResult<T>, uri: URI, textDocument?: TextDocument, text?: string): LangiumDocument<T> {
        let document: LangiumDocument<T>;
        if (textDocument) {
            document = {
                parseResult,
                uri,
                state: DocumentState.Parsed,
                references: [],
                textDocument
            };
        } else {
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
        (parseResult.value as Mutable<AstNode>).$document = document;
        return document;
    }

    async update<T extends AstNode = AstNode>(document: Mutable<LangiumDocument<T>>, cancellationToken: CancellationToken): Promise<LangiumDocument<T>> {
        // The CST full text property contains the original text that was used to create the AST.
        const oldText = document.parseResult.value.$cstNode?.root.fullText;
        const textDocument = this.textDocuments?.get(document.uri.toString());
        const text = textDocument ? textDocument.getText() : await this.fileSystemProvider.readFile(document.uri);

        if (textDocument) {
            Object.defineProperty(
                document,
                'textDocument',
                {
                    value: textDocument
                }
            );
        } else {
            const textDocumentGetter = this.createTextDocumentGetter(document.uri, text);
            Object.defineProperty(
                document,
                'textDocument',
                {
                    get: textDocumentGetter
                }
            );
        }

        // Some of these documents can be pretty large, so parsing them again can be quite expensive.
        // Therefore, we only parse if the text has actually changed.
        if (oldText !== text) {
            document.parseResult = await this.parseAsync(document.uri, text, cancellationToken);
            (document.parseResult.value as Mutable<AstNode>).$document = document;
        }
        document.state = DocumentState.Parsed;
        return document;
    }

    protected parse<T extends AstNode>(uri: URI, text: string, options?: ParserOptions): ParseResult<T> {
        const services = this.serviceRegistry.getServices(uri);
        return services.parser.LangiumParser.parse<T>(text, options);
    }

    protected parseAsync<T extends AstNode>(uri: URI, text: string, cancellationToken: CancellationToken): Promise<ParseResult<T>> {
        const services = this.serviceRegistry.getServices(uri);
        return services.parser.AsyncParser.parse<T>(text, cancellationToken);
    }

    protected createTextDocumentGetter(uri: URI, text?: string): () => TextDocument {
        const serviceRegistry = this.serviceRegistry;
        let textDoc: TextDocument | undefined = undefined;
        return () => {
            return textDoc ??= TextDocument.create(
                uri.toString(), serviceRegistry.getServices(uri).LanguageMetaData.languageId, 0, text ?? ''
            );
        };
    }
}

/**
 * Shared service for managing Langium documents.
 */
export interface LangiumDocuments {

    /**
     * A stream of all documents managed under this service.
     */
    readonly all: Stream<LangiumDocument>

    /**
     * Manage a new document under this service.
     * @throws an error if a document with the same URI is already present.
     */
    addDocument(document: LangiumDocument): void;

    /**
     * Retrieve the document with the given URI, if present. Otherwise returns `undefined`.
     */
    getDocument(uri: URI): LangiumDocument | undefined;

    /**
     * Retrieve the document with the given URI. If not present, a new one will be created using the file system access.
     * The new document will be added to the list of documents managed under this service.
     */
    getOrCreateDocument(uri: URI, cancellationToken?: CancellationToken): Promise<LangiumDocument>;

    /**
     * Creates a new document with the given URI and text content.
     * The new document is automatically added to this service and can be retrieved using {@link getDocument}.
     *
     * @throws an error if a document with the same URI is already present.
     */
    createDocument(uri: URI, text: string): LangiumDocument;

    /**
     * Creates a new document with the given URI and text content asynchronously.
     * The process can be interrupted with a cancellation token.
     * The new document is automatically added to this service and can be retrieved using {@link getDocument}.
     *
     * @throws an error if a document with the same URI is already present.
     */
    createDocument(uri: URI, text: string, cancellationToken: CancellationToken): Promise<LangiumDocument>;

    /**
     * Returns `true` if a document with the given URI is managed under this service.
     */
    hasDocument(uri: URI): boolean;

    /**
     * Flag the document with the given URI as `Changed`, if present, meaning that its content
     * is no longer valid. The content (parseResult) stays untouched, while internal data may
     * be dropped to reduce memory footprint.
     *
     * @returns the affected {@link LangiumDocument} if existing for convenience
     */
    invalidateDocument(uri: URI): LangiumDocument | undefined;

    /**
     * Remove the document with the given URI, if present, and mark it as `Changed`, meaning
     * that its content is no longer valid. The next call to `getOrCreateDocument` with the same
     * URI will create a new document instance.
     *
     * @returns the affected {@link LangiumDocument} if existing for convenience
     */
    deleteDocument(uri: URI): LangiumDocument | undefined;
}

export class DefaultLangiumDocuments implements LangiumDocuments {

    protected readonly langiumDocumentFactory: LangiumDocumentFactory;
    protected readonly serviceRegistry: ServiceRegistry;

    protected readonly documentMap: Map<string, LangiumDocument> = new Map();

    constructor(services: LangiumSharedCoreServices) {
        this.langiumDocumentFactory = services.workspace.LangiumDocumentFactory;
        this.serviceRegistry = services.ServiceRegistry;
    }

    get all(): Stream<LangiumDocument> {
        return stream(this.documentMap.values());
    }

    addDocument(document: LangiumDocument): void {
        const uriString = document.uri.toString();
        if (this.documentMap.has(uriString)) {
            throw new Error(`A document with the URI '${uriString}' is already present.`);
        }
        this.documentMap.set(uriString, document);
    }

    getDocument(uri: URI): LangiumDocument | undefined {
        const uriString = uri.toString();
        return this.documentMap.get(uriString);
    }

    async getOrCreateDocument(uri: URI, cancellationToken?: CancellationToken): Promise<LangiumDocument> {
        let document = this.getDocument(uri);
        if (document) {
            return document;
        }
        document = await this.langiumDocumentFactory.fromUri(uri, cancellationToken);
        this.addDocument(document);
        return document;
    }

    createDocument(uri: URI, text: string): LangiumDocument;
    createDocument(uri: URI, text: string, cancellationToken: CancellationToken): Promise<LangiumDocument>;
    createDocument(uri: URI, text: string, cancellationToken?: CancellationToken): LangiumDocument | Promise<LangiumDocument> {
        if (cancellationToken) {
            return this.langiumDocumentFactory.fromString(text, uri, cancellationToken).then(document => {
                this.addDocument(document);
                return document;
            });
        } else {
            const document = this.langiumDocumentFactory.fromString(text, uri);
            this.addDocument(document);
            return document;
        }
    }

    hasDocument(uri: URI): boolean {
        return this.documentMap.has(uri.toString());
    }

    invalidateDocument(uri: URI): LangiumDocument | undefined {
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

    deleteDocument(uri: URI): LangiumDocument | undefined {
        const uriString = uri.toString();
        const langiumDoc = this.documentMap.get(uriString);
        if (langiumDoc) {
            langiumDoc.state = DocumentState.Changed;
            this.documentMap.delete(uriString);
        }
        return langiumDoc;
    }
}
