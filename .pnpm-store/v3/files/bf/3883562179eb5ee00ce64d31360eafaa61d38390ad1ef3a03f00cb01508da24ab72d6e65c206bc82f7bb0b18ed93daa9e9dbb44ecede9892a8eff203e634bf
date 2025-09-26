import module from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parentPort, workerData, } from 'node:worker_threads';
import { MODULE_REGISTER_SUPPORTED } from './constants.js';
import { extractProperties, overrideStdio, startWorkerThread, } from './helpers.js';
export * from './common.js';
export * from './constants.js';
export * from './helpers.js';
export * from './types.js';
let syncFnCache;
export function createSyncFn(workerPath, timeoutOrOptions) {
    syncFnCache ?? (syncFnCache = new Map());
    if (typeof workerPath !== 'string' || workerPath.startsWith('file://')) {
        workerPath = fileURLToPath(workerPath);
    }
    const cachedSyncFn = syncFnCache.get(workerPath);
    if (cachedSyncFn) {
        return cachedSyncFn;
    }
    if (!path.isAbsolute(workerPath)) {
        throw new Error('`workerPath` must be absolute');
    }
    const syncFn = startWorkerThread(workerPath, typeof timeoutOrOptions === 'number'
        ? { timeout: timeoutOrOptions }
        : timeoutOrOptions);
    syncFnCache.set(workerPath, syncFn);
    return syncFn;
}
export function runAsWorker(fn) {
    if (!workerData) {
        return;
    }
    const stdio = [];
    overrideStdio(stdio);
    const { workerPort, sharedBufferView, pnpLoaderPath } = workerData;
    if (pnpLoaderPath && MODULE_REGISTER_SUPPORTED) {
        module.register(pnpLoaderPath);
    }
    parentPort.on('message', ({ id, args }) => {
        ;
        (async () => {
            let isAborted = false;
            const handleAbortMessage = (msg) => {
                if (msg.id === id && msg.cmd === 'abort') {
                    isAborted = true;
                }
            };
            workerPort.on('message', handleAbortMessage);
            let msg;
            try {
                msg = { id, stdio, result: await fn(...args) };
            }
            catch (error) {
                msg = { id, stdio, error, properties: extractProperties(error) };
            }
            workerPort.off('message', handleAbortMessage);
            if (isAborted) {
                stdio.length = 0;
                return;
            }
            try {
                workerPort.postMessage(msg);
                Atomics.add(sharedBufferView, 0, 1);
                Atomics.notify(sharedBufferView, 0);
            }
            finally {
                stdio.length = 0;
            }
        })();
    });
}
//# sourceMappingURL=index.js.map