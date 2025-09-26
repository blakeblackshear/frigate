/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { Deferred, OperationCancelled } from '../utils/promise-utils.js';
import { Emitter } from '../utils/event.js';
/**
 * Default implementation of the async parser which simply wraps the sync parser in a promise.
 *
 * @remarks
 * A real implementation would create worker threads or web workers to offload the parsing work.
 */
export class DefaultAsyncParser {
    constructor(services) {
        this.syncParser = services.parser.LangiumParser;
    }
    parse(text, _cancelToken) {
        return Promise.resolve(this.syncParser.parse(text));
    }
}
export class AbstractThreadedAsyncParser {
    constructor(services) {
        /**
         * The thread count determines how many threads are used to parse files in parallel.
         * The default value is 8. Decreasing this value increases startup performance, but decreases parallel parsing performance.
         */
        this.threadCount = 8;
        /**
         * The termination delay determines how long the parser waits for a thread to finish after a cancellation request.
         * The default value is 200(ms).
         */
        this.terminationDelay = 200;
        this.workerPool = [];
        this.queue = [];
        this.hydrator = services.serializer.Hydrator;
    }
    initializeWorkers() {
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
    async parse(text, cancelToken) {
        const worker = await this.acquireParserWorker(cancelToken);
        const deferred = new Deferred();
        let timeout;
        // If the cancellation token is requested, we wait for a certain time before terminating the worker.
        // Since the cancellation token lives longer than the parsing process, we need to dispose the event listener.
        // Otherwise, we might accidentally terminate the worker after the parsing process has finished.
        const cancellation = cancelToken.onCancellationRequested(() => {
            timeout = setTimeout(() => {
                this.terminateWorker(worker);
            }, this.terminationDelay);
        });
        worker.parse(text).then(result => {
            const hydrated = this.hydrator.hydrate(result);
            deferred.resolve(hydrated);
        }).catch(err => {
            deferred.reject(err);
        }).finally(() => {
            cancellation.dispose();
            clearTimeout(timeout);
        });
        return deferred.promise;
    }
    terminateWorker(worker) {
        worker.terminate();
        const index = this.workerPool.indexOf(worker);
        if (index >= 0) {
            this.workerPool.splice(index, 1);
        }
    }
    async acquireParserWorker(cancelToken) {
        this.initializeWorkers();
        for (const worker of this.workerPool) {
            if (worker.ready) {
                worker.lock();
                return worker;
            }
        }
        const deferred = new Deferred();
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
}
export class ParserWorker {
    get ready() {
        return this._ready;
    }
    get onReady() {
        return this.onReadyEmitter.event;
    }
    constructor(sendMessage, onMessage, onError, terminate) {
        this.onReadyEmitter = new Emitter();
        this.deferred = new Deferred();
        this._ready = true;
        this._parsing = false;
        this.sendMessage = sendMessage;
        this._terminate = terminate;
        onMessage(result => {
            const parseResult = result;
            this.deferred.resolve(parseResult);
            this.unlock();
        });
        onError(error => {
            this.deferred.reject(error);
            this.unlock();
        });
    }
    terminate() {
        this.deferred.reject(OperationCancelled);
        this._terminate();
    }
    lock() {
        this._ready = false;
    }
    unlock() {
        this._parsing = false;
        this._ready = true;
        this.onReadyEmitter.fire();
    }
    parse(text) {
        if (this._parsing) {
            throw new Error('Parser worker is busy');
        }
        this._parsing = true;
        this.deferred = new Deferred();
        this.sendMessage(text);
        return this.deferred.promise;
    }
}
//# sourceMappingURL=async-parser.js.map