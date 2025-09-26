import { useContext, useMemo } from 'react';
import { MotionContext } from './index.mjs';
import { getCurrentTreeVariants } from './utils.mjs';

function useCreateMotionContext(props) {
    const { initial, animate } = getCurrentTreeVariants(props, useContext(MotionContext));
    return useMemo(() => ({ initial, animate }), [variantLabelsAsDependency(initial), variantLabelsAsDependency(animate)]);
}
function variantLabelsAsDependency(prop) {
    return Array.isArray(prop) ? prop.join(" ") : prop;
}

export { useCreateMotionContext };
