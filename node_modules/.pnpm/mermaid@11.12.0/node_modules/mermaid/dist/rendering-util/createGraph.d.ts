import type { LayoutData } from './types.ts';
import type { Selection } from 'd3';
import * as graphlib from 'dagre-d3-es/src/graphlib/index.js';
type D3Selection<T extends SVGElement = SVGElement> = Selection<T, unknown, Element | null, unknown>;
/**
 * Creates a  graph by merging the graph construction and DOM element insertion.
 *
 * This function creates the graph, inserts the SVG groups (clusters, edgePaths, edgeLabels, nodes)
 * into the provided element, and uses `insertNode` to add nodes to the diagram. Node dimensions
 * are computed using each node's bounding box.
 *
 * @param element - The D3 selection in which the SVG groups are inserted.
 * @param data4Layout - The layout data containing nodes and edges.
 * @returns A promise resolving to an object containing the Graphology graph and the inserted groups.
 */
export declare function createGraphWithElements(element: D3Selection, data4Layout: LayoutData): Promise<{
    graph: graphlib.Graph;
    groups: {
        clusters: D3Selection<SVGGElement>;
        edgePaths: D3Selection<SVGGElement>;
        edgeLabels: D3Selection<SVGGElement>;
        nodes: D3Selection<SVGGElement>;
        rootGroups: D3Selection<SVGGElement>;
    };
    nodeElements: Map<string, D3Selection<SVGElement | SVGGElement>>;
}>;
export {};
