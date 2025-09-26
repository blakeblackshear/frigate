/** @jsxImportSource vue */
import { VNode, ComponentOptionsMixin, SlotsType, PropType, NativeElements } from "vue";
import { ScrollToIndexOpts } from "../core";
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
export declare const WindowVirtualizer: import("vue").DefineComponent<{
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
}, void, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {
    /**
     * Callback invoked whenever scroll offset changes.
     */
    scroll: () => void;
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
}>> & {
    onScroll?: (() => any) | undefined;
    onScrollEnd?: (() => any) | undefined;
}, {
    shift: boolean;
    horizontal: boolean;
    as: keyof import("vue").IntrinsicElementAttributes;
    item: keyof import("vue").IntrinsicElementAttributes;
}, SlotsType<{
    default: (arg: {
        item: any;
        index: number;
    }) => VNode[];
}>>;
