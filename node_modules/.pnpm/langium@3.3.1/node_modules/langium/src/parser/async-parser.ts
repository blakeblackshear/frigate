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
import { Deferred, OperationCancelled } from '../utils/promise-utils.js';
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
export class DefaultAsyncParser implements AsyncParser {

    protected readonly syncParser: LangiumParser;

    constructor(services: LangiumCoreServices) {
        this.syncParser = services.parser.LangiumParser;
    }

    parse<T extends AstNode>(text: string, _cancelToken: CancellationToken): Promise<ParseResult<T>> {
        return Promise.resolve(this.syncParser.parse<T>(text));
    }
}

export abstract class AbstractThreadedAsyncParser implements AsyncParser {

    /**
     * The thread count determines how many threads are used to parse files in parallel.
     * The default value is 8. Decreasing this value increases startup performance, but decreases parallel parsing performance.
     */
    protected threadCount = 8;
    /**
     * The termination delay determines how long the parser waits for a thread to finish after a cancellation request.
     * The default value is 200(ms).
     */
    protected terminationDelay = 200;
    protected workerPool: ParserWorker[] = [];
    protected queue: Array<Deferred<ParserWorker>> = [];

    protected readonly hydrator: Hydrator;

    constructor(services: LangiumCoreServices) {
        this.hydrator = services.serializer.Hydrator;
    }

    protected initializeWorkers(): void {
        while (this.workerPool.length < this.threadCount) {
            const worker = this.createWorker();
            worker.onReady(() => {
                if (this.queue.length > 0) {
                    const deferred = this.queue.shift();
                    if (deferred) {
                        worker.lock();
                        deferred.resolve(worker);
                    }
                }
            });
            this.workerPool.push(worker);
        }
    }

    async parse<T extends AstNode>(text: string, cancelToken: CancellationToken): Promise<ParseResult<T>> {
        const worker = await this.acquireParserWorker(cancelToken);
        const deferred = new Deferred<ParseResult<T>>();
        let timeout: NodeJS.Timeout | undefined;
        // If the cancellation token is requested, we wait for a certain time before terminating the worker.
        // Since the cancellation token lives longer than the parsing process, we need to dispose the event listener.
        // Otherwise, we might accidentally terminate the worker after the parsing process has finished.
        const cancellation = cancelToken.onCancellationRequested(() => {
            timeout = setTimeout(() => {
                this.terminateWorker(worker);
            }, this.terminationDelay);
        });
        worker.parse(text).then(result => {
            const hydrated = this.hydrator.hydrate<T>(result);
            deferred.resolve(hydrated);
        }).catch(err => {
            deferred.reject(err);
        }).finally(() => {
            cancellation.dispose();
            clearTimeout(timeout);
        });
        return deferred.promise;
    }

    protected terminateWorker(worker: ParserWorker): void {
        worker.terminate();
        const index = this.workerPool.indexOf(worker);
        if (index >= 0) {
            this.workerPool.splice(index, 1);
        }
    }

    protected async acquireParserWorker(cancelToken: CancellationToken): Promise<ParserWorker> {
        this.initializeWorkers();
        for (const worker of this.workerPool) {
            if (worker.ready) {
                worker.lock();
                return worker;
            }
        }
        const deferred = new Deferred<ParserWorker>();
        cancelToken.onCancellationRequested(() => {
            const index = this.queue.indexOf(deferred);
            if (index >= 0) {
                this.queue.splice(index, 1);
            }
            deferred.reject(OperationCancelled);
        });
        this.queue.push(deferred);
        return deferred.promise;
    }

    protected abstract createWorker(): ParserWorker;
}

export type WorkerMessagePost = (message: unknown) => void;
export type WorkerMessageCallback = (cb: (message: unknown) => void) => void;

export class ParserWorker {

    protected readonly sendMessage: WorkerMessagePost;
    protected readonly _terminate: () => void;
    protected readonly onReadyEmitter = new Emitter<void>();

    protected deferred = new Deferred<ParseResult>();
    protected _ready = true;
    protected _parsing = false;

    get ready(): boolean {
        return this._ready;
    }

    get onReady(): Event<void> {
        return this.onReadyEmitter.event;
    }

    constructor(sendMessage: WorkerMessagePost, onMessage: WorkerMessageCallback, onError: WorkerMessageCallback, terminate: () => void) {
        this.sendMessage = sendMessage;
        this._terminate = terminate;
        onMessage(result => {
            const parseResult = result as ParseResult;
            this.deferred.resolve(parseResult);
            this.unlock();
        });
        onError(error => {
            this.deferred.reject(error);
            this.unlock();
        });
    }

    terminate(): void {
        this.deferred.reject(OperationCancelled);
        this._terminate();
    }

    lock(): void {
        this._ready = false;
    }

    unlock(): void {
        this._parsing = false;
        this._ready = true;
        this.onReadyEmitter.fire();
    }

    parse(text: string): Promise<ParseResult> {
        if (this._parsing) {
            throw new Error('Parser worker is busy');
        }
        this._parsing = true;
        this.deferred = new Deferred();
        this.sendMessage(text);
        return this.deferred.promise;
    }
}
