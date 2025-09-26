import { motionValue } from '../../value/index.mjs';
import { isMotionValue } from '../../value/utils/is-motion-value.mjs';
import { animateMotionValue } from '../interfaces/motion-value.mjs';

function animateSingleValue(value, keyframes, options) {
    const motionValue$1 = isMotionValue(value) ? value : motionValue(value);
    motionValue$1.start(animateMotionValue("", motionValue$1, keyframes, options));
    return motionValue$1.animation;
}

export { animateSingleValue };
