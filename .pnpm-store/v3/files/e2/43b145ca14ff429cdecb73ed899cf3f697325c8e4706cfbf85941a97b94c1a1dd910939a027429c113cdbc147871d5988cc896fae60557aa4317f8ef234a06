declare const cacheSymbol: unique symbol;
/**
 * Serializable cache snapshot.
 *
 * **This is not intended to be modified by users. And it is not guaranteed to work if you pass it to the different version of this package.**
 */
export interface CacheSnapshot {
    [cacheSymbol]: never;
}
export type ScrollToIndexAlign = "start" | "center" | "end" | "nearest";
export interface ScrollToIndexOpts {
    /**
     * Alignment of item.
     *
     * - `start`: Align the item to the start of the list.
     * - `center`: Align the item to the center of the list.
     * - `end`: Align the item to the end of the list.
     * - `nearest`: If the item is already completely visible, don't scroll. Otherwise scroll until it becomes visible. That is similar behavior to [`nearest` option of scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView).
     *
     * @defaultValue "start"
     */
    align?: ScrollToIndexAlign;
    /**
     * If true, scrolling animates smoothly with [`behavior: smooth` of scrollTo](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTo#behavior).
     *
     * **Using smooth scrolling over many items can kill performance benefit of virtual scroll. Do not overuse it.**
     */
    smooth?: boolean;
    /**
     * Additional offset from the scrolled position.
     * @defaultValue 0
     */
    offset?: number;
}
export {};
