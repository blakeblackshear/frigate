import type { D3Selection } from '../../../types.js';
export declare function insertPolygonShape<T extends SVGGraphicsElement>(parent: D3Selection<T>, w: number, h: number, points: {
    x: number;
    y: number;
}[]): import("d3-selection").Selection<SVGPolygonElement, unknown, Element | null, unknown>;
