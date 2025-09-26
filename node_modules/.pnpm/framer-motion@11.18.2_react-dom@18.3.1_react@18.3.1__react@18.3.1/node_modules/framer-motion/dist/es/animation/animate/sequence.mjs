import { spring } from '../generators/spring/index.mjs';
import { createAnimationsFromSequence } from '../sequence/create.mjs';
import { animateSubject } from './subject.mjs';

function animateSequence(sequence, options, scope) {
    const animations = [];
    const animationDefinitions = createAnimationsFromSequence(sequence, options, scope, { spring });
    animationDefinitions.forEach(({ keyframes, transition }, subject) => {
        animations.push(...animateSubject(subject, keyframes, transition));
    });
    return animations;
}

export { animateSequence };
