import { ViewportComponentAttributes } from "./types";
import { VirtualizerHandle, VirtualizerProps } from "./Virtualizer";
/**
 * Methods of {@link VList}.
 */
export interface VListHandle extends VirtualizerHandle {
}
/**
 * Props of {@link VList}.
 */
export interface VListProps extends Pick<VirtualizerProps, "children" | "count" | "overscan" | "itemSize" | "shift" | "horizontal" | "cache" | "ssrCount" | "item" | "onScroll" | "onScrollEnd" | "keepMounted">, ViewportComponentAttributes {
    /**
     * If true, items are aligned to the end of the list when total size of items are smaller than viewport size. It's useful for chat like app.
     */
    reverse?: boolean;
}
/**
 * Virtualized list component. See {@link VListProps} and {@link VListHandle}.
 */
export declare const VList: import("react").ForwardRefExoticComponent<VListProps & import("react").RefAttributes<VListHandle>>;
