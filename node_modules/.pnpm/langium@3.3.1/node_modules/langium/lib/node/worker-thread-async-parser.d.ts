/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
/// <reference types="node" resolution-mode="require"/>
import type { LangiumCoreServices } from '../services.js';
import { ParserWorker } from '../parser/async-parser.js';
import { AbstractThreadedAsyncParser } from '../parser/async-parser.js';
import { Worker } from 'node:worker_threads';
export declare class WorkerThreadAsyncParser extends AbstractThreadedAsyncParser {
    protected workerPath: string | (() => string);
    constructor(services: LangiumCoreServices, workerPath: string | (() => string));
    protected createWorker(): ParserWorker;
}
export declare class WorkerThreadParserWorker extends ParserWorker {
    constructor(worker: Worker);
}
//# sourceMappingURL=worker-thread-async-parser.d.ts.map