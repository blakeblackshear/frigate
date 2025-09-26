import { createRenderBatcher } from './batcher.mjs';

const { schedule: microtask, cancel: cancelMicrotask } = createRenderBatcher(queueMicrotask, false);

export { cancelMicrotask, microtask };
