import { stepsOrder } from './batcher.mjs';
import { frame, cancelFrame } from './frame.mjs';

/**
 * @deprecated
 *
 * Import as `frame` instead.
 */
const sync = frame;
/**
 * @deprecated
 *
 * Use cancelFrame(callback) instead.
 */
const cancelSync = stepsOrder.reduce((acc, key) => {
    acc[key] = (process) => cancelFrame(process);
    return acc;
}, {});

export { cancelSync, sync };
