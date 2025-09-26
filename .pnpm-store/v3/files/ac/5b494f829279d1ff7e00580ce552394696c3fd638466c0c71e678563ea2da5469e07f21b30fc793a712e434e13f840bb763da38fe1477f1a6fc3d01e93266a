/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { type Dispatch, type SetStateAction, type ReactNode } from 'react';
/**
 * This hook is a very thin wrapper around a `useState`.
 */
export declare function useCollapsible({ initialState, }: {
    /** The initial state. Will be non-collapsed by default. */
    initialState?: boolean | (() => boolean);
}): {
    collapsed: boolean;
    setCollapsed: Dispatch<SetStateAction<boolean>>;
    toggleCollapsed: () => void;
};
type CollapsibleAnimationConfig = {
    duration?: number;
    easing?: string;
};
type CollapsibleElementType = React.ElementType<Pick<React.HTMLAttributes<unknown>, 'className' | 'onTransitionEnd' | 'style'>>;
type CollapsibleBaseProps = {
    /** The actual DOM element to be used in the markup. */
    as?: CollapsibleElementType;
    /** Initial collapsed state. */
    collapsed: boolean;
    children: ReactNode;
    /** Configuration of animation, like `duration` and `easing` */
    animation?: CollapsibleAnimationConfig;
    /**
     * A callback fired when the collapse transition animation ends. Receives
     * the **new** collapsed state: e.g. when
     * expanding, `collapsed` will be `false`. You can use this for some "cleanup"
     * like applying new styles when the container is fully expanded.
     */
    onCollapseTransitionEnd?: (collapsed: boolean) => void;
    /** Class name for the underlying DOM element. */
    className?: string;
};
type CollapsibleProps = CollapsibleBaseProps & {
    /**
     * Delay rendering of the content till first expansion. Marked as required to
     * force us to think if content should be server-rendered or not. This has
     * perf impact since it reduces html file sizes, but could undermine SEO.
     * @see https://github.com/facebook/docusaurus/issues/4753
     */
    lazy: boolean;
};
/**
 * A headless component providing smooth and uniform collapsing behavior. The
 * component will be invisible (zero height) when collapsed. Doesn't provide
 * interactivity by itself: collapse state is toggled through props.
 */
export declare function Collapsible({ lazy, ...props }: CollapsibleProps): ReactNode;
export {};
//# sourceMappingURL=index.d.ts.map