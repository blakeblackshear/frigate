import { JSX, ReactElement, ReactNode } from "react";
import { CacheSnapshot, ScrollToIndexOpts } from "../core";
import { CustomContainerComponent, CustomItemComponent } from "./types";
/**
 * Methods of {@link WindowVirtualizer}.
 */
export interface WindowVirtualizerHandle {
    /**
     * Get current {@link CacheSnapshot}.
     */
    readonly cache: CacheSnapshot;
    /**
     * Find the start index of visible range of items.
     */
    findStartIndex: () => number;
    /**
     * Find the end index of visible range of items.
     */
    findEndIndex: () => number;
    /**
     * Scroll to the item specified by index.
     * @param index index of item
     * @param opts options
     */
    scrollToIndex(index: number, opts?: ScrollToIndexOpts): void;
}
/**
 * Props of {@link WindowVirtualizer}.
 */
export interface WindowVirtualizerProps {
    /**
     * Elements rendered by this component.
     *
     * You can also pass a function and set {@link WindowVirtualizerProps.count} to create elements lazily.
     */
    children: ReactNode | ((index: number) => ReactElement);
    /**
     * If you set a function to {@link WindowVirtualizerProps.children}, you have to set total number of items to this prop.
     */
    count?: number;
    /**
     * Number of items to render above/below the visible bounds of the list. Lower value will give better performance but you can increase to avoid showing blank items in fast scrolling.
     * @defaultValue 4
     */
    overscan?: number;
    /**
     * Item size hint for unmeasured items. It will help to reduce scroll jump when items are measured if used properly.
     *
     * - If not set, initial item sizes will be automatically estimated from measured sizes. This is recommended for most cases.
     * - If set, you can opt out estimation and use the value as initial item size.
     */
    itemSize?: number;
    /**
     * While true is set, scroll position will be maintained from the end not usual start when items are added to/removed from start. It's recommended to set false if you add to/remove from mid/end of the list because it can cause unexpected behavior. This prop is useful for reverse infinite scrolling.
     */
    shift?: boolean;
    /**
     * If true, rendered as a horizontally scrollable list. Otherwise rendered as a vertically scrollable list.
     */
    horizontal?: boolean;
    /**
     * You can restore cache by passing a {@link CacheSnapshot} on mount. This is useful when you want to restore scroll position after navigation. The snapshot can be obtained from {@link WindowVirtualizerHandle.cache}.
     *
     * **The length of items should be the same as when you take the snapshot, otherwise restoration may not work as expected.**
     */
    cache?: CacheSnapshot;
    /**
     * A prop for SSR. If set, the specified amount of items will be mounted in the initial rendering regardless of the container size until hydrated.
     */
    ssrCount?: number;
    /**
     * Component or element type for container element.
     * @defaultValue "div"
     */
    as?: keyof JSX.IntrinsicElements | CustomContainerComponent;
    /**
     * Component or element type for item element. This component will get {@link CustomItemComponentProps} as props.
     * @defaultValue "div"
     */
    item?: keyof JSX.IntrinsicElements | CustomItemComponent;
    /**
     * Callback invoked whenever scroll offset changes.
     */
    onScroll?: () => void;
    /**
     * Callback invoked when scrolling stops.
     */
    onScrollEnd?: () => void;
}
/**
 * {@link Virtualizer} controlled by the window scrolling. See {@link WindowVirtualizerProps} and {@link WindowVirtualizerHandle}.
 */
export declare const WindowVirtualizer: import("react").ForwardRefExoticComponent<WindowVirtualizerProps & import("react").RefAttributes<WindowVirtualizerHandle>>;
