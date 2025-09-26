import { useConstant } from '../../utils/use-constant.mjs';
import { useUnmountEffect } from '../../utils/use-unmount-effect.mjs';
import { createScopedWaapiAnimate } from '../animators/waapi/animate-style.mjs';

function useAnimateMini() {
    const scope = useConstant(() => ({
        current: null, // Will be hydrated by React
        animations: [],
    }));
    const animate = useConstant(() => createScopedWaapiAnimate(scope));
    useUnmountEffect(() => {
        scope.animations.forEach((animation) => animation.stop());
    });
    return [scope, animate];
}

export { useAnimateMini };
