import { memo } from 'motion-utils';
import { supportsFlags } from './flags.mjs';

function memoSupports(callback, supportsFlag) {
    const memoized = memo(callback);
    return () => { var _a; return (_a = supportsFlags[supportsFlag]) !== null && _a !== void 0 ? _a : memoized(); };
}

export { memoSupports };
