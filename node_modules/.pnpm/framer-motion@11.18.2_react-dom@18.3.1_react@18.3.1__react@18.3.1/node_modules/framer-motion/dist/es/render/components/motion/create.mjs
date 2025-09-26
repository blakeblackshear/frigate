import { animations } from '../../../motion/features/animations.mjs';
import { drag } from '../../../motion/features/drag.mjs';
import { gestureAnimations } from '../../../motion/features/gestures.mjs';
import { layout } from '../../../motion/features/layout.mjs';
import { createMotionComponentFactory } from '../create-factory.mjs';
import { createDomVisualElement } from '../../dom/create-visual-element.mjs';

const createMotionComponent = /*@__PURE__*/ createMotionComponentFactory({
    ...animations,
    ...gestureAnimations,
    ...drag,
    ...layout,
}, createDomVisualElement);

export { createMotionComponent };
