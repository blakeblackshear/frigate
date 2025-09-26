"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerfLogger = void 0;
const tslib_1 = require("tslib");
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const async_hooks_1 = require("async_hooks");
const logger_1 = tslib_1.__importDefault(require("./logger"));
// For now this is a private env variable we use internally
// But we'll want to expose this feature officially some day
const PerfDebuggingEnabled = process.env.DOCUSAURUS_PERF_LOGGER === 'true';
const Thresholds = {
    min: 5,
    yellow: 100,
    red: 1000,
};
const PerfPrefix = logger_1.default.yellow(`[PERF]`);
// This is what enables to "see the parent stack" for each log
// Parent1 > Parent2 > Parent3 > child trace
const ParentPrefix = new async_hooks_1.AsyncLocalStorage();
function applyParentPrefix(label) {
    const parentPrefix = ParentPrefix.getStore();
    return parentPrefix ? `${parentPrefix} > ${label}` : label;
}
function getMemory() {
    // Before reading memory stats, we explicitly call the GC
    // Note: this only works when Node.js option "--expose-gc" is provided
    globalThis.gc?.();
    return process.memoryUsage();
}
function createPerfLogger() {
    if (!PerfDebuggingEnabled) {
        const noop = () => { };
        return {
            start: noop,
            end: noop,
            log: noop,
            async: async (_label, asyncFn) => asyncFn(),
        };
    }
    const formatDuration = (duration) => {
        if (duration > Thresholds.red) {
            return logger_1.default.red(`${(duration / 1000).toFixed(2)} seconds!`);
        }
        else if (duration > Thresholds.yellow) {
            return logger_1.default.yellow(`${duration.toFixed(2)} ms`);
        }
        else {
            return logger_1.default.green(`${duration.toFixed(2)} ms`);
        }
    };
    const formatBytesToMb = (bytes) => logger_1.default.cyan(`${(bytes / 1024 / 1024).toFixed(0)}mb`);
    const formatMemoryDelta = (memory) => {
        return logger_1.default.dim(`(Heap ${formatBytesToMb(memory.before.heapUsed)} -> ${formatBytesToMb(memory.after.heapUsed)} / Total ${formatBytesToMb(memory.after.heapTotal)})`);
    };
    const formatMemoryCurrent = () => {
        const memory = getMemory();
        return logger_1.default.dim(`(Heap ${formatBytesToMb(memory.heapUsed)} / Total ${formatBytesToMb(memory.heapTotal)})`);
    };
    const formatStatus = (error) => {
        return error ? logger_1.default.red('[KO]') : ''; // logger.green('[OK]');
    };
    const printPerfLog = ({ label, duration, memory, error, }) => {
        if (duration < Thresholds.min) {
            return;
        }
        console.log(`${PerfPrefix}${formatStatus(error)} ${label} - ${formatDuration(duration)} - ${formatMemoryDelta(memory)}`);
    };
    const start = (label) => performance.mark(label, {
        detail: {
            memoryUsage: getMemory(),
        },
    });
    const readMark = (label) => {
        const startMark = performance.getEntriesByName(label, 'mark')?.[0];
        if (!startMark) {
            throw new Error(`No performance start mark for label=${label}`);
        }
        performance.clearMarks(label);
        return startMark;
    };
    const end = (label) => {
        const startMark = readMark(label);
        const duration = performance.now() - startMark.startTime;
        const { detail: { memoryUsage }, } = startMark;
        printPerfLog({
            label: applyParentPrefix(label),
            duration,
            memory: {
                before: memoryUsage,
                after: getMemory(),
            },
            error: undefined,
        });
    };
    const log = (label) => console.log(`${PerfPrefix} ${applyParentPrefix(label)} - ${formatMemoryCurrent()}`);
    const async = async (label, asyncFn) => {
        const finalLabel = applyParentPrefix(label);
        const before = performance.now();
        const memoryBefore = getMemory();
        const asyncEnd = ({ error }) => {
            const memoryAfter = getMemory();
            const duration = performance.now() - before;
            printPerfLog({
                error,
                label: finalLabel,
                duration,
                memory: {
                    before: memoryBefore,
                    after: memoryAfter,
                },
            });
        };
        try {
            const result = await ParentPrefix.run(finalLabel, () => asyncFn());
            asyncEnd({ error: undefined });
            return result;
        }
        catch (e) {
            asyncEnd({ error: e });
            throw e;
        }
    };
    return {
        start,
        end,
        log,
        async,
    };
}
exports.PerfLogger = createPerfLogger();
//# sourceMappingURL=perfLogger.js.map