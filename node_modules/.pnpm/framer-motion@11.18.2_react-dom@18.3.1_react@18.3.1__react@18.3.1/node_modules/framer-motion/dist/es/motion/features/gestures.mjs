import { HoverGesture } from '../../gestures/hover.mjs';
import { FocusGesture } from '../../gestures/focus.mjs';
import { PressGesture } from '../../gestures/press.mjs';
import { InViewFeature } from './viewport/index.mjs';

const gestureAnimations = {
    inView: {
        Feature: InViewFeature,
    },
    tap: {
        Feature: PressGesture,
    },
    focus: {
        Feature: FocusGesture,
    },
    hover: {
        Feature: HoverGesture,
    },
};

export { gestureAnimations };
