import type { D3Element } from '../../types.js';
import type { MindmapNode } from './mindmapTypes.js';
import type { LayoutData, Node, Edge } from '../../rendering-util/types.js';
export type MindmapLayoutNode = Node & {
    level: number;
    nodeId: string;
    type: number;
    section?: number;
};
export type MindmapLayoutEdge = Edge & {
    depth: number;
    section?: number;
};
declare const nodeType: {
    readonly DEFAULT: 0;
    readonly NO_BORDER: 0;
    readonly ROUNDED_RECT: 1;
    readonly RECT: 2;
    readonly CIRCLE: 3;
    readonly CLOUD: 4;
    readonly BANG: 5;
    readonly HEXAGON: 6;
};
export declare class MindmapDB {
    private nodes;
    private count;
    private elements;
    private baseLevel?;
    readonly nodeType: typeof nodeType;
    constructor();
    clear(): void;
    getParent(level: number): MindmapNode | null;
    getMindmap(): MindmapNode | null;
    addNode(level: number, id: string, descr: string, type: number): void;
    getType(startStr: string, endStr: string): 0 | 2 | 1 | 3 | 4 | 5 | 6;
    setElementForId(id: number, element: D3Element): void;
    getElementById(id: number): any;
    decorateNode(decoration?: {
        class?: string;
        icon?: string;
    }): void;
    type2Str(type: number): string;
    /**
     * Assign section numbers to nodes based on their position relative to root
     * @param node - The mindmap node to process
     * @param sectionNumber - The section number to assign (undefined for root)
     */
    assignSections(node: MindmapNode, sectionNumber?: number): void;
    /**
     * Convert mindmap tree structure to flat array of nodes
     * @param node - The mindmap node to process
     * @param processedNodes - Array to collect processed nodes
     */
    flattenNodes(node: MindmapNode, processedNodes: MindmapLayoutNode[]): void;
    /**
     * Generate edges from parent-child relationships in mindmap tree
     * @param node - The mindmap node to process
     * @param edges - Array to collect edges
     */
    generateEdges(node: MindmapNode, edges: MindmapLayoutEdge[]): void;
    /**
     * Get structured data for layout algorithms
     * Following the pattern established by ER diagrams
     * @returns Structured data containing nodes, edges, and config
     */
    getData(): LayoutData;
    getLogger(): Record<import("../../logger.js").LogLevel, {
        (...data: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
    }>;
}
export {};
