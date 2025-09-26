import type { Node, ShapeRenderOptions } from '../../types.js';
import type { D3Selection } from '../../../types.js';
export declare function iconCircle<T extends SVGGraphicsElement>(parent: D3Selection<T>, node: Node, { config: { themeVariables, flowchart } }: ShapeRenderOptions): Promise<import("d3-selection").Selection<SVGGElement, unknown, Element | null, unknown>>;
