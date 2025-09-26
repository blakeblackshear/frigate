import { GroupPlaybackControls } from 'motion-dom';
import { createAnimationsFromSequence } from '../../sequence/create.mjs';
import { animateElements } from './animate-elements.mjs';

function animateSequence(definition, options) {
    const animations = [];
    createAnimationsFromSequence(definition, options).forEach(({ keyframes, transition }, element) => {
        animations.push(...animateElements(element, keyframes, transition));
    });
    return new GroupPlaybackControls(animations);
}

export { animateSequence };
