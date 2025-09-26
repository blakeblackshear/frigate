/** @jsxImportSource vue */
import { ComponentOptionsMixin, SlotsType, VNode, PropType } from "vue";
import { VirtualizerHandle } from "./Virtualizer";
import { ItemProps } from "./utils";
interface VListHandle extends VirtualizerHandle {
}
export declare const VList: import("vue").DefineComponent<{
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
     * A prop for SSR. If set, the specified amount of items will be mounted in the initial rendering regardless of the container size until hydrated.
     */
    ssrCount: NumberConstructor;
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
}, VListHandle, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {
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
     * A prop for SSR. If set, the specified amount of items will be mounted in the initial rendering regardless of the container size until hydrated.
     */
    ssrCount: NumberConstructor;
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
}, SlotsType<{
    default: (arg: {
        item: any;
        index: number;
    }) => VNode[];
}>>;
export {};
