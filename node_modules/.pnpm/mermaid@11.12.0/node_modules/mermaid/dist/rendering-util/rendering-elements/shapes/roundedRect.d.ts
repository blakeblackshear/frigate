import type { Node } from '../../types.js';
import type { D3Selection } from '../../../types.js';
/**
 * Generates evenly spaced points along an elliptical arc connecting two points.
 *
 * @param x1 - x-coordinate of the start point of the arc
 * @param y1 - y-coordinate of the start point of the arc
 * @param x2 - x-coordinate of the end point of the arc
 * @param y2 - y-coordinate of the end point of the arc
 * @param rx - horizontal radius of the ellipse
 * @param ry - vertical radius of the ellipse
 * @param clockwise - direction of the arc; true for clockwise, false for counterclockwise
 * @returns Array of points `{ x, y }` along the elliptical arc
 *
 * @throws Error if the given radii are too small to draw an arc between the points
 */
export declare function generateArcPoints(x1: number, y1: number, x2: number, y2: number, rx: number, ry: number, clockwise: boolean): {
    x: number;
    y: number;
}[];
export declare function roundedRect<T extends SVGGraphicsElement>(parent: D3Selection<T>, node: Node): Promise<import("d3-selection").Selection<SVGGElement, unknown, Element | null, unknown>>;
