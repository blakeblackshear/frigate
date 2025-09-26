import { useCallback } from 'react';
import { rootProjectionNode } from './node/HTMLProjectionNode.mjs';

function useResetProjection() {
    const reset = useCallback(() => {
        const root = rootProjectionNode.current;
        if (!root)
            return;
        root.resetTree();
    }, []);
    return reset;
}

export { useResetProjection };
