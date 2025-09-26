import { warnOnce } from '../../utils/warn-once.mjs';
import { useScroll } from '../use-scroll.mjs';

/**
 * @deprecated useElementScroll is deprecated. Convert to useScroll({ container: ref })
 */
function useElementScroll(ref) {
    if (process.env.NODE_ENV === "development") {
        warnOnce(false, "useElementScroll is deprecated. Convert to useScroll({ container: ref }).");
    }
    return useScroll({ container: ref });
}

export { useElementScroll };
