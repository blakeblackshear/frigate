import { velocityPerSecond } from '../../../utils/velocity-per-second.mjs';

const velocitySampleDuration = 5; // ms
function calcGeneratorVelocity(resolveValue, t, current) {
    const prevT = Math.max(t - velocitySampleDuration, 0);
    return velocityPerSecond(current - resolveValue(prevT), t - prevT);
}

export { calcGeneratorVelocity };
