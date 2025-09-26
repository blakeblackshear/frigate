import { useMotionValueEvent } from '../utils/use-motion-value-event.mjs';
import { useMotionValue } from './use-motion-value.mjs';
import { frame } from '../frameloop/frame.mjs';

/**
 * Creates a `MotionValue` that updates when the velocity of the provided `MotionValue` changes.
 *
 * ```javascript
 * const x = useMotionValue(0)
 * const xVelocity = useVelocity(x)
 * const xAcceleration = useVelocity(xVelocity)
 * ```
 *
 * @public
 */
function useVelocity(value) {
    const velocity = useMotionValue(value.getVelocity());
    const updateVelocity = () => {
        const latest = value.getVelocity();
        velocity.set(latest);
        /**
         * If we still have velocity, schedule an update for the next frame
         * to keep checking until it is zero.
         */
        if (latest)
            frame.update(updateVelocity);
    };
    useMotionValueEvent(value, "change", () => {
        // Schedule an update to this value at the end of the current frame.
        frame.update(updateVelocity, false, true);
    });
    return velocity;
}

export { useVelocity };
