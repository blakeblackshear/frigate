/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { LangiumCoreServices } from '../services.js';
import { ParserWorker } from '../parser/async-parser.js';
import { AbstractThreadedAsyncParser } from '../parser/async-parser.js';
import { Worker } from 'node:worker_threads';

export class WorkerThreadAsyncParser extends AbstractThreadedAsyncParser {

    protected workerPath: string | (() => string);

    constructor(services: LangiumCoreServices, workerPath: string | (() => string)) {
        super(services);
        this.workerPath = workerPath;
    }

    protected override createWorker(): ParserWorker {
        const path = typeof this.workerPath === 'function' ? this.workerPath() : this.workerPath;
        const worker = new Worker(path);
        const parserWorker = new WorkerThreadParserWorker(worker);
        return parserWorker;
    }

}

export class WorkerThreadParserWorker extends ParserWorker {

    constructor(worker: Worker) {
        super(
            (message) => worker.postMessage(message),
            cb => worker.on('message', cb),
            cb => worker.on('error', cb),
            () => worker.terminate()
        );
    }

}
