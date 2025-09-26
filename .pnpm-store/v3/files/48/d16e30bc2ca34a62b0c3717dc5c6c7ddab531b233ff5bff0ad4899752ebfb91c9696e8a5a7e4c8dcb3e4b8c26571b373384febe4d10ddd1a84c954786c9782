/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { CancellationToken } from '../utils/cancellation.js';
import type { LangiumCoreServices } from '../services.js';
import type { AstNode } from '../syntax-tree.js';
import type { LangiumParser, ParseResult } from './langium-parser.js';
import type { Hydrator } from '../serializer/hydrator.js';
import type { Event } from '../utils/event.js';
import { Deferred } from '../utils/promise-utils.js';
import { Emitter } from '../utils/event.js';
/**
 * Async parser that allows cancellation of the current parsing process.
 *
 * @remarks
 * The sync parser implementation is blocking the event loop, which can become quite problematic for large files.
 * The default implementation is not actually async. It just wraps the sync parser in a promise. A real implementation would create worker threads or web workers to offload the parsing work.
 */
export interface AsyncParser {
    /**
     * Parses the given text and returns the parse result.
     *
     * @param text The text to parse.
     * @param cancelToken A cancellation token that can be used to cancel the parsing process.
     * @returns A promise that resolves to the parse result.
     *
     * @throws `OperationCancelled` if the parsing process is cancelled.
     */
    parse<T extends AstNode>(text: string, cancelToken: CancellationToken): Promise<ParseResult<T>>;
}
/**
 * Default implementation of the async parser which simply wraps the sync parser in a promise.
 *
 * @remarks
 * A real implementation would create worker threads or web workers to offload the parsing work.
 */
export declare class DefaultAsyncParser implements AsyncParser {
    protected readonly syncParser: LangiumParser;
    constructor(services: LangiumCoreServices);
    parse<T extends AstNode>(text: string, _cancelToken: CancellationToken): Promise<ParseResult<T>>;
}
export declare abstract class AbstractThreadedAsyncParser implements AsyncParser {
    /**
     * The thread count determines how many threads are used to parse files in parallel.
     * The default value is 8. Decreasing this value increases startup performance, but decreases parallel parsing performance.
     */
    protected threadCount: number;
    /**
     * The termination delay determines how long the parser waits for a thread to finish after a cancellation request.
     * The default value is 200(ms).
     */
    protected terminationDelay: number;
    protected workerPool: ParserWorker[];
    protected queue: Array<Deferred<ParserWorker>>;
    protected readonly hydrator: Hydrator;
    constructor(services: LangiumCoreServices);
    protected initializeWorkers(): void;
    parse<T extends AstNode>(text: string, cancelToken: CancellationToken): Promise<ParseResult<T>>;
    protected terminateWorker(worker: ParserWorker): void;
    protected acquireParserWorker(cancelToken: CancellationToken): Promise<ParserWorker>;
    protected abstract createWorker(): ParserWorker;
}
export type WorkerMessagePost = (message: unknown) => void;
export type WorkerMessageCallback = (cb: (message: unknown) => void) => void;
export declare class ParserWorker {
    protected readonly sendMessage: WorkerMessagePost;
    protected readonly _terminate: () => void;
    protected readonly onReadyEmitter: Emitter<void>;
    protected deferred: Deferred<ParseResult>;
    protected _ready: boolean;
    protected _parsing: boolean;
    get ready(): boolean;
    get onReady(): Event<void>;
    constructor(sendMessage: WorkerMessagePost, onMessage: WorkerMessageCallback, onError: WorkerMessageCallback, terminate: () => void);
    terminate(): void;
    lock(): void;
    unlock(): void;
    parse(text: string): Promise<ParseResult>;
}
//# sourceMappingURL=async-parser.d.ts.map