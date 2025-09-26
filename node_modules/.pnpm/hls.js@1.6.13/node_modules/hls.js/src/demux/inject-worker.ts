// ensure the worker ends up in the bundle
// If the worker should not be included this gets aliased to empty.js
import './transmuxer-worker';
import { version } from '../version';

const workerStore: Record<string, WorkerContext> = {};

export function hasUMDWorker(): boolean {
  return typeof __HLS_WORKER_BUNDLE__ === 'function';
}

export type WorkerContext = {
  worker: Worker;
  objectURL?: string;
  scriptURL?: string;
  clientCount: number;
};

export function injectWorker(): WorkerContext {
  const workerContext = workerStore[version];
  if (workerContext) {
    workerContext.clientCount++;
    return workerContext;
  }
  const blob = new self.Blob(
    [
      `var exports={};var module={exports:exports};function define(f){f()};define.amd=true;(${__HLS_WORKER_BUNDLE__.toString()})(true);`,
    ],
    {
      type: 'text/javascript',
    },
  );
  const objectURL = self.URL.createObjectURL(blob);
  const worker = new self.Worker(objectURL);
  const result = {
    worker,
    objectURL,
    clientCount: 1,
  };
  workerStore[version] = result;
  return result;
}

export function loadWorker(path: string): WorkerContext {
  const workerContext = workerStore[path];
  if (workerContext) {
    workerContext.clientCount++;
    return workerContext;
  }
  const scriptURL = new self.URL(path, self.location.href).href;
  const worker = new self.Worker(scriptURL);
  const result = {
    worker,
    scriptURL,
    clientCount: 1,
  };
  workerStore[path] = result;
  return result;
}

export function removeWorkerFromStore(path?: string | null) {
  const workerContext = workerStore[path || version];
  if (workerContext) {
    const clientCount = workerContext.clientCount--;
    if (clientCount === 1) {
      const { worker, objectURL } = workerContext;
      delete workerStore[path || version];
      if (objectURL) {
        // revoke the Object URL that was used to create transmuxer worker, so as not to leak it
        self.URL.revokeObjectURL(objectURL);
      }
      worker.terminate();
    }
  }
}
