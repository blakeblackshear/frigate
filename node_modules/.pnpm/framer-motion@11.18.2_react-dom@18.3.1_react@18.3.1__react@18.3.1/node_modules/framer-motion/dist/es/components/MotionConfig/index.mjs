"use client";
import { jsx } from 'react/jsx-runtime';
import { useContext, useMemo } from 'react';
import { MotionConfigContext } from '../../context/MotionConfigContext.mjs';
import { loadExternalIsValidProp } from '../../render/dom/utils/filter-props.mjs';
import { useConstant } from '../../utils/use-constant.mjs';

/**
 * `MotionConfig` is used to set configuration options for all children `motion` components.
 *
 * ```jsx
 * import { motion, MotionConfig } from "framer-motion"
 *
 * export function App() {
 *   return (
 *     <MotionConfig transition={{ type: "spring" }}>
 *       <motion.div animate={{ x: 100 }} />
 *     </MotionConfig>
 *   )
 * }
 * ```
 *
 * @public
 */
function MotionConfig({ children, isValidProp, ...config }) {
    isValidProp && loadExternalIsValidProp(isValidProp);
    /**
     * Inherit props from any parent MotionConfig components
     */
    config = { ...useContext(MotionConfigContext), ...config };
    /**
     * Don't allow isStatic to change between renders as it affects how many hooks
     * motion components fire.
     */
    config.isStatic = useConstant(() => config.isStatic);
    /**
     * Creating a new config context object will re-render every `motion` component
     * every time it renders. So we only want to create a new one sparingly.
     */
    const context = useMemo(() => config, [
        JSON.stringify(config.transition),
        config.transformPagePoint,
        config.reducedMotion,
    ]);
    return (jsx(MotionConfigContext.Provider, { value: context, children: children }));
}

export { MotionConfig };
