import { NativeAnimationControls } from './NativeAnimationControls.mjs';
import { convertMotionOptionsToNative } from './utils/convert-options.mjs';

class PseudoAnimation extends NativeAnimationControls {
    constructor(target, pseudoElement, valueName, keyframes, options) {
        const animationOptions = convertMotionOptionsToNative(valueName, keyframes, options);
        const animation = target.animate(animationOptions.keyframes, {
            pseudoElement,
            ...animationOptions.options,
        });
        super(animation);
    }
}

export { PseudoAnimation };
