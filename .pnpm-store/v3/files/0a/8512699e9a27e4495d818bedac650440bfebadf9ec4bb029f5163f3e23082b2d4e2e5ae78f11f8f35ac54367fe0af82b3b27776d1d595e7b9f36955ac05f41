"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeSSG = executeSSG;
const tslib_1 = require("tslib");
const path = tslib_1.__importStar(require("path"));
const node_url_1 = require("node:url");
const os_1 = tslib_1.__importDefault(require("os"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const logger_1 = tslib_1.__importStar(require("@docusaurus/logger"));
const ssgParams_1 = require("./ssgParams");
const ssgTemplate_1 = require("./ssgTemplate");
const ssgEnv_1 = require("./ssgEnv");
const ssgUtils_1 = require("./ssgUtils");
const ssgGlobalResult_1 = require("./ssgGlobalResult");
const ssgWorkerInline_1 = require("./ssgWorkerInline");
const createSimpleSSGExecutor = async ({ params, pathnames, }) => {
    return {
        run: () => {
            return logger_1.PerfLogger.async('SSG (current thread)', async () => {
                const ssgResults = await (0, ssgWorkerInline_1.executeSSGInlineTask)({
                    pathnames,
                    params,
                });
                return (0, ssgGlobalResult_1.createGlobalSSGResult)(ssgResults);
            });
        },
        destroy: async () => {
            // nothing to do
        },
    };
};
// Sensible default that gives decent performances
// It's hard to have a perfect formula that works for all hosts
// Each thread has some creation overhead
// Having 1 thread per cpu doesn't necessarily improve perf on small sites
// We want to ensure that we don't create a worker thread for less than x paths
function inferNumberOfThreads({ pageCount, cpuCount, minPagesPerCpu, }) {
    // Calculate "ideal" amount of threads based on the number of pages to render
    const threadsByWorkload = Math.ceil(pageCount / minPagesPerCpu);
    // Use the smallest of threadsByWorkload or cpuCount, ensuring min=1 thread
    return Math.max(1, Math.min(threadsByWorkload, cpuCount));
}
function getNumberOfThreads(pathnames) {
    if (typeof ssgEnv_1.SSGWorkerThreadCount !== 'undefined') {
        return ssgEnv_1.SSGWorkerThreadCount;
    }
    // See also https://github.com/tinylibs/tinypool/pull/108
    const cpuCount = 
    // TODO Docusaurus v4: bump node, availableParallelism() now always exists
    typeof os_1.default.availableParallelism === 'function'
        ? os_1.default.availableParallelism()
        : os_1.default.cpus().length;
    return inferNumberOfThreads({
        pageCount: pathnames.length,
        cpuCount,
        // These are "magic value" that we should refine based on user feedback
        // Local tests show that it's not worth spawning new workers for few pages
        minPagesPerCpu: 100,
    });
}
const createPooledSSGExecutor = async ({ params, pathnames, }) => {
    const numberOfThreads = getNumberOfThreads(pathnames);
    // When the inferred or provided number of threads is just 1
    // It's not worth it to use a thread pool
    // This also allows users to disable the thread pool with the env variable
    // DOCUSAURUS_SSG_WORKER_THREADS=1
    if (numberOfThreads === 1) {
        return createSimpleSSGExecutor({ params, pathnames });
    }
    const pool = await logger_1.PerfLogger.async(`Create SSG thread pool - ${logger_1.default.cyan(numberOfThreads)} threads`, async () => {
        const Tinypool = await import('tinypool').then((m) => m.default);
        const workerURL = (0, node_url_1.pathToFileURL)(path.resolve(__dirname, 'ssgWorkerThread.js'));
        return new Tinypool({
            filename: workerURL.pathname,
            minThreads: numberOfThreads,
            maxThreads: numberOfThreads,
            concurrentTasksPerWorker: 1,
            runtime: 'worker_threads',
            isolateWorkers: false,
            workerData: { params },
            // WORKER MEMORY MANAGEMENT
            // Allows containing SSG memory leaks with a thread recycling workaround
            // See https://github.com/facebook/docusaurus/pull/11166
            // See https://github.com/facebook/docusaurus/issues/11161
            maxMemoryLimitBeforeRecycle: ssgEnv_1.SSGWorkerThreadRecyclerMaxMemory,
            resourceLimits: {
            // For some reason I can't figure out how to limit memory on a worker
            // See https://x.com/sebastienlorber/status/1920781195618513143
            },
        });
    });
    const pathnamesChunks = lodash_1.default.chunk(pathnames, ssgEnv_1.SSGWorkerThreadTaskSize);
    // Tiny wrapper for type-safety
    const submitTask = async (task) => {
        const result = await pool.run(task);
        // Note, we don't use PerfLogger.async() because all tasks are submitted
        // immediately at once and queued, while results are received progressively
        logger_1.PerfLogger.log(`Result for task ${logger_1.default.name(task.id)}`);
        return result;
    };
    return {
        run: async () => {
            const results = await logger_1.PerfLogger.async(`Thread pool`, async () => {
                return Promise.all(pathnamesChunks.map((taskPathnames, taskIndex) => {
                    return submitTask({
                        id: taskIndex + 1,
                        pathnames: taskPathnames,
                    });
                }));
            });
            const allResults = results.flat();
            return (0, ssgGlobalResult_1.createGlobalSSGResult)(allResults);
        },
        destroy: async () => {
            await pool.destroy();
        },
    };
};
async function executeSSG({ props, serverBundlePath, clientManifestPath, router, }) {
    const params = await (0, ssgParams_1.createSSGParams)({
        serverBundlePath,
        clientManifestPath,
        props,
    });
    // TODO doesn't look like the appropriate place for hash router entry
    if (router === 'hash') {
        logger_1.PerfLogger.start('Generate Hash Router entry point');
        const content = await (0, ssgTemplate_1.renderHashRouterTemplate)({ params });
        await (0, ssgUtils_1.generateHashRouterEntrypoint)({ content, params });
        logger_1.PerfLogger.end('Generate Hash Router entry point');
        return { collectedData: {} };
    }
    const createExecutor = props.siteConfig.future.experimental_faster
        .ssgWorkerThreads
        ? createPooledSSGExecutor
        : createSimpleSSGExecutor;
    const executor = await createExecutor({ params, pathnames: props.routesPaths });
    const result = await executor.run();
    await executor.destroy();
    return result;
}
