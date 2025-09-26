import { collectMotionValues } from './index.mjs';
import { useCombineMotionValues } from './use-combine-values.mjs';

function useComputed(compute) {
    /**
     * Open session of collectMotionValues. Any MotionValue that calls get()
     * will be saved into this array.
     */
    collectMotionValues.current = [];
    compute();
    const value = useCombineMotionValues(collectMotionValues.current, compute);
    /**
     * Synchronously close session of collectMotionValues.
     */
    collectMotionValues.current = undefined;
    return value;
}

export { useComputed };
