/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { ParserWorker } from '../parser/async-parser.js';
import { AbstractThreadedAsyncParser } from '../parser/async-parser.js';
import { Worker } from 'node:worker_threads';
export class WorkerThreadAsyncParser extends AbstractThreadedAsyncParser {
    constructor(services, workerPath) {
        super(services);
        this.workerPath = workerPath;
    }
    createWorker() {
        const path = typeof this.workerPath === 'function' ? this.workerPath() : this.workerPath;
        const worker = new Worker(path);
        const parserWorker = new WorkerThreadParserWorker(worker);
        return parserWorker;
    }
}
export class WorkerThreadParserWorker extends ParserWorker {
    constructor(worker) {
        super((message) => worker.postMessage(message), cb => worker.on('message', cb), cb => worker.on('error', cb), () => worker.terminate());
    }
}
//# sourceMappingURL=worker-thread-async-parser.js.map