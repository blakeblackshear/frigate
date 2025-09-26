import { type Snippet } from "svelte";
import { type ScrollToIndexOpts } from "../core";
/**
 * Props of {@link WindowVirtualizer}.
 */
export interface WindowVirtualizerProps<T> {
    /**
     * The data items rendered by this component.
     */
    data: T[];
    /**
     * The elements renderer snippet.
     */
    children: Snippet<[item: T, index: number]>;
    /**
     * Function that returns the key of an item in the list. It's recommended to specify whenever possible for performance.
     * @default defaultGetKey (returns index of item)
     */
    getKey?: (data: T, index: number) => string | number;
    /**
     * Number of items to render above/below the visible bounds of the list. You can increase to avoid showing blank items in fast scrolling.
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
     * Callback invoked whenever scroll offset changes.
     */
    onscroll?: () => void;
    /**
     * Callback invoked when scrolling stops.
     */
    onscrollend?: () => void;
}
/**
 * Methods of {@link WindowVirtualizer}.
 */
export interface WindowVirtualizerHandle {
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
