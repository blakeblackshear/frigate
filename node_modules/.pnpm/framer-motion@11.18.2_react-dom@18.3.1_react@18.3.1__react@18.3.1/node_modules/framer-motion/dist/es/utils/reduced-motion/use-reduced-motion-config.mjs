import { useContext } from 'react';
import { MotionConfigContext } from '../../context/MotionConfigContext.mjs';
import { useReducedMotion } from './use-reduced-motion.mjs';

function useReducedMotionConfig() {
    const reducedMotionPreference = useReducedMotion();
    const { reducedMotion } = useContext(MotionConfigContext);
    if (reducedMotion === "never") {
        return false;
    }
    else if (reducedMotion === "always") {
        return true;
    }
    else {
        return reducedMotionPreference;
    }
}

export { useReducedMotionConfig };
