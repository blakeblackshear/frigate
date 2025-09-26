/**
 * Create a worker manager.
 *
 * A worker manager is an object which deals with Monaco based web workers, such as cleanups and
 * idle timeouts.
 *
 * @param monaco - The Monaco editor module.
 * @param options - The options of the worker manager.
 * @returns The worker manager.
 */
export function createWorkerManager(monaco, options) {
    let { createData, interval = 30_000, label, moduleId, stopWhenIdleFor = 120_000 } = options;
    let worker;
    let lastUsedTime = 0;
    let disposed = false;
    const stopWorker = () => {
        if (worker) {
            worker.dispose();
            worker = undefined;
        }
    };
    const intervalId = setInterval(() => {
        if (!worker) {
            return;
        }
        const timePassedSinceLastUsed = Date.now() - lastUsedTime;
        if (timePassedSinceLastUsed > stopWhenIdleFor) {
            stopWorker();
        }
    }, interval);
    return {
        dispose() {
            disposed = true;
            clearInterval(intervalId);
            stopWorker();
        },
        getWorker(...resources) {
            if (disposed) {
                throw new Error('Worker manager has been disposed');
            }
            lastUsedTime = Date.now();
            if (!worker) {
                worker = monaco.editor.createWebWorker({
                    createData,
                    label,
                    moduleId,
                });
            }
            return worker.withSyncedResources(resources);
        },
        updateCreateData(newCreateData) {
            createData = newCreateData;
            stopWorker();
        },
    };
}
