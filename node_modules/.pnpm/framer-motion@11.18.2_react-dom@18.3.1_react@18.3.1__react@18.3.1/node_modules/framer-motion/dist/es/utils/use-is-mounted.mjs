import { useRef } from 'react';
import { useIsomorphicLayoutEffect } from './use-isomorphic-effect.mjs';

function useIsMounted() {
    const isMounted = useRef(false);
    useIsomorphicLayoutEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);
    return isMounted;
}

export { useIsMounted };
