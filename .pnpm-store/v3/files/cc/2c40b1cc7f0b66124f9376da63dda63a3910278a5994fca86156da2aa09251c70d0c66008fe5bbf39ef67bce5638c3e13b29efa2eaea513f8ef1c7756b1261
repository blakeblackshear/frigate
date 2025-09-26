/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { useState, useEffect, useRef, useCallback, } from 'react';
import useIsomorphicLayoutEffect from '@docusaurus/useIsomorphicLayoutEffect';
import { prefersReducedMotion } from '../../utils/accessibilityUtils';
const DefaultAnimationEasing = 'ease-in-out';
/**
 * This hook is a very thin wrapper around a `useState`.
 */
export function useCollapsible({ initialState, }) {
    const [collapsed, setCollapsed] = useState(initialState ?? false);
    const toggleCollapsed = useCallback(() => {
        setCollapsed((expanded) => !expanded);
    }, []);
    return {
        collapsed,
        setCollapsed,
        toggleCollapsed,
    };
}
const CollapsedStyles = {
    display: 'none',
    overflow: 'hidden',
    height: '0px',
};
const ExpandedStyles = {
    display: 'block',
    overflow: 'visible',
    height: 'auto',
};
function applyCollapsedStyle(el, collapsed) {
    const collapsedStyles = collapsed ? CollapsedStyles : ExpandedStyles;
    el.style.display = collapsedStyles.display;
    el.style.overflow = collapsedStyles.overflow;
    el.style.height = collapsedStyles.height;
}
/*
Lex111: Dynamic transition duration is used in Material design, this technique
is good for a large number of items.
https://material.io/archive/guidelines/motion/duration-easing.html#duration-easing-dynamic-durations
https://github.com/mui-org/material-ui/blob/e724d98eba018e55e1a684236a2037e24bcf050c/packages/material-ui/src/styles/createTransitions.js#L40-L43
 */
function getAutoHeightDuration(height) {
    if (prefersReducedMotion()) {
        // Not using 0 because it prevents onTransitionEnd to fire and bubble up :/
        // See https://github.com/facebook/docusaurus/pull/8906
        return 1;
    }
    const constant = height / 36;
    return Math.round((4 + 15 * constant ** 0.25 + constant / 5) * 10);
}
function useCollapseAnimation({ collapsibleRef, collapsed, animation, }) {
    const mounted = useRef(false);
    useEffect(() => {
        const el = collapsibleRef.current;
        function getTransitionStyles() {
            const height = el.scrollHeight;
            const duration = animation?.duration ?? getAutoHeightDuration(height);
            const easing = animation?.easing ?? DefaultAnimationEasing;
            return {
                transition: `height ${duration}ms ${easing}`,
                height: `${height}px`,
            };
        }
        function applyTransitionStyles() {
            const transitionStyles = getTransitionStyles();
            el.style.transition = transitionStyles.transition;
            el.style.height = transitionStyles.height;
        }
        // On mount, we just apply styles, no animated transition
        if (!mounted.current) {
            applyCollapsedStyle(el, collapsed);
            mounted.current = true;
            return undefined;
        }
        // eslint-disable-next-line react-compiler/react-compiler
        el.style.willChange = 'height';
        function startAnimation() {
            const animationFrame = requestAnimationFrame(() => {
                // When collapsing
                if (collapsed) {
                    applyTransitionStyles();
                    requestAnimationFrame(() => {
                        el.style.height = CollapsedStyles.height;
                        el.style.overflow = CollapsedStyles.overflow;
                    });
                }
                // When expanding
                else {
                    el.style.display = 'block';
                    requestAnimationFrame(() => {
                        applyTransitionStyles();
                    });
                }
            });
            return () => cancelAnimationFrame(animationFrame);
        }
        return startAnimation();
    }, [collapsibleRef, collapsed, animation]);
}
function CollapsibleBase({ as: As = 'div', collapsed, children, animation, onCollapseTransitionEnd, className, }) {
    const collapsibleRef = useRef(null);
    useCollapseAnimation({ collapsibleRef, collapsed, animation });
    return (<As 
    // @ts-expect-error: the "too complicated type" is produced from
    // "CollapsibleElementType" being a huge union
    ref={collapsibleRef} // Refs are contravariant, which is not expressible in TS
     onTransitionEnd={(e) => {
            if (e.propertyName !== 'height') {
                return;
            }
            applyCollapsedStyle(collapsibleRef.current, collapsed);
            onCollapseTransitionEnd?.(collapsed);
        }} className={className}>
      {children}
    </As>);
}
function CollapsibleLazy({ collapsed, ...props }) {
    const [mounted, setMounted] = useState(!collapsed);
    // Updated in effect so that first expansion transition can work
    const [lazyCollapsed, setLazyCollapsed] = useState(collapsed);
    useIsomorphicLayoutEffect(() => {
        if (!collapsed) {
            setMounted(true);
        }
    }, [collapsed]);
    useIsomorphicLayoutEffect(() => {
        if (mounted) {
            setLazyCollapsed(collapsed);
        }
    }, [mounted, collapsed]);
    return mounted ? (<CollapsibleBase {...props} collapsed={lazyCollapsed}/>) : null;
}
/**
 * A headless component providing smooth and uniform collapsing behavior. The
 * component will be invisible (zero height) when collapsed. Doesn't provide
 * interactivity by itself: collapse state is toggled through props.
 */
export function Collapsible({ lazy, ...props }) {
    const Comp = lazy ? CollapsibleLazy : CollapsibleBase;
    return <Comp {...props}/>;
}
//# sourceMappingURL=index.js.map