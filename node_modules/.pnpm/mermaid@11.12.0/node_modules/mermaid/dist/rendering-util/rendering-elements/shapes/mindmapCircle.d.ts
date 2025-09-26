import type { Node } from '../../types.js';
import type { D3Selection } from '../../../types.js';
export declare function mindmapCircle<T extends SVGGraphicsElement>(parent: D3Selection<T>, node: Node): Promise<import("d3-selection").Selection<SVGGElement, unknown, Element | null, unknown>>;
