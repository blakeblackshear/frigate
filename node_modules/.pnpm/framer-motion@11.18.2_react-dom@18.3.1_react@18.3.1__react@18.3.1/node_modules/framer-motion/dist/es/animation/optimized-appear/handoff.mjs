import { appearAnimationStore } from './store.mjs';
import { appearStoreId } from './store-id.mjs';

function handoffOptimizedAppearAnimation(elementId, valueName, frame) {
    var _a;
    const storeId = appearStoreId(elementId, valueName);
    const optimisedAnimation = appearAnimationStore.get(storeId);
    if (!optimisedAnimation) {
        return null;
    }
    const { animation, startTime } = optimisedAnimation;
    function cancelAnimation() {
        var _a;
        (_a = window.MotionCancelOptimisedAnimation) === null || _a === void 0 ? void 0 : _a.call(window, elementId, valueName, frame);
    }
    /**
     * We can cancel the animation once it's finished now that we've synced
     * with Motion.
     *
     * Prefer onfinish over finished as onfinish is backwards compatible with
     * older browsers.
     */
    animation.onfinish = cancelAnimation;
    if (startTime === null || ((_a = window.MotionHandoffIsComplete) === null || _a === void 0 ? void 0 : _a.call(window, elementId))) {
        /**
         * If the startTime is null, this animation is the Paint Ready detection animation
         * and we can cancel it immediately without handoff.
         *
         * Or if we've already handed off the animation then we're now interrupting it.
         * In which case we need to cancel it.
         */
        cancelAnimation();
        return null;
    }
    else {
        return startTime;
    }
}

export { handoffOptimizedAppearAnimation };
