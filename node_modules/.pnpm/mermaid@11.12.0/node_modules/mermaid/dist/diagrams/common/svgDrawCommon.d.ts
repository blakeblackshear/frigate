import type { SVG, SVGGroup } from '../../diagram-api/types.js';
import type { Bound, D3RectElement, D3TextElement, RectData, TextData, TextObject } from './commonTypes.js';
export declare const drawRect: (element: SVG | SVGGroup, rectData: RectData) => D3RectElement;
/**
 * Draws a background rectangle
 *
 * @param element - Diagram (reference for bounds)
 * @param bounds - Shape of the rectangle
 */
export declare const drawBackgroundRect: (element: SVG | SVGGroup, bounds: Bound) => void;
export declare const drawText: (element: SVG | SVGGroup, textData: TextData) => D3TextElement;
export declare const drawImage: (elem: SVG | SVGGroup, x: number, y: number, link: string) => void;
export declare const drawEmbeddedImage: (element: SVG | SVGGroup, x: number, y: number, link: string) => void;
export declare const getNoteRect: () => RectData;
export declare const getTextObj: () => TextObject;
