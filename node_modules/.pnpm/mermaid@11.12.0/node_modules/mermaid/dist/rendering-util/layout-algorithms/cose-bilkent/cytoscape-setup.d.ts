import cytoscape from 'cytoscape';
import type { LayoutData, Node, Edge } from '../../types.js';
import type { PositionedNode, PositionedEdge } from './types.js';
/**
 * Declare module augmentation for cytoscape edge types
 */
declare module 'cytoscape' {
    interface EdgeSingular {
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
    }
}
/**
 * Add nodes to cytoscape instance from provided node array
 * This function processes only the nodes provided in the data structure
 * @param nodes - Array of nodes to add
 * @param cy - The cytoscape instance
 */
export declare function addNodes(nodes: Node[], cy: cytoscape.Core): void;
/**
 * Add edges to cytoscape instance from provided edge array
 * This function processes only the edges provided in the data structure
 * @param edges - Array of edges to add
 * @param cy - The cytoscape instance
 */
export declare function addEdges(edges: Edge[], cy: cytoscape.Core): void;
/**
 * Create and configure cytoscape instance
 * @param data - Layout data containing nodes and edges
 * @returns Promise resolving to configured cytoscape instance
 */
export declare function createCytoscapeInstance(data: LayoutData): Promise<cytoscape.Core>;
/**
 * Extract positioned nodes from cytoscape instance
 * @param cy - The cytoscape instance after layout
 * @returns Array of positioned nodes
 */
export declare function extractPositionedNodes(cy: cytoscape.Core): PositionedNode[];
/**
 * Extract positioned edges from cytoscape instance
 * @param cy - The cytoscape instance after layout
 * @returns Array of positioned edges
 */
export declare function extractPositionedEdges(cy: cytoscape.Core): PositionedEdge[];
