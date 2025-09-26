import { motionValue } from './index.mjs';
import { useConstant } from '../utils/use-constant.mjs';
import { useEffect } from 'react';
import { warning } from 'motion-utils';
import { scroll } from '../render/dom/scroll/index.mjs';
import { useIsomorphicLayoutEffect } from '../utils/use-isomorphic-effect.mjs';

function refWarning(name, ref) {
    warning(Boolean(!ref || ref.current), `You have defined a ${name} options but the provided ref is not yet hydrated, probably because it's defined higher up the tree. Try calling useScroll() in the same component as the ref, or setting its \`layoutEffect: false\` option.`);
}
const createScrollMotionValues = () => ({
    scrollX: motionValue(0),
    scrollY: motionValue(0),
    scrollXProgress: motionValue(0),
    scrollYProgress: motionValue(0),
});
function useScroll({ container, target, layoutEffect = true, ...options } = {}) {
    const values = useConstant(createScrollMotionValues);
    const useLifecycleEffect = layoutEffect
        ? useIsomorphicLayoutEffect
        : useEffect;
    useLifecycleEffect(() => {
        refWarning("target", target);
        refWarning("container", container);
        return scroll((_progress, { x, y }) => {
            values.scrollX.set(x.current);
            values.scrollXProgress.set(x.progress);
            values.scrollY.set(y.current);
            values.scrollYProgress.set(y.progress);
        }, {
            ...options,
            container: (container === null || container === void 0 ? void 0 : container.current) || undefined,
            target: (target === null || target === void 0 ? void 0 : target.current) || undefined,
        });
    }, [container, target, JSON.stringify(options.offset)]);
    return values;
}

export { useScroll };
