import type { DiagramDBBase } from '../../diagram-api/types.js';
import type { ArchitectureDiagramConfig } from '../../config.type.js';
import type { D3Element } from '../../types.js';
import type cytoscape from 'cytoscape';
export type ArchitectureAlignment = 'vertical' | 'horizontal' | 'bend';
export type ArchitectureDirection = 'L' | 'R' | 'T' | 'B';
export type ArchitectureDirectionX = Extract<ArchitectureDirection, 'L' | 'R'>;
export type ArchitectureDirectionY = Extract<ArchitectureDirection, 'T' | 'B'>;
/**
 * Contains LL, RR, TT, BB which are impossible connections
 */
export type InvalidArchitectureDirectionPair = `${ArchitectureDirection}${ArchitectureDirection}`;
export type ArchitectureDirectionPair = Exclude<InvalidArchitectureDirectionPair, 'LL' | 'RR' | 'TT' | 'BB'>;
export type ArchitectureDirectionPairXY = Exclude<InvalidArchitectureDirectionPair, 'LL' | 'RR' | 'TT' | 'BB' | 'LR' | 'RL' | 'TB' | 'BT'>;
export declare const ArchitectureDirectionName: {
    readonly L: "left";
    readonly R: "right";
    readonly T: "top";
    readonly B: "bottom";
};
export declare const ArchitectureDirectionArrow: {
    readonly L: (scale: number) => string;
    readonly R: (scale: number) => string;
    readonly T: (scale: number) => string;
    readonly B: (scale: number) => string;
};
export declare const ArchitectureDirectionArrowShift: {
    readonly L: (orig: number, arrowSize: number) => number;
    readonly R: (orig: number, _arrowSize: number) => number;
    readonly T: (orig: number, arrowSize: number) => number;
    readonly B: (orig: number, _arrowSize: number) => number;
};
export declare const getOppositeArchitectureDirection: (x: ArchitectureDirection) => ArchitectureDirection;
export declare const isArchitectureDirection: (x: unknown) => x is ArchitectureDirection;
export declare const isArchitectureDirectionX: (x: ArchitectureDirection) => x is ArchitectureDirectionX;
export declare const isArchitectureDirectionY: (x: ArchitectureDirection) => x is ArchitectureDirectionY;
export declare const isArchitectureDirectionXY: (a: ArchitectureDirection, b: ArchitectureDirection) => boolean;
export declare const isArchitecturePairXY: (pair: ArchitectureDirectionPair) => pair is ArchitectureDirectionPairXY;
/**
 * Verifies that the architecture direction pair does not contain an invalid match (LL, RR, TT, BB)
 * @param x - architecture direction pair which could potentially be invalid
 * @returns true if the pair is not LL, RR, TT, or BB
 */
export declare const isValidArchitectureDirectionPair: (x: InvalidArchitectureDirectionPair) => x is ArchitectureDirectionPair;
export type ArchitectureDirectionPairMap = Partial<Record<ArchitectureDirectionPair, string>>;
/**
 * Creates a pair of the directions of each side of an edge. This function should be used instead of manually creating it to ensure that the source is always the first character.
 *
 * Note: Undefined is returned when sourceDir and targetDir are the same. In theory this should never happen since the diagram parser throws an error if a user defines it as such.
 * @param sourceDir - source direction
 * @param targetDir - target direction
 * @returns
 */
export declare const getArchitectureDirectionPair: (sourceDir: ArchitectureDirection, targetDir: ArchitectureDirection) => ArchitectureDirectionPair | undefined;
/**
 * Given an x,y position for an arrow and the direction of the edge it belongs to, return a factor for slightly shifting the edge
 * @param param0 - [x, y] coordinate pair
 * @param pair - architecture direction pair
 * @returns a new [x, y] coordinate pair
 */
export declare const shiftPositionByArchitectureDirectionPair: ([x, y]: number[], pair: ArchitectureDirectionPair) => number[];
/**
 * Given the directional pair of an XY edge, get the scale factors necessary to shift the coordinates inwards towards the edge
 * @param pair - XY pair of an edge
 * @returns - number[] containing [+/- 1, +/- 1]
 */
export declare const getArchitectureDirectionXYFactors: (pair: ArchitectureDirectionPairXY) => number[];
export declare const getArchitectureDirectionAlignment: (a: ArchitectureDirection, b: ArchitectureDirection) => ArchitectureAlignment;
export interface ArchitectureStyleOptions {
    archEdgeColor: string;
    archEdgeArrowColor: string;
    archEdgeWidth: string;
    archGroupBorderColor: string;
    archGroupBorderWidth: string;
}
export interface ArchitectureService {
    id: string;
    type: 'service';
    edges: ArchitectureEdge[];
    icon?: string;
    iconText?: string;
    title?: string;
    in?: string;
    width?: number;
    height?: number;
}
export interface ArchitectureJunction {
    id: string;
    type: 'junction';
    edges: ArchitectureEdge[];
    in?: string;
    width?: number;
    height?: number;
}
export type ArchitectureNode = ArchitectureService | ArchitectureJunction;
export declare const isArchitectureService: (x: ArchitectureNode) => x is ArchitectureService;
export declare const isArchitectureJunction: (x: ArchitectureNode) => x is ArchitectureJunction;
export interface ArchitectureGroup {
    id: string;
    icon?: string;
    title?: string;
    in?: string;
}
export interface ArchitectureEdge<DT = ArchitectureDirection> {
    lhsId: string;
    lhsDir: DT;
    lhsInto?: boolean;
    lhsGroup?: boolean;
    rhsId: string;
    rhsDir: DT;
    rhsInto?: boolean;
    rhsGroup?: boolean;
    title?: string;
}
export interface ArchitectureDB extends DiagramDBBase<ArchitectureDiagramConfig> {
    clear: () => void;
    addService: (service: Omit<ArchitectureService, 'edges'>) => void;
    getServices: () => ArchitectureService[];
    addJunction: (service: Omit<ArchitectureJunction, 'edges'>) => void;
    getJunctions: () => ArchitectureJunction[];
    getNodes: () => ArchitectureNode[];
    getNode: (id: string) => ArchitectureNode | null;
    addGroup: (group: ArchitectureGroup) => void;
    getGroups: () => ArchitectureGroup[];
    addEdge: (edge: ArchitectureEdge) => void;
    getEdges: () => ArchitectureEdge[];
    setElementForId: (id: string, element: D3Element) => void;
    getElementById: (id: string) => D3Element;
    getDataStructures: () => ArchitectureDataStructures;
}
export type ArchitectureAdjacencyList = Record<string, ArchitectureDirectionPairMap>;
export type ArchitectureSpatialMap = Record<string, number[]>;
/**
 * Maps the direction that groups connect from.
 *
 * **Outer key**: ID of group A
 *
 * **Inner key**: ID of group B
 *
 * **Value**: 'vertical' or 'horizontal'
 *
 * Note: tmp[groupA][groupB] == tmp[groupB][groupA]
 */
export type ArchitectureGroupAlignments = Record<string, Record<string, Exclude<ArchitectureAlignment, 'bend'>>>;
export interface ArchitectureDataStructures {
    adjList: ArchitectureAdjacencyList;
    spatialMaps: ArchitectureSpatialMap[];
    groupAlignments: ArchitectureGroupAlignments;
}
export interface ArchitectureState extends Record<string, unknown> {
    nodes: Record<string, ArchitectureNode>;
    groups: Record<string, ArchitectureGroup>;
    edges: ArchitectureEdge[];
    registeredIds: Record<string, 'node' | 'group'>;
    dataStructures?: ArchitectureDataStructures;
    elements: Record<string, D3Element>;
    config: ArchitectureDiagramConfig;
}
export interface EdgeSingularData {
    id: string;
    label?: string;
    source: string;
    sourceDir: ArchitectureDirection;
    sourceArrow?: boolean;
    sourceGroup?: boolean;
    target: string;
    targetDir: ArchitectureDirection;
    targetArrow?: boolean;
    targetGroup?: boolean;
    [key: string]: any;
}
export declare const edgeData: (edge: cytoscape.EdgeSingular) => EdgeSingularData;
export interface EdgeSingular extends cytoscape.EdgeSingular {
    _private: {
        bodyBounds: unknown;
        rscratch: {
            startX: number;
            startY: number;
            midX: number;
            midY: number;
            endX: number;
            endY: number;
        };
    };
    data(): EdgeSingularData;
    data<T extends keyof EdgeSingularData>(key: T): EdgeSingularData[T];
}
export type NodeSingularData = {
    type: 'service';
    id: string;
    icon?: string;
    label?: string;
    parent?: string;
    width: number;
    height: number;
    [key: string]: any;
} | {
    type: 'junction';
    id: string;
    parent?: string;
    width: number;
    height: number;
    [key: string]: any;
} | {
    type: 'group';
    id: string;
    icon?: string;
    label?: string;
    parent?: string;
    [key: string]: any;
};
export declare const nodeData: (node: cytoscape.NodeSingular) => NodeSingularData;
export interface NodeSingular extends cytoscape.NodeSingular {
    _private: {
        bodyBounds: {
            h: number;
            w: number;
            x1: number;
            x2: number;
            y1: number;
            y2: number;
        };
        children: cytoscape.NodeSingular[];
    };
    data(): NodeSingularData;
    data<T extends keyof NodeSingularData>(key: T): NodeSingularData[T];
}
