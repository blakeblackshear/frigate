import { resolveElements } from 'motion-dom';
import { isDOMKeyframes } from '../utils/is-dom-keyframes.mjs';

function resolveSubjects(subject, keyframes, scope, selectorCache) {
    if (typeof subject === "string" && isDOMKeyframes(keyframes)) {
        return resolveElements(subject, scope, selectorCache);
    }
    else if (subject instanceof NodeList) {
        return Array.from(subject);
    }
    else if (Array.isArray(subject)) {
        return subject;
    }
    else {
        return [subject];
    }
}

export { resolveSubjects };
