import { useAnimationFrame } from '../utils/use-animation-frame.mjs';
import { useMotionValue } from './use-motion-value.mjs';

function useTime() {
    const time = useMotionValue(0);
    useAnimationFrame((t) => time.set(t));
    return time;
}

export { useTime };
