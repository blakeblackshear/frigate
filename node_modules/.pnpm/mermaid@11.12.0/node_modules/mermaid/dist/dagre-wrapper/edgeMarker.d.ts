import type { SVG } from '../diagram-api/types.js';
import type { EdgeData } from '../types.js';
/**
 * Adds SVG markers to a path element based on the arrow types specified in the edge.
 *
 * @param svgPath - The SVG path element to add markers to.
 * @param edge - The edge data object containing the arrow types.
 * @param url - The URL of the SVG marker definitions.
 * @param id - The ID prefix for the SVG marker definitions.
 * @param diagramType - The type of diagram being rendered.
 */
export declare const addEdgeMarkers: (svgPath: SVG, edge: Pick<EdgeData, "arrowTypeStart" | "arrowTypeEnd">, url: string, id: string, diagramType: string) => void;
