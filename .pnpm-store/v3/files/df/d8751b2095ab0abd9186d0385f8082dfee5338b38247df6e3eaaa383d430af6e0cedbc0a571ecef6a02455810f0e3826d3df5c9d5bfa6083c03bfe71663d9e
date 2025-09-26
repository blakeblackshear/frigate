import { useEffect } from 'react';

function useUnmountEffect(callback) {
    return useEffect(() => () => callback(), []);
}

export { useUnmountEffect };
