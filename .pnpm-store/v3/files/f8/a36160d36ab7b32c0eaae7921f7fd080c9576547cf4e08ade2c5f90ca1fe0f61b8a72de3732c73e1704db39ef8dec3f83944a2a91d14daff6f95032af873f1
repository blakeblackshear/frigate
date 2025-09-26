/** @jsxImportSource vue */
import { VNode, ComponentOptionsMixin, SlotsType, PropType, NativeElements } from "vue";
import { ScrollToIndexOpts } from "../core";
import { ItemProps } from "./utils";
export interface VirtualizerHandle {
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
export declare const Virtualizer: import("vue").DefineComponent<{
    /**
     * The data items rendered by this component.
     */
    data: {
        type: ArrayConstructor;
        required: true;
    };
    /**
     * Number of items to render above/below the visible bounds of the list. You can increase to avoid showing blank items in fast scrolling.
     * @defaultValue 4
     */
    overscan: NumberConstructor;
    /**
     * Item size hint for unmeasured items. It will help to reduce scroll jump when items are measured if used properly.
     *
     * - If not set, initial item sizes will be automatically estimated from measured sizes. This is recommended for most cases.
     * - If set, you can opt out estimation and use the value as initial item size.
     */
    itemSize: NumberConstructor;
    /**
     * While true is set, scroll position will be maintained from the end not usual start when items are added to/removed from start. It's recommended to set false if you add to/remove from mid/end of the list because it can cause unexpected behavior. This prop is useful for reverse infinite scrolling.
     */
    shift: BooleanConstructor;
    /**
     * If true, rendered as a horizontally scrollable list. Otherwise rendered as a vertically scrollable list.
     */
    horizontal: BooleanConstructor;
    /**
     * If you put an element before virtualizer, you have to define its height with this prop.
     */
    startMargin: {
        type: NumberConstructor;
        default: number;
    };
    /**
     * A prop for SSR. If set, the specified amount of items will be mounted in the initial rendering regardless of the container size until hydrated.
     */
    ssrCount: NumberConstructor;
    /**
     * Reference to the scrollable element. The default will get the direct parent element of virtualizer.
     */
    scrollRef: PropType<HTMLElement>;
    /**
     * Component or element type for container element.
     * @defaultValue "div"
     */
    as: {
        type: PropType<keyof NativeElements>;
        default: string;
    };
    /**
     * Component or element type for item element.
     * @defaultValue "div"
     */
    item: {
        type: PropType<keyof NativeElements>;
        default: string;
    };
    /**
     * A function that provides properties/attributes for item element
     *
     * **This prop will be merged into `item` prop in the future**
     */
    itemProps: PropType<ItemProps>;
    /**
     * List of indexes that should be always mounted, even when off screen.
     */
    keepMounted: PropType<number[]>;
}, VirtualizerHandle, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {
    /**
     * Callback invoked whenever scroll offset changes.
     * @param offset Current scrollTop, or scrollLeft if horizontal: true.
     */
    scroll: (offset: number) => void;
    /**
     * Callback invoked when scrolling stops.
     */
    scrollEnd: () => void;
}, string, import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    /**
     * The data items rendered by this component.
     */
    data: {
        type: ArrayConstructor;
        required: true;
    };
    /**
     * Number of items to render above/below the visible bounds of the list. You can increase to avoid showing blank items in fast scrolling.
     * @defaultValue 4
     */
    overscan: NumberConstructor;
    /**
     * Item size hint for unmeasured items. It will help to reduce scroll jump when items are measured if used properly.
     *
     * - If not set, initial item sizes will be automatically estimated from measured sizes. This is recommended for most cases.
     * - If set, you can opt out estimation and use the value as initial item size.
     */
    itemSize: NumberConstructor;
    /**
     * While true is set, scroll position will be maintained from the end not usual start when items are added to/removed from start. It's recommended to set false if you add to/remove from mid/end of the list because it can cause unexpected behavior. This prop is useful for reverse infinite scrolling.
     */
    shift: BooleanConstructor;
    /**
     * If true, rendered as a horizontally scrollable list. Otherwise rendered as a vertically scrollable list.
     */
    horizontal: BooleanConstructor;
    /**
     * If you put an element before virtualizer, you have to define its height with this prop.
     */
    startMargin: {
        type: NumberConstructor;
        default: number;
    };
    /**
     * A prop for SSR. If set, the specified amount of items will be mounted in the initial rendering regardless of the container size until hydrated.
     */
    ssrCount: NumberConstructor;
    /**
     * Reference to the scrollable element. The default will get the direct parent element of virtualizer.
     */
    scrollRef: PropType<HTMLElement>;
    /**
     * Component or element type for container element.
     * @defaultValue "div"
     */
    as: {
        type: PropType<keyof NativeElements>;
        default: string;
    };
    /**
     * Component or element type for item element.
     * @defaultValue "div"
     */
    item: {
        type: PropType<keyof NativeElements>;
        default: string;
    };
    /**
     * A function that provides properties/attributes for item element
     *
     * **This prop will be merged into `item` prop in the future**
     */
    itemProps: PropType<ItemProps>;
    /**
     * List of indexes that should be always mounted, even when off screen.
     */
    keepMounted: PropType<number[]>;
}>> & {
    onScroll?: ((offset: number) => any) | undefined;
    onScrollEnd?: (() => any) | undefined;
}, {
    shift: boolean;
    horizontal: boolean;
    startMargin: number;
    as: keyof import("vue").IntrinsicElementAttributes;
    item: keyof import("vue").IntrinsicElementAttributes;
}, SlotsType<{
    default: (arg: {
        item: any;
        index: number;
    }) => VNode[];
}>>;
