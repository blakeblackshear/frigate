import { invariant } from 'motion-utils';
import { visualElementStore } from '../../render/store.mjs';
import { isMotionValue } from '../../value/utils/is-motion-value.mjs';
import { animateTarget } from '../interfaces/visual-element-target.mjs';
import { createDOMVisualElement, createObjectVisualElement } from '../utils/create-visual-element.mjs';
import { isDOMKeyframes } from '../utils/is-dom-keyframes.mjs';
import { resolveSubjects } from './resolve-subjects.mjs';
import { animateSingleValue } from './single-value.mjs';

function isSingleValue(subject, keyframes) {
    return (isMotionValue(subject) ||
        typeof subject === "number" ||
        (typeof subject === "string" && !isDOMKeyframes(keyframes)));
}
/**
 * Implementation
 */
function animateSubject(subject, keyframes, options, scope) {
    const animations = [];
    if (isSingleValue(subject, keyframes)) {
        animations.push(animateSingleValue(subject, isDOMKeyframes(keyframes)
            ? keyframes.default || keyframes
            : keyframes, options ? options.default || options : options));
    }
    else {
        const subjects = resolveSubjects(subject, keyframes, scope);
        const numSubjects = subjects.length;
        invariant(Boolean(numSubjects), "No valid elements provided.");
        for (let i = 0; i < numSubjects; i++) {
            const thisSubject = subjects[i];
            const createVisualElement = thisSubject instanceof Element
                ? createDOMVisualElement
                : createObjectVisualElement;
            if (!visualElementStore.has(thisSubject)) {
                createVisualElement(thisSubject);
            }
            const visualElement = visualElementStore.get(thisSubject);
            const transition = { ...options };
            /**
             * Resolve stagger function if provided.
             */
            if ("delay" in transition &&
                typeof transition.delay === "function") {
                transition.delay = transition.delay(i, numSubjects);
            }
            animations.push(...animateTarget(visualElement, { ...keyframes, transition }, {}));
        }
    }
    return animations;
}

export { animateSubject };
