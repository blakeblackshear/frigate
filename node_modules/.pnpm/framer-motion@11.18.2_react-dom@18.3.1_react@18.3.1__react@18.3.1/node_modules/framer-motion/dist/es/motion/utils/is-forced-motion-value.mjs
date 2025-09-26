import { scaleCorrectors } from '../../projection/styles/scale-correction.mjs';
import { transformProps } from '../../render/html/utils/keys-transform.mjs';

function isForcedMotionValue(key, { layout, layoutId }) {
    return (transformProps.has(key) ||
        key.startsWith("origin") ||
        ((layout || layoutId !== undefined) &&
            (!!scaleCorrectors[key] || key === "opacity")));
}

export { isForcedMotionValue };
