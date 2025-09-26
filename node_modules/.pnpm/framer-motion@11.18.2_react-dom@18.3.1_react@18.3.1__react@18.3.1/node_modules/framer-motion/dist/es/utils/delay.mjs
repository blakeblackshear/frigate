import { secondsToMilliseconds } from 'motion-utils';
import { time } from '../frameloop/sync-time.mjs';
import { frame, cancelFrame } from '../frameloop/frame.mjs';

/**
 * Timeout defined in ms
 */
function delay(callback, timeout) {
    const start = time.now();
    const checkElapsed = ({ timestamp }) => {
        const elapsed = timestamp - start;
        if (elapsed >= timeout) {
            cancelFrame(checkElapsed);
            callback(elapsed - timeout);
        }
    };
    frame.read(checkElapsed, true);
    return () => cancelFrame(checkElapsed);
}
function delayInSeconds(callback, timeout) {
    return delay(callback, secondsToMilliseconds(timeout));
}

export { delay, delayInSeconds };
