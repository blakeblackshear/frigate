import { JSX, CSSProperties, ReactNode, Ref } from "react";
import { ViewportComponentAttributes } from "./types";
/**
 * Props of customized cell component for {@link VGrid}.
 */
export interface CustomCellComponentProps {
    style: CSSProperties;
    children: ReactNode;
}
export type CustomCellComponent = React.ForwardRefExoticComponent<React.PropsWithoutRef<CustomCellComponentProps> & React.RefAttributes<any>>;
/**
 * Methods of {@link VGrid}.
 */
export interface VGridHandle {
    /**
     * Get current scrollTop.
     */
    readonly scrollTop: number;
    /**
     * Get current scrollLeft.
     */
    readonly scrollLeft: number;
    /**
     * Get current scrollHeight.
     */
    readonly scrollHeight: number;
    /**
     * Get current scrollWidth.
     */
    readonly scrollWidth: number;
    /**
     * Get current offsetHeight.
     */
    readonly viewportHeight: number;
    /**
     * Get current offsetWidth.
     */
    readonly viewportWidth: number;
    /**
     * Find the start index of visible range of items.
     */
    findStartIndex: () => [x: number, y: number];
    /**
     * Find the end index of visible range of items.
     */
    findEndIndex: () => [x: number, y: number];
    /**
     * Get item offset from start.
     * @param indexX horizontal index of item
     * @param indexY vertical of item
     */
    getItemOffset(indexX: number, indexY: number): [x: number, y: number];
    /**
     * Get item size.
     * @param indexX horizontal index of item
     * @param indexY vertical of item
     */
    getItemSize(indexX: number, indexY: number): [width: number, height: number];
    /**
     * Scroll to the item specified by index.
     * @param indexX horizontal index of item
     * @param indexY vertical index of item
     */
    scrollToIndex(indexX: number, indexY: number): void;
    /**
     * Scroll to the given offset.
     * @param offsetX offset from left
     * @param offsetY offset from top
     */
    scrollTo(offsetX: number, offsetY: number): void;
    /**
     * Scroll by the given offset.
     * @param offsetX horizontal offset from current position
     * @param offsetY vertical offset from current position
     */
    scrollBy(offsetX: number, offsetY: number): void;
}
/**
 * Props of {@link VGrid}.
 */
export interface VGridProps extends ViewportComponentAttributes {
    /**
     * A function to create elements rendered by this component.
     */
    children: (arg: {
        /**
         * row index of cell
         */
        rowIndex: number;
        /**
         * column index of cell
         */
        colIndex: number;
    }) => ReactNode;
    /**
     * Total row length of grid.
     */
    row: number;
    /**
     * Total column length of grid.
     */
    col: number;
    /**
     * Cell height hint for unmeasured items. It's recommended to specify this prop if item sizes are fixed and known, or much larger than the defaultValue. It will help to reduce scroll jump when items are measured.
     * @defaultValue 40
     */
    cellHeight?: number;
    /**
     * Cell width hint for unmeasured items. It's recommended to specify this prop if item sizes are fixed and known, or much larger than the defaultValue. It will help to reduce scroll jump when items are measured.
     * @defaultValue 100
     */
    cellWidth?: number;
    /**
     * Number of items to render above/below the visible bounds of the grid. Lower value will give better performance but you can increase to avoid showing blank items in fast scrolling.
     * @defaultValue 2
     */
    overscan?: number;
    /**
     * If set, the specified amount of rows will be mounted in the initial rendering regardless of the container size. This prop is mostly for SSR.
     */
    initialRowCount?: number;
    /**
     * If set, the specified amount of cols will be mounted in the initial rendering regardless of the container size. This prop is mostly for SSR.
     */
    initialColCount?: number;
    /**
     * Component or element type for cell element. This component will get {@link CustomCellComponentProps} as props.
     * @defaultValue "div"
     */
    item?: keyof JSX.IntrinsicElements | CustomCellComponent;
    /** Reference to the rendered DOM element (the one that scrolls). */
    domRef?: Ref<HTMLDivElement>;
    /** Reference to the inner rendered DOM element (the one that contains all the cells). */
    innerDomRef?: Ref<HTMLDivElement>;
    /**
     * Callback invoked whenever scroll offset changes.
     */
    onScroll?: (offset: number) => void;
    /**
     * Callback invoked when scrolling stops.
     */
    onScrollEnd?: () => void;
}
/**
 * Virtualized grid component. See {@link VGridProps} and {@link VGridHandle}.
 */
export declare const VGrid: import("react").ForwardRefExoticComponent<VGridProps & import("react").RefAttributes<VGridHandle>>;
