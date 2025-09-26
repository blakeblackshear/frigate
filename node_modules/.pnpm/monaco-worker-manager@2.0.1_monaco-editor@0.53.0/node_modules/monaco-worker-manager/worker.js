import { initialize as initializeWorker } from 'monaco-editor/esm/vs/editor/editor.worker.js';
/**
 * Create a web worker proxy.
 *
 * @param fn - The function that creates the web worker.
 */
export function initialize(fn) {
    self.onmessage = () => {
        initializeWorker((ctx, createData) => Object.create(fn(ctx, createData)));
    };
}
