import { GroupPlaybackControls } from 'motion-dom';
import { animateElements } from './animate-elements.mjs';

const createScopedWaapiAnimate = (scope) => {
    function scopedAnimate(elementOrSelector, keyframes, options) {
        return new GroupPlaybackControls(animateElements(elementOrSelector, keyframes, options, scope));
    }
    return scopedAnimate;
};
const animateMini = /*@__PURE__*/ createScopedWaapiAnimate();

export { animateMini, createScopedWaapiAnimate };
