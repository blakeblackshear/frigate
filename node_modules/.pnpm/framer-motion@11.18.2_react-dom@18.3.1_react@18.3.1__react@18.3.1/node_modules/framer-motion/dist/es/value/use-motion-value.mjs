import { useContext, useState, useEffect } from 'react';
import { motionValue } from './index.mjs';
import { MotionConfigContext } from '../context/MotionConfigContext.mjs';
import { useConstant } from '../utils/use-constant.mjs';

/**
 * Creates a `MotionValue` to track the state and velocity of a value.
 *
 * Usually, these are created automatically. For advanced use-cases, like use with `useTransform`, you can create `MotionValue`s externally and pass them into the animated component via the `style` prop.
 *
 * ```jsx
 * export const MyComponent = () => {
 *   const scale = useMotionValue(1)
 *
 *   return <motion.div style={{ scale }} />
 * }
 * ```
 *
 * @param initial - The initial state.
 *
 * @public
 */
function useMotionValue(initial) {
    const value = useConstant(() => motionValue(initial));
    /**
     * If this motion value is being used in static mode, like on
     * the Framer canvas, force components to rerender when the motion
     * value is updated.
     */
    const { isStatic } = useContext(MotionConfigContext);
    if (isStatic) {
        const [, setLatest] = useState(initial);
        useEffect(() => value.on("change", setLatest), []);
    }
    return value;
}

export { useMotionValue };
