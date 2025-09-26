import type { Node } from '../../types.js';
import type { D3Selection, Point } from '../../../types.js';
export declare const labelHelper: <T extends SVGGraphicsElement>(parent: D3Selection<T>, node: Node, _classes?: string) => Promise<{
    shapeSvg: import("d3-selection").Selection<SVGGElement, unknown, Element | null, unknown>;
    bbox: any;
    halfPadding: number;
    label: import("d3-selection").Selection<SVGGElement, unknown, Element | null, unknown>;
}>;
export declare const insertLabel: <T extends SVGGraphicsElement>(parent: D3Selection<T>, label: string, options: {
    labelStyle?: string | undefined;
    icon?: boolean | undefined;
    img?: string | undefined;
    useHtmlLabels?: boolean | undefined;
    padding: number;
    width?: number | undefined;
    centerLabel?: boolean | undefined;
    addSvgBackground?: boolean | undefined;
}) => Promise<{
    shapeSvg: D3Selection<T>;
    bbox: any;
    halfPadding: number;
    label: import("d3-selection").Selection<SVGGElement, unknown, Element | null, unknown>;
}>;
export declare const updateNodeBounds: <T extends SVGGraphicsElement>(node: Node, element: D3Selection<SVGGElement> | D3Selection<T>) => void;
/**
 * @param parent - Parent element to append the polygon to
 * @param w - Width of the polygon
 * @param h - Height of the polygon
 * @param points - Array of points to create the polygon
 */
export declare function insertPolygonShape(parent: D3Selection<SVGGElement>, w: number, h: number, points: Point[]): import("d3-selection").Selection<SVGPolygonElement, unknown, Element | null, unknown>;
export declare const getNodeClasses: (node: Node, extra?: string) => string;
export declare function createPathFromPoints(points: Point[]): string;
export declare function generateFullSineWavePoints(x1: number, y1: number, x2: number, y2: number, amplitude: number, numCycles: number): {
    x: number;
    y: number;
}[];
/**
 * @param centerX - x-coordinate of center of circle
 * @param centerY - y-coordinate of center of circle
 * @param radius - radius of circle
 * @param numPoints - total points required
 * @param startAngle - angle where arc will start
 * @param endAngle - angle where arc will end
 */
export declare function generateCirclePoints(centerX: number, centerY: number, radius: number, numPoints: number, startAngle: number, endAngle: number): {
    x: number;
    y: number;
}[];
