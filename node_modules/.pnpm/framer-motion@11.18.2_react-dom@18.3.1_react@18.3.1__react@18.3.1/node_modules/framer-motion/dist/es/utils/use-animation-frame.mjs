import { useRef, useContext, useEffect } from 'react';
import { MotionConfigContext } from '../context/MotionConfigContext.mjs';
import { frame, cancelFrame } from '../frameloop/frame.mjs';

function useAnimationFrame(callback) {
    const initialTimestamp = useRef(0);
    const { isStatic } = useContext(MotionConfigContext);
    useEffect(() => {
        if (isStatic)
            return;
        const provideTimeSinceStart = ({ timestamp, delta }) => {
            if (!initialTimestamp.current)
                initialTimestamp.current = timestamp;
            callback(timestamp - initialTimestamp.current, delta);
        };
        frame.update(provideTimeSinceStart, true);
        return () => cancelFrame(provideTimeSinceStart);
    }, [callback]);
}

export { useAnimationFrame };
