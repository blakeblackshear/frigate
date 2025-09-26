import { GroupPlaybackControls } from 'motion-dom';
import { animateSequence } from './sequence.mjs';
import { animateSubject } from './subject.mjs';

function isSequence(value) {
    return Array.isArray(value) && value.some(Array.isArray);
}
/**
 * Creates an animation function that is optionally scoped
 * to a specific element.
 */
function createScopedAnimate(scope) {
    /**
     * Implementation
     */
    function scopedAnimate(subjectOrSequence, optionsOrKeyframes, options) {
        let animations = [];
        if (isSequence(subjectOrSequence)) {
            animations = animateSequence(subjectOrSequence, optionsOrKeyframes, scope);
        }
        else {
            animations = animateSubject(subjectOrSequence, optionsOrKeyframes, options, scope);
        }
        const animation = new GroupPlaybackControls(animations);
        if (scope) {
            scope.animations.push(animation);
        }
        return animation;
    }
    return scopedAnimate;
}
const animate = createScopedAnimate();

export { animate, createScopedAnimate };
