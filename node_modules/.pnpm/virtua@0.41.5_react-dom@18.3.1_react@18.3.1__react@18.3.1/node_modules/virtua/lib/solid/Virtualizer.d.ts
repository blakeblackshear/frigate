/**
 * @jsxImportSource solid-js
 */
import { JSX, type ValidComponent, Accessor } from "solid-js";
import { ScrollToIndexOpts, CacheSnapshot } from "../core";
/**
 * Methods of {@link Virtualizer}.
 */
export interface VirtualizerHandle {
    /**
     * Get current {@link CacheSnapshot}.
     */
    readonly cache: CacheSnapshot;
    /**
     * Get current scrollTop, or scrollLeft if horizontal: true.
     */
    readonly scrollOffset: number;
    /**
     * Get current scrollHeight, or scrollWidth if horizontal: true.
     */
    readonly scrollSize: number;
    /**
     * Get current offsetHeight, or offsetWidth if horizontal: true.
     */
    readonly viewportSize: number;
    /**
     * Find the start index of visible range of items.
     */
    findStartIndex: () => number;
    /**
     * Find the end index of visible range of items.
     */
    findEndIndex: () => number;
    /**
     * Get item offset from start.
     * @param index index of item
     */
    getItemOffset(index: number): number;
    /**
     * Get item size.
     * @param index index of item
     */
    getItemSize(index: number): number;
    /**
     * Scroll to the item specified by index.
     * @param index index of item
     * @param opts options
     */
    scrollToIndex(index: number, opts?: ScrollToIndexOpts): void;
    /**
     * Scroll to the given offset.
     * @param offset offset from start
     */
    scrollTo(offset: number): void;
    /**
     * Scroll by the given offset.
     * @param offset offset from current position
     */
    scrollBy(offset: number): void;
}
/**
 * Props of {@link Virtualizer}.
 */
export interface VirtualizerProps<T> {
    /**
     * Get reference to {@link VirtualizerHandle}.
     */
    ref?: (handle?: VirtualizerHandle) => void;
    /**
     * The data items rendered by this component.
     */
    data: T[];
    /**
     * The elements renderer function.
     */
    children: (data: T, index: Accessor<number>) => JSX.Element;
    /**
     * Number of items to render above/below the visible bounds of the list. Lower value will give better performance but you can increase to avoid showing blank items in fast scrolling.
     * @defaultValue 4
     */
    overscan?: number;
    /**
     * Component or element type for container element.
     * @defaultValue "div"
     */
    as?: ValidComponent;
    /**
     * Component or element type for item element.
     * @defaultValue "div"
     */
    item?: ValidComponent;
    /**
     * Reference to the scrollable element. The default will get the direct parent element of virtualizer.
     */
    scrollRef?: HTMLElement;
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
     * List of indexes that should be always mounted, even when off screen.
     */
    keepMounted?: number[];
    /**
     * You can restore cache by passing a {@link CacheSnapshot} on mount. This is useful when you want to restore scroll position after navigation. The snapshot can be obtained from {@link VirtualizerHandle.cache}.
     *
     * **The length of items should be the same as when you take the snapshot, otherwise restoration may not work as expected.**
     */
    cache?: CacheSnapshot;
    /**
     * If you put an element before virtualizer, you have to define its height with this prop.
     */
    startMargin?: number;
    /**
     * Callback invoked whenever scroll offset changes.
     * @param offset Current scrollTop, or scrollLeft if horizontal: true.
     */
    onScroll?: (offset: number) => void;
    /**
     * Callback invoked when scrolling stops.
     */
    onScrollEnd?: () => void;
}
/**
 * Customizable list virtualizer for advanced usage. See {@link VirtualizerProps} and {@link VirtualizerHandle}.
 */
export declare const Virtualizer: <T>(props: VirtualizerProps<T>) => JSX.Element;
