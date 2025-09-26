import { ResolvedOptions, Op, OpSet } from './core.js';
import { Point } from './geometry.js';
interface EllipseParams {
    rx: number;
    ry: number;
    increment: number;
}
export declare function line(x1: number, y1: number, x2: number, y2: number, o: ResolvedOptions): OpSet;
export declare function linearPath(points: Point[], close: boolean, o: ResolvedOptions): OpSet;
export declare function polygon(points: Point[], o: ResolvedOptions): OpSet;
export declare function rectangle(x: number, y: number, width: number, height: number, o: ResolvedOptions): OpSet;
export declare function curve(inputPoints: Point[] | Point[][], o: ResolvedOptions): OpSet;
export interface EllipseResult {
    opset: OpSet;
    estimatedPoints: Point[];
}
export declare function ellipse(x: number, y: number, width: number, height: number, o: ResolvedOptions): OpSet;
export declare function generateEllipseParams(width: number, height: number, o: ResolvedOptions): EllipseParams;
export declare function ellipseWithParams(x: number, y: number, o: ResolvedOptions, ellipseParams: EllipseParams): EllipseResult;
export declare function arc(x: number, y: number, width: number, height: number, start: number, stop: number, closed: boolean, roughClosure: boolean, o: ResolvedOptions): OpSet;
export declare function svgPath(path: string, o: ResolvedOptions): OpSet;
export declare function solidFillPolygon(polygonList: Point[][], o: ResolvedOptions): OpSet;
export declare function patternFillPolygons(polygonList: Point[][], o: ResolvedOptions): OpSet;
export declare function patternFillArc(x: number, y: number, width: number, height: number, start: number, stop: number, o: ResolvedOptions): OpSet;
export declare function randOffset(x: number, o: ResolvedOptions): number;
export declare function randOffsetWithRange(min: number, max: number, o: ResolvedOptions): number;
export declare function doubleLineFillOps(x1: number, y1: number, x2: number, y2: number, o: ResolvedOptions): Op[];
export {};
