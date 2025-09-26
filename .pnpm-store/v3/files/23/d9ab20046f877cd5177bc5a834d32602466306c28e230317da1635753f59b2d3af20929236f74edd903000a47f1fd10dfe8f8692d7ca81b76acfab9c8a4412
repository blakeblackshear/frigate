import { useState, useEffect } from 'react';
import { inView } from '../render/dom/viewport/index.mjs';

function useInView(ref, { root, margin, amount, once = false } = {}) {
    const [isInView, setInView] = useState(false);
    useEffect(() => {
        if (!ref.current || (once && isInView))
            return;
        const onEnter = () => {
            setInView(true);
            return once ? undefined : () => setInView(false);
        };
        const options = {
            root: (root && root.current) || undefined,
            margin,
            amount,
        };
        return inView(ref.current, onEnter, options);
    }, [root, ref, margin, once, amount]);
    return isInView;
}

export { useInView };
