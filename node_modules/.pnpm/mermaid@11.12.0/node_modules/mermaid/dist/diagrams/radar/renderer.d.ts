import type { DiagramRenderer } from '../../diagram-api/types.js';
export declare function relativeRadius(value: number, minValue: number, maxValue: number, radius: number): number;
export declare function closedRoundCurve(points: {
    x: number;
    y: number;
}[], tension: number): string;
export declare const renderer: DiagramRenderer;
