import type { SVGGroup } from '../../../diagram-api/types.js';
import type { Dimension } from './interfaces.js';
export interface TextDimensionCalculator {
    getMaxDimension(texts: string[], fontSize: number): Dimension;
}
export declare class TextDimensionCalculatorWithFont implements TextDimensionCalculator {
    private parentGroup;
    constructor(parentGroup: SVGGroup);
    getMaxDimension(texts: string[], fontSize: number): Dimension;
}
