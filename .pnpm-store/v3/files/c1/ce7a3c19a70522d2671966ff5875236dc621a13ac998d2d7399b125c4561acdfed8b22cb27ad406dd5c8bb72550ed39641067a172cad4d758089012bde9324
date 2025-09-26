import { warnOnce } from '../../utils/warn-once.mjs';
import { useScroll } from '../use-scroll.mjs';

/**
 * @deprecated useViewportScroll is deprecated. Convert to useScroll()
 */
function useViewportScroll() {
    if (process.env.NODE_ENV !== "production") {
        warnOnce(false, "useViewportScroll is deprecated. Convert to useScroll().");
    }
    return useScroll();
}

export { useViewportScroll };
