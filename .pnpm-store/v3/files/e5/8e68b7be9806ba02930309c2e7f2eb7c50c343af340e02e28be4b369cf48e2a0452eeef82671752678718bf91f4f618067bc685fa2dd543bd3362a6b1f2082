import { isKeyframesTarget } from '../animation/utils/is-keyframes-target.mjs';

const isCustomValue = (v) => {
    return Boolean(v && typeof v === "object" && v.mix && v.toValue);
};
const resolveFinalValueInKeyframes = (v) => {
    // TODO maybe throw if v.length - 1 is placeholder token?
    return isKeyframesTarget(v) ? v[v.length - 1] || 0 : v;
};

export { isCustomValue, resolveFinalValueInKeyframes };
