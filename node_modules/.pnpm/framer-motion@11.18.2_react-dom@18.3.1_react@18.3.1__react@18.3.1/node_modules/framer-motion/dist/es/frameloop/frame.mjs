import { noop } from 'motion-utils';
import { createRenderBatcher } from './batcher.mjs';

const { schedule: frame, cancel: cancelFrame, state: frameData, steps: frameSteps, } = createRenderBatcher(typeof requestAnimationFrame !== "undefined" ? requestAnimationFrame : noop, true);

export { cancelFrame, frame, frameData, frameSteps };
