export type Node = {
    /**
     * - The label of the node.
     */
    label: string;
    /**
     * - The horizontal padding of the node.
     */
    paddingX?: number;
    /**
     * - The vertical padding of the node.
     */
    paddingY?: number;
    /**
     * - The padding of the node for all directions. Overrides `paddingX` and `paddingY`.
     */
    padding?: number;
    /**
     * - The left padding of the node.
     */
    paddingLeft?: number;
    /**
     * - The right padding of the node.
     */
    paddingRight?: number;
    _prevWidth?: number;
    width?: number;
    _prevHeight?: number;
    height?: number;
};
export function render(): {
    (svg: any, g: any): void;
    createNodes(value: any, ...args: any[]): (selection: any, g: any, shapes: any) => any;
    createClusters(value: any, ...args: any[]): (selection: any, g: any) => any;
    createEdgeLabels(value: any, ...args: any[]): (selection: any, g: any) => any;
    createEdgePaths(value: any, ...args: any[]): (selection: any, g: any, arrows: any) => any;
    shapes(value: any, ...args: any[]): {
        rect: (parent: any, bbox: any, node: any) => any;
        ellipse: (parent: any, bbox: any, node: any) => any;
        circle: (parent: any, bbox: any, node: any) => any;
        diamond: (parent: any, bbox: any, node: any) => any;
    } | any;
    arrows(value: any, ...args: any[]): {
        normal: (parent: any, id: any, edge: any, type: any) => void;
        vee: (parent: any, id: any, edge: any, type: any) => void;
        undirected: (parent: any, id: any, edge: any, type: any) => void;
    } | any;
};
