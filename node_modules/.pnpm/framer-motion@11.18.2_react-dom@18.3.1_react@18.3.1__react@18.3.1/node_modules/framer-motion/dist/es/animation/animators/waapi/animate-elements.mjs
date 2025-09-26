import { resolveElements, getValueTransition } from 'motion-dom';
import { invariant, secondsToMilliseconds } from 'motion-utils';
import { NativeAnimation } from './NativeAnimation.mjs';

function animateElements(elementOrSelector, keyframes, options, scope) {
    const elements = resolveElements(elementOrSelector, scope);
    const numElements = elements.length;
    invariant(Boolean(numElements), "No valid element provided.");
    const animations = [];
    for (let i = 0; i < numElements; i++) {
        const element = elements[i];
        const elementTransition = { ...options };
        /**
         * Resolve stagger function if provided.
         */
        if (typeof elementTransition.delay === "function") {
            elementTransition.delay = elementTransition.delay(i, numElements);
        }
        for (const valueName in keyframes) {
            const valueKeyframes = keyframes[valueName];
            const valueOptions = {
                ...getValueTransition(elementTransition, valueName),
            };
            valueOptions.duration = valueOptions.duration
                ? secondsToMilliseconds(valueOptions.duration)
                : valueOptions.duration;
            valueOptions.delay = secondsToMilliseconds(valueOptions.delay || 0);
            animations.push(new NativeAnimation(element, valueName, valueKeyframes, valueOptions));
        }
    }
    return animations;
}

export { animateElements };
