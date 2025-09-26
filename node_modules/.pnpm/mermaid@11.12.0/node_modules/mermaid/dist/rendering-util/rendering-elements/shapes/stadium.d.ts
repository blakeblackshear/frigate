import type { Node } from '../../types.js';
import type { D3Selection } from '../../../types.js';
export declare const createStadiumPathD: (x: number, y: number, totalWidth: number, totalHeight: number) => string;
export declare function stadium<T extends SVGGraphicsElement>(parent: D3Selection<T>, node: Node): Promise<import("d3-selection").Selection<SVGGElement, unknown, Element | null, unknown>>;
