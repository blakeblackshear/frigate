/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { type ReactNode } from 'react';
type ScrollController = {
    /** A boolean ref tracking whether scroll events are enabled. */
    scrollEventsEnabledRef: React.RefObject<boolean>;
    /** Enable scroll events in `useScrollPosition`. */
    enableScrollEvents: () => void;
    /** Disable scroll events in `useScrollPosition`. */
    disableScrollEvents: () => void;
};
export declare function ScrollControllerProvider({ children, }: {
    children: ReactNode;
}): ReactNode;
/**
 * We need a way to update the scroll position while ignoring scroll events
 * so as not to toggle Navbar/BackToTop visibility.
 *
 * This API permits to temporarily disable/ignore scroll events. Motivated by
 * https://github.com/facebook/docusaurus/pull/5618
 */
export declare function useScrollController(): ScrollController;
type ScrollPosition = {
    scrollX: number;
    scrollY: number;
};
/**
 * This hook fires an effect when the scroll position changes. The effect will
 * be provided with the before/after scroll positions. Note that the effect may
 * not be always run: if scrolling is disabled through `useScrollController`, it
 * will be a no-op.
 *
 * @see {@link useScrollController}
 */
export declare function useScrollPosition(effect: (position: ScrollPosition, lastPosition: ScrollPosition | null) => void, deps?: unknown[]): void;
/**
 * This hook permits to "block" the scroll position of a DOM element.
 * The idea is that we should be able to update DOM content above this element
 * but the screen position of this element should not change.
 *
 * Feature motivated by the Tabs groups: clicking on a tab may affect tabs of
 * the same group upper in the tree, yet to avoid a bad UX, the clicked tab must
 * remain under the user mouse.
 *
 * @see https://github.com/facebook/docusaurus/pull/5618
 */
export declare function useScrollPositionBlocker(): {
    /**
     * Takes an element, and keeps its screen position no matter what's getting
     * rendered above it, until the next render.
     */
    blockElementScrollPositionUntilNextRender: (el: HTMLElement) => void;
};
type CancelScrollTop = () => void;
/**
 * A "smart polyfill" of `window.scrollTo({ top, behavior: "smooth" })`.
 * This currently always uses a polyfilled implementation unless
 * `scroll-behavior: smooth` has been set in CSS, because native support
 * detection for scroll behavior seems unreliable.
 *
 * This hook does not do anything by itself: it returns a start and a stop
 * handle. You can execute either handle at any time.
 */
export declare function useSmoothScrollTo(): {
    /**
     * Start the scroll.
     *
     * @param top The final scroll top position.
     */
    startScroll: (top: number) => void;
    /**
     * A cancel function, because the non-native smooth scroll-top
     * implementation must be interrupted if user scrolls down. If there's no
     * existing animation or the scroll is using native behavior, this is a no-op.
     */
    cancelScroll: CancelScrollTop;
};
export {};
//# sourceMappingURL=scrollUtils.d.ts.map