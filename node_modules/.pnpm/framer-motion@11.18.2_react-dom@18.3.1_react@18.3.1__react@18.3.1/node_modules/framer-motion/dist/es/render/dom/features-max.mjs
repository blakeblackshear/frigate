import { drag } from '../../motion/features/drag.mjs';
import { layout } from '../../motion/features/layout.mjs';
import { domAnimation } from './features-animation.mjs';

/**
 * @public
 */
const domMax = {
    ...domAnimation,
    ...drag,
    ...layout,
};

export { domMax };
