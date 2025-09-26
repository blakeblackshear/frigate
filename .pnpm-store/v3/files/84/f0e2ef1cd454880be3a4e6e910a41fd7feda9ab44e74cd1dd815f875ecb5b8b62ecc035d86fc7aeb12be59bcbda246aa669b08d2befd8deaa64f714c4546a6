import { isDragActive } from './drag/state/is-active.mjs';
import { setupGesture } from './utils/setup.mjs';

/**
 * Filter out events that are not pointer events, or are triggering
 * while a Motion gesture is active.
 */
function filterEvents(callback) {
    return (event) => {
        if (event.pointerType === "touch" || isDragActive())
            return;
        callback(event);
    };
}
/**
 * Create a hover gesture. hover() is different to .addEventListener("pointerenter")
 * in that it has an easier syntax, filters out polyfilled touch events, interoperates
 * with drag gestures, and automatically removes the "pointerennd" event listener when the hover ends.
 *
 * @public
 */
function hover(elementOrSelector, onHoverStart, options = {}) {
    const [elements, eventOptions, cancel] = setupGesture(elementOrSelector, options);
    const onPointerEnter = filterEvents((enterEvent) => {
        const { target } = enterEvent;
        const onHoverEnd = onHoverStart(enterEvent);
        if (typeof onHoverEnd !== "function" || !target)
            return;
        const onPointerLeave = filterEvents((leaveEvent) => {
            onHoverEnd(leaveEvent);
            target.removeEventListener("pointerleave", onPointerLeave);
        });
        target.addEventListener("pointerleave", onPointerLeave, eventOptions);
    });
    elements.forEach((element) => {
        element.addEventListener("pointerenter", onPointerEnter, eventOptions);
    });
    return cancel;
}

export { hover };
