"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = executeSSGWorkerThreadTask;
const tslib_1 = require("tslib");
const node_worker_threads_1 = require("node:worker_threads");
const logger_1 = tslib_1.__importStar(require("@docusaurus/logger"));
const ssgRenderer_js_1 = require("./ssgRenderer.js");
// eslint-disable-next-line no-underscore-dangle
const workerId = process?.__tinypool_state__?.workerId;
if (!workerId) {
    throw new Error('SSG Worker Thread not executing in Tinypool context?');
}
const params = node_worker_threads_1.workerData?.[1]?.params;
if (!params) {
    throw new Error(`SSG Worker Thread workerData params missing`);
}
const WorkerLogPrefix = `SSG Worker ${logger_1.default.name(workerId)}`;
// We only load once the SSG rendered (expensive), NOT once per worker task
// TODO check potential memory leak?
const appRendererPromise = logger_1.PerfLogger.async(`${WorkerLogPrefix} - Initialization`, () => (0, ssgRenderer_js_1.loadSSGRenderer)({
    params,
}));
async function executeSSGWorkerThreadTask(task) {
    const appRenderer = await appRendererPromise;
    const ssgResults = await logger_1.PerfLogger.async(`${WorkerLogPrefix} - Task ${logger_1.default.name(task.id)} - Rendering ${logger_1.default.cyan(task.pathnames.length)} pathnames`, () => appRenderer.renderPathnames(task.pathnames));
    // Afaik it's not needed to shutdown here,
    // The thread pool destroys worker thread and releases worker thread memory
    // await appRenderer.shutdown();
    return ssgResults;
}
